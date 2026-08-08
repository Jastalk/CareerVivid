import * as functions from "firebase-functions/v1";
import { onRequest as onRequestV2 } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";

import { secureCorsHandler } from "./utils/corsUtils.js";
import { resolveAuth } from "./utils/authUtils.js";
import { getAIClient } from "./utils/ai";
import { MOBILE_INTERVIEW_GUIDE_QUESTIONS } from "./mobileInterviewGuideQuestions.generated";

if (!admin.apps.length) {
    admin.initializeApp();
}

const corsHandler = secureCorsHandler;
const MAX_TRANSCRIPT_ENTRIES = 80;
const MAX_TRANSCRIPT_CHARS = 28_000;
// A 90 second, 16 kHz mono PCM recording is about 2.9 MB before Base64
// encoding. Keep the request comfortably below the HTTP payload limit while
// allowing a little room for the WAV header and future timing metadata.
const MAX_MOBILE_AUDIO_BYTES = 4 * 1024 * 1024;
// CompanyQuestPage starts every Web stage with getStageQuestionPool(...).slice(0, 5).
// Keep this server-side cap as a guard for older Firestore documents that may
// still contain the complete tiered pool instead of the Web session sequence.
const WEB_QUEST_STAGE_QUESTION_LIMIT = 5;

type InterviewCategory = "Behavioral" | "System Design" | "Technical" | "Leadership";
type TranscriptSpeaker = "user" | "ai";

interface MobileInterviewLiveTokenRequestBody {
    jobTitle?: string;
    company?: string;
    category?: InterviewCategory | string;
    questions?: string[];
    source?: string;
}

type MobileInterviewQuestionStage = "screening" | "coding" | "system_design" | "behavioral" | "values" | "final";

interface MobileInterviewQuestionsRequestBody {
    guideSlug?: string;
    stage?: MobileInterviewQuestionStage | string;
}

interface MobileTranscriptEntry {
    speaker?: TranscriptSpeaker | "candidate" | "interviewer" | "model";
    text?: string;
    isFinal?: boolean;
    timestamp?: number;
}

interface MobileInterviewAnalyzeRequestBody extends MobileInterviewLiveTokenRequestBody {
    sessionId?: string;
    prompt?: string;
    transcript?: MobileTranscriptEntry[];
    durationInSeconds?: number;
}

interface MobileInterviewTranscribeRequestBody {
    audioBase64?: string;
    mimeType?: string;
    durationInSeconds?: number;
    question?: string;
    company?: string;
    stage?: string;
}

interface MobileInterviewTranscriptionPayload {
    transcript: string;
    suggestions: string[];
}

interface InterviewAnalysisPayload {
    overallScore: number;
    communicationScore: number;
    confidenceScore: number;
    relevanceScore: number;
    // New v2 scoring dimensions
    problemSolvingScore: number;
    experienceScore: number;
    roleAlignmentScore: number;
    leadershipScore: number | null;
    strengths: string;
    areasForImprovement: string;
    skills: string[];
}

interface NormalizedTranscriptEntry {
    speaker: TranscriptSpeaker;
    text: string;
    isFinal: boolean;
    timestamp: number;
}

function normalizeCategory(value?: string): InterviewCategory {
    const clean = (value || "").trim().toLowerCase();
    if (clean.includes("system")) return "System Design";
    if (clean.includes("technical") || clean.includes("code")) return "Technical";
    if (clean.includes("leader")) return "Leadership";
    return "Behavioral";
}

function normalizeQuestionStage(value?: string): MobileInterviewQuestionStage {
    const stage = String(value || "").trim().toLowerCase();
    if (stage.includes("system")) return "system_design";
    if (stage.includes("cod")) return "coding";
    if (stage.includes("value")) return "values";
    if (stage.includes("final") || stage.includes("hiring")) return "final";
    if (stage.includes("recruit") || stage.includes("screen")) return "screening";
    return "behavioral";
}

type MobileQuestionBuckets = {
    screening?: unknown;
    coding?: unknown;
    systemDesign?: unknown;
    behavioral?: unknown;
    values?: unknown;
    final?: unknown;
};

function asQuestionList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((question) => String(question || "").trim())
        .filter(Boolean);
}

