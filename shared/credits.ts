/**
 * CareerVivid credit system — THE single source of truth.
 *
 * This file is canonical. The web app imports it via the `@shared` alias;
 * `functions/` receives a generated copy at `functions/src/generated/credits.ts`
 * (see scripts/sync-shared.mjs) because the functions build is CommonJS and
 * scoped to `include: ["src"]`. CI fails if the copy is stale.
 *
 * Do not add a second price table anywhere. The three tables this replaces
 * disagreed on model IDs, not just prices, and one of them had no importers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The two-surface rule
 *
 *   Product surfaces (web, extension, mobile) bill by ACTION.  Users know what
 *   "tailor my resume" is; they do not know what gemini-3.1-flash-lite is.
 *
 *   The CLI bills by MODEL, per turn. It is a developer tool where model choice
 *   is explicit and deliberate.
 *
 * Both settle into one ledger, in one credit unit, against one monthly limit.
 * That is what makes them reconcilable.
 */

// ─────────────────────────────────────────────────────────────────────────────
// The unit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One credit is anchored to $0.003 of model cost at list price.
 *
 * This is an INTERNAL anchor for margin analysis and reconciliation. Never show
 * it to users — they see credits, not dollars.
 *
 * Margin at full burn:
 *   Free         100 cr →  $0.30 COGS  /  $0 revenue   (acquisition cost)
 *   Pro         1000 cr →  $3.00 COGS  /  $12 revenue  (75%)
 *   Max         4500 cr →  $13.50 COGS /  $35 revenue  (61%)
 *   Enterprise  1500 cr →  $4.50 COGS  /  $12 seat     (62%)
 *
 * Full burn is a ceiling, not an expectation. Typical utilisation is well under
 * half, so realised margin runs higher. Repricing should be driven by the
 * `costUsd` recorded on settled ledger entries, not by these estimates.
 */
export const CREDIT_UNIT_USD = 0.003;

// ─────────────────────────────────────────────────────────────────────────────
// Plan limits
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_MONTHLY_CREDITS = {
    free: 100,
    pro: 1_000,
    max: 4_500,
    enterprise: 1_500, // per seat, pooled
} as const;

export const ENTERPRISE_MINIMUM_SEATS = 2;

export type PlanKey = keyof typeof PLAN_MONTHLY_CREDITS;

/** Plan aliases that exist in Firestore user docs. */
const PLAN_ALIASES: Record<string, PlanKey> = {
    free: 'free',
    pro: 'pro',
    premium: 'pro',
    pro_monthly: 'pro',
    pro_sprint: 'pro',
    max: 'max',
    pro_max: 'max',
    enterprise: 'enterprise',
};

export const resolvePlan = (plan?: string): PlanKey => PLAN_ALIASES[plan ?? 'free'] ?? 'free';

// ─────────────────────────────────────────────────────────────────────────────
// Model rates — used for BOTH CLI pricing and COGS reconciliation
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelRate {
    /** USD per 1M input tokens. */
    inputPerM: number;
    /** USD per 1M output tokens. */
    outputPerM: number;
    /** USD per 1M input audio tokens (Live API only). */
    audioInPerM?: number;
    /** USD per 1M output audio tokens (Live API only). */
    audioOutPerM?: number;
    /** Credits charged per CLI turn. Omit to make the model unavailable to the CLI. */
    cliTurnCost?: number;
}

/**
 * VERIFY THESE against the actual Vertex bill before shipping. They are list
 * prices as understood at authoring time, and list prices move.
 *
 * The billable model allowlist is DERIVED from these keys (see isBillableModel),
 * so a model with no rate cannot be charged — which structurally prevents the
 * old failure where the advertised model IDs were rejected by the proxy.
 */
