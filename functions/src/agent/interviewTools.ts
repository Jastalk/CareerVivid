/**
 * Interview Studio tools — the agent's window into the 301-company question bank.
 *
 * The data is `MOBILE_INTERVIEW_GUIDE_QUESTIONS`, generated at build time from
 * the quest tracker CSVs (see functions prebuild). It is already server-side,
 * keyed by slug, with real questions grouped into the six loop stages — which
 * means the agent can quote genuine company questions and run an in-chat mock
 * without any new data pipeline.
 *
 * Both tools return a `kind` discriminator alongside the model-facing payload.
 * Read-tool results are forwarded to the client as `effects`, and the panel
 * renders anything with a known `kind` as a rich card (company card, question
 * card) instead of leaving the model to retype the content as prose.
 */

import {
    MOBILE_INTERVIEW_GUIDE_QUESTIONS,
    type MobileInterviewGuideStageQuestions,
} from "../mobileInterviewGuideQuestions.generated";
import {
    AGENT_CODING_QUESTIONS,
    AGENT_PRACTICE_CATALOG,
    AGENT_SYSTEM_DESIGN_QUESTIONS,
} from "../agentPracticeCatalog.generated";
import * as admin from "firebase-admin";
import { type AgentTool } from "./types";
import { getAIClient, getVertexLocationForModel } from "../utils/ai";
import { normalizeSpokenCompanyQuery } from "./interviewIntent";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const STAGES = ["screening", "coding", "systemDesign", "behavioral", "values", "final"] as const;
type StageKey = (typeof STAGES)[number];

const STAGE_LABEL: Record<StageKey, string> = {
    screening: "Recruiter screen",
    coding: "Coding",
    systemDesign: "System design",
    behavioral: "Behavioral",
    values: "Values / culture",
    final: "Final round",
};

const S = (v: unknown, field: string, max = 200): string => {
    if (typeof v !== "string" || !v.trim()) throw new Error(`${field} is required.`);
    return v.trim().slice(0, max);
};

const optS = (v: unknown, max = 2_000): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

const norm = (s: string) => normalizeSpokenCompanyQuery(s);

interface GuideHit {
    slug: string;
    company: string;
    route: string;
    questionCounts: Partial<Record<StageKey, number>>;
    totalQuestions: number;
}

const toHit = (slug: string): GuideHit => {
    const g = MOBILE_INTERVIEW_GUIDE_QUESTIONS[slug];
    const counts: Partial<Record<StageKey, number>> = {};
    let total = 0;
    for (const stage of STAGES) {
        const n = g.stageQuestions[stage]?.length ?? 0;
        if (n > 0) counts[stage] = n;
        total += n;
    }
    return { slug, company: g.company, route: `/quest/${slug}`, questionCounts: counts, totalQuestions: total };
};

/**
 * Resolve a company reference the way a person types it — "Google", "open ai",
 * a slug — to catalog entries. Name match first; question-text search is the
 * fallback so "who asks about consistent hashing" still lands somewhere.
 */
function findGuides(query: string, limit: number): GuideHit[] {
    const q = norm(query);
    if (!q) return [];

    const slugs = Object.keys(MOBILE_INTERVIEW_GUIDE_QUESTIONS);
    const nameHits = slugs.filter((slug) => {
        const g = MOBILE_INTERVIEW_GUIDE_QUESTIONS[slug];
        return norm(g.company).includes(q) || slug.replace(/-/g, " ").includes(q);
    });
    if (nameHits.length > 0) return nameHits.slice(0, limit).map(toHit);

    // Content search: rank by number of question matches so the company that
    // actually drills the topic outranks one passing mention.
    const scored: Array<{ slug: string; score: number }> = [];
    for (const slug of slugs) {
        const g = MOBILE_INTERVIEW_GUIDE_QUESTIONS[slug];
        let score = 0;
        for (const stage of STAGES) {
            for (const question of g.stageQuestions[stage] ?? []) {
                if (norm(question).includes(q)) score++;
            }
        }
        if (score > 0) scored.push({ slug, score });
    }
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ slug }) => toHit(slug));
}