function questionsForStage(buckets: MobileQuestionBuckets, stage: MobileInterviewQuestionStage): string[] {
    let questions: string[];
    switch (stage) {
        case "screening": questions = asQuestionList(buckets.screening); break;
        case "coding": questions = asQuestionList(buckets.coding); break;
        case "system_design": questions = asQuestionList(buckets.systemDesign); break;
        case "behavioral": questions = asQuestionList(buckets.behavioral); break;
        case "values": questions = asQuestionList(buckets.values); break;
        case "final": questions = asQuestionList(buckets.final); break;
    }
    return questions.slice(0, WEB_QUEST_STAGE_QUESTION_LIMIT);
}

/**
 * Uses the same per-company source pools as the web interview guide. There is
 * intentionally no generic fallback here: an unavailable guide must surface
 * as unavailable instead of showing a question that does not exist on web.
 */
async function officialQuestionsForStage(guideSlug: string, stage: MobileInterviewQuestionStage): Promise<{
    company: string;
    sourceURL: string;
    questions: string[];
} | null> {
    // Firestore is updated by the same guide sync that feeds Web. The generated
    // catalog uses the exact same source files as a safe bootstrap fallback
    // until the next guide sync has populated this ordered field.
    const guideDocument = await admin.firestore().collection("interviewGuides").doc(guideSlug).get();
    if (guideDocument.exists) {
        const data = guideDocument.data() || {};
        const questions = questionsForStage(data.mobileQuestionBuckets as MobileQuestionBuckets, stage);
        if (questions.length > 0) {
            return {
                company: String(data.company || guideSlug),
                sourceURL: String(data.url || ""),
                questions,
            };
        }
    }

    const guide = MOBILE_INTERVIEW_GUIDE_QUESTIONS[guideSlug];
    if (!guide) return null;
    return {
        company: guide.company,
        sourceURL: guide.sourceURL,
        questions: questionsForStage(guide.stageQuestions, stage),
    };
}

function createPracticeId(jobTitle: string, company: string): string {
    const sanitize = (value: string) =>
        value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/[\s/]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

    const id = `${sanitize(jobTitle) || "interview"}-${sanitize(company) || "career-vivid"}`;
    return id.slice(0, 100) || `ios-interview-${Date.now()}`;
}

/**
 * Read-only, authenticated source of truth for native company question flows.
 * The payload intentionally contains only the question text and the public
 * source URL; it never exposes the private Firestore guide collection.
 */
export const mobileInterviewQuestions = functions.region("us-west1").runWith({
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

        const body = req.body as MobileInterviewQuestionsRequestBody;
        const guideSlug = String(body.guideSlug || "").trim().toLowerCase();
        const stage = normalizeQuestionStage(body.stage);
        const official = await officialQuestionsForStage(guideSlug, stage);

        if (!official) {
            res.status(404).json({ error: "This company guide is not available in the official question catalog yet." });
            return;
        }
        if (official.questions.length === 0) {
            res.status(422).json({ error: `No official ${stage.replace("_", " ")} questions are available for ${official.company} yet.` });
            return;
        }

        res.status(200).json({
            success: true,
            guideSlug,
            stage,
            company: official.company,
            sourceURL: official.sourceURL,
            questions: official.questions,
        });
    });
});

function normalizeQuestions(questions?: string[], category: InterviewCategory = "Behavioral"): string[] {
    const clean = (questions || [])
        .map((question) => String(question || "").trim())
        .filter(Boolean)
        .slice(0, 7);

    if (clean.length > 0) return clean;

    switch (category) {
        case "System Design":
            return [
                "How would you design the core system for this role's product area?",
                "What trade-offs would you make around latency, reliability, and cost?",
                "How would you monitor and debug the system in production?",
            ];
        case "Technical":
            return [
                "Walk me through a technical project that best proves you can do this role.",
                "What was the hardest engineering decision, and how did you validate it?",
                "How do you keep quality high while shipping quickly?",
            ];
        case "Leadership":
            return [
                "Tell me about a time you aligned people around a difficult technical decision.",
                "How do you handle unclear ownership across teams?",
                "How do you coach teammates while still delivering your own work?",
            ];
        case "Behavioral":
        default:
            return [
                "Tell me about a recent project that shows why you are a fit for this role.",
                "Describe a time you handled competing priorities under pressure.",
                "What did you learn from a project that did not go as planned?",
            ];
    }
}

