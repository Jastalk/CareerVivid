/**
 * Enterprise Agent proxy — grounded generation backed by Vertex AI Agent Builder.
 *
 * Replaces raw `generateContent` calls for the knowledge-bound surfaces (ATS
 * matching, career feedback, rubric lookups). Those answers must be traceable to
 * a source document, which the Discovery Engine `answerQuery` API gives us via
 * citations and a grounding score. Free-form creative generation stays on
 * geminiProxy — grounding a cover-letter rewrite against a datastore would only
 * constrain it.
 */

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { protos } from "@google-cloud/discoveryengine";
import { secureCorsHandler } from "../utils/corsUtils.js";
import {
  ENTERPRISE_DATASTORES,
  ENTERPRISE_LOCATION,
  EnterpriseDatastoreKey,
  enterpriseServingConfigPath,
  getEnterpriseAgentClient,
  GCP_PROJECT_ID,
} from "../utils/ai";

const corsHandler = secureCorsHandler;

type AnswerQueryRequest = protos.google.cloud.discoveryengine.v1.IAnswerQueryRequest;
type Answer = protos.google.cloud.discoveryengine.v1.IAnswer;

const HarmCategory = protos.google.cloud.discoveryengine.v1.HarmCategory;
const HarmBlockThreshold =
  protos.google.cloud.discoveryengine.v1.AnswerQueryRequest.SafetySpec.SafetySetting
    .HarmBlockThreshold;
const FilteringLevel =
  protos.google.cloud.discoveryengine.v1.AnswerQueryRequest.GroundingSpec.FilteringLevel;

/**
 * Every category the platform exposes is blocked at medium and above. Leaving a
 * category unlisted means the service default applies, which is weaker.
 */
const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

/**
 * Below this grounding score an answer is treated as a hallucination and is not
 * returned. ATS feedback that is not traceable to the job description or the
 * user's resume is worse than no feedback: a candidate may act on it.
 */
const GROUNDEDNESS_FLOOR = Number(process.env.ENTERPRISE_GROUNDEDNESS_FLOOR || 0.7);

/** Datastore keys a caller is allowed to name, so the field cannot address arbitrary stores. */
const ALLOWED_DATASTORES = new Set<EnterpriseDatastoreKey>(
  Object.keys(ENTERPRISE_DATASTORES) as EnterpriseDatastoreKey[]
);

/** Session ids become part of a resource name; keep them to a safe alphabet. */
function sanitizeSessionSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
}

/**
 * Sessions are namespaced by uid.
 *
 * Conversation history is readable by anyone holding the session name, so a
 * session id chosen by the client must never be usable verbatim — otherwise one
 * user could resume another user's interview-practice thread.
 */
function scopedSessionPath(uid: string, datastoreId: string, sessionId?: string): string | undefined {
  if (!sessionId) return undefined;
  const segment = `u-${sanitizeSessionSegment(uid)}-${sanitizeSessionSegment(sessionId)}`;
  return (
    `projects/${GCP_PROJECT_ID}/locations/${ENTERPRISE_LOCATION}` +
    `/collections/default_collection/dataStores/${datastoreId}/sessions/${segment}`
  );
}

