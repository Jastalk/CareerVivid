/**
 * Closes Live voice sessions whose client stopped checking in.
 *
 * Most of a call is already paid for by the time this runs — `agentVoiceHeartbeat`
 * bills every 30s while the session is live (see ./voiceBilling.ts). This exists
 * for the tail: the last unbilled slice of a session whose browser vanished
 * without calling `endAgentVoiceSession`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Bill to the last heartbeat, not to the cap
 *
 * An earlier version charged abandoned sessions at their `capMinutes` ceiling.
 * That punished the honest case — a laptop that slept two minutes into a
 * 45-minute session would be billed for all 45 — while barely affecting the
 * dishonest one.
 *
 * The last heartbeat is the last moment we know audio was flowing, so it is
 * both the fair and the defensible cutoff. Worst case the user gets one free
 * heartbeat interval; they cannot get a free session.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { closeVoiceSession, HEARTBEAT_GRACE_MS } from "./voiceBilling";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REGION = "us-west1";
const SWEEP_LIMIT = 200;

export const sweepStaleVoiceSessions = onSchedule(
    {
        // Frequent because the window between the last heartbeat and the sweep
        // is time a session sits open holding a stale cap reservation.
        schedule: "every 5 minutes",
        timeZone: "America/Chicago",
        timeoutSeconds: 300,
        memory: "512MiB",
        region: REGION,
    },
    async () => {
        const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - HEARTBEAT_GRACE_MS);

        const snap = await db
            .collection("voiceSessions")
            .where("status", "==", "open")
            .where("lastHeartbeatAt", "<", cutoff)
            .limit(SWEEP_LIMIT)
            .get();

        if (snap.empty) return;

        let swept = 0;
        let credits = 0;

        for (const doc of snap.docs) {
            const s = doc.data();
            const lastBeatMs: number | undefined = s.lastHeartbeatAt?.toMillis?.();
            if (!lastBeatMs || !s.uid) continue;

            try {
                const tick = await closeVoiceSession({
                    sessionRef: doc.ref,
                    uid: s.uid,
                    upToMs: lastBeatMs,
                    reason: "sweep",
                });
                credits += tick.charged;
                swept++;
            } catch (e: any) {
                // One bad session must not stall the rest of the sweep.
                console.error(`[voiceSweeper] ${doc.id}: ${e?.message}`);
            }
        }

        if (swept) {
            console.log(
                `[voiceSweeper] closed ${swept} abandoned session(s), billed ${credits} tail credit(s)`,
            );
        }
    },
);