function normalizeTranscript(entries?: MobileTranscriptEntry[]): NormalizedTranscriptEntry[] {
    const normalized = (entries || [])
        .slice(0, MAX_TRANSCRIPT_ENTRIES)
        .map((entry) => {
            const rawSpeaker = String(entry.speaker || "").toLowerCase();
            const speaker: TranscriptSpeaker =
                rawSpeaker === "ai" || rawSpeaker === "model" || rawSpeaker === "interviewer"
                    ? "ai"
                    : "user";
            return {
                speaker,
                text: String(entry.text || "").trim(),
                isFinal: entry.isFinal !== false,
                timestamp: typeof entry.timestamp === "number" ? entry.timestamp : Date.now(),
            };
        })
        .filter((entry) => entry.text.length > 0);

    const totalChars = normalized.reduce((sum, entry) => sum + entry.text.length, 0);
    if (totalChars > MAX_TRANSCRIPT_CHARS) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "The interview transcript is too long for one mobile analysis request."
        );
    }

    return normalized;
}

function formatTranscriptForPrompt(entries: NormalizedTranscriptEntry[]): string {
    return entries
        .map((entry) => `${entry.speaker === "ai" ? "Interviewer" : "Candidate"}: ${entry.text}`)
        .join("\n\n");
}

function clampScore(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(100, Math.round(numeric)));
}

function parseAnalysis(rawText: string): InterviewAnalysisPayload {
    const parsed = JSON.parse(rawText.trim()) as Partial<InterviewAnalysisPayload>;
    const problemSolving = clampScore(parsed.problemSolvingScore, 70);
    const experience = clampScore(parsed.experienceScore, 70);
    const roleAlignment = clampScore(parsed.roleAlignmentScore, 70);
    const leadership = parsed.leadershipScore != null ? clampScore(parsed.leadershipScore, 70) : null;
    return {
        overallScore: clampScore(parsed.overallScore, 70),
        // Map new dimensions back to legacy fields for older clients
        communicationScore: clampScore(parsed.communicationScore, 70),
        confidenceScore: problemSolving,
        relevanceScore: experience,
        // New v2 fields
        problemSolvingScore: problemSolving,
        experienceScore: experience,
        roleAlignmentScore: roleAlignment,
        leadershipScore: leadership,
        strengths: String(parsed.strengths || "The candidate gave relevant context and started connecting experience to the role."),
        areasForImprovement: String(parsed.areasForImprovement || "Add more specific examples, quantify your impact, and connect each answer back to the target role."),
        skills: Array.isArray(parsed.skills) ? parsed.skills.map(String).filter(Boolean) : [],
    };
}

