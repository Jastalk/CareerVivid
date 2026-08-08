/**
 * Streaming agent turn (Server-Sent Events).
 *
 * Callables buffer: the user waits for the whole turn — often several tool
 * calls — before a single character appears. Over a multi-step request that is
 * many silent seconds, and silence reads as broken.
 *
 * This is an onRequest function rather than a callable because callables have
 * no streaming transport. That costs us the automatic auth context, so the ID
 * token is verified explicitly below — the one thing that must not be skipped
 * when stepping outside the callable contract.
 *
 * The loop itself is `runAgentTurn`, shared with the callable. Only the
 * transport differs.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { secureCorsHandler } from "./../utils/corsUtils.js";
import { runAgentTurn, CreditLimitError } from "./turnRunner";
import { appendTurns, type StoredTurn } from "./conversations";

if (!admin.apps.length) admin.initializeApp();

const REGION = "us-west1";

export const careerAgentStream = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 300, memory: "512MB" })
    .https.onRequest(async (req, res) => {
        secureCorsHandler(req, res, async () => {
            if (req.method !== "POST") {
                res.status(405).json({ error: "Method Not Allowed" });
                return;
            }

            // Callables verify the caller for you; onRequest does not.
            const header = req.get("Authorization") ?? "";
            const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
            if (!idToken) {
                res.status(401).json({ error: "Sign in to use the Career Agent." });
                return;
            }

            let uid: string;
            try {
                uid = (await admin.auth().verifyIdToken(idToken)).uid;
            } catch {
                res.status(401).json({ error: "Invalid or expired session." });
                return;
            }

            const body = req.body ?? {};
            const message = String(body.message ?? "").trim().slice(0, 8_000);
            if (!message && !body.attachment) {
                res.status(400).json({ error: "message is required." });
                return;
            }

            res.set({
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                // Cloud Run buffers by default, which would defeat the point.
                "X-Accel-Buffering": "no",
            });
            res.flushHeaders?.();

            const send = (event: string, data: unknown) => {
                res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            };

            // A silent stream is indistinguishable from a hung one to proxies
            // and to the user, so keep the pipe warm during long tool calls.
            const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);

            try {
                const out = await runAgentTurn({
                    uid,
                    message,
                    route: String(body.route ?? "/"),
                    entity: body.entity,
                    history: body.history ?? [],
                    autoExecTools: body.autoExecTools ?? [],
                    attachment: body.attachment,
                    emit: {
                        chunk: (text) => send("chunk", { text }),
                        proposal: (p) => send("proposal", p),
                        effect: (e) => send("effect", e),
                    },
                });

                // Persist only after a successful turn, so a failed one does not
                // leave a half-written thread the model would later read back.
                let conversationId: string | undefined = body.conversationId
                    ? String(body.conversationId)
                    : undefined;
                try {
                    const turns: StoredTurn[] = [
                        { role: "user", text: message, at: Date.now() },
                        { role: "assistant", text: out.text, effects: out.effects, at: Date.now() },
                    ];
                    const saved = await appendTurns({ uid, conversationId, turns });
                    conversationId = saved.conversationId;
                    send("saved", saved);
                } catch (e: any) {
                    // History is a convenience; losing it must not fail the turn
                    // the user already received and paid for.
                    console.error("[careerAgentStream] history save failed:", e?.message);
                }

                send("done", { ...out, conversationId });
            } catch (e: any) {
                if (e instanceof CreditLimitError) {
                    send("error", {
                        code: "credit_limit_reached",
                        creditsRemaining: e.creditsRemaining,
                        monthlyLimit: e.monthlyLimit,
                    });
                } else {
                    send("error", { code: "internal", message: e?.message ?? "Agent turn failed." });
                }
            } finally {
                clearInterval(heartbeat);
                res.end();
            }
        });
    });
