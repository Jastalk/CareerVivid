/**
 * agentProxy — Firebase HTTP Function
 *
 * Proxies CareerVivid CLI agent requests to Gemini using the server-side API key.
 * Authentication is done via the user's `cv_live_` API key (same as agentDeductCredits).
 *
 * Request body (POST JSON):
 *   - apiKey:          string  — the user's cv_live_... CareerVivid API key
 *   - model:           string  — Gemini model name (e.g. "gemini-2.5-flash")
 *   - contents:        Content[] — the full conversation history in @google/genai format
 *   - tools?:          Tool[]  — Gemini tool declarations
 *   - systemInstruction?: string — system prompt
 *   - thinkingBudget?: number — thinking token budget (0 to disable)
 *   - includeThoughts?: boolean — whether to return thought parts
 *
 * Response JSON:
 *   - candidates:      Gemini response candidates
 *   - creditsUsed:     number
 *   - creditsRemaining: number
 *   - monthlyLimit:    number
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { secureCorsHandler } from "./utils/corsUtils.js";
import { getAIClient, getVertexLocationForModel } from "./utils/ai";
import { Content } from "@google/genai";
import { getPlanMonthlyLimitForUser, getPlanMonthlyLimit as resolvePlanMonthlyLimit } from "./utils/planLimits";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const corsHandler = secureCorsHandler;

// ─────────────────────────────────────────────────────────────────────────────
// Credit costs per model (must match agentCredits.ts)
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_CREDIT_COST: Record<string, number> = {
  "gemini-2.5-flash-lite": 0.5,
  "gemini-2.5-flash": 1,
  "gemini-2.5-pro": 2,
  "gemini-2.0-pro-exp-02-05": 3,
  "gemini-3.1-flash-lite": 0.75,
  "gemini-3.5-flash": 1.5,
  default: 1,
};

function getMonthlyLimit(plan?: string): number {
  return resolvePlanMonthlyLimit(plan);
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve user from API key and deduct credits atomically
// ─────────────────────────────────────────────────────────────────────────────
async function resolveAndDeduct(
  apiKey: string,
  model: string
): Promise<{
  ok: boolean;
  uid?: string;
  reason?: string;
  creditsUsed?: number;
  creditsRemaining?: number;
  monthlyLimit?: number;
}> {
  // Resolve user from API key via collection group query on the 'private' subcollection.
  // API keys are stored at: users/{uid}/private/{docId} with a 'key' field.
  // The fieldOverride index in firestore.indexes.json covers: collectionGroup=private, field=key, COLLECTION_GROUP
  const snapshot = await db
    .collectionGroup("private")
    .where("key", "==", apiKey)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { ok: false, reason: "Invalid or revoked API key." };
  }

  const keyDoc = snapshot.docs[0];
  const pathSegments = keyDoc.ref.path.split("/");
  // Path: users/{uid}/private/{docId} → segments[0]=users, segments[1]=uid
  const uid = pathSegments[1];

  const costPerCall = MODEL_CREDIT_COST[model] ?? MODEL_CREDIT_COST["default"];
  const userRef = db.collection("users").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    if (!userDoc.exists) {
      return { ok: false, reason: "User not found." };
    }

    const userData = userDoc.data()!;
    const isAdmin =
      userData.role === "admin" || (userData.roles || []).includes("admin");

    const aiUsage = userData.aiUsage || {};
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-04"
    const usageMonth: string = aiUsage.month || "";
    let count: number = usageMonth === currentMonth ? (aiUsage.count ?? 0) : 0;
    const limit = getPlanMonthlyLimitForUser(userData);

    if (!isAdmin && count + costPerCall > limit - 2) {
      return {
        ok: false,
        reason: "limit_reached",
        creditsRemaining: Math.max(0, limit - count),
        monthlyLimit: limit,
      };
    }

    const updates: Record<string, any> = {
      "aiUsage.count":
        usageMonth === currentMonth
          ? admin.firestore.FieldValue.increment(costPerCall)
          : count + costPerCall,
      "aiUsage.month": currentMonth,
      "aiUsage.cliCount": admin.firestore.FieldValue.increment(costPerCall),
    };

    tx.update(userRef, updates);

    return {
      ok: true,
      uid,
      creditsUsed: costPerCall,
      creditsRemaining: Math.max(0, limit - count - costPerCall),
      monthlyLimit: limit,
    };
  });

  return result;
}

/**
 * Give back credits taken by resolveAndDeduct when the Gemini call itself
 * failed. Credits are reserved before the call so concurrent requests cannot
 * overspend a limit, which means a failed call has already been billed —
 * without this the caller pays for nothing, and the CLI's retry loop pays
 * again on every attempt.
 */
