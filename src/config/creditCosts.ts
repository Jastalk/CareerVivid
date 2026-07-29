/**
 * Centralized AI Credit Cost Configuration
 * Single source of truth for all AI feature pricing.
 *
 * Plan overview:
 *  - Free:       100 AI credits / month  (Gemini models only)
 *  - Pro:      1,000 AI credits / month
 *  - Max:      4,500 AI credits / month
 *  - Enterprise: 1,500 AI credits / seat / month (pooled, 2-seat minimum)
 */

// --- Tier Limits (Monthly) ---
export const FREE_PLAN_CREDIT_LIMIT = 100;        // Free tier: 100 credits/mo
export const PRO_PLAN_CREDIT_LIMIT = 1000;        // Pro: $12/mo or $120/yr → 1,000 credits
export const PRO_MAX_PLAN_CREDIT_LIMIT = 4500;    // Max: $35/mo or $372/yr → 4,500 credits
export const ENTERPRISE_PLAN_CREDIT_LIMIT = 1500; // Enterprise: $12/seat (pooled)
export const ENTERPRISE_MINIMUM_SEATS = 2;

// --- CLI Agent costs (per AI round-trip) ---
export const CLI_AGENT_COSTS = {
    'gemini-3.1-flash-lite': 1,  // 1 credit / turn
    'gemma-4': 1,                // 1 credit / turn
    'gemini-3.5-flash': 3,       // 3 credits / turn — default
    'gemini-3.6-flash': 5,       // 5 credits / turn — deep reasoning
} as const;

export const AI_CREDIT_COSTS = {
    // --- CLI Agent (per turn) ---
    CLI_AGENT_FLASH_LITE: 1,    // gemini-3.1-flash-lite / gemma-4
    CLI_AGENT_FLASH: 3,         // gemini-3.5-flash
    CLI_AGENT_PRO: 5,           // gemini-3.6-flash

    // --- Job Tools ---
    JOB_SEARCH: 1,               // Search & score jobs against resume
    RESUME_TAILOR: 5,            // AI resume tailoring
    JOB_PREP_NOTES_ALL: 10,      // Targeted job prep notes

    // --- Developer Tools ---
    CLI_PUBLISH: 0,              // Markdown/Mermaid via CLI (free)
    REACTFLOW_CONVERSION: 5,     // Snapshot to ReactFlow
    ARCHITECTURE_AUTO_GEN: 10,   // Architecture Auto-Gen
    CODE_REVIEW: 5,              // Automated Code Review

    // --- Portfolio & Content ---
    PORTFOLIO_GENERATE: 5,
    PORTFOLIO_REFINE: 2,
    BLOG_COVER_STANDARD: 10,
    BLOG_COVER_PRO: 20,
    BULLET_EDIT: 2,              // AI Bullet refinement

    // --- Interview Studio ---
    TECH_INTERVIEW_VOICE: 15,    // Technical System Design Voice Interview
    INTERVIEW_QUESTION_GEN: 2,

    // --- AI Image Generation ---
    IMAGE_STANDARD: 10,
    IMAGE_PRO: 20,
} as const;

export type AICreditCostKey = keyof typeof AI_CREDIT_COSTS;
