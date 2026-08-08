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
import { type AgentTool } from "./types";

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

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

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

        return {
            kind: "open_stage",
            company: hit.company,
            stage,
            // `?stage=` is what CompanyQuestPage reads to auto-launch the round.
            route: `${hit.route}?stage=${stage}`,
            note: "Call navigateToRoute with this exact route. The round opens over the page and you stay reachable beside it — keep coaching while they work.",
        };
    },
};