async function createInterviewAnalysis(params: {
    transcript: NormalizedTranscriptEntry[];
    prompt: string;
    category: InterviewCategory;
    durationInSeconds?: number;
}): Promise<InterviewAnalysisPayload> {
    const formattedTranscript = formatTranscriptForPrompt(params.transcript);
    const durationLine = params.durationInSeconds
        ? `The session lasted about ${params.durationInSeconds} seconds.`
        : "The session duration was not provided.";

    // Detect whether this is a management/leadership role from the prompt context
    const isLeadershipRole =
        params.category === "Leadership" ||
        /\b(manager|director|vp|head of|lead|principal|staff|senior manager|engineering manager|product lead|team lead|people manager)\b/i.test(params.prompt);

    const leadershipBlock = isLeadershipRole
        ? `- leadershipScore: Did the candidate demonstrate people management, mentoring, team building, stakeholder alignment, or cross-functional collaboration? Score their ability to lead through others and make organizational decisions.`
        : `- leadershipScore: set to null (this is an individual contributor role).`;

    const fullPrompt = `
You are CareerVivid's senior interview coach — encouraging but honest. Analyze the candidate's mobile mock interview transcript and provide constructive, actionable feedback.

Role context:
${params.prompt}

Interview category:
${params.category}

${durationLine}

Transcript:
---
${formattedTranscript}
---

## PROCEDURE — follow in order
Step 1 — TALLY: For each interviewer question, note whether the candidate answered it (fully, partially, or missed) and what specific detail they gave.
Step 2 — SCORE each dimension using the bands below, based on your tally.
Step 3 — Write feedback bullets referencing specific moments from the transcript.
Step 4 — SKILLS: Identify 3 to 5 key professional, domain-specific, or soft skills demonstrated by the candidate (e.g. "React State Management", "Cross-functional Collaboration", "User Empathy", "API Design"). Let yourself choose freely based on the transcript answers.

## SCORING BANDS — all scores 0 to 100
A typical candidate giving reasonable answers should score 70-85. Be encouraging for practice.
- 90-100: Exceptional — specific, well-structured, with depth and impact. Reserve for truly standout responses.
- 75-89: Strong — solid answers that demonstrate competence and relevant experience.
- 60-74: Developing — reasonable answers with room for more specificity, structure, or depth.
- 40-59: Needs work — vague, off-target, or missing key substance.
- 0-39: Minimal — barely answered or empty transcript.

## DIMENSIONS TO SCORE
- communicationScore: How clearly and effectively did the candidate convey their ideas? Consider structure, clarity, and ability to explain complex concepts simply. Don't require a specific framework (like STAR) — any clear structure counts.
- problemSolvingScore: Did the candidate demonstrate analytical thinking, structured reasoning, or good judgment? Consider how they approached problems, made decisions, or evaluated trade-offs.
- experienceScore: Did the candidate share relevant experiences with concrete outcomes, learnings, or impact? Give credit for real examples even if they don't include exact metrics.
- roleAlignmentScore: How well do the candidate's answers connect to the specific role, its requirements, and the company context? Consider domain knowledge and role fit.
${leadershipBlock}
- overallScore: Your holistic assessment — a weighted blend of all dimensions. This represents your overall impression of the candidate's readiness.

## IMPORTANT RULES
- Give credit for demonstrating understanding, even without perfect delivery.
- Don't penalize informal or conversational answers if the substance is good.
- Short but substantive answers (30-90 seconds) are perfectly valid for practice.
- Focus on what the candidate DID say, not what they didn't say.
- strengths: 2-4 markdown bullets citing specific things the candidate said well.
- areasForImprovement: 2-4 markdown bullets with actionable, encouraging tips tied to specific moments.
- skills: An array of 3-5 strings representing key skills demonstrated. Be specific and descriptive.
`;

    // CareerVivid's interview-report workload stays in the same us-west1
    // Vertex region as the deployed function and its existing data flow.
    // Gemini 3.x is not enabled for this project in us-west1, while this
    // structured-output model is available there and keeps reports reliable.
    const model = "gemini-2.5-flash";
    const ai = getAIClient(undefined, "us-west1");

    const leadershipProp = isLeadershipRole
        ? { leadershipScore: { type: "NUMBER" as const, description: "Leadership and collaboration score 0-100" } }
        : {};
    const result = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    rubricFindings: { type: "STRING" as const, description: "Working notes: tally of each question and how the candidate answered. Written before any score." },
                    communicationScore: { type: "NUMBER" as const },
                    problemSolvingScore: { type: "NUMBER" as const },
                    experienceScore: { type: "NUMBER" as const },
                    roleAlignmentScore: { type: "NUMBER" as const },
                    ...leadershipProp,
                    overallScore: { type: "NUMBER" as const },
                    strengths: { type: "STRING" as const },
                    areasForImprovement: { type: "STRING" as const },
                    skills: {
                        type: "ARRAY" as const,
                        items: { type: "STRING" as const },
                        description: "Array of 3 to 5 key skills demonstrated in the interview, decided freely by the LLM based on answers."
                    }
                },
                propertyOrdering: [
                    "rubricFindings",
                    "communicationScore",
                    "problemSolvingScore",
                    "experienceScore",
                    "roleAlignmentScore",
                    ...(isLeadershipRole ? ["leadershipScore"] : []),
                    "overallScore",
                    "strengths",
                    "areasForImprovement",
                    "skills",
                ],
                required: [
                    "rubricFindings",
                    "overallScore",
                    "communicationScore",
                    "problemSolvingScore",
                    "experienceScore",
                    "roleAlignmentScore",
                    "strengths",
                    "areasForImprovement",
                    "skills",
                ],
            },
        },
    });

    return parseAnalysis(result.text || "{}");
}


