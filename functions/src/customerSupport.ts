import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getAIClient, getVertexLocationForModel } from "./utils/ai";

if (!admin.apps.length) {
  admin.initializeApp();
}

const SUPPORT_MODEL = "gemini-2.5-flash-lite";
const SUPPORT_EMAIL = "support@careervivid.app";

export interface SupportTriageInput {
  source: "contact_form" | "feedback_modal" | "portfolio_message";
  name?: string | null;
  email?: string | null;
  subject?: string | null;
  message: string;
  rating?: number | null;
  productArea?: string | null;
  userId?: string | null;
  url?: string | null;
  context?: Record<string, unknown> | null;
}

export interface SupportTriageResult {
  category: string;
  priority: "P0" | "P1" | "P2" | "P3";
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  nextAction: string;
  replyDraft: string;
  internalNotes: string;
  needsHumanReview: boolean;
}

const SUPPORT_SYSTEM_INSTRUCTION = `
You are CareerVivid's customer support triage assistant.
Use only the provided ticket data.
Return strict JSON only.

CareerVivid helps job seekers build resumes, practice AI interviews, track jobs, autofill applications, and create career content.

Classify the ticket, estimate priority, and draft a concise customer reply.
Do not promise refunds, exact timelines, account changes, or bug fixes.
If information is missing, ask for exactly what support needs next.
Escalate billing, login, data loss, privacy, payment, and production-blocking issues to human review.

Priority guide:
P0: security, privacy, payment failure affecting many users, data loss, app-wide outage.
P1: user cannot access paid/core feature, login blocker, broken checkout, repeated crash.
P2: single-user bug, confusing behavior, missing feature request with clear impact.
P3: general question, positive feedback, low-impact suggestion.

JSON schema:
{
  "category": "billing|login|resume_editor|interview|job_tracker|chrome_extension|community|portfolio|bug|feature_request|question|other",
  "priority": "P0|P1|P2|P3",
  "sentiment": "positive|neutral|negative",
  "summary": "one sentence",
  "nextAction": "internal next step",
  "replyDraft": "customer-facing reply",
  "internalNotes": "brief notes for support/engineering",
  "needsHumanReview": true
}
`;

const fallbackTriage = (input: SupportTriageInput, error?: unknown): SupportTriageResult => ({
  category: input.rating && input.rating >= 4 ? "feedback" : "other",
  priority: input.rating && input.rating <= 2 ? "P2" : "P3",
  sentiment: input.rating && input.rating >= 4 ? "positive" : "neutral",
  summary: input.subject || input.message.slice(0, 160) || "New customer message",
  nextAction: "Review the customer message and respond manually.",
  replyDraft:
    "Hi there,\n\nThanks for reaching out to CareerVivid. I received your message and I am reviewing it now. If this is about a bug, please send the page you were on, what you expected to happen, and a screenshot if available.\n\nBest,\nCareerVivid Support",
  internalNotes: error instanceof Error ? `AI triage failed: ${error.message}` : "AI triage fallback used.",
  needsHumanReview: true,
});

const cleanString = (value: unknown, maxLength: number): string => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const normalizeTriage = (input: SupportTriageInput, raw: Partial<SupportTriageResult>): SupportTriageResult => {
  const priority = ["P0", "P1", "P2", "P3"].includes(String(raw.priority))
    ? (raw.priority as SupportTriageResult["priority"])
    : fallbackTriage(input).priority;
  const sentiment = ["positive", "neutral", "negative"].includes(String(raw.sentiment))
    ? (raw.sentiment as SupportTriageResult["sentiment"])
    : "neutral";

  return {
    category: cleanString(raw.category, 80) || "other",
    priority,
    sentiment,
    summary: cleanString(raw.summary, 500) || fallbackTriage(input).summary,
    nextAction: cleanString(raw.nextAction, 500) || "Review and respond manually.",
    replyDraft: cleanString(raw.replyDraft, 1800) || fallbackTriage(input).replyDraft,
    internalNotes: cleanString(raw.internalNotes, 800) || "No internal notes returned.",
    needsHumanReview: raw.needsHumanReview !== false,
  };
};

