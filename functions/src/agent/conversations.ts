/**
 * Conversation history — saved, listable, deletable.
 *
 * Stored at `agentConversations/{id}` (top level, `uid` field). NOT under
 * `users/{uid}/…`: that namespace carries a `match /{allChildren=**}` rule
 * granting the owner write access, and Firestore rules are additive, so a
 * stricter nested rule cannot take it back. A client-writable transcript could
 * be forged, and these feed straight back into the model as history.
 *
 * Delete is a real delete. A user asking to remove a conversation about a
 * layoff, a salary, or a diagnosis is not asking for it to be flagged hidden.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const REGION = "us-west1";
const COLLECTION = "agentConversations";
const MAX_TURNS_STORED = 60;
const MESSAGE_BATCH = 400;

const requireAuth = (context: functions.https.CallableContext): string => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
    return uid;
};

export interface StoredTurn {
    role: "user" | "assistant";
    text: string;
    /** Rich payloads (question cards, company cards) so a reopened thread looks the same. */
    effects?: unknown[];
    at: number;
}

/**
 * Append a turn, creating the conversation on first write.
 *
 * The title is derived from the user's opening line, because a thread called
 * "New conversation" is useless in a list of twenty.
 */
export async function appendTurns(opts: {
    uid: string;
    conversationId?: string;
    turns: StoredTurn[];
}): Promise<{ conversationId: string; title: string }> {
    const ref = opts.conversationId
        ? db.collection(COLLECTION).doc(opts.conversationId)
        : db.collection(COLLECTION).doc();

    const snap = await ref.get();
    // A caller passing someone else's id gets a fresh conversation, never theirs.
    if (snap.exists && snap.data()!.uid !== opts.uid) {
        return appendTurns({ uid: opts.uid, turns: opts.turns });
    }

    const existing: StoredTurn[] = snap.exists ? (snap.data()!.turns ?? []) : [];
    const merged = [...existing, ...opts.turns].slice(-MAX_TURNS_STORED);

    const firstUser = merged.find((t) => t.role === "user")?.text ?? "New conversation";
    const title = snap.exists && snap.data()!.title
        ? snap.data()!.title
        : firstUser.slice(0, 60) + (firstUser.length > 60 ? "…" : "");

    await ref.set(
        {
            uid: opts.uid,
            title,
            turns: merged,
            turnCount: merged.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(snap.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
        },
        { merge: true },
    );

    return { conversationId: ref.id, title };
}

export const listAgentConversations = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const limit = Math.min(50, Math.max(1, Number(data?.limit) || 30));

        const snap = await db
            .collection(COLLECTION)
            .where("uid", "==", uid)
            .orderBy("updatedAt", "desc")
            .limit(limit)
            .get();

        return {
            conversations: snap.docs.map((d) => ({
                id: d.id,
                title: d.data().title ?? "Conversation",
                turnCount: d.data().turnCount ?? 0,
                updatedAt: d.data().updatedAt?.toMillis?.() ?? 0,
            })),
        };
    });

export const getAgentConversation = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const id = String(data?.conversationId ?? "");
        if (!id) throw new functions.https.HttpsError("invalid-argument", "conversationId is required.");

        const snap = await db.collection(COLLECTION).doc(id).get();
        // Ownership is a field check: these live in a top-level collection.
        if (!snap.exists || snap.data()!.uid !== uid) {
            throw new functions.https.HttpsError("not-found", "Conversation not found.");
        }

        return {
            id: snap.id,
            title: snap.data()!.title ?? "Conversation",
            turns: (snap.data()!.turns ?? []) as StoredTurn[],
        };
    });

export const deleteAgentConversation = functions
    .region(REGION)
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(async (data, context) => {
        const uid = requireAuth(context);
        const all = data?.all === true;

        if (all) {
            // Batched: a user with hundreds of threads should not get a partial
            // wipe and a timeout when they asked to clear everything.
            let deleted = 0;
            for (;;) {
                const snap = await db
                    .collection(COLLECTION)
                    .where("uid", "==", uid)
                    .limit(MESSAGE_BATCH)
                    .get();
                if (snap.empty) break;
                const batch = db.batch();
                snap.docs.forEach((d) => batch.delete(d.ref));
                await batch.commit();
                deleted += snap.size;
                if (snap.size < MESSAGE_BATCH) break;
            }
            return { deleted };
        }

        const id = String(data?.conversationId ?? "");
        if (!id) throw new functions.https.HttpsError("invalid-argument", "conversationId is required.");

        const ref = db.collection(COLLECTION).doc(id);
        const snap = await ref.get();
        if (!snap.exists || snap.data()!.uid !== uid) {
            throw new functions.https.HttpsError("not-found", "Conversation not found.");
        }

        await ref.delete();
        return { deleted: 1 };
    });