export const searchCompanyGuides: AgentTool = {
    name: "searchCompanyGuides",
    description:
        "Search the 301-company interview question bank by company name or topic keyword. Returns matching companies with their question counts per stage and the /quest route for the full practice loop. Call this before quoting questions or recommending where to practice.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: 'Company name or topic, e.g. "Google", "rate limiter", "figma".' },
            limit: { type: "number", description: "Max companies to return. Default 5." },
        },
        required: ["query"],
    },
    phase: 3,
    risk: "read",
    writes: false,
    execute: async (_ctx, a) => {
        const query = S(a.query, "query");
        const limit = Math.min(10, Math.max(1, Number(a.limit) || 5));
        const guides = findGuides(query, limit);
        return {
            kind: "company_guides",
            query,
            guides,
            note: guides.length
                ? "These render as cards for the user — mention them briefly rather than re-listing every detail."
                : "No match. Offer the closest big-name loops or ask which company they meant.",
        };
    },
};

export const getCompanyQuestions: AgentTool = {
    name: "getCompanyQuestions",
    description:
        "Fetch real interview questions for one company, optionally one stage (screening, coding, systemDesign, behavioral, values, final). Use for in-chat mock practice: ask ONE question, wait for the answer, give feedback, then continue. The full scored loop lives at the returned /quest route.",
    parameters: {
        type: "object",
        properties: {
            company: { type: "string", description: "Company name or slug from searchCompanyGuides." },
            stage: { type: "string", enum: [...STAGES] },
            count: { type: "number", description: "Questions to return. Default 5, max 10." },
        },
        required: ["company"],
    },
    phase: 3,
    risk: "read",
    writes: false,
    execute: async (_ctx, a) => {
        const ref = S(a.company, "company");
        const hit = findGuides(ref, 1)[0];
        if (!hit) throw new Error(`No interview guide for "${ref}". Try searchCompanyGuides first.`);

        const guide = MOBILE_INTERVIEW_GUIDE_QUESTIONS[hit.slug];
        const stage: StageKey | undefined = (STAGES as readonly string[]).includes(a.stage) ? a.stage : undefined;
        const count = Math.min(10, Math.max(1, Number(a.count) || 5));

        // Coding and system design must come from the exact pools used by the
        // browser workspaces. Each item carries the stable id and route that
        // openInterviewStage later uses, so chat and screen cannot drift.
        if (stage === "coding" || stage === "systemDesign") {
            const practice = AGENT_PRACTICE_CATALOG[hit.slug];
            const ids = stage === "coding" ? practice?.coding : practice?.systemDesign;
            const questionById = stage === "coding"
                ? AGENT_CODING_QUESTIONS
                : AGENT_SYSTEM_DESIGN_QUESTIONS[hit.slug];
            const pool = ids?.map((id) => questionById?.[id]).filter(Boolean) ?? [];
            if (!pool.length) {
                throw new Error(`${guide.company} has no executable ${STAGE_LABEL[stage]} questions available.`);
            }
            const questions = pool.slice(0, count).map((question) => ({
                stage,
                openStage: stage === "systemDesign" ? "system_design" : "coding",
                stageLabel: STAGE_LABEL[stage],
                question: question.question,
                questionId: question.id,
                route: `${hit.route}?stage=${stage === "systemDesign" ? "system_design" : "coding"}&${
                    stage === "systemDesign" ? "systemDesignChallenge" : "codingChallenge"
                }=${encodeURIComponent(question.id)}`,
            }));
            return {
                kind: "interview_questions",
                company: guide.company,
                slug: hit.slug,
                route: hit.route,
                stage,
                questions,
                note:
                    "Ask exactly one returned question. If the user wants to open it, call openInterviewStage with its exact questionId, company, and openStage. Never replace it with another question.",
            };
        }

        const pick = (sq: MobileInterviewGuideStageQuestions): Array<{ stage: StageKey; stageLabel: string; question: string }> => {
            const out: Array<{ stage: StageKey; stageLabel: string; question: string }> = [];
            const stages = stage ? [stage] : STAGES;
            for (const st of stages) {
                for (const q of sq[st] ?? []) {
                    out.push({ stage: st, stageLabel: STAGE_LABEL[st], question: q });
                    if (out.length >= count) return out;
                }
            }
            return out;
        };

        const questions = pick(guide.stageQuestions);
        if (!questions.length) {
            throw new Error(
                `${guide.company} has no ${stage ?? ""} questions in the bank. Available stages: ${
                    Object.keys(hit.questionCounts).join(", ") || "none"
                }.`,
            );
        }

        return {
            kind: "interview_questions",
            company: guide.company,
            slug: hit.slug,
            route: hit.route,
            stage: stage ?? "mixed",
            questions,
            note: "These render as cards. For practice: ask exactly one, wait for the user's answer, then coach.",
        };
    },
};

