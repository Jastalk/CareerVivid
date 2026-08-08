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
import { buildContext } from "./context";
import { resolveProposal } from "./proposals";
import { runAgentTurn, CreditLimitError } from "./turnRunner";
import { closeVoiceSession, affordableMinutes, HEARTBEAT_INTERVAL_MS } from "./voiceBilling";
import { reserve, settle } from "../credits/ledger";
import {
    VOICE_SESSION_CAP_MINUTES,
    VOICE_CREDITS_PER_MINUTE,
    resolvePlan,
} from "../generated/credits";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REGION = "us-west1";

const requireAuth = (context: functions.https.CallableContext): string => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in to use the Career Agent.");
    return uid;
};

// ─────────────────────────────────────────────────────────────────────────────
// careerAgentTurn
// ─────────────────────────────────────────────────────────────────────────────

export const careerAgentTurn = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 120, memory: "512MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const message = String(data?.message ?? "").trim().slice(0, 8_000);
        if (!message && !data?.attachment) {
            throw new functions.https.HttpsError("invalid-argument", "message is required.");
        }

        try {
            return await runAgentTurn({
                uid,
                message,
                route: String(data?.route ?? "/"),
                entity: data?.entity,
                history: data?.history ?? [],
                autoExecTools: data?.autoExecTools ?? [],
                attachment: data?.attachment,
            });
        } catch (e: any) {
            if (e instanceof CreditLimitError) {
                throw new functions.https.HttpsError("resource-exhausted", "credit_limit_reached", {
                    creditsRemaining: e.creditsRemaining,
                    monthlyLimit: e.monthlyLimit,
                });
            }
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