const RATES = {
    // cliTurnCost is AUTHORITATIVE — these are the prices main actually charges
    // (functions/src/agentProxy.ts + agentCredits.ts agreed on them before this
    // file existed). Do not "tidy" them toward the token rates below.
    //
    // inputPerM/outputPerM are ESTIMATES used only for COGS reconciliation, and
    // the 3.x figures are extrapolated. Verify against the Vertex bill before
    // trusting any margin analysis built on them.
    'gemini-3.1-flash-lite': { inputPerM: 0.10, outputPerM: 0.40, cliTurnCost: 1 },
    'gemma-4': { inputPerM: 0.10, outputPerM: 0.40, cliTurnCost: 1 },
    'gemini-3.5-flash-lite': { inputPerM: 0.10, outputPerM: 0.40, cliTurnCost: 1 },
    'gemini-3.5-flash': { inputPerM: 0.30, outputPerM: 2.50, cliTurnCost: 3 },
    'gemini-3.6-flash': { inputPerM: 1.25, outputPerM: 10.00, cliTurnCost: 5 },
    'gemini-2.5-flash-lite': { inputPerM: 0.10, outputPerM: 0.40, cliTurnCost: 1 },
    'gemini-2.5-flash': { inputPerM: 0.30, outputPerM: 2.50, cliTurnCost: 3 },
    'gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 10.00, cliTurnCost: 5 },
    'gemini-live-2.5-flash-native-audio': {
        inputPerM: 0.50,
        outputPerM: 2.00,
        audioInPerM: 3.00,
        audioOutPerM: 12.00,
        // No cliTurnCost: Live is metered by duration, never per turn.
    },
} satisfies Record<string, ModelRate>;

/** Model IDs stay literal for `ModelId`; values widen so optional fields are readable. */
export type ModelId = keyof typeof RATES;
export const MODEL_RATES: Record<ModelId, ModelRate> = RATES;

export const isBillableModel = (model: string): model is ModelId =>
    Object.prototype.hasOwnProperty.call(MODEL_RATES, model);