async function verifyCaller(req: any): Promise<string | null> {
  const header: string = req.headers?.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(header.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Flatten the Answer proto into the citation shape the client renders. */
function formatCitations(answer: Answer) {
  const references = answer.references || [];
  return (answer.citations || []).flatMap((citation) =>
    (citation.sources || []).map((source) => {
      const reference = source.referenceId ? references[Number(source.referenceId)] : undefined;
      const chunk = reference?.chunkInfo;
      return {
        referenceId: source.referenceId ?? null,
        title: chunk?.documentMetadata?.title ?? null,
        uri: chunk?.documentMetadata?.uri ?? null,
        snippet: chunk?.content ?? null,
        startIndex: Number(citation.startIndex ?? 0),
        endIndex: Number(citation.endIndex ?? 0),
      };
    })
  );
}

/**
 * Some callers (resume scoring, system-design plans) need machine-readable
 * output. The model is asked for JSON, but a grounded answer is prose first, so
 * parsing is attempted and failure is reported rather than thrown — the caller
 * still gets the text and can degrade gracefully.
 */
function extractStructured(answerText: string): { parsed: unknown | null; parseError: string | null } {
  const fenced = answerText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : answerText).trim();
  if (!candidate.startsWith("{") && !candidate.startsWith("[")) {
    return { parsed: null, parseError: "No JSON object found in answer." };
  }
  try {
    return { parsed: JSON.parse(candidate), parseError: null };
  } catch (error: any) {
    return { parsed: null, parseError: error.message };
  }
}

export const enterpriseAgentProxy = onRequest(
  {
    timeoutSeconds: 120,
    region: "us-west1",
    memory: "512MiB",
    invoker: "public",
  },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      // `invoker: "public"` is an IAM setting; browsers authenticate with a
      // Firebase ID token, which IAM cannot evaluate. The tenant boundary is
      // enforced here instead.
      const uid = await verifyCaller(req);
      if (!uid) {
        res.status(401).json({ error: "Sign in to use AI features." });
        return;
      }

      const payload = req.body?.data ?? req.body ?? {};
      const {
        userMessage,
        sessionId,
        datastoreId = "jobCatalog",
        structured = false,
        filter,
      } = payload;

      if (typeof userMessage !== "string" || !userMessage.trim()) {
        res.status(400).json({ error: "Missing userMessage." });
        return;
      }
      if (!ALLOWED_DATASTORES.has(datastoreId as EnterpriseDatastoreKey)) {
        res.status(400).json({ error: `Unknown datastore: ${datastoreId}` });
        return;
      }

      const resolvedDatastore = ENTERPRISE_DATASTORES[datastoreId as EnterpriseDatastoreKey];

      try {
        const { conversational } = getEnterpriseAgentClient();

        const request: AnswerQueryRequest = {
          servingConfig: enterpriseServingConfigPath(resolvedDatastore),
          query: { text: userMessage },
          session: scopedSessionPath(uid, resolvedDatastore, sessionId),
          // Ties retrieval and any personalization to this tenant.
          userPseudoId: uid,
          userLabels: { uid },
          safetySpec: { enable: true, safetySettings: SAFETY_SETTINGS },
          groundingSpec: {
            includeGroundingSupports: true,
            filteringLevel: FilteringLevel.FILTERING_LEVEL_HIGH,
          },
          answerGenerationSpec: {
            includeCitations: true,
            ignoreAdversarialQuery: true,
            ignoreLowRelevantContent: true,
            ignoreJailBreakingQuery: true,
            ...(structured
              ? {
                  promptSpec: {
                    preamble:
                      "Answer strictly from the provided sources. Respond with a single JSON object and no prose.",
                  },
                }
              : {}),
          },
          searchSpec: filter
            ? { searchParams: { filter: String(filter), maxReturnResults: 10 } }
            : { searchParams: { maxReturnResults: 10 } },
        };

        const [response] = await conversational.answerQuery(request);
        const answer = response.answer || {};
        const answerText = answer.answerText || "";
        const groundingScore = typeof answer.groundingScore === "number" ? answer.groundingScore : null;

        // A skipped answer means the platform itself declined (adversarial query,
        // no relevant content, safety). Surface that instead of an empty string.
        const skipped = answer.answerSkippedReasons || [];
        if (skipped.length > 0 && !answerText) {
          res.status(422).json({
            error: "The agent declined to answer.",
            reasons: skipped,
            sessionId: response.session?.name ?? null,
          });
          return;
        }

        if (groundingScore !== null && groundingScore < GROUNDEDNESS_FLOOR) {
          res.status(422).json({
            error: "Answer was not sufficiently grounded in the source documents.",
            groundingScore,
            threshold: GROUNDEDNESS_FLOOR,
          });
          return;
        }

        const structuredResult = structured ? extractStructured(answerText) : null;

        res.status(200).json({
          text: answerText,
          groundingScore,
          citations: formatCitations(answer),
          safetyRatings: answer.safetyRatings || [],
          sessionId: response.session?.name ?? null,
          datastore: resolvedDatastore,
          ...(structuredResult
            ? { structured: structuredResult.parsed, structuredError: structuredResult.parseError }
            : {}),
        });
      } catch (error: any) {
        console.error("[enterpriseAgentProxy]", error?.message || error);
        res.status(500).json({ error: error?.message || "Enterprise agent request failed." });
      }
    });
  }
);
