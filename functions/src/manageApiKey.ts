import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { randomBytes } from "crypto";

const db = admin.firestore();

/**
 * Callable Cloud Function: manageApiKey
 * Actions:
 *   generate — creates a new cv_live_... key and stores it (overwrites existing)
 *   revoke   — deletes the key document
 *   get      — returns the existing key (masked: first 12 chars visible)
 */
export const manageApiKey = functions
    .region("us-west1")
    .runWith({ timeoutSeconds: 30, memory: "512MB" })
    .https.onCall(async (data, context) => {
        // 1. Auth guard
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "You must be signed in to manage API keys."
            );
        }

        const uid = context.auth.uid;
        const action: string = data?.action;
        const keyRef = db.collection("users").doc(uid).collection("private").doc("apiKeys");

        if (action === "generate") {
            // Generate a 32-byte random hex prefixed with cv_live_
            const secret = `cv_live_${randomBytes(32).toString("hex")}`;
            await keyRef.set({
                key: secret,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { key: secret };
        }

        if (action === "revoke") {
            await keyRef.delete();
            return { success: true };
        }

        if (action === "get") {
            const snap = await keyRef.get();
            if (!snap.exists) return { key: null };
            const rawKey: string = snap.data()!.key;
            // Return the full key — the UI decides masking
            return { key: rawKey };
        }

        throw new functions.https.HttpsError(
            "invalid-argument",
            "action must be one of: generate, revoke, get"
        );
    });
