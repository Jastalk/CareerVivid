/**
 * The agent's window into the user's own interview reports.
 *
 * The question-bank tools let the agent talk about how a company interviews.
 * This one lets it talk about how *this user* interviewed — the scores the
 * report screen shows, the strengths and gaps it listed, and the exchanges
 * those judgments came from.
 *
 * Why a tool rather than a field on the context envelope: a full report with
 * its transcript is thousands of tokens, and most turns have nothing to do
 * with it. The envelope carries a one-line pointer (see context.ts,
 * `lastPractice`) so the model knows a report exists; this tool fetches it when
 * the conversation actually turns to coaching.
 *
 * Distinct from `practiceGaps`, which the agent writes about its own in-chat
 * rounds via recordPracticeOutcome. This reads what Interview Studio scored —
 * sessions the agent was never part of, which is most of the user's practice.
 *
 * The transcript is the load-bearing part. Scores alone let the model say
 * "work on specificity"; the exchanges let it say "on the caching question you
 * named Redis but never said what you cached or why" — which is the difference
 * between a horoscope and coaching.
 */

import * as admin from "firebase-admin";
import { type AgentTool } from "./types";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/** Bounds on what one report contributes to the turn. */
const MAX_EXCHANGES = 12;
const QUESTION_CHARS = 300;
const ANSWER_CHARS = 700;
const FEEDBACK_CHARS = 2_000;

const clip = (v: unknown, n: number): string => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length <= n ? s : `${s.slice(0, n)}…`;
};

const num = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined;

const millis = (v: any): number =>
    typeof v?.toMillis === "function" ? v.toMillis() : typeof v === "number" ? v : 0;

interface TranscriptLine {
    speaker?: string;
    text?: string;
}

/**
 * Pair the transcript into question/answer exchanges.
 *
 * Interviewer turns can arrive split across several lines (streamed audio
 * transcription does this constantly), so consecutive same-speaker lines are
 * joined rather than treated as separate questions. Anything the user said
 * before the first interviewer line is dropped: it is greeting noise, not an
 * answer to anything.
 */
export function toExchanges(
    transcript: TranscriptLine[],
): Array<{ question: string; answer: string }> {
    const merged: Array<{ speaker: string; text: string }> = [];
    for (const line of transcript ?? []) {
        const text = typeof line?.text === "string" ? line.text.trim() : "";
        if (!text) continue;
        const speaker = line.speaker === "ai" ? "ai" : "user";
        const last = merged[merged.length - 1];
        if (last && last.speaker === speaker) last.text = `${last.text} ${text}`;
        else merged.push({ speaker, text });
    }

    const out: Array<{ question: string; answer: string }> = [];
    for (let i = 0; i < merged.length; i++) {
        if (merged[i].speaker !== "ai") continue;
        const answer = merged[i + 1]?.speaker === "user" ? merged[i + 1].text : "";
        out.push({
            question: clip(merged[i].text, QUESTION_CHARS),
            // An empty answer is signal, not an omission — the model should be
            // able to see that a question went unanswered.
            answer: clip(answer, ANSWER_CHARS),
        });
        if (out.length >= MAX_EXCHANGES) break;
    }
    return out;
}

/** Shape one stored analysis into the payload the model reads. */
function shapeReport(sessionId: string, data: any, analysis: any) {
    const job = data?.job ?? {};
    const history: any[] = Array.isArray(data?.interviewHistory) ? data.interviewHistory : [];
    const ordered = [...history].sort((a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0));
    const previous = ordered.find((a) => a?.id !== analysis?.id);

    const scores = {
        overall: num(analysis?.overallScore),
        communication: num(analysis?.communicationScore),
        problemSolving: num(analysis?.problemSolvingScore ?? analysis?.confidenceScore),
        experience: num(analysis?.experienceScore ?? analysis?.relevanceScore),
        roleAlignment: num(analysis?.roleAlignmentScore),
        leadership: num(analysis?.leadershipScore),
    };

    return {
        kind: "interview_report",
        sessionId,
        analysisId: String(analysis?.id ?? ""),
        role: clip(job.title, 160) || "Practice interview",
        company: clip(job.company, 160),
        at: analysis?.timestamp ? new Date(analysis.timestamp).toISOString() : "",
        scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => v !== undefined)),
        // The report screen renders these as "What went well" / "Practice next".
        strengths: clip(analysis?.strengths, FEEDBACK_CHARS),
        areasForImprovement: clip(analysis?.areasForImprovement, FEEDBACK_CHARS),
        skills: Array.isArray(analysis?.skills) ? analysis.skills.slice(0, 8).map((s: any) => clip(s, 80)) : [],
        exchanges: toExchanges(analysis?.transcript ?? []),
        attempt: { number: history.length, previousOverall: num(previous?.overallScore) },
        note:
            "This is the user's own report. Coach from the exchanges, quoting what they " +
            "actually said. Never invent an answer they did not give, and never restate " +
            "a score as praise without saying what earned it.",
    };
}

