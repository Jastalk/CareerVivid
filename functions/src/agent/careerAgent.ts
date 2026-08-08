/**
 * Career Agent — the server-side loop.
 *
 * The model call happens HERE, never in the browser. `src/agent/QueryEngine.ts`
 * runs `new GoogleGenAI({ apiKey })` client-side against a key from
 * localStorage; that is a developer sandbox and must not back a real feature.
 *
 * Three callables:
 *   careerAgentTurn     one user message → assistant text + any proposals
 *   careerAgentResolve  approve or reject a proposal, executing it if approved
 *   getAgentVoiceToken  short-lived Vertex token for a Live session (Phase 4)
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";
import { getAIClient, getVertexLocationForModel } from "../utils/ai";
import { buildContext } from "./context";
import { TOOLS_BY_NAME, toolDeclarations, isAutoExecEligible } from "./tools";
import { createProposal, resolveProposal } from "./proposals";
import { closeVoiceSession, affordableMinutes, HEARTBEAT_INTERVAL_MS } from "./voiceBilling";
import { reserve, settle, release, consumeFreeAgentTurn, monthlyLimitFor } from "../credits/ledger";
import {
    FREE_AGENT_MODEL,
    ACTION_PRICES,
    VOICE_SESSION_CAP_MINUTES,
    VOICE_CREDITS_PER_MINUTE,
    resolvePlan,
    type ActionKey,
} from "../generated/credits";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REGION = "us-west1";
/** Raise as phases ship. Everything above this is defined but not exposed. */
const ENABLED_PHASE = Number(process.env.AGENT_MAX_PHASE ?? 4);
const MAX_ITERATIONS = 12;

const SYSTEM_PROMPT = `
You are the CareerVivid Career Agent. You help users learn skills, build resumes,
track applications, and prepare for interviews — inside their CareerVivid workspace.

## How you work

- You have tools. Use them instead of guessing. If you need the user's profile, call
  getCareerProfile; do not invent their background.
- Ask only for information you genuinely lack. Never re-ask for something already in
  your context.
- Write actions (creating a resume, adding jobs, moving stages) are PROPOSED, not
  performed. The user sees a card and approves. Say what you are proposing in one
  short sentence — do not ask "shall I?" in prose, the card does that.
- After a proposal is approved you will be told the result. Verify it, then offer the
  natural next step.
- Prefer finishing what the user already started over beginning something new.

## Onboarding a new user

Two routes to a first resume, both ending in the editor:

1. **They upload one.** You will receive it inside <uploaded_resume>. Map it onto
   createResumeDraft, keeping their wording. Ask about anything important that is
   missing (usually contact details or dates) — do not fill gaps with invented
   content. Propose the draft.
2. **Guided creation.** Gather name, contact email, headline role, and at least one
   position. That is enough for a first draft; everything else can be added in the
   editor. Do not interrogate them for a complete history up front.

If they would rather use the visual builder than talk it through, call
navigateToRoute('/newresume') and let them pick a template there.

Once createResumeDraft is approved you get a route back — call navigateToRoute with
it so they land in the editor on their new resume.

## Tone

Direct and concrete. No filler, no "Great question!". Short paragraphs. When the user
is new and has nothing set up, offer two or three specific starting points rather than
an open-ended "what would you like to do?".

## Boundaries

- To open an existing resume call openResume and navigate to the route it returns.
  Never compose a resume URL from an id — /resume/{id} is not a route and 404s.
- The job tracker is /job-tracker, the builder is /newresume, a saved resume is
  /edit/{id}, practice is /interview-studio. navigateToRoute rejects anything else.
- Never claim a change was saved unless a tool result says so.
- Never present estimates or drafts as the user's real data.
- If a tool fails, say what failed and what you need to retry — do not silently retry
  with different arguments.
`.trim();

const requireAuth = (context: functions.https.CallableContext): string => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in to use the Career Agent.");
    return uid;
};

