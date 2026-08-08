import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";

import { secureCorsHandler } from "./utils/corsUtils.js";
import { resolveAuth } from "./utils/authUtils.js";
import { createResumeFromBaseContent } from "./resumeGeneration";

if (!admin.apps.length) {
    admin.initializeApp();
}

const corsHandler = secureCorsHandler;
const MAX_TRANSCRIPT_CHARS = 24_000;

interface ResumeCoachCreateRequestBody {
    title?: string;
    transcript?: string;
}

interface ResumeCoachLiveTokenRequestBody {
    role?: string;
    source?: string;
}

function normalizeTranscript(value?: string): string {
    const transcript = (value || "").trim();
    if (!transcript) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The resume coach needs at least one answer before creating a resume."
        );
    }
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The resume coach transcript is too long. Please keep the session under 3 minutes."
        );
    }
    return transcript;
}

export const resumeCoachCreate = functions.region("us-west1").runWith({
    timeoutSeconds: 120,
    memory: "1GB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method Not Allowed" });
            return;
        }

        const user = await resolveAuth(req);
        if (!user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }

        try {
            const body = req.body as ResumeCoachCreateRequestBody;
            const title = body.title?.trim() || "Resume Coach Draft";
            const transcript = normalizeTranscript(body.transcript);
            const startedAt = Date.now();

            const result = await createResumeFromBaseContent({
                uid: user.uid,
                title,
                baseContent: `Resume coach conversation:\n\n${transcript}`,
                creationSource: "coach",
                model: "gemini-2.5-flash",
            });

            res.json({
                success: true,
                resumeId: result.resumeId,
                timings: {
                    totalMs: Date.now() - startedAt,
                },
                message: "Resume coach draft generated successfully.",
            });
        } catch (err: any) {
            console.error("[resumeCoachCreate] Error:", err.message);
            if (err instanceof functions.https.HttpsError) {
                const status = err.code === "invalid-argument" ? 400 : 500;
                res.status(status).json({ error: err.message });
                return;
            }
            res.status(500).json({ error: `Resume coach generation failed: ${err.message}` });
        }
    });
});

export const resumeCoachLiveToken = functions.region("us-west1").runWith({
    timeoutSeconds: 15,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method Not Allowed" });
            return;
        }

        const user = await resolveAuth(req);
        if (!user) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }

        try {
            const body = req.body as ResumeCoachLiveTokenRequestBody;
            const role = body.role?.trim() || "resume builder";
            const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "jastalk-firebase";
            const location = process.env.GOOGLE_CLOUD_LOCATION || "us-west1";
            const model = `projects/${project}/locations/${location}/publishers/google/models/gemini-live-2.5-flash-native-audio`;

            const sessionRef = admin.firestore().collection("resumeCoachSessions").doc();
            await sessionRef.set({
                uid: user.uid,
                role,
                source: body.source || "ios",
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                model,
                status: "started",
            });

            const auth = new GoogleAuth({
                scopes: "https://www.googleapis.com/auth/cloud-platform",
            });
            const client = await auth.getClient();
            const accessTokenResponse = await client.getAccessToken();
            const accessToken = accessTokenResponse.token;

            if (!accessToken) {
                throw new Error("Could not create a Vertex AI access token.");
            }

            console.log(`[resumeCoachLiveToken] uid=${user.uid} sessionId=${sessionRef.id} role="${role}"`);

            res.status(200).json({
                accessToken,
                project,
                location,
                model,
                sessionId: sessionRef.id,
            });
        } catch (err: any) {
            console.error("[resumeCoachLiveToken] Error:", err.message);
            res.status(500).json({ error: err.message || "Could not start resume coach live session." });
        }
    });
});