/** Stage ids from buildQuestLine (src/lib/companyQuests.ts). */
const QUEST_STAGES = ["screening", "coding", "system_design", "behavioral", "values", "final"] as const;

/**
 * Open one stage of a company loop as a modal, not the quest landing page.
 *
 * CompanyQuestPage already honours `?stage=` and auto-launches that round —
 * CodingBattle and SystemDesignBattle render as full-screen overlays over the
 * quest route. So the agent does not need to navigate anywhere new; it needs to
 * stop sending people to the quest index and start naming the round.
 *
 * Read-only: opening a practice modal writes nothing and spends nothing. The
 * scoring at the end of the round is where credits are charged, by the battle.
 */
export const openInterviewStage: AgentTool = {
    name: "openInterviewStage",
    description:
        "Open a specific round of a company's interview loop as a modal — coding opens the code editor, system_design opens the whiteboard. Use this the moment the user agrees to practise a question you are discussing. Do NOT send them to the quest page and make them pick the round themselves.",
    parameters: {
        type: "object",
        properties: {
            company: { type: "string", description: "Company name or slug." },
            stage: {
                type: "string",
                enum: [...QUEST_STAGES],
                description: "coding and system_design open a working modal; the others open their quest round.",
            },
            questionId: {
                type: "string",
                description: "Exact questionId returned by getCompanyQuestions. Required when opening a specific coding or system-design question already discussed in chat.",
            },
        },
        required: ["company", "stage"],
    },
    phase: 3,
    risk: "read",
    writes: false,
    execute: async (_ctx, a) => {
        const ref = S(a.company, "company");
        const stage = S(a.stage, "stage", 40);
        if (!(QUEST_STAGES as readonly string[]).includes(stage)) {
            throw new Error(`stage must be one of: ${QUEST_STAGES.join(", ")}`);
        }

        const hit = findGuides(ref, 1)[0];
        if (!hit) throw new Error(`No interview guide for "${ref}". Try searchCompanyGuides first.`);

        const questionId = optS(a.questionId, 200);
        if (questionId && stage !== "coding" && stage !== "system_design") {
            throw new Error("questionId is only supported for coding and system_design stages.");
        }
        const practiceStage = stage === "coding"
            ? "coding"
            : stage === "system_design"
                ? "systemDesign"
                : null;
        const questionExists = Boolean(practiceStage && questionId
            && AGENT_PRACTICE_CATALOG[hit.slug]?.[practiceStage].includes(questionId));
        const question = questionExists && questionId
            ? practiceStage === "coding"
                ? AGENT_CODING_QUESTIONS[questionId]
                : AGENT_SYSTEM_DESIGN_QUESTIONS[hit.slug]?.[questionId]
            : undefined;
        if (questionId && !question) {
            throw new Error(
                `Question "${questionId}" is not available in ${hit.company}'s ${stage.replace("_", " ")} workspace. Fetch the stage questions again.`,
            );
        }

        return {
            kind: "open_stage",
            company: hit.company,
            stage,
            questionId: question?.id,
            question: question?.question,
            // A question-specific generated route wins; otherwise preserve the
            // existing next-unsolved behavior for a generic stage request.
            route: question
                ? `${hit.route}?stage=${stage}&${stage === "coding" ? "codingChallenge" : "systemDesignChallenge"}=${encodeURIComponent(question.id)}`
                : `${hit.route}?stage=${stage}`,
            note: question
                ? "Navigate to this exact route. The workspace will open the same question that was asked in chat."
                : "Navigate to this exact route. No specific question was selected, so the workspace will use its normal next-unsolved question.",
        };
    },
};