export const getInterviewReport: AgentTool = {
    name: "getInterviewReport",
    description:
        "Fetch the full scored report from one of the user's own practice interviews — every dimension score, the strengths and improvement notes, the skills detected, and the question-by-question transcript. Call this before coaching on a past session, comparing attempts, or answering 'how did I do'. Omit sessionId for the most recent session.",
    parameters: {
        type: "object",
        properties: {
            sessionId: {
                type: "string",
                description: "Practice session id, from your context envelope. Omit for the most recent scored session.",
            },
        },
    },
    phase: 3,
    risk: "read",
    writes: false,
    execute: async (ctx, a) => {
        const col = db.collection("users").doc(ctx.uid).collection("practiceHistory");
        const requested = typeof a?.sessionId === "string" ? a.sessionId.trim().slice(0, 200) : "";

        let snap: admin.firestore.DocumentSnapshot | undefined;
        if (requested) {
            const doc = await col.doc(requested).get();
            if (!doc.exists) throw new Error(`No practice session ${requested}. Omit sessionId for the most recent one.`);
            snap = doc;
        } else {
            // Ordering by timestamp finds the latest session, but the latest
            // session may be an abandoned draft with nothing scored in it.
            // Scan a short window and take the newest one that has a report.
            const recent = await col.orderBy("timestamp", "desc").limit(10).get();
            snap = recent.docs.find((d) => (d.data()?.interviewHistory ?? []).length > 0);
            if (!snap) {
                throw new Error(
                    "No scored practice session yet. Suggest starting one at /interview-studio rather than guessing at their performance.",
                );
            }
        }

        const data = snap.data() ?? {};
        const history: any[] = Array.isArray(data.interviewHistory) ? data.interviewHistory : [];
        if (!history.length) {
            throw new Error(
                `Session ${snap.id} has no scored report — the interview was started but never finished. Offer to resume it at /interview-studio.`,
            );
        }

        const latest = [...history].sort((x, y) => (y?.timestamp ?? 0) - (x?.timestamp ?? 0))[0];
        return shapeReport(snap.id, data, latest);
    },
};

/**
 * The one-line pointer the context envelope carries.
 *
 * Kept here beside the tool so the two stay in step: the envelope names the
 * session, the tool is the only thing that opens it.
 */
export async function getLastPracticePointer(uid: string): Promise<
    | {
          sessionId: string;
          role: string;
          company?: string;
          at: string;
          overallScore?: number;
          attempts: number;
          scored: boolean;
      }
    | undefined
> {
    const snap = await db
        .collection("users")
        .doc(uid)
        .collection("practiceHistory")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();

    const doc = snap.docs[0];
    if (!doc) return undefined;

    const data = doc.data() ?? {};
    const history: any[] = Array.isArray(data.interviewHistory) ? data.interviewHistory : [];
    const latest = [...history].sort((x, y) => (y?.timestamp ?? 0) - (x?.timestamp ?? 0))[0];
    const at = latest?.timestamp ?? millis(data.timestamp);

    return {
        sessionId: doc.id,
        role: clip(data.job?.title, 120) || "Practice interview",
        company: clip(data.job?.company, 120) || undefined,
        at: at ? new Date(at).toISOString() : "",
        overallScore: num(latest?.overallScore),
        attempts: history.length,
        scored: history.length > 0,
    };
}
