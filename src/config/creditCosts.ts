/**
 * Web-app view of the credit system.
 *
 * The numbers live in `shared/credits.ts` — the one place web, functions, and
 * CLI all read from. This file only re-shapes them for existing callers.
 *
 * It previously held two of the three competing price tables. `CLI_AGENT_COSTS`
 * is gone: it had no importers, and it advertised model IDs (`…-preview`) that
 * the backend allowlist rejects outright. Use `CLI_MODELS` from shared instead.
 */

import {
    MODEL_RATES,
    PLAN_MONTHLY_CREDITS,
    ENTERPRISE_MINIMUM_SEATS as SHARED_MIN_SEATS,
    ACTION_PRICES,
    FREE_AGENT_TURNS_PER_DAY,
    VOICE_CREDITS_PER_MINUTE,
} from '@shared/credits';

export {
    ACTION_PRICES,
    FREE_AGENT_TURNS_PER_DAY,
    VOICE_CREDITS_PER_MINUTE,
    CLI_MODELS,
    MODEL_RATES,
    voiceCreditsForSeconds,
    quoteAction,
    resolvePlan,
} from '@shared/credits';
export type { ActionKey, ModelId, PlanKey } from '@shared/credits';

// --- Tier limits (monthly) ---
export const FREE_PLAN_CREDIT_LIMIT = PLAN_MONTHLY_CREDITS.free;
export const PRO_PLAN_CREDIT_LIMIT = PLAN_MONTHLY_CREDITS.pro;
export const PRO_MAX_PLAN_CREDIT_LIMIT = PLAN_MONTHLY_CREDITS.max;
export const ENTERPRISE_PLAN_CREDIT_LIMIT = PLAN_MONTHLY_CREDITS.enterprise;
export const ENTERPRISE_MINIMUM_SEATS = SHARED_MIN_SEATS;

/**
 * Legacy alias map.
 *
 * Existing UI imports `AI_CREDIT_COSTS.RESUME_TAILOR`; the canonical key is
 * `'resume.tailor'`. Kept so this consolidation is not also a refactor of every
 * call site — migrate consumers to `ACTION_PRICES` and delete this.
 */
export const AI_CREDIT_COSTS = {
    /**
     * Legacy CLI keys, still read by the landing-page calculator.
     * Values come from MODEL_RATES so they cannot drift from what the backend
     * actually charges — which is exactly how the old table ended up quoting
     * prices no function honoured.
     */
    CLI_AGENT_FLASH_LITE: MODEL_RATES['gemini-3.1-flash-lite'].cliTurnCost ?? 1,
    CLI_AGENT_FLASH: MODEL_RATES['gemini-3.5-flash'].cliTurnCost ?? 3,
    CLI_AGENT_PRO: MODEL_RATES['gemini-3.6-flash'].cliTurnCost ?? 5,

    JOB_SEARCH: ACTION_PRICES['job.search'],
    RESUME_TAILOR: ACTION_PRICES['resume.tailor'],
    JOB_PREP_NOTES_ALL: ACTION_PRICES['job.prep_notes'],
    CLI_PUBLISH: ACTION_PRICES['dev.cli_publish'],
    REACTFLOW_CONVERSION: ACTION_PRICES['dev.reactflow_conversion'],
    ARCHITECTURE_AUTO_GEN: ACTION_PRICES['dev.architecture_gen'],
    CODE_REVIEW: ACTION_PRICES['dev.code_review'],
    PORTFOLIO_GENERATE: ACTION_PRICES['portfolio.generate'],
    PORTFOLIO_REFINE: ACTION_PRICES['portfolio.refine'],
    BLOG_COVER_STANDARD: ACTION_PRICES['blog.cover_standard'],
    BLOG_COVER_PRO: ACTION_PRICES['blog.cover_pro'],
    BULLET_EDIT: ACTION_PRICES['resume.bullet_edit'],
    INTERVIEW_QUESTION_GEN: ACTION_PRICES['interview.question_gen'],
    IMAGE_STANDARD: ACTION_PRICES['image.standard'],
    IMAGE_PRO: ACTION_PRICES['image.pro'],

    /**
     * Voice is metered per minute now, not flat.
     *
     * The old flat 15 was roughly 10x under cost — a 30-minute native-audio
     * session runs about $0.45, or ~150 credits. This value is the FLOOR shown
     * before a session starts; the real charge is duration-based and settled by
     * `endAgentVoiceSession`.
     */
    TECH_INTERVIEW_VOICE: VOICE_CREDITS_PER_MINUTE,
} as const;

export type AICreditCostKey = keyof typeof AI_CREDIT_COSTS;