/** Read the latest route, question, and structured canvas relayed by the browser. */
export const getOpenWorkspace: AgentTool = {
    name: "getOpenWorkspace",
    description:
        "Read what is open on the user's screen right now: route, company, current question, requirements, canvas nodes and connections, or coding buffer. Call for questions like 'what is my current question?' or 'can you see my solution?'. Never substitute a question-bank item.",
    parameters: { type: "object", properties: {} },
    phase: 3,
    risk: "read",
    writes: false,
    execute: async (ctx) => {
        if (!ctx.workspace) {
            return {
                kind: "open_workspace",
                route: ctx.route ?? "/",
                available: false,
                note: "No coding or system-design round is open in the browser right now.",
            };
        }
        return {
            kind: "open_workspace",
            route: ctx.route ?? "/",
            available: true,
            workspace: ctx.workspace,
            note: "This is what is on their screen. Answer from this exact question and its canvas or code buffer — never ask the user to describe or paste what is already here.",
        };
    },
};

const WORKSPACE_REVIEW_MODEL = "gemini-3.6-flash";

/**
 * Review a coding buffer against the problem it is meant to solve.
 *
 * Deliberately the same output shape as the diagram review, and deliberately
 * NOT a solution: the user is mid-interview, and handing them working code
 * teaches nothing and ruins the round. `nextEdits` names the next decision the
 * way a coach would — "you initialise globalMax to -Infinity but currentMax to
 * 0, so a fully negative array returns 0" — without writing the line for them.
 */
async function reviewCodingWorkspace(workspace: any) {
    const ai = getAIClient(undefined, getVertexLocationForModel(WORKSPACE_REVIEW_MODEL));
    const result = await ai.models.generateContent({
        model: WORKSPACE_REVIEW_MODEL,
        contents:
            "You are a senior engineer reviewing a candidate's in-progress interview solution. " +
            "Judge only the code supplied against the exact problem. An empty or scaffold-only buffer is " +
            "a legitimate finding, not an error — say what the first real step is.\n\n" +
            "TWO DIFFERENT THINGS, DO NOT CONFUSE THEM:\n" +
            "1. Whether it RUNS. If syntaxError is present the code does not parse and nothing else " +
            "matters yet — lead with it, quote the exact fix (for example `for let (` should be " +
            "`for (let`), and put it first in nextEdits. A syntax error is not the interview question, " +
            "so giving the corrected line away costs the candidate nothing.\n" +
            "2. Whether it is CORRECT. That IS the interview question. Never write the algorithm, the " +
            "loop body, or a finished function — name the decision they have to make and the input that " +
            "would break what they have, and let them write it.\n\n" +
            "Never claim code is correct without checking it against a case. If syntaxError is null, " +
            "trace at least one input by hand before saying the logic is sound.\n\n" +
            JSON.stringify({
                question: workspace.problem,
                language: workspace.language ?? "unknown",
                code: workspace.code ?? "",
                syntaxError: workspace.syntaxError ?? null,
                testsRun: workspace.testSummary ?? null,
            }),
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    runs: { type: "BOOLEAN", description: "False when the code does not parse. Say so before anything else." },
                    score: { type: "NUMBER", description: "How far along this solution is, 0 to 100." },
                    verdict: { type: "STRING", description: "One concise sentence on whether the approach is on track." },
                    strengths: { type: "ARRAY", items: { type: "STRING" } },
                    missingOrWeak: { type: "ARRAY", items: { type: "STRING" }, description: "Bugs, unhandled cases, or missing logic." },
                    nextEdits: { type: "ARRAY", items: { type: "STRING" }, description: "The next decisions to make, as hints — never finished code." },
                },
                required: ["runs", "score", "verdict", "strengths", "missingOrWeak", "nextEdits"],
            },
        },
    });

    let review: Record<string, unknown>;
    try {
        review = JSON.parse(result.text || "{}");
    } catch {
        throw new Error("The code review returned an invalid result. Please try once more.");
    }

    return {
        kind: "workspace_review",
        workspaceKind: "coding",
        model: WORKSPACE_REVIEW_MODEL,
        question: workspace.problem,
        language: workspace.language ?? "unknown",
        // Echoed so the agent can quote the exact parser message and location.
        syntaxError: workspace.syntaxError ?? null,
        reviewedLines: String(workspace.code ?? "").split("\n").filter((l: string) => l.trim()).length,
        ...review,
    };
}

