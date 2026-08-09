/**
 * Continuous metering for Live voice sessions.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The problem with billing at the end
 *
 * Live cost depends on how long the call lasts, so it cannot be reserved up
 * front the way every other action is. The obvious design — settle when the
 * session closes — makes revenue contingent on the browser politely calling
 * home. It will not, routinely:
 *
 *   - the tab is closed mid-call
 *   - the laptop sleeps, or the network drops before the callable lands
 *   - a user works out that closing the tab is free
 *
 * The Live socket is browser↔Vertex, so the model spend has already hit our
 * bill in every one of those cases.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * So: bill as it happens
 *
 * The client heartbeats every 30s. Each heartbeat charges the slice since the
 * last one and advances `lastBilledAt`. Nothing is owed at the end except the
 * final partial slice.
 *
 * What that buys:
 *   - closing the tab costs the user everything they actually used; the most
 *     that can ever be lost is one heartbeat interval
 *   - a crash at 2 minutes bills 2 minutes, not the session cap — the old
 *     sweeper charged the ceiling, which overcharged honest disconnects
 *   - suppressing heartbeats to dodge billing also stops the session, because
 *     the same call is what keeps it alive
 *   - the cap and the credit balance are enforced server-side on every tick,
 *     not just by the client's own timer
 */

import * as admin from "firebase-admin";
import { reserve, settle, monthlyLimitFor } from "../credits/ledger";
import { voiceCreditsForSeconds } from "../generated/credits";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * The only model a voice session may use.
 *
 * `gemini-3.6-flash` — which the text agent escalates to for hard questions —
 * has NO Live API. Routing a call to it does not degrade gracefully; the socket
 * simply fails. The two surfaces share tools, prompts and billing, so a model
 * upgrade aimed at text reads like it should apply here too. It must not.
 *
 * Exported as the single source for both the billing rate lookup and the
 * client's connect call, so the two cannot drift apart.
 */
export const VOICE_MODEL = "gemini-live-2.5-flash-native-audio";

/** How often the client is expected to check in. */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Missed heartbeats before the sweeper treats a session as gone.
 *
 * Two intervals plus slack: one missed beat is a hiccup, sustained silence is
 * a closed tab.
 */
export const HEARTBEAT_GRACE_MS = 90_000;

export type TickReason = "heartbeat" | "end" | "sweep";

export interface TickResult {
    /** Credits charged by this tick alone. */
    charged: number;
    /** Running total for the session. */
    billedTotal: number;
    /** Seconds billed across the session so far. */
    billedSeconds: number;
    /** The session must stop: cap reached, or the user is out of credits. */
    shouldStop: boolean;
    stopReason?: "cap_reached" | "no_credits";
}

/**
 * Charge the slice of wall-clock since the last tick.
 *
 * `upToMs` is when the session is considered to have stopped producing audio —
 * now for a live heartbeat, the last heartbeat for a swept session. It is never
 * client-supplied: a value the caller could choose is a value they would choose
 * to be zero.
 */
export async function billVoiceSlice(opts: {
    sessionRef: FirebaseFirestore.DocumentReference;
    uid: string;
    upToMs: number;
    reason: TickReason;
}): Promise<TickResult> {
    const snap = await opts.sessionRef.get();
    if (!snap.exists) {
        return { charged: 0, billedTotal: 0, billedSeconds: 0, shouldStop: true };
    }

    const s = snap.data()!;
    const startedMs: number | undefined = s.startedAt?.toMillis?.();
    // serverTimestamp() resolves asynchronously; a doc read before it lands has
    // no startedAt. Skip rather than bill from a guess.
    if (!startedMs) {
        return { charged: 0, billedTotal: s.billedCredits ?? 0, billedSeconds: s.billedSeconds ?? 0, shouldStop: false };
    }

    const capMs = (s.capMinutes ?? 15) * 60_000;
    const lastBilledMs: number = s.lastBilledAt?.toMillis?.() ?? startedMs;

    // Never bill past the cap, and never bill backwards if clocks disagree.
    const ceilingMs = startedMs + capMs;
    const effectiveUpToMs = Math.min(opts.upToMs, ceilingMs);
    const sliceSeconds = Math.max(0, (effectiveUpToMs - lastBilledMs) / 1_000);

    const atCap = effectiveUpToMs >= ceilingMs;
    const amount = voiceCreditsForSeconds(sliceSeconds);

    if (amount <= 0) {
        return {
            charged: 0,
            billedTotal: s.billedCredits ?? 0,
            billedSeconds: s.billedSeconds ?? 0,
            shouldStop: atCap,
            ...(atCap ? { stopReason: "cap_reached" as const } : {}),
        };
    }

    const res = await reserve({
        uid: opts.uid,
        surface: "web",
        action: "interview.voice",
        credits: amount,
        taskId: s.taskId,
        model: VOICE_MODEL,
    });

    if (!res.ok) {
        // Out of credits mid-call. The slice stays unbilled — we cannot charge
        // past a limit — but the session must end now so the shortfall is one
        // slice rather than unbounded.
        await opts.sessionRef.update({
            lastBilledAt: admin.firestore.Timestamp.fromMillis(effectiveUpToMs),
            unbilledSeconds: admin.firestore.FieldValue.increment(sliceSeconds),
        });
        return {
            charged: 0,
            billedTotal: s.billedCredits ?? 0,
            billedSeconds: s.billedSeconds ?? 0,
            shouldStop: true,
            stopReason: "no_credits",
        };
    }

    await settle({ uid: opts.uid, entryId: res.entryId, result: "ok" });

    const billedTotal = (s.billedCredits ?? 0) + amount;
    const billedSeconds = (s.billedSeconds ?? 0) + sliceSeconds;

    await opts.sessionRef.update({
        lastBilledAt: admin.firestore.Timestamp.fromMillis(effectiveUpToMs),
        billedCredits: billedTotal,
        billedSeconds,
        lastTickReason: opts.reason,
    });

    return {
        charged: amount,
        billedTotal,
        billedSeconds,
        shouldStop: atCap,
        ...(atCap ? { stopReason: "cap_reached" as const } : {}),
    };
}

/** Close a session, billing whatever slice remains. */
export async function closeVoiceSession(opts: {
    sessionRef: FirebaseFirestore.DocumentReference;
    uid: string;
    upToMs: number;
    reason: TickReason;
}): Promise<TickResult> {
    const tick = await billVoiceSlice(opts);
    await opts.sessionRef.update({
        status: "closed",
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        closedBy: opts.reason,
    });
    return tick;
}

/** Minutes of voice the user can still afford, for capping a new session. */
export function affordableMinutes(userData: FirebaseFirestore.DocumentData, perMinute: number): number {
    const limit = monthlyLimitFor(userData);
    const month = new Date().toISOString().slice(0, 7);
    const used = userData.aiUsage?.month === month ? (userData.aiUsage?.count ?? 0) : 0;
    return Math.floor((limit - used) / perMinute);
}

export { db as voiceBillingDb };