/**
 * Trim a client-supplied parsed resume to the fields a draft needs.
 *
 * The client parses the upload, so this payload is caller-controlled. It only
 * ever reaches the model as text — it never becomes a write on its own, since
 * the model still has to call `createResumeDraft` and the user still has to
 * approve. Capping it keeps a large upload from blowing out the turn.
 */
function sanitizeAttachment(raw: any): Record<string, unknown> | null {
    if (!raw || typeof raw !== "object" || raw.type !== "parsed_resume") return null;
    const d = raw.data;
    if (!d || typeof d !== "object") return null;

    const str = (v: unknown, n = 400) => (typeof v === "string" ? v.slice(0, n) : undefined);
    const list = (v: unknown, n: number, f: (x: any) => unknown) =>
        Array.isArray(v) ? v.slice(0, n).map(f) : undefined;

    const out = {
        personalDetails: d.personalDetails
            ? {
                  firstName: str(d.personalDetails.firstName, 80),
                  lastName: str(d.personalDetails.lastName, 80),
                  jobTitle: str(d.personalDetails.jobTitle, 120),
                  email: str(d.personalDetails.email, 200),
                  phone: str(d.personalDetails.phone, 60),
                  city: str(d.personalDetails.city, 120),
                  country: str(d.personalDetails.country, 120),
              }
            : undefined,
        professionalSummary: str(d.professionalSummary, 3_000),
        skills: list(d.skills, 40, (s: any) => ({ name: str(s?.name ?? s, 80), level: str(s?.level, 20) })),
        employmentHistory: list(d.employmentHistory, 15, (e: any) => ({
            jobTitle: str(e?.jobTitle, 120),
            employer: str(e?.employer, 120),
            city: str(e?.city, 120),
            startDate: str(e?.startDate, 40),
            endDate: str(e?.endDate, 40),
            description: str(e?.description, 2_000),
        })),
        education: list(d.education, 10, (e: any) => ({
            school: str(e?.school, 160),
            degree: str(e?.degree, 160),
            city: str(e?.city, 120),
            startDate: str(e?.startDate, 40),
            endDate: str(e?.endDate, 40),
        })),
    };

    return Object.values(out).some((v) => v !== undefined) ? out : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// careerAgentTurn
// ─────────────────────────────────────────────────────────────────────────────

export const careerAgentTurn = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 120, memory: "512MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const message = String(data?.message ?? "").trim().slice(0, 8_000);
        if (!message) throw new functions.https.HttpsError("invalid-argument", "message is required.");

        const route = String(data?.route ?? "/");
        const entity = data?.entity;
        const history = Array.isArray(data?.history) ? data.history.slice(-20) : [];
        const taskId = db.collection("_").doc().id;

        // Free conversation runs on the cheapest model. Anything stronger is billed.
        const { free, remaining } = await consumeFreeAgentTurn(uid);
        const model = FREE_AGENT_MODEL;

        const res = await reserve({
            uid,
            surface: "web",
            action: "agent.turn",
            credits: free ? 0 : ACTION_PRICES["agent.turn"],
            taskId,
            model,
        });
        if (!res.ok) {
            throw new functions.https.HttpsError("resource-exhausted", "credit_limit_reached", {
                creditsRemaining: res.creditsRemaining,
                monthlyLimit: res.monthlyLimit,
            });
        }

        try {
            const ctx = await buildContext(uid, route, entity);
            // Vertex ADC, not the Gemini API. getAIClient routes to
            // generativelanguage.googleapis.com the moment an apiKey is passed,
            // and the Gemini key was retired when this project moved to Vertex —
            // passing it produced "API key not valid" on every turn.
            const ai = getAIClient(undefined, getVertexLocationForModel(model));

            // A resume the user uploaded, already parsed client-side by
            // `parseResumeFromFile`. Parsing stays on the client because that
            // path is proven and handles PDF/DOCX; the agent only needs the
            // structured result to build a draft from.
            const attachment = sanitizeAttachment(data?.attachment);

            const contents: any[] = [
                ...history,
                {
                    role: "user",
                    parts: [
                        {
                            text:
                                `<workspace_context>\n${JSON.stringify(ctx)}\n</workspace_context>\n` +
                                (attachment
                                    ? `<uploaded_resume>\n${JSON.stringify(attachment)}\n</uploaded_resume>\n` +
                                      `The user uploaded this resume. Map it onto createResumeDraft arguments and propose the draft. ` +
                                      `Do not invent details it does not contain; ask about anything important that is missing.\n`
                                    : "") +
                                `\n${message}`,
                        },
                    ],
                },
            ];

            const autoExec: string[] = Array.isArray(data?.autoExecTools) ? data.autoExecTools.map(String) : [];
            const proposals: Array<Awaited<ReturnType<typeof createProposal>>> = [];
            const effects: unknown[] = [];
            let text = "";
            let usage = { inputTokens: 0, outputTokens: 0 };

            for (let i = 0; i < MAX_ITERATIONS; i++) {
                const result = await ai.models.generateContent({
                    model,
                    contents,
                    config: { systemInstruction: SYSTEM_PROMPT, tools: toolDeclarations(ENABLED_PHASE) },
                });

                usage.inputTokens += result.usageMetadata?.promptTokenCount ?? 0;
                usage.outputTokens += result.usageMetadata?.candidatesTokenCount ?? 0;

                const calls = result.functionCalls ?? [];
                if (!calls.length) {
                    text = result.text ?? "";
                    break;
                }

                // Echo the model's turn back VERBATIM. Rebuilding it from
                // `functionCalls` drops `thoughtSignature`, which Gemini 3.x
                // requires on every functionCall part it sees again — without it
                // the next call fails with "missing a thought_signature".
                const modelTurn = result.candidates?.[0]?.content;
                contents.push(
                    modelTurn ?? {
                        role: "model",
                        parts: calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })),
                    },
                );

                const responses: any[] = [];
                for (const call of calls) {
                    const tool = TOOLS_BY_NAME.get(call.name ?? "");
                    if (!tool || tool.phase > ENABLED_PHASE) {
                        responses.push({
                            functionResponse: { name: call.name, response: { error: `Unknown tool: ${call.name}` } },
                        });
                        continue;
                    }

                    let args: any;
                    try {
                        args = tool.validate ? tool.validate(call.args ?? {}) : (call.args ?? {});
                    } catch (e: any) {
                        responses.push({
                            functionResponse: { name: call.name, response: { error: `Invalid arguments: ${e.message}` } },
                        });
                        continue;
                    }

                    const preApproved = isAutoExecEligible(tool) && autoExec.includes(tool.name);

                    if (tool.writes && !preApproved) {
                        // Persist the arguments server-side. The client approves by ID
                        // and never supplies what gets written.
                        const proposal = await createProposal({
                            uid, taskId, tool: tool.name, args,
                            summary: tool.summarize?.(args) ?? `Run ${tool.name}`,
                        });
                        proposals.push(proposal);
                        responses.push({
                            functionResponse: {
                                name: call.name,
                                response: { proposed: true, proposalId: proposal.id, note: "Awaiting user approval. Do not call again." },
                            },
                        });
                        continue;
                    }

                    try {
                        const out = await tool.execute({ uid, taskId }, args);
                        if (out && typeof out === "object") effects.push(out);
                        responses.push({ functionResponse: { name: call.name, response: { result: out } } });
                    } catch (e: any) {
                        responses.push({ functionResponse: { name: call.name, response: { error: e.message } } });
                    }
                }

                contents.push({ role: "user", parts: responses });
            }

            await settle({ uid, entryId: res.entryId, model, usage, result: "ok" });

            if (text) {
                await userDoc(uid).collection("agentTasks").doc(taskId).set({
                    summary: text.slice(0, 200),
                    route,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            return {
                text,
                proposals,
                effects,
                taskId,
                credits: { free, freeTurnsRemaining: remaining, creditsRemaining: res.creditsRemaining },
            };
        } catch (e: any) {
            await release({ uid, entryId: res.entryId, reason: e?.message ?? String(e) });
            throw new functions.https.HttpsError("internal", e?.message ?? "Agent turn failed.");
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// careerAgentResolve
// ─────────────────────────────────────────────────────────────────────────────

export const careerAgentResolve = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 120, memory: "512MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const proposalId = String(data?.proposalId ?? "");
        if (!proposalId) throw new functions.https.HttpsError("invalid-argument", "proposalId is required.");

        const outcome = await resolveProposal({ uid, proposalId, approve: data?.approve === true });

        if (outcome.status === "error") {
            const code =
                outcome.code === "not_found" ? "not-found"
                : outcome.code === "expired" ? "deadline-exceeded"
                : outcome.code === "no_credits" ? "resource-exhausted"
                : outcome.code === "already_resolved" ? "failed-precondition"
                : "internal";
            throw new functions.https.HttpsError(code as any, outcome.message);
        }
        return outcome;
    });

// ─────────────────────────────────────────────────────────────────────────────
// getAgentVoiceToken — Phase 4
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Issues a short-lived Vertex access token for a Live session, mirroring the
 * pattern already proven by `getInterviewVertexToken`.
 *
 * A permanent Gemini key must never reach the browser. This token is
 * server-minted, scoped, and expires on its own.
 */
export const getAgentVoiceToken = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const purpose = String(data?.purpose ?? "interview_practice");

        const userSnap = await userDoc(uid).get();
        if (!userSnap.exists) throw new functions.https.HttpsError("not-found", "User not found.");

        const userData = userSnap.data()!;
        const plan = resolvePlan(userData.plan);
        const capMinutes = VOICE_SESSION_CAP_MINUTES[plan];

        // Refuse to open a session the user cannot afford to finish. Cutting
        // someone off mid-interview is worse than not starting.
        const affordable = affordableMinutes(userData, VOICE_CREDITS_PER_MINUTE);
        if (affordable < 2) {
            throw new functions.https.HttpsError("resource-exhausted", "Not enough credits for a voice session.");
        }

        const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        if (!tokenResponse?.token) {
            throw new functions.https.HttpsError("internal", "Could not mint a Vertex token.");
        }

        const sessionRef = db.collection("voiceSessions").doc();
        await sessionRef.set({
            uid,
            purpose,
            plan,
            capMinutes: Math.min(capMinutes, affordable),
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastBilledAt: admin.firestore.FieldValue.serverTimestamp(),
            lastHeartbeatAt: admin.firestore.FieldValue.serverTimestamp(),
            billedCredits: 0,
            billedSeconds: 0,
            status: "open",
        });

        return {
            accessToken: tokenResponse.token,
            project: process.env.GCLOUD_PROJECT,
            location: REGION,
            sessionId: sessionRef.id,
            capMinutes: Math.min(capMinutes, affordable),
            heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
            creditsPerMinute: VOICE_CREDITS_PER_MINUTE,
        };
    });

/**
 * Closes a voice session and bills the actual duration.
 *
 * Duration is taken from the SERVER-recorded start time, not from a
 * client-reported number — the client is not a trustworthy source for
 * something that determines a charge.
 */
export const endAgentVoiceSession = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const sessionId = String(data?.sessionId ?? "");
        if (!sessionId) throw new functions.https.HttpsError("invalid-argument", "sessionId is required.");

        const ref = db.collection("voiceSessions").doc(sessionId);
        const snap = await ref.get();
        if (!snap.exists || snap.data()!.uid !== uid) {
            throw new functions.https.HttpsError("not-found", "Session not found.");
        }
        if (snap.data()!.status !== "open") {
            return { status: "closed", credits: snap.data()!.billedCredits ?? 0 };
        }

        // Most of the call is already paid for by heartbeats; this settles the
        // final partial slice against server time.
        const tick = await closeVoiceSession({ sessionRef: ref, uid, upToMs: Date.now(), reason: "end" });
        return {
            status: "closed",
            durationSeconds: Math.round(tick.billedSeconds),
            credits: tick.billedTotal,
        };
    });

function userDoc(uid: string) {
    return db.collection("users").doc(uid);
}
