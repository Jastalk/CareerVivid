/**
 * Career Agent — shared contracts.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * How approval is enforced
 *
 * A write tool is never executed during the model loop. When the model calls
 * one, the server validates the arguments, builds a human-readable diff, and
 * persists a PROPOSAL. The loop is told "proposed, awaiting user approval" and
 * moves on.
 *
 * The client renders the proposal as a card. Approving sends only the proposal
 * ID back; the server re-reads the stored arguments and executes them.
 *
 * The client therefore never supplies the arguments that get written. If it
 * could, the approval card would be decoration — an attacker (or a confused
 * client) could approve one thing and write another.
 */

export type ToolPhase = 1 | 2 | 3 | 4;

/** Tools the user may opt into auto-executing. Batch and credit-spending work is never eligible. */
export type RiskTier = "read" | "low_write" | "high_write";

export interface AgentTool {
    name: string;
    description: string;
    /**
     * OpenAPI-subset schema, as Gemini function calling expects.
     * `any` on property values because the SDK's `Schema` type is recursive and
     * nominal; declaring it here would force a cast at every tool definition.
     */
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
    phase: ToolPhase;
    risk: RiskTier;
    /**
     * Read tools run inline. Write tools produce a proposal instead.
     * Derived from `risk`, but stated explicitly so it is greppable.
     */
    writes: boolean;
    /** Credits charged on execution. Reads are 0. */
    action?: string;
    /**
     * Validate and normalise model-supplied arguments.
     * Throwing here rejects the call before anything is persisted.
     */
    validate?: (args: any) => any;
    /** One-line summary for the proposal card, e.g. "Add 3 jobs to your tracker". */
    summarize?: (args: any) => string;
    /** Executed for reads immediately, for writes only after approval. */
    execute: (ctx: ToolContext, args: any) => Promise<unknown>;
}

export interface ToolContext {
    uid: string;
    /** Groups every model call and write of one user request. */
    taskId: string;
    /** Latest browser route and bounded work surface, supplied on each tool relay. */
    route?: string;
    workspace?: import("./workspace").AgentWorkspace | null;
}

/** A change the agent wants to make, awaiting the user's decision. */
export interface AgentProposal {
    id: string;
    uid: string;
    taskId: string;
    tool: string;
    args: Record<string, unknown>;
    summary: string;
    /** Rendered for the approval card. Never contains raw documents. */
    diff: ProposalDiff;
    status: "pending" | "executing" | "approved" | "rejected" | "expired";
    createdAt: FirebaseFirestore.Timestamp;
    resolvedAt?: FirebaseFirestore.Timestamp;
    result?: unknown;
    error?: string;
}

export interface ProposalDiff {
    kind: "create" | "update" | "batch";
    entity: "resume" | "job" | "profile" | "session";
    /** Field-level before/after. `before` absent on create. */
    changes: Array<{ label: string; before?: string; after: string }>;
    /** For batch operations: one line per item. */
    items?: string[];
}

/**
 * The bounded context envelope sent with each turn.
 *
 * Built server-side from an explicit allowlist. Never a raw Firestore
 * passthrough — an agent that receives the user's whole document history both
 * costs more every turn and leaks fields no tool needs.
 */
export interface AgentContext {
    route: string;
    entity?: { type: "resume" | "job" | "course"; id: string };
    activeResumeId?: string;
    profile: {
        hasProfile: boolean;
        targetArchetypes: string[];
        targetLocations: string[];
        salaryRange?: string;
        /** Truncated. The full CV goes to tools that need it, not to every turn. */
        cvExcerpt?: string;
    };
    resumes: Array<{ id: string; title: string; updatedAt: string }>;
    tracker: {
        counts: Record<string, number>;
        recent: Array<{ id: string; title: string; company: string; status: string }>;
    };
    learning: Array<{ courseId: string; title: string; percentComplete: number }>;
    /** Weaknesses earlier rounds surfaced, so coaching builds on itself. */
    practiceGaps: Array<{ gap: string; stage: string; company?: string }>;
    recentTasks: Array<{ taskId: string; summary: string; at: string }>;
    /**
     * Pointer to the newest Interview Studio session, NOT the report itself.
     *
     * `practiceGaps` covers rounds the agent ran. This covers the scored
     * sessions it was never part of — which is most of them. A full report with
     * its transcript is thousands of tokens and irrelevant to most turns, but
     * without something in the envelope the model has no way to know one exists,
     * so it never asks. This is the smallest thing that makes
     * `getInterviewReport` discoverable.
     */
    lastPractice?: {
        sessionId: string;
        role: string;
        company?: string;
        at: string;
        overallScore?: number;
        attempts: number;
        /** False when the session was started but never finished — no report to fetch. */
        scored: boolean;
    };
}

/** Hard ceiling on the serialized envelope. Beyond this, fields are dropped newest-first. */
export const MAX_CONTEXT_BYTES = 12_000;
