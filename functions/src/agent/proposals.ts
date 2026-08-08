/**
 * Proposal creation and execution — shared by the turn-based and Live agents.
 *
 * Both surfaces enforce approval identically: a write tool never executes when
 * the model asks for it. The server stores the validated arguments and hands
 * back an id; the user approves that id; the server re-reads the stored
 * arguments and runs them.
 *
 * The client never supplies what gets written. That property is the whole
 * reason the approval card means anything, and it must hold on BOTH surfaces —
 * a real-time voice agent that wrote directly would be a hole straight through
 * the text agent's guarantees.
 */

import * as admin from "firebase-admin";
import { TOOLS_BY_NAME } from "./tools";
import type { AgentProposal, ProposalDiff } from "./types";
import { reserve, settle, release } from "../credits/ledger";
import { ACTION_PRICES, VOICE_CREDITS_PER_MINUTE, type ActionKey } from "../generated/credits";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const PROPOSAL_TTL_MS = 30 * 60 * 1_000;

/** A proposal card needs to show WHAT changes, not a JSON blob. */
export function buildDiff(toolName: string, args: any): ProposalDiff {
    switch (toolName) {
        case "createResumeDraft":
            return {
                kind: "create",
                entity: "resume",
                changes: [
                    { label: "Title", after: args.title },
                    { label: "Name", after: `${args.firstName} ${args.lastName}`.trim() },
                    { label: "Role", after: args.jobTitle || "(none)" },
                    { label: "Email", after: args.email },
                    { label: "Summary", after: args.professionalSummary || "(none)" },
                    { label: "Skills", after: (args.skills ?? []).map((s: any) => s.name).join(", ") || "(none)" },
                    { label: "Roles", after: `${(args.employmentHistory ?? []).length} position(s)` },
                    { label: "Education", after: `${(args.education ?? []).length} entry(ies)` },
                ],
            };
        case "updateResumeSection":
            return {
                kind: "update",
                entity: "resume",
                changes: [{ label: args.section, after: String(args.value).slice(0, 800) }],
            };
        case "addTrackedJob":
            return {
                kind: args.jobs.length > 1 ? "batch" : "create",
                entity: "job",
                changes: [{ label: "Jobs", after: `${args.jobs.length}` }],
                items: args.jobs.map(
                    (j: any) => `${j.jobTitle} — ${j.companyName}${j.location ? ` (${j.location})` : ""}`,
                ),
            };
        case "moveJobToStage":
            return { kind: "update", entity: "job", changes: [{ label: "Stage", after: args.status }] };
        case "updateCareerProfile":
        case "setJobTargets":
            return {
                kind: "update",
                entity: "profile",
                changes: Object.entries(args)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => ({ label: k, after: Array.isArray(v) ? v.join(", ") : String(v) })),
            };
        case "tailorResume":
            return {
                kind: "create",
                entity: "resume",
                changes: [{ label: "New summary", after: String(args.summary).slice(0, 800) }],
            };
        case "startInterviewPractice":
            return {
                kind: "create",
                entity: "session",
                changes: [
                    { label: "Role", after: args.role },
                    { label: "Mode", after: String(args.mode).replace("_", " ") },
                ],
            };
        case "startVoiceSession":
            return {
                kind: "create",
                entity: "session",
                changes: [
                    { label: "Purpose", after: String(args.purpose).replace("_", " ") },
                    { label: "Estimated", after: `~${args.estimatedMinutes} min` },
                    { label: "Cost", after: `~${args.estimatedMinutes * VOICE_CREDITS_PER_MINUTE} credits` },
                ],
            };
        default:
            return {
                kind: "update",
                entity: "profile",
                changes: Object.entries(args).map(([k, v]) => ({ label: k, after: String(v).slice(0, 200) })),
            };
    }
}

export interface CreatedProposal {
    id: string;
    tool: string;
    summary: string;
    diff: ProposalDiff;
}

/**
 * Tool validators intentionally use optional fields for context such as a
 * tracked job or selected resume. Firestore rejects `undefined` anywhere in a
 * document, so remove those optional values before a proposal is persisted.
 * Keep this at the persistence boundary: every current and future write tool
 * gets the same protection without changing its model-facing schema.
 */
function removeUndefined<T>(value: T): T {
    if (Array.isArray(value)) {
        return value
            .filter((item) => item !== undefined)
            .map((item) => removeUndefined(item)) as T;
    }
    if (value && typeof value === "object" && value.constructor === Object) {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, item]) => item !== undefined)
                .map(([key, item]) => [key, removeUndefined(item)]),
        ) as T;
    }
    return value;
}