async function transcribeMobileInterviewAudio(params: {
    audioBase64: string;
    mimeType: string;
    durationInSeconds?: number;
    question?: string;
    company?: string;
    stage?: string;
}): Promise<MobileInterviewTranscriptionPayload> {
    const model = "gemini-2.5-flash";
    const ai = getAIClient(undefined, "us-west1");
    const durationLine = params.durationInSeconds
        ? `The recording is about ${Math.max(1, Math.round(params.durationInSeconds))} seconds long.`
        : "The recording duration was not provided.";
    const question = String(params.question || "").trim().slice(0, 2_000);
    const company = String(params.company || "the company").trim().slice(0, 160) || "the company";
    const stage = String(params.stage || "interview").trim().slice(0, 160) || "interview";
    const promptContext = question
        ? `Company: ${company}\nInterview stage: ${stage}\nExact question: ${question}`
        : `Company: ${company}\nInterview stage: ${stage}`;
    const result = await ai.models.generateContent({
        model,
        contents: [{
            role: "user",
            parts: [
                {
                    inlineData: {
                        mimeType: params.mimeType,
                        data: params.audioBase64,
                    },
                },
                {
                    text: `Transcribe the candidate's spoken interview answer exactly as clearly as possible. ${durationLine}

${promptContext}

Return a strict JSON object with:
- transcript: the candidate's exact spoken answer with normal punctuation. Preserve their language, wording, uncertainty, and meaning. Do not rewrite or improve it.
- suggestions: 1 to 3 short, friendly, actionable coaching suggestions tied to this exact question. Each suggestion must be one sentence, begin with a direct action, stay under 18 words, and focus on something the candidate can improve immediately before sending or recording again. Do not invent experience, facts, scores, or a model answer. Avoid forcing STAR unless it genuinely fits the question.`,
                },
            ],
        }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    transcript: { type: "STRING" },
                    suggestions: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        minItems: 1,
                        maxItems: 3,
                    },
                },
                required: ["transcript", "suggestions"],
            },
        },
    });

    const raw = (result.text || "{}").trim();
    let parsed: Partial<MobileInterviewTranscriptionPayload> = {};
    try {
        parsed = JSON.parse(raw) as Partial<MobileInterviewTranscriptionPayload>;
    } catch {
        // Keep the endpoint useful if a model response ever arrives as plain
        // text despite the JSON schema. The app can still review the transcript.
        return { transcript: raw, suggestions: [] };
    }

    const transcript = String(parsed.transcript || "").trim();
    const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .map((suggestion) => String(suggestion || "").trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];
    return { transcript, suggestions };
}

export const mobileInterviewLiveToken = functions.region("us-west1").runWith({
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
            const body = req.body as MobileInterviewLiveTokenRequestBody;
            const jobTitle = body.jobTitle?.trim() || "Software Engineer";
            const company = body.company?.trim() || "CareerVivid";
            const category = normalizeCategory(body.category);
            const questions = normalizeQuestions(body.questions, category);
            const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "jastalk-firebase";
            const location = process.env.GOOGLE_CLOUD_LOCATION || "us-west1";
            const model = `projects/${project}/locations/${location}/publishers/google/models/gemini-live-2.5-flash-native-audio`;

            const sessionRef = admin.firestore().collection("interviewSessions").doc();
            await sessionRef.set({
                uid: user.uid,
                jobTitle,
                company,
                category,
                questions,
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

            res.status(200).json({
                accessToken,
                project,
                location,
                model,
                sessionId: sessionRef.id,
                questions,
            });
        } catch (err: any) {
            console.error("[mobileInterviewLiveToken] Error:", err.message);
            res.status(500).json({ error: err.message || "Could not start mobile interview session." });
        }
    });
});