export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function generateSupportTriage(input: SupportTriageInput): Promise<SupportTriageResult> {
  try {
    const ai = getAIClient(undefined, getVertexLocationForModel(SUPPORT_MODEL));
    const response = await ai.models.generateContent({
      model: SUPPORT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify(
                {
                  ...input,
                  generatedAt: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        },
      ],
      config: {
        systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}") as Partial<SupportTriageResult>;
    return normalizeTriage(input, parsed);
  } catch (error) {
    console.error("[customerSupport] Gemini triage failed", error);
    return fallbackTriage(input, error);
  }
}

export function renderSupportTriageHtml(triage: SupportTriageResult): string {
  return `
    <div style="margin-top: 20px; background: #eef2ff; border: 2px solid #4f46e5; padding: 16px;">
      <h3 style="margin: 0 0 12px; color: #312e81;">Gemini Support Triage</h3>
      <p><strong>Priority:</strong> ${escapeHtml(triage.priority)} &nbsp; <strong>Category:</strong> ${escapeHtml(triage.category)} &nbsp; <strong>Sentiment:</strong> ${escapeHtml(triage.sentiment)}</p>
      <p><strong>Summary:</strong> ${escapeHtml(triage.summary)}</p>
      <p><strong>Next action:</strong> ${escapeHtml(triage.nextAction)}</p>
      <p><strong>Human review:</strong> ${triage.needsHumanReview ? "Yes" : "No"}</p>
      <div style="margin-top: 12px; background: white; border: 1px solid #c7d2fe; padding: 12px;">
        <p style="margin-top: 0;"><strong>Reply draft</strong></p>
        <pre style="white-space: pre-wrap; font-family: sans-serif; margin: 0;">${escapeHtml(triage.replyDraft)}</pre>
      </div>
      <p style="font-size: 12px; color: #4b5563;"><strong>Internal notes:</strong> ${escapeHtml(triage.internalNotes)}</p>
    </div>
  `;
}

export function renderSupportTriageText(triage: SupportTriageResult): string {
  return [
    "Gemini Support Triage",
    `Priority: ${triage.priority}`,
    `Category: ${triage.category}`,
    `Sentiment: ${triage.sentiment}`,
    `Summary: ${triage.summary}`,
    `Next action: ${triage.nextAction}`,
    `Human review: ${triage.needsHumanReview ? "Yes" : "No"}`,
    "",
    "Reply draft:",
    triage.replyDraft,
    "",
    `Internal notes: ${triage.internalNotes}`,
  ].join("\n");
}

export const onFeedbackCreated = functions
  .region("us-west1")
  .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .firestore.document("feedback/{feedbackId}")
  .onCreate(async (snapshot, context) => {
    const feedbackId = context.params.feedbackId;
    const data = snapshot.data();
    if (!data) {
      return null;
    }

    const message = cleanString(data.comment, 4000) || `Rating: ${data.rating || "unknown"}/5`;
    const triage = await generateSupportTriage({
      source: "feedback_modal",
      email: data.userEmail || null,
      message,
      rating: typeof data.rating === "number" ? data.rating : null,
      productArea: data.source || null,
      userId: data.userId || null,
      context: data.context || null,
    });

    await snapshot.ref.update({
      aiSupport: triage,
      aiSupportGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      supportStatus: triage.needsHumanReview ? "needs_review" : "triaged",
    });

    await admin.firestore().collection("mail").add({
      to: SUPPORT_EMAIL,
      message: {
        subject: `[Feedback][${triage.priority}] ${data.rating || "?"}/5 from ${data.userEmail || "unknown user"}`,
        text: [
          `Feedback ID: ${feedbackId}`,
          `User: ${data.userEmail || "N/A"}`,
          `Source: ${data.source || "N/A"}`,
          `Rating: ${data.rating || "N/A"}`,
          "",
          "Message:",
          message,
          "",
          renderSupportTriageText(triage),
        ].join("\n"),
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>New CareerVivid Feedback</h2>
            <p><strong>ID:</strong> ${escapeHtml(feedbackId)}</p>
            <p><strong>User:</strong> ${escapeHtml(data.userEmail || "N/A")}</p>
            <p><strong>Source:</strong> ${escapeHtml(data.source || "N/A")}</p>
            <p><strong>Rating:</strong> ${escapeHtml(data.rating || "N/A")}</p>
            <p style="white-space: pre-wrap;"><strong>Message:</strong><br>${escapeHtml(message)}</p>
            ${renderSupportTriageHtml(triage)}
          </div>
        `,
      },
    });

    return null;
  });