async function refundCredits(uid: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  try {
    await db.collection("users").doc(uid).update({
      "aiUsage.count": admin.firestore.FieldValue.increment(-amount),
      "aiUsage.cliCount": admin.firestore.FieldValue.increment(-amount),
    });
  } catch (e: any) {
    // A failed refund must not mask the original error the user is waiting on.
    console.error(`[agentProxy] refund failed uid=${uid} amount=${amount}:`, e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// agentProxy — HTTPS function
// ─────────────────────────────────────────────────────────────────────────────
export const agentProxy = functions
  .region("us-west1")
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
    secrets: ["GEMINI_API_KEY"],
  })
  .https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
      // Preflight handled automatically by secureCorsHandler

      if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      const {
        apiKey,
        model,
        contents,
        tools: toolDeclarations,
        systemInstruction,
        thinkingBudget,
        includeThoughts,
      } = req.body || {};

      // ── Input validation ────────────────────────────────────────────────
      if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("cv_live_")) {
        res.status(401).json({ error: "A valid CareerVivid API key is required." });
        return;
      }
      if (!model || typeof model !== "string") {
        res.status(400).json({ error: "model is required." });
        return;
      }
      // Only bill models we have a price for. Falling through to the `default`
      // cost meant an unpriced — typically more expensive — model was charged
      // at the cheapest rate.
      if (!Object.prototype.hasOwnProperty.call(MODEL_CREDIT_COST, model) || model === "default") {
        res.status(400).json({
          error: `Unsupported model: ${model}`,
          supported: Object.keys(MODEL_CREDIT_COST).filter((m) => m !== "default"),
        });
        return;
      }
      if (!Array.isArray(contents) || contents.length === 0) {
        res.status(400).json({ error: "contents (conversation history) is required." });
        return;
      }

      // ── Check + deduct credits ──────────────────────────────────────────
      const creditResult = await resolveAndDeduct(apiKey, model);
      if (!creditResult.ok) {
        if (creditResult.reason === "limit_reached") {
          res.status(402).json({
            error: "credit_limit_reached",
            creditsRemaining: creditResult.creditsRemaining ?? 0,
            monthlyLimit: creditResult.monthlyLimit ?? 100,
          });
        } else {
          res.status(401).json({ error: creditResult.reason || "Authentication failed." });
        }
        return;
      }

      // ── Call Gemini ─────────────────────────────────────────────────────
      try {
        const clientKey = (model.includes("gemini-3.5") || model.includes("gemini-3.1"))
          ? process.env.GEMINI_API_KEY
          : undefined;
        const ai = getAIClient(clientKey, getVertexLocationForModel(model));

        const config: Record<string, any> = {};
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (toolDeclarations) config.tools = toolDeclarations;
        
        if (thinkingBudget && thinkingBudget > 0) {
          config.thinkingConfig = {
            thinkingBudget,
            includeThoughts: includeThoughts ?? false,
          };
        }

        const result = await ai.models.generateContent({
          model,
          contents: contents as Content[],
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        // The unified SDK response shape
        res.json({
          candidates: result.candidates,
          promptFeedback: result.promptFeedback,
          creditsUsed: creditResult.creditsUsed,
          creditsRemaining: creditResult.creditsRemaining,
          monthlyLimit: creditResult.monthlyLimit,
        });
      } catch (err: any) {
        console.error("[agentProxy] Gemini error:", err);

        // The credits were reserved before the call; the call did not happen.
        await refundCredits(creditResult.uid!, creditResult.creditsUsed ?? 0);

        // Pass the upstream status through so the client can tell a transient
        // 429/503 from a permanent failure instead of guessing from the text.
        const upstream = Number(err?.status ?? err?.code);
        const status = upstream === 429 || upstream === 503 ? upstream : 502;
        res.status(status).json({
          error: err.message || "Gemini call failed.",
          refunded: creditResult.creditsUsed ?? 0,
          retryable: status !== 502,
        });
      }
    });
  });