/**
 * Review whatever round is actually open — diagram or code.
 *
 * This used to throw "Open a system-design whiteboard before asking for a
 * diagram review" for anything that was not `system_design`. In a coding round
 * that error was the agent's only information about the workspace, so it
 * concluded the user was in the wrong place and said so out loud: "It looks
 * like you're in the coding workspace, not the system design whiteboard. Can
 * you tell me what code you've added?" — while the buffer was sitting in the
 * context it had just been handed.
 *
 * Both kinds return the same shape (score, verdict, strengths, missingOrWeak,
 * nextEdits) so the agent needs no separate handling to speak the result.
 */
export const reviewOpenWorkspace: AgentTool = {
    name: "reviewOpenWorkspace",
    description:
        "Review the user's current work against the question they are on — a system-design diagram or a coding solution, whichever is open. Uses the structured canvas or the code buffer, never a screenshot. Call for 'is this correct?', 'grade this', 'is this a good start?', or any request for feedback on what they have so far.",
    parameters: { type: "object", properties: {} },
    phase: 3,
    risk: "read",
    writes: false,
    action: "agent.turn",
    execute: async (ctx) => {
        const workspace = ctx.workspace;
        if (!workspace) {
            throw new Error("No coding or system-design round is open. Ask what they are working on.");
        }
        if (!workspace.problem) throw new Error("The open round has no current question yet.");

        if (workspace.kind === "coding") {
            return reviewCodingWorkspace(workspace);
        }

        const ai = getAIClient(undefined, getVertexLocationForModel(WORKSPACE_REVIEW_MODEL));
        const result = await ai.models.generateContent({
            model: WORKSPACE_REVIEW_MODEL,
            contents:
                "You are a senior system-design interviewer. Evaluate only the supplied structured graph " +
                "against the exact prompt and requirements. Do not assume unlabeled components or invisible edges. " +
                "Give practical next edits.\n\n" +
                JSON.stringify({
                    company: workspace.company,
                    question: workspace.problem,
                    requirements: workspace.requirements ?? [],
                    nodes: workspace.nodes ?? [],
                    connections: workspace.connections ?? [],
                }),
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        score: { type: "NUMBER", description: "Overall coverage score from 0 to 100." },
                        verdict: { type: "STRING", description: "One concise sentence stating whether the design is on track." },
                        strengths: { type: "ARRAY", items: { type: "STRING" } },
                        missingOrWeak: { type: "ARRAY", items: { type: "STRING" } },
                        nextEdits: { type: "ARRAY", items: { type: "STRING" } },
                    },
                    required: ["score", "verdict", "strengths", "missingOrWeak", "nextEdits"],
                },
            },
        });
        let review: Record<string, unknown>;
        try {
            review = JSON.parse(result.text || "{}");
        } catch {
            throw new Error("The diagram review returned an invalid result. Please try once more.");
        }
        return {
            kind: "workspace_review",
            workspaceKind: "system_design",
            model: WORKSPACE_REVIEW_MODEL,
            question: workspace.problem,
            reviewedNodes: workspace.nodes?.length ?? 0,
            reviewedConnections: workspace.connections?.length ?? 0,
            ...review,
        };
    },
};

/**
 * Offer to write into the user's editor, for them to approve.
 *
 * Everything else the agent writes is a Firestore proposal resolved on the
 * server. A code buffer is neither on the server nor persisted, so this returns
 * the edit to the CLIENT, which renders a diff card and applies it to the open
 * round only if the user says yes. Nothing reaches the editor unapproved.
 *
 * The `kind` gate is the whole product decision:
 *
 *   syntax — makes the code RUN. Brackets, a misplaced `let`, indentation.
 *            Never changes behaviour, so it is allowed in every round: being
 *            stuck on a typo measures nothing about a candidate.
 *   logic  — changes what the code DOES. That is the thing a scored round is
 *            measuring, so it is refused there and allowed in practice, where
 *            the point is to learn rather than to be assessed.
 *
 * Enforced here rather than in the prompt because a prompt is a request and
 * this is a rule. The model is told why it was refused so it can coach instead.
 */