/** Persist a validated write for the user to approve. Returns what the card renders. */
export async function createProposal(opts: {
    uid: string;
    taskId: string;
    tool: string;
    args: Record<string, unknown>;
    summary: string;
}): Promise<CreatedProposal> {
    // Top-level: users/{uid}/** is client-writable via a catch-all rule, and a
    // forgeable proposal makes the approval card meaningless.
    const ref = db.collection("agentProposals").doc();
    const args = removeUndefined(opts.args);
    const proposal: AgentProposal = {
        id: ref.id,
        uid: opts.uid,
        taskId: opts.taskId,
        tool: opts.tool,
        args,
        summary: opts.summary,
        diff: buildDiff(opts.tool, args),
        status: "pending",
        createdAt: admin.firestore.Timestamp.now(),
    };
    await ref.set(proposal);
    return { id: ref.id, tool: proposal.tool, summary: proposal.summary, diff: proposal.diff };
}

export type ResolveOutcome =
    | { status: "approved"; result: unknown; creditsRemaining: number }
    | { status: "rejected" }
    | { status: "error"; code: "not_found" | "already_resolved" | "expired" | "no_credits" | "failed"; message: string };

/**
 * Approve or reject a stored proposal, executing it on approval.
 *
 * Ownership is checked on the document's `uid` field, not inferred from a path,
 * because these live in a top-level collection.
 */
export async function resolveProposal(opts: {
    uid: string;
    proposalId: string;
    approve: boolean;
}): Promise<ResolveOutcome> {
    const ref = db.collection("agentProposals").doc(opts.proposalId);

    /**
     * Claim the proposal transactionally before doing anything with it.
     *
     * A read-then-write would let two concurrent approvals — a double-click, or
     * a retry racing the original — both observe `pending` and both execute.
     * For `addTrackedJob` that means the jobs land twice; for `createResumeDraft`,
     * two resumes and two charges. The transaction makes exactly one caller win.
     */
    type Claim =
        | { ok: true; proposal: AgentProposal }
        | { ok: false; outcome: ResolveOutcome };

    const claim: Claim = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            return { ok: false as const, outcome: { status: "error", code: "not_found", message: "Proposal not found." } as ResolveOutcome };
        }

        const p = snap.data() as AgentProposal;
        if (p.uid !== opts.uid) {
            return { ok: false as const, outcome: { status: "error", code: "not_found", message: "Proposal not found." } as ResolveOutcome };
        }
        if (p.status !== "pending") {
            return { ok: false as const, outcome: { status: "error", code: "already_resolved", message: `Already ${p.status}.` } as ResolveOutcome };
        }
        if (Date.now() - p.createdAt.toMillis() > PROPOSAL_TTL_MS) {
            tx.update(ref, { status: "expired", resolvedAt: admin.firestore.Timestamp.now() });
            return { ok: false as const, outcome: { status: "error", code: "expired", message: "This proposal expired. Ask again." } as ResolveOutcome };
        }
        if (!opts.approve) {
            tx.update(ref, { status: "rejected", resolvedAt: admin.firestore.Timestamp.now() });
            return { ok: false as const, outcome: { status: "rejected" } as ResolveOutcome };
        }

        // Move out of `pending` inside the transaction so a racing caller loses.
        tx.update(ref, { status: "executing", claimedAt: admin.firestore.Timestamp.now() });
        return { ok: true as const, proposal: p };
    });

    if (!claim.ok) return claim.outcome;
    const p = claim.proposal;

    const tool = TOOLS_BY_NAME.get(p.tool);
    if (!tool) {
        await ref.update({ status: "pending" });
        return { status: "error", code: "failed", message: `Tool ${p.tool} no longer exists.` };
    }

    const credits = tool.action ? (ACTION_PRICES[tool.action as ActionKey] ?? 0) : 0;
    const res = await reserve({ uid: opts.uid, surface: "web", action: tool.action ?? p.tool, credits, taskId: p.taskId });
    if (!res.ok) {
        // Hand the claim back so the user can retry after topping up.
        await ref.update({ status: "pending" });
        return { status: "error", code: "no_credits", message: "Not enough credits for this action." };
    }

    try {
        // Arguments come from the stored proposal, never from the request.
        const result = await tool.execute({ uid: opts.uid, taskId: p.taskId }, p.args);
        await ref.update({
            status: "approved",
            resolvedAt: admin.firestore.Timestamp.now(),
            result: result ?? null,
        });
        await settle({ uid: opts.uid, entryId: res.entryId, result: "ok" });
        return { status: "approved", result, creditsRemaining: res.creditsRemaining };
    } catch (e: any) {
        await release({ uid: opts.uid, entryId: res.entryId, reason: e?.message ?? String(e) });
        // Back to pending so the user can retry rather than losing the proposal.
        await ref.update({ status: "pending", error: String(e?.message ?? e).slice(0, 500) });
        return { status: "error", code: "failed", message: e?.message ?? "Could not apply the change." };
    }
}
