/**
 * agentDeductCredits — Firebase Callable Function
 *
 * Authenticates CLI requests via CareerVivid API key (cv_live_...),
 * then deducts credits based on the model used.
 *
 * Called by: `cv agent` after each successful Gemini API call.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { getPlanMonthlyLimit as resolvePlanMonthlyLimit, getPlanMonthlyLimitForUser } from "./utils/planLimits";

const novuSecretKey = defineSecret("NOVU_SECRET_KEY");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// Credit costs per model (CareerVivid-managed usage)
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_CREDIT_COST: Record<string, number> = {
  "gemini-3.1-flash-lite": 1,
  "gemma-4": 1,
  "gemini-3.5-flash-lite": 1,
  "gemini-3.5-flash": 3,
  "gemini-3.6-flash": 5,
  "gemini-2.5-flash-lite": 1,
  "gemini-2.5-flash": 3,
  "gemini-2.5-pro": 5,
  default: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// Monthly credit limits by plan
// ─────────────────────────────────────────────────────────────────────────────
function getMonthlyLimit(plan?: string): number {
  return resolvePlanMonthlyLimit(plan);
}

// ─────────────────────────────────────────────────────────────────────────────
// agentDeductCredits — HTTPS Callable
// ─────────────────────────────────────────────────────────────────────────────
export const agentDeductCredits = functions
  .region("us-west1")
  .runWith({ secrets: [novuSecretKey], timeoutSeconds: 30, memory: "512MB" })
  .https.onCall(
    async (
      data: { model: string; calls?: number; apiKey: string },
      _context
    ) => {
      const { model, calls = 1, apiKey } = data;

      // ── 1. Validate inputs ──────────────────────────────────────────────
      if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("cv_live_")) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "A valid CareerVivid API key (cv_live_...) is required."
        );
      }
      if (!model || typeof model !== "string") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "model is required."
        );
      }
      if (calls < 1 || calls > 100) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "calls must be between 1 and 100."
        );
      }

      // ── 2. Resolve user from API key ─────────────────────────────────────
      // API keys are stored at: users/{uid}/private/{docId} { key, name, createdAt }
      // The fieldOverride index in firestore.indexes.json covers: collectionGroup=private, field=key, COLLECTION_GROUP
      const snapshot = await db
        .collectionGroup("private")
        .where("key", "==", apiKey)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Invalid or revoked API key."
        );
      }

      // Extract uid from path: users/{uid}/private/{docId}
      const keyDoc = snapshot.docs[0];
      const pathSegments = keyDoc.ref.path.split("/");
      const uid = pathSegments[1]; // users/[uid]/private/[docId]

      // ── 3. Compute cost ──────────────────────────────────────────────────
      const costPerCall = MODEL_CREDIT_COST[model] ?? MODEL_CREDIT_COST["default"];
      const totalCost = costPerCall * calls;

      // ── 4. Deduct in a transaction ───────────────────────────────────────
      const userRef = db.collection("users").doc(uid);

      const result = await db.runTransaction(async (tx) => {
        const userDoc = await tx.get(userRef);
        if (!userDoc.exists) {
          throw new functions.https.HttpsError("not-found", "User not found.");
        }

        const userData = userDoc.data()!;
        const isAdmin =
          userData.role === "admin" || (userData.roles || []).includes("admin");

        const aiUsage = userData.aiUsage || {};
        // Current month tracking
        const currentMonth = new Date().toISOString().slice(0, 7); // "2026-04"
        const usageMonth: string = aiUsage.month || "";

        // Reset count if new month
        let count: number =
          usageMonth === currentMonth ? aiUsage.count ?? 0 : 0;
        const limit = getPlanMonthlyLimitForUser(userData);

        // Track if we crossed thresholds
        let triggerWarning = false;
        let triggerExceeded = false;

        // Check credit reserve buffer (stop at 2 remaining to avoid partial turns)
        if (!isAdmin && count + totalCost > limit - 2) {
          triggerExceeded = true;
          // We don't abort here because we need to return the exceeded state to the user,
          // but we won't charge them for the failed run.
        } else if (!isAdmin && count < (limit * 0.8) && (count + totalCost) >= (limit * 0.8)) {
          triggerWarning = true;
        }

        if (triggerExceeded) {
          // Fire and forget Novu workflow
          import('@novu/api').then(({ Novu }) => {
            const novu = new Novu({ secretKey: novuSecretKey.value() });
            novu.trigger({
              workflowId: 'usage-limit-exceeded',
              to: uid,
              payload: { upgradePlanUrl: 'https://careervivid.app/subscription' }
            }).catch(console.error);
          });

          const creditsRemaining = Math.max(0, limit - count);
          return {
            ok: false as const,
            reason: "limit_reached" as const,
            creditsRemaining,
            creditsUsed: 0,
          };
        }

        if (triggerWarning) {
          // Fire and forget Novu workflow
          import('@novu/api').then(({ Novu }) => {
            const novu = new Novu({ secretKey: novuSecretKey.value() });
            novu.trigger({
              workflowId: 'usage-limit-warning',
              to: uid,
              payload: { 
                creditsRemaining: limit - (count + totalCost),
                creditsTotal: limit,
                upgradePlanUrl: 'https://careervivid.app/subscription' 
              }
            }).catch(console.error);
          });
        }

        const newCount = count + totalCost;
        const updates: Record<string, any> = {
          "aiUsage.count": usageMonth === currentMonth
            ? admin.firestore.FieldValue.increment(totalCost)
            : newCount,
          "aiUsage.month": currentMonth,
        };

        // Also track CLI usage separately for analytics
        updates["aiUsage.cliCount"] = admin.firestore.FieldValue.increment(totalCost);

        tx.update(userRef, updates);

        return {
          ok: true as const,
          creditsUsed: totalCost,
          creditsRemaining: Math.max(0, limit - newCount),
          monthlyLimit: limit,
        };
      });

      return result;
    }
  );