export const proposeCodeEdit: AgentTool = {
    name: "proposeCodeEdit",
    description:
        "Offer an edit to the user's open code editor. They see a diff and approve it before anything changes. Use kind 'syntax' for changes that only make the code run — a missing bracket, a malformed for-loop, indentation — and kind 'logic' for anything that changes what the code does. Logic edits are refused in a scored round, so coach those instead. Always send the COMPLETE new buffer, never a fragment.",
    parameters: {
        type: "object",
        properties: {
            nextCode: { type: "string", description: "The complete file as it should end up. Not a snippet, not a diff." },
            kind: { type: "string", enum: ["syntax", "logic"], description: "'syntax' only if behaviour is unchanged." },
            summary: { type: "string", description: "One line the user reads before approving, e.g. \"line 5: for let ( becomes for (let\"." },
        },
        required: ["nextCode", "kind", "summary"],
    },
    phase: 3,
    risk: "read",
    writes: false,
    validate: (a) => {
        const nextCode = typeof a?.nextCode === "string" ? a.nextCode : "";
        if (!nextCode.trim()) throw new Error("nextCode must be the complete new buffer.");
        if (nextCode.length > 20_000) throw new Error("That buffer is too large to propose as one edit.");
        const kind = a?.kind === "logic" ? "logic" : "syntax";
        const summary = String(a?.summary ?? "").trim().slice(0, 200);
        if (!summary) throw new Error("summary is required — the user reads it before approving.");
        return { nextCode, kind, summary };
    },
    execute: async (ctx, a) => {
        const workspace = ctx.workspace;
        if (!workspace || workspace.kind !== "coding") {
            throw new Error("No coding round is open, so there is no editor to write to.");
        }

        if (a.kind === "logic" && workspace.scored !== false) {
            throw new Error(
                "This round is scored, so you may not write logic into their editor — that is the part being " +
                "measured. Fix what stops the code running if anything does, then coach the logic: name the " +
                "decision and the input that breaks what they have, and let them write it.",
            );
        }

        // The client applies it only if this still matches their buffer.
        return {
            kind: "code_edit_proposal",
            awaiting: "user_approval",
            language: workspace.language ?? "javascript",
            baseCode: workspace.code ?? "",
            nextCode: a.nextCode,
            editKind: a.kind,
            summary: a.summary,
            note: "A diff card is now on their screen. Say in one sentence what you changed and why, then stop — do not claim it is applied. They have to approve it.",
        };
    },
};

/**
 * Record what a practice round exposed, so the next one starts smarter.
 *
 * This is the compounding part: without it every session begins from zero and
 * the agent asks the same diagnostic questions forever. With it, "you skipped
 * capacity estimation again" becomes possible.
 *
 * A read tool by intent but it does persist — under the user's own profile,
 * additive only, and it stores an assessment rather than anything the user
 * would be surprised to find written down.
 */
export const recordPracticeOutcome: AgentTool = {
    name: "recordPracticeOutcome",
    description:
        "After a practice round, record what went well and what to work on. Call this when a round finishes or the user moves on — not mid-problem. Keep each point short and specific to what actually happened.",
    parameters: {
        type: "object",
        properties: {
            company: { type: "string" },
            stage: { type: "string", enum: [...QUEST_STAGES] },
            strengths: { type: "array", items: { type: "string" }, description: "What they did well. Max 3." },
            gaps: { type: "array", items: { type: "string" }, description: "What to work on next. Max 3." },
            summary: { type: "string", description: "One sentence the user would recognise." },
        },
        required: ["stage", "gaps"],
    },
    phase: 3,
    risk: "read",
    writes: false,
    execute: async (ctx, a) => {
        const list = (v: unknown, n: number) =>
            Array.isArray(v) ? v.slice(0, n).map((x) => String(x).slice(0, 200)) : [];

        const gaps = list(a.gaps, 3);
        if (!gaps.length) throw new Error("gaps must contain at least one point.");

        const doc = {
            uid: ctx.uid,
            taskId: ctx.taskId,
            company: optS(a.company, 120) ?? null,
            stage: S(a.stage, "stage", 40),
            strengths: list(a.strengths, 3),
            gaps,
            summary: optS(a.summary, 400) ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection("users").doc(ctx.uid).collection("practiceOutcomes").add(doc);

        return {
            kind: "practice_outcome",
            ...doc,
            createdAt: undefined,
            note: "Saved to their profile. Say the gaps back in one line; the card shows the detail.",
        };
    },
};
