/**
 * llmGateway — OpenAI-compatible Gemini routing gateway
 *
 * Routes OpenAI-format chat completion requests to Google Gemini using
 * the server-side Gemini API key (same key used by agentProxy).
 *
 * Users can authenticate with:
 *   (A) Their CareerVivid API key (cv_live_...) — credits deducted from their account
 *   (B) Their own Gemini API key (GEMINI_API_KEY) — bypasses CV credits entirely
 *
 * Auth headers accepted:
 *   x-api-key: cv_live_...          (CLI style)
 *   Authorization: Bearer cv_live_... (OpenAI SDK style)
 *   x-gemini-key: AIza...           (BYO Gemini key)
 *
 * Endpoint: POST /v1/chat/completions  (or POST /chat/completions)
 * Streaming: supported (SSE, OpenAI chunk format)
 *
 * Supported models:
 *   gemini-2.5-flash (default)
 *   gemini-3.1-flash-preview
 *   gemini-3.1-flash-lite-preview
 *   gemini-3.1-pro-preview
 *   gemini-2.5-pro-preview
 */

import { onRequest } from "firebase-functions/v2/https";
import { GoogleGenAI } from "@google/genai";
import { getAIClient, getVertexLocationForModel } from "./utils/ai";
import * as admin from "firebase-admin";
import { secureCorsHandler } from "./utils/corsUtils.js";
import { randomUUID } from "crypto";
import { resolveAndDeduct } from "./utils/creditUtils.js";
import { getPlanMonthlyLimitForUser } from "./utils/planLimits";

if (!admin.apps.length) admin.initializeApp();

const corsHandler = secureCorsHandler;

// ── Supported Gemini & Gemma models ───────────────────────────────────────────
const SUPPORTED_MODELS = new Set([
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemma-4",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-pro-preview",
  "gemini-3.1-pro-preview",
]);

const MODEL_ALIASES: Record<string, string> = {
  "gemini-2.5-flash-lite": "gemini-3.1-flash-lite",
  "gemini-2.5-flash": "gemini-3.5-flash",
  "gemini-2.5-pro": "gemini-3.6-flash",
  "gemini-2.5-pro-preview": "gemini-3.6-flash",
  "gemini-3.1-pro-preview": "gemini-3.6-flash",
};

const DEFAULT_MODEL = "gemini-3.6-flash";