/** Models the CLI may request. Derived — never hand-maintained. */
export const CLI_MODELS = (Object.keys(MODEL_RATES) as ModelId[])
    .filter((m) => MODEL_RATES[m].cliTurnCost !== undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Action prices — what product surfaces charge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Priced by user-visible outcome, not by model. Stable across model swaps:
 * changing which model backs `resume.tailor` must not change what it costs.
 */
export const ACTION_PRICES = {
    // --- Agent ---
    'agent.turn': 1,              // only past the free daily allowance, or on escalation
    'agent.artifact.preview': 0,  // building a proposal is free; committing it is not

    // --- Resume ---
    'resume.tailor': 5,
    'resume.analyze': 2,
    'resume.generate': 3,
    'resume.bullet_edit': 2,

    // --- Jobs ---
    'job.search': 1,
    'job.prep_notes': 10,
    'job.evaluate': 2,

    // --- Interview ---
    'interview.question_gen': 2,

    // --- Portfolio & content ---
    'portfolio.generate': 5,
    'portfolio.refine': 2,
    'image.standard': 10,
    'image.pro': 20,
    'blog.cover_standard': 10,
    'blog.cover_pro': 20,

    // --- Developer tools ---
    'dev.reactflow_conversion': 5,
    'dev.architecture_gen': 10,
    'dev.code_review': 5,
    'dev.cli_publish': 0,
} as const;

export type ActionKey = keyof typeof ACTION_PRICES;

// ─────────────────────────────────────────────────────────────────────────────
// Live voice — metered by duration, NOT flat
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The old flat `TECH_INTERVIEW_VOICE: 15` was roughly 10x underpriced.
 *
 * A 30-minute native-audio session costs about $0.45 in model spend
 * (~57.6k input audio tokens + ~23k output audio tokens), which is ~150
 * credits at the anchor. Charging 15 lost ~$0.40 every session, and a Free
 * user could run six of them for $0 revenue.
 *
 * Duration billing also gives users the right incentive — and it is the same
 * incentive the architecture needs, since Live reprocesses accumulated context
 * and grows more expensive per turn the longer a session runs.
 */
export const VOICE_CREDITS_PER_MINUTE = 5;

/** Bill in 15s blocks so a 20s session is not charged a full minute. */
export const VOICE_BILLING_BLOCK_SECONDS = 15;

/** Hard per-session ceiling by plan, in minutes. Protects against runaway sessions. */
export const VOICE_SESSION_CAP_MINUTES: Record<PlanKey, number> = {
    free: 10,
    pro: 45,
    max: 90,
    enterprise: 90,
};

export const voiceCreditsForSeconds = (seconds: number): number => {
    const blocks = Math.ceil(Math.max(0, seconds) / VOICE_BILLING_BLOCK_SECONDS);
    const perBlock = VOICE_CREDITS_PER_MINUTE * (VOICE_BILLING_BLOCK_SECONDS / 60);
    return round2(blocks * perBlock);
};

// ─────────────────────────────────────────────────────────────────────────────
// Free conversation allowance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agent conversation is free, but only on the cheapest model and only up to a
 * daily cap. Both conditions matter:
 *
 *   - The model cap is what makes it affordable. A Flash-Lite turn costs about
 *     $0.0008. The same turn on Flash costs ~$0.0037 — 4.6x more. Free
 *     conversation on Flash would run ~$3.24/month for a heavy free user.
 *   - The daily cap is what bounds abuse. Once the agent has tools, an
 *     unmetered endpoint is a free Gemini proxy.
 *
 * Escalation to a stronger model is a deliberate, charged act.
 */
export const FREE_AGENT_TURNS_PER_DAY = 30;

/** The model that backs free conversation. */
export const FREE_AGENT_MODEL: ModelId = 'gemini-3.1-flash-lite';

// ─────────────────────────────────────────────────────────────────────────────
// Quoting
// ─────────────────────────────────────────────────────────────────────────────

export interface Quote {
    /** Credits to reserve. */
    credits: number;
    /** Stable identifier recorded on the ledger entry. */
    action: string;
    /** True when this turn is covered by the free daily allowance. */
    free: boolean;
}

export const quoteAction = (action: ActionKey): Quote => ({
    credits: ACTION_PRICES[action],
    action,
    free: ACTION_PRICES[action] === 0,
});

export const quoteCliTurn = (model: string): Quote => {
    if (!isBillableModel(model)) {
        throw new Error(
            `Unsupported model: ${model}. Supported: ${CLI_MODELS.join(', ')}`,
        );
    }
    const cost = MODEL_RATES[model].cliTurnCost;
    if (cost === undefined) {
        throw new Error(`Model ${model} is not available for per-turn billing.`);
    }
    return { credits: cost, action: `cli.turn:${model}`, free: false };
};

export const quoteAgentTurn = (freeTurnsUsedToday: number): Quote =>
    freeTurnsUsedToday < FREE_AGENT_TURNS_PER_DAY
        ? { credits: 0, action: 'agent.turn', free: true }
        : { credits: ACTION_PRICES['agent.turn'], action: 'agent.turn', free: false };

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation — what the call actually cost us
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelUsage {
    inputTokens?: number;
    outputTokens?: number;
    audioInputTokens?: number;
    audioOutputTokens?: number;
}

/**
 * Actual COGS in USD. Recorded on every settled ledger entry so pricing can be
 * revised from data rather than from the estimates in this file.
 */
export const usageCostUsd = (model: string, usage: ModelUsage): number => {
    if (!isBillableModel(model)) return 0;
    const r: ModelRate = MODEL_RATES[model];
    const m = (tokens: number | undefined, perM: number | undefined) =>
        ((tokens ?? 0) / 1_000_000) * (perM ?? 0);
    return (
        m(usage.inputTokens, r.inputPerM) +
        m(usage.outputTokens, r.outputPerM) +
        m(usage.audioInputTokens, r.audioInPerM) +
        m(usage.audioOutputTokens, r.audioOutPerM)
    );
};

/**
 * Settlement tolerance.
 *
 * If actual usage exceeds the quote by more than this factor, charge the quote
 * anyway and emit an alert. A user who was told "5 credits" must never be
 * billed 40 because our estimate was wrong — that is our mispricing to absorb
 * and to fix, not a surprise to pass on.
 */
export const SETTLEMENT_OVERAGE_TOLERANCE = 1.5;

export const settlementAmount = (quoted: number, actual: number): {
    charge: number;
    capped: boolean;
} => {
    const ceiling = quoted * SETTLEMENT_OVERAGE_TOLERANCE;
    return actual > ceiling
        ? { charge: quoted, capped: true }
        : { charge: round2(actual), capped: false };
};

// ─────────────────────────────────────────────────────────────────────────────

/** Credits are billed to 2dp; float drift across many increments is real. */
function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
