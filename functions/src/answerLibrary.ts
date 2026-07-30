import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Normalizes a question label to create a safe, consistent key for document storage and lookup.
 * Lowercases, trims, removes all non-alphanumeric characters, and truncates to a safe length.
 */
export function getLabelHash(label: string): string {
    const normalized = label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "");
    return normalized.slice(0, 150) || "default_hash";
}

export const saveAnswerLibrary = functions
    .region("us-west1")
    .runWith({
        timeoutSeconds: 60,
        memory: "512MB",
    })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        const userId = context.auth.uid;
        const {
            answers,
            companyName = "Unknown",
            jobTitle = "Unknown",
        }: {
            answers: { label: string; answer: string; confidence?: string }[];
            companyName?: string;
            jobTitle?: string;
        } = data;

        if (!answers || !Array.isArray(answers)) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "answers array is required"
            );
        }

        const libraryRef = db.collection("users").doc(userId).collection("answerLibrary");
        const batch = db.batch();
        let savedCount = 0;

        for (const ans of answers) {
            if (!ans.label || !ans.answer) continue;

            const labelKey = getLabelHash(ans.label);
            const docRef = libraryRef.doc(labelKey);

            batch.set(
                docRef,
                {
                    label: ans.label,
                    normalizedLabel: labelKey,
                    answer: ans.answer,
                    confidence: ans.confidence || "high",
                    companyName,
                    jobTitle,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    usageCount: admin.firestore.FieldValue.increment(1),
                },
                { merge: true }
            );
            savedCount++;
        }

        if (savedCount > 0) {
            await batch.commit();
        }

        return { success: true, savedCount };
    });

export const getAnswerLibrary = functions
    .region("us-west1")
    .runWith({
        timeoutSeconds: 60,
        memory: "512MB",
    })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        const userId = context.auth.uid;
        const libraryRef = db.collection("users").doc(userId).collection("answerLibrary");

        const snapshot = await libraryRef.orderBy("updatedAt", "desc").get();
        const answers = snapshot.docs.map((doc) => {
            const docData = doc.data();
            return {
                label: docData.label || "",
                normalizedLabel: docData.normalizedLabel || doc.id,
                answer: docData.answer || "",
                confidence: docData.confidence || "high",
                companyName: docData.companyName || "",
                jobTitle: docData.jobTitle || "",
                updatedAt: docData.updatedAt ? docData.updatedAt.toDate().toISOString() : null,
                usageCount: docData.usageCount || 0,
            };
        });

        return { success: true, answers };
    });
