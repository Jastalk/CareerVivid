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

const SKILL_LEVELS = ["Novice", "Intermediate", "Advanced", "Expert"] as const;

/**
 * Read a skill out of whatever the model actually sent.
 *
 * The Live API does not reliably honour an object-inside-array schema. Instead
 * of `{name, level}` it sends the object JSON-ENCODED as a string, so
 * `{"name":"System Design","level":"Advanced"}` arrived as the skill *name* and
 * was written to the resume verbatim — the user opened their editor and found a
 * JSON blob sitting in their skills list, next to "Go-to-Market Strategy".
 *
 * Tightening the prompt would not fix this; the model is not choosing to do it.
 * So every shape it has actually produced is decoded here: an object, a
 * JSON-encoded object, a JSON-encoded array of either, or a plain name.
 *
 * Anything that still looks like markup after decoding is DROPPED rather than
 * guessed at. A skill the agent silently failed to add is a nuisance; a skill
 * that reads like a stack trace on a resume someone sends to a recruiter is
 * damage, and the user has no reason to expect they need to check.
 */
const JSON_ISH = /[{}[\]"]/;

function collectSkills(
    raw: unknown,
    out: Array<{ name: string; level?: string }>,
    depth = 0,
): void {
    if (raw == null || depth > 3 || out.length >= 24) return;

    if (Array.isArray(raw)) {
        for (const item of raw) collectSkills(item, out, depth + 1);
        return;
    }

    if (typeof raw === "object") {
        const name = String((raw as any).name ?? "").trim();
        const level = String((raw as any).level ?? "").trim();
        if (name) out.push({ name, ...(level ? { level } : {}) });
        return;
    }

    const text = String(raw).trim();
    if (!text) return;

    // A string that opens like JSON is the Live API's stringified object. Decode
    // it once; if it does not parse it is not a skill name either.
    if (text.startsWith("{") || text.startsWith("[")) {
        try {
            collectSkills(JSON.parse(text), out, depth + 1);
        } catch {
            /* Unparseable — dropped below by the JSON_ISH filter. */
        }
        return;
    }

    out.push({ name: text });
}

/** Normalise the `skills` argument into clean, resume-safe entries. */
export function coerceSkills(raw: unknown): Array<{ name: string; level?: string }> {
    const collected: Array<{ name: string; level?: string }> = [];
    collectSkills(raw, collected);

    const seen = new Set<string>();
    const clean: Array<{ name: string; level?: string }> = [];
    for (const entry of collected) {
        const name = entry.name.replace(/\s+/g, " ").trim().slice(0, 80);
        if (!name || JSON_ISH.test(name)) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const level = entry.level ?? "";
        clean.push({
            name,
            // An off-list level is dropped rather than written through; mergeSkills
            // then applies the same default a hand-added skill gets.
            ...((SKILL_LEVELS as readonly string[]).includes(level) ? { level } : {}),
        });
    }
    return clean;
}

/**
 * The score a round must reach before its skills can go on a resume.
 *
 * 75 is the floor of the report's own "Strong" band — "solid answers that
 * demonstrate competence and relevant experience". Below that the report is
 * telling the candidate they have work to do, and a resume claim would be the
 * agent contradicting its own grading. Deliberately above the 70 stage-clear
 * threshold: clearing a round means you can move on, not that you should
 * advertise the skill.
 */
export const RESUME_SKILL_SCORE_FLOOR = 75;

/** Case- and punctuation-insensitive, so "Node.js" and "nodejs" are one skill. */
const skillKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Merge new skills into the ones already on the resume.
 *
 * Additive by construction: existing entries keep their position, their id, and
 * the level the user chose. `updateResumeSection` REPLACES a section, so using
 * it to "add a skill" silently deleted every skill not named in the call — the
 * agent proposed three skills after a coding round and would have wiped the
 * other twelve. Approving a card labelled "add" must never be able to remove.
 */
export function mergeSkills(
    existing: unknown,
    incoming: Array<{ name: string; level?: string }>,
): { skills: Array<{ id: string; name: string; level: string }>; added: string[] } {
    const kept = (Array.isArray(existing) ? existing : []).flatMap((s: any) => {
        const stored = (typeof s === "string" ? s : String(s?.name ?? "")).trim();
        if (!stored) return [];

        // A blob an earlier call wrote is unwrapped in place, so the next add
        // cleans the resume up instead of leaving `{"name":"System Design"}`
        // sitting in the skills list forever. Only strings that OPEN like JSON
        // are candidates — a real name that merely contains a bracket
        // ("Node.js [advanced]") must survive untouched.
        const healed = stored.startsWith("{") || stored.startsWith("[")
            ? coerceSkills(stored)[0]
            : { name: stored, level: undefined as string | undefined };
        if (!healed) return [];

        const level = String(healed.level ?? s?.level ?? "");
        return [{
            id: String(s?.id ?? ""),
            name: healed.name.slice(0, 80),
            level: (SKILL_LEVELS as readonly string[]).includes(level) ? level : "Intermediate",
        }];
    });

    const seen = new Set(kept.map((s) => skillKey(s.name)));
    const added: string[] = [];

    for (const skill of incoming) {
        const name = String(skill?.name ?? "").trim().slice(0, 80);
        if (!name) continue;
        const key = skillKey(name);
        // Already claimed. Re-adding it would churn the resume for nothing, and
        // would overwrite a level the user may have set by hand.
        if (seen.has(key)) continue;
        seen.add(key);
        const level = String(skill?.level ?? "");
        kept.push({
            id: "",
            name,
            level: (SKILL_LEVELS as readonly string[]).includes(level) ? level : "Intermediate",
        });
        added.push(name);
    }

    // Ids are re-sequenced across the whole list to match what every other
    // writer produces (`s0`, `s1`, …); kept entries keep their order regardless.
    return { skills: kept.slice(0, 40).map((s, i) => ({ ...s, id: `s${i}` })), added };
}

export type RoundEvidence =
    | { ok: true; role: string; overallScore: number }
    | { ok: false; reason: string };

/**
 * Decide whether a practice session can back a resume claim.
 *
 * Two gates, in this order, because they fail for different reasons and the
 * model needs to hear which:
 *
 *  1. TIMING — no report means the round is still in progress. Mid-problem is
 *     the worst possible moment to interrupt someone with a resume card;
 *     they are thinking about eviction order, not their CV.
 *  2. EVIDENCE — the score must clear RESUME_SKILL_SCORE_FLOOR. A skill on a
 *     resume is a claim they will be interviewed against, and the agent should
 *     only help make claims their own scored work supports.
 *
 * Pure, and separate from the Firestore read, because this rule is the whole
 * product decision and it should be readable and testable on its own.
 */
export function evaluateRoundEvidence(sessionData: any): RoundEvidence {
    const history: any[] = Array.isArray(sessionData?.interviewHistory) ? sessionData.interviewHistory : [];
    if (!history.length) {
        return {
            ok: false,
            reason:
                "That round has not been scored yet. Wait until they submit and the report comes back, " +
                "then try again — never add skills mid-problem.",
        };
    }

    const latest = [...history].sort((x, y) => (y?.timestamp ?? 0) - (x?.timestamp ?? 0))[0];
    const overallScore = num(latest?.overallScore) ?? 0;
    if (overallScore < RESUME_SKILL_SCORE_FLOOR) {
        return {
            ok: false,
            reason:
                `That round scored ${overallScore}, below the ${RESUME_SKILL_SCORE_FLOOR} needed to put a skill ` +
                "on a resume. Do not propose skills. Coach them on the gaps and offer another attempt instead.",
        };
    }

    return { ok: true, role: clip(sessionData?.job?.title, 160) || "Practice interview", overallScore };
}

/** The scored evidence behind a resume claim, or a thrown reason there is none. */
async function requireStrongRound(
    uid: string,
    sessionId: string,
): Promise<{ sessionId: string; role: string; overallScore: number }> {
    const snap = await db.collection("users").doc(uid).collection("practiceHistory").doc(sessionId).get();
    if (!snap.exists) {
        throw new Error(
            `No practice session ${sessionId}. Pass the sessionId from lastPractice or getInterviewReport — never invent one.`,
        );
    }

    const verdict = evaluateRoundEvidence(snap.data() ?? {});
    if (!verdict.ok) throw new Error(verdict.reason);

    return { sessionId, role: verdict.role, overallScore: verdict.overallScore };
}

/**
 * Add skills a scored round actually demonstrated.
 *
 * Two gates, both enforced here rather than in the prompt, because the prompt
 * was already being ignored:
 *
 *  1. TIMING — the session must have a report. An unscored session means the
 *     round is still in progress, and mid-problem is the worst moment to
 *     interrupt someone with a resume card.
 *  2. EVIDENCE — the report must clear RESUME_SKILL_SCORE_FLOOR. A skill on a
 *     resume is a claim the user will be interviewed against; the agent should
 *     only help make claims their own scored work supports.
 */
export const addResumeSkills: AgentTool = {
    name: "addResumeSkills",
    description:
        "Add skills a scored practice round demonstrated to the user's resume, keeping every skill already there. Only call this AFTER a round has been submitted and scored, and only when the score shows they handled it well — the server rejects the call otherwise. Never call it mid-problem. For rewriting or reordering the whole skills list, use updateResumeSection instead.",
    parameters: {
        type: "object",
        properties: {
            sessionId: {
                type: "string",
                description: "The scored practice session that demonstrated these skills, from lastPractice or getInterviewReport.",
            },
            skills: {
                type: "array",
                description: "Skills the round actually demonstrated. Max 6. Skills already on the resume are ignored.",
                items: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        level: { type: "string", enum: [...SKILL_LEVELS] },
                    },
                    required: ["name"],
                },
            },
            resumeId: { type: "string", description: "Omit for the most recently edited resume." },
        },
        required: ["sessionId", "skills"],
    },
    phase: 3,
    risk: "low_write",
    writes: true,
    validate: (a) => {
        const sessionId = typeof a?.sessionId === "string" ? a.sessionId.trim().slice(0, 200) : "";
        if (!sessionId) throw new Error("sessionId is required — name the scored round these skills came from.");

        // Decoded rather than read straight off the argument: the Live API sends
        // each skill JSON-encoded as a string often enough that trusting the
        // declared schema put a raw `{"name":...}` blob on a user's resume.
        const skills = coerceSkills(a?.skills).slice(0, 6);
        if (!skills.length) {
            throw new Error(
                "skills must contain at least one named skill, each as an object like " +
                '{"name": "System Design", "level": "Advanced"} — not a string containing JSON.',
            );
        }

        return {
            sessionId,
            skills,
            ...(typeof a?.resumeId === "string" && a.resumeId.trim() ? { resumeId: a.resumeId.trim().slice(0, 60) } : {}),
        };
    },
    summarize: (a) => `Add ${a.skills.length} skill${a.skills.length === 1 ? "" : "s"} to your resume`,
    // Runs before the card exists, so a round that is unscored or weak never
    // reaches the user as something to approve — the model is told why instead.
    precheck: async (ctx, a) => {
        await requireStrongRound(ctx.uid, a.sessionId);
    },
    execute: async (ctx, a) => {
        // Re-checked on execute, not just when the proposal was built. A
        // proposal lives for 30 minutes; the evidence behind it must still hold
        // at the moment it is written.
        const evidence = await requireStrongRound(ctx.uid, a.sessionId);

        const col = db.collection("users").doc(ctx.uid).collection("resumes");
        const snap = a.resumeId
            ? await col.doc(a.resumeId).get()
            : (await col.orderBy("updatedAt", "desc").limit(1).get()).docs[0];
        if (!snap || !snap.exists) throw new Error("No resume found. Offer to create one first.");

        const { skills, added } = mergeSkills(snap.data()?.skills, a.skills);
        if (!added.length) {
            return { resumeId: snap.id, added: [], note: "Every one of those skills was already on the resume. Nothing changed." };
        }

        await snap.ref.update({ skills, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return {
            resumeId: snap.id,
            route: `/edit/${snap.id}`,
            added,
            totalSkills: skills.length,
            evidence,
        };
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