export const mobileInterviewAnalyze = onRequestV2({
    region: "us-west1",
    timeoutSeconds: 120,
    memory: "1GiB",
}, async (req, res) => {
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
            const body = req.body as MobileInterviewAnalyzeRequestBody;
            const jobTitle = body.jobTitle?.trim() || "Software Engineer";
            const company = body.company?.trim() || "CareerVivid";
            const category = normalizeCategory(body.category);
            const questions = normalizeQuestions(body.questions, category);
            const transcript = normalizeTranscript(body.transcript);
            const userAnswerCount = transcript.filter((entry) => entry.speaker === "user").length;

            if (userAnswerCount === 0) {
                res.status(422).json({
                    error: "The interview needs at least one candidate answer before feedback can be generated.",
                });
                return;
            }

            const prompt = body.prompt?.trim() ||
                `${category} interview for ${jobTitle} at ${company}. Focus on role-specific proof, communication, and decision quality.`;
            const analysisCore = await createInterviewAnalysis({
                transcript,
                prompt,
                category,
                durationInSeconds: body.durationInSeconds,
            });

            const practiceId = createPracticeId(jobTitle, company);
            const analysis = {
                ...analysisCore,
                id: `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
                timestamp: Date.now(),
                transcript,
                durationInSeconds: body.durationInSeconds || null,
                source: "ios-live-api",
                analysisVersion: "web-compatible-v1",
            };
            const job = {
                id: practiceId,
                title: jobTitle,
                company,
                description: prompt,
                location: "",
                url: "",
            };
            const historyRef = admin.firestore()
                .collection("users")
                .doc(user.uid)
                .collection("practiceHistory")
                .doc(practiceId);
            // One immutable report document per attempt. The legacy
            // practiceHistory document is preserved for the web experience,
            // but keeping every analysis in a single array would eventually
            // hit Firestore's document-size limit and make attempts hard to
            // browse independently on mobile.
            const reportRef = admin.firestore()
                .collection("users")
                .doc(user.uid)
                .collection("interviewReports")
                .doc(analysis.id);

            await Promise.all([
                historyRef.set({
                    job,
                    questions,
                    section: "interviews",
                    activeInterviewDraft: null,
                    transcript,
                    interviewHistory: admin.firestore.FieldValue.arrayUnion(analysis),
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    source: "ios",
                    lastInterviewCategory: category,
                    lastInterviewPrompt: prompt,
                }, { merge: true }),
                reportRef.set({
                    practiceId,
                    job,
                    questions,
                    category,
                    prompt,
                    transcript,
                    analysis,
                    timestamp: analysis.timestamp,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    source: "ios",
                    schemaVersion: 1,
                }),
            ]);

            if (body.sessionId) {
                await admin.firestore().collection("interviewSessions").doc(body.sessionId).set({
                    status: "analyzed",
                    endedAt: admin.firestore.FieldValue.serverTimestamp(),
                    transcript,
                    analysis,
                    practiceId,
                }, { merge: true });
            }

            res.status(200).json({
                success: true,
                practiceId,
                analysis,
            });
        } catch (err: any) {
            console.error("[mobileInterviewAnalyze] Error:", err.message);
            if (err instanceof functions.https.HttpsError) {
                const status = err.code === "invalid-argument" ? 400 : 500;
                res.status(status).json({ error: err.message });
                return;
            }
            res.status(500).json({ error: err.message || "Could not analyze interview transcript." });
        }
    });
});

/**
 * Converts the just-recorded short answer into editable text before analysis.
 * Both this endpoint and `mobileInterviewAnalyze` intentionally use the same
 * stable Vertex model and region during the testing phase.
 */
export const mobileInterviewTranscribe = onRequestV2({
    region: "us-west1",
    timeoutSeconds: 120,
    memory: "1GiB",
}, async (req, res) => {
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
            const body = req.body as MobileInterviewTranscribeRequestBody;
            const audioBase64 = String(body.audioBase64 || "").replace(/^data:[^;]+;base64,/, "").trim();
            const mimeType = String(body.mimeType || "audio/wav").trim().toLowerCase();

            if (!audioBase64) {
                res.status(400).json({ error: "Record an answer before requesting a transcript." });
                return;
            }
            if (mimeType !== "audio/wav") {
                res.status(400).json({ error: "CareerVivid currently accepts WAV interview recordings." });
                return;
            }

            const audioBytes = Buffer.from(audioBase64, "base64");
            if (audioBytes.length === 0 || audioBytes.length > MAX_MOBILE_AUDIO_BYTES) {
                res.status(413).json({ error: "The recording is too large. Keep your answer under 90 seconds and try again." });
                return;
            }

            const transcription = await transcribeMobileInterviewAudio({
                audioBase64,
                mimeType,
                durationInSeconds: body.durationInSeconds,
                question: body.question,
                company: body.company,
                stage: body.stage,
            });

            res.status(200).json({
                success: true,
                transcript: transcription.transcript,
                suggestions: transcription.suggestions,
                model: "gemini-2.5-flash",
                region: "us-west1",
            });
        } catch (err: any) {
            console.error("[mobileInterviewTranscribe] Error:", err.message);
            res.status(500).json({ error: err.message || "Could not transcribe this recording." });
        }
    });
});