// ── OpenAI-compatible types ───────────────────────────────────────────────────
interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChatRequest {
  model?: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// ── Build Gemini contents from OpenAI messages ────────────────────────────────
function buildGeminiContents(messages: OpenAIMessage[]) {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");
  const contents = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  return { systemMsg, contents };
}

// ── Non-streaming Gemini call ─────────────────────────────────────────────────
async function callGemini(
  messages: OpenAIMessage[],
  model: string,
  temperature: number | undefined,
  maxTokens: number | undefined,
  apiKey: string | undefined
): Promise<string> {
  const clientKey = apiKey || ((model.includes("gemini-3.5") || model.includes("gemini-3.1")) ? process.env.GEMINI_API_KEY : undefined);
  const ai = clientKey ? new GoogleGenAI({ apiKey: clientKey }) : getAIClient(undefined, getVertexLocationForModel(model));
  const { systemMsg, contents } = buildGeminiContents(messages);

  const config: any = {};
  if (systemMsg) config.systemInstruction = systemMsg.content;
  if (temperature != null) config.temperature = temperature;
  if (maxTokens != null) config.maxOutputTokens = maxTokens;

  const result = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  return result.text || "";
}

// ── Streaming Gemini call (SSE) ───────────────────────────────────────────────
async function callGeminiStream(
  messages: OpenAIMessage[],
  model: string,
  temperature: number | undefined,
  maxTokens: number | undefined,
  apiKey: string | undefined,
  res: any,
  id: string
): Promise<void> {
  const clientKey = apiKey || ((model.includes("gemini-3.5") || model.includes("gemini-3.1")) ? process.env.GEMINI_API_KEY : undefined);
  const ai = clientKey ? new GoogleGenAI({ apiKey: clientKey }) : getAIClient(undefined, getVertexLocationForModel(model));
  const { systemMsg, contents } = buildGeminiContents(messages);

  const config: any = {};
  if (systemMsg) config.systemInstruction = systemMsg.content;
  if (temperature != null) config.temperature = temperature;
  if (maxTokens != null) config.maxOutputTokens = maxTokens;

  const created = Math.floor(Date.now() / 1000);

  // SSE headers — must be set before any write
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.status(200);

  // Initial role delta (matches OpenAI SSE protocol)
  const roleChunk = {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
  };
  res.write(`data: ${JSON.stringify(roleChunk)}\n\n`);

  const result = await ai.models.generateContentStream({
    model,
    contents,
    config,
  });

  for await (const chunk of result) {
    const text = chunk.text;
    if (!text) continue;
    const data = {
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Final stop chunk
  const stopChunk = {
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  };
  res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
}

// ── Read-only credit balance (no deduction) ──────────────────────────────────
async function readCredits(apiKey: string): Promise<{ creditsUsed: number; creditsRemaining: number; monthlyLimit: number } | null> {
  const firestore = admin.firestore();
  const snapshot = await firestore
    .collectionGroup("private")
    .where("key", "==", apiKey)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const uid = snapshot.docs[0].ref.path.split("/")[1];
  const userDoc = await firestore.collection("users").doc(uid).get();
  if (!userDoc.exists) return null;
  const data = userDoc.data()!;
  const aiUsage = data.aiUsage || {};
  const currentMonth = new Date().toISOString().slice(0, 7);
  const count = aiUsage.month === currentMonth ? (aiUsage.count ?? 0) : 0;
  const limit = getPlanMonthlyLimitForUser(data);
  return { creditsUsed: count, creditsRemaining: Math.max(0, limit - count), monthlyLimit: limit };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const llmGateway = onRequest(
  {
    region: "us-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: ["GEMINI_API_KEY"],
  },
  async (req, res) => {
    corsHandler(req as any, res as any, async () => {
      if (req.method === "OPTIONS") { res.status(204).send(""); return; }

      // ── GET /credits — read-only balance check ──────────────────────────────
      if (req.method === "GET" && (req.path || "/").includes("/credits")) {
        const authHeader = req.headers["authorization"];
        const xApiKey = req.headers["x-api-key"] as string | undefined;
        const cvKey = authHeader?.startsWith("Bearer cv_live_")
          ? authHeader.slice(7)
          : xApiKey?.startsWith("cv_live_") ? xApiKey : undefined;
        if (!cvKey) { res.status(401).json({ error: "CV API key required" }); return; }
        const balance = await readCredits(cvKey);
        if (!balance) { res.status(401).json({ error: "Invalid API key" }); return; }
        res.status(200).json(balance);
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed. Use POST." });
        return;
      }

      const urlPath = req.path || "/";
      if (!urlPath.includes("/chat/completions")) {
        res.status(404).json({
          error: "Not Found",
          hint: "Use POST /v1/chat/completions or POST /chat/completions",
          supported_models: Array.from(SUPPORTED_MODELS),
          docs: "https://careervivid.app/#/developer",
        });
        return;
      }

      const body = req.body as Partial<OpenAIChatRequest>;

      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        res.status(400).json({ error: "messages array is required." });
        return;
      }

      const rawModel = body.model ?? DEFAULT_MODEL;
      const resolvedModel = MODEL_ALIASES[rawModel] || rawModel;
      const model = SUPPORTED_MODELS.has(resolvedModel) ? resolvedModel : DEFAULT_MODEL;
      const isStreaming = body.stream === true;

      // ── Auth: determine which key mode ──────────────────────────────────────
      // Mode A: user provides their own Gemini key (x-gemini-key header)
      const byoGeminiKey = req.headers["x-gemini-key"] as string | undefined;

      // Mode B: user authenticates with CV API key → use server-side Gemini key
      let cvApiKey: string | undefined;
      const authHeader = req.headers["authorization"];
      if (authHeader?.startsWith("Bearer cv_live_")) {
        cvApiKey = authHeader.slice(7);
      } else if ((req.headers["x-api-key"] as string)?.startsWith("cv_live_")) {
        cvApiKey = req.headers["x-api-key"] as string;
      }

      if (!byoGeminiKey && !cvApiKey) {
        res.status(401).json({
          error: "Unauthorized",
          options: {
            "Option A (BYO Gemini key)": "x-gemini-key: AIza...",
            "Option B (CareerVivid key)": "Authorization: Bearer cv_live_...",
          },
          get_cv_key: "https://careervivid.app/#/developer",
        });
        return;
      }

      // ── Credit deduction for CV key users ───────────────────────────────────
      let geminiApiKey: string | undefined;
      let creditsUsed: number | undefined;
      let creditsRemaining: number | undefined;

      if (byoGeminiKey) {
        // User brings their own key — no credits needed
        geminiApiKey = byoGeminiKey;
      } else {
        // CV key — deduct credits and use server-side Gemini key
        const credit = await resolveAndDeduct(cvApiKey!, model);

        if (!credit.ok) {
          if (credit.reason === "limit_reached") {
            res.status(402).json({
              error: "credit_limit_reached",
              message: "Monthly credit limit reached.",
              creditsRemaining: credit.creditsRemaining ?? 0,
              monthlyLimit: credit.monthlyLimit ?? 100,
              upgrade: "https://careervivid.app/#/pricing",
            });
          } else {
            res.status(401).json({ error: credit.reason ?? "Authentication failed." });
          }
          return;
        }

        geminiApiKey = undefined;
        creditsUsed = credit.creditsUsed;
        creditsRemaining = credit.creditsRemaining;
      }

      const id = `cvgw-${randomUUID()}`;

      // ── Streaming path ───────────────────────────────────────────────────────
      if (isStreaming) {
        try {
          await callGeminiStream(
            body.messages!,
            model,
            body.temperature,
            body.max_tokens,
            geminiApiKey,
            res,
            id
          );
        } catch (err: any) {
          console.error("[llmGateway] Gemini streaming error:", err);
          if (!res.headersSent) {
            res.status(502).json({ error: "gemini_error", message: err.message ?? "Gemini call failed." });
          } else {
            const errChunk = { error: { message: err.message ?? "Gemini call failed.", type: "server_error" } };
            res.write(`data: ${JSON.stringify(errChunk)}\n\n`);
            res.end();
          }
        }
        return;
      }

      // ── Non-streaming path ───────────────────────────────────────────────────
      let content: string;
      try {
        content = await callGemini(
          body.messages!,
          model,
          body.temperature,
          body.max_tokens,
          geminiApiKey
        );
      } catch (err: any) {
        console.error("[llmGateway] Gemini error:", err);
        res.status(502).json({
          error: "gemini_error",
          message: err.message ?? "Gemini call failed.",
        });
        return;
      }

      // ── OpenAI-compatible response ──────────────────────────────────────────
      const response: Record<string, unknown> = {
        id,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };

      // Only include credit fields when using a CV key
      if (creditsUsed != null) {
        response["x-cv-credits-used"] = creditsUsed;
        response["x-cv-credits-remaining"] = creditsRemaining;
      }

      res.status(200).json(response);
    });
  }
);
