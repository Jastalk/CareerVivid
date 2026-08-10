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

/** camelCase argument keys are field names, not language. */
const FIELD_LABEL: Record<string, string> = {
    professionalSummary: "Summary",
    employmentHistory: "Experience",
    education: "Education",
    skills: "Skills",
    title: "Title",
    cvMarkdown: "Master CV",
    targetArchetypes: "Target roles",
    targetLocations: "Locations",
    targetSalaryMin: "Salary from",
    targetSalaryMax: "Salary to",
};

const humanLabel = (key: string): string =>
    FIELD_LABEL[key] ??
    key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

/**
 * Render one resume section the way a person would read it.
 *
 * `updateResumeSection` takes list sections as a JSON-encoded string, and the
 * card was printing that string verbatim — the user was shown
 * `[{"name":"System Design","level":"Intermediate"}, …]` and asked to approve
 * it. A card nobody can read is not consent, it is a rubber stamp, so the list
 * sections are decoded into the same item list the batch tools already use.
 */
function resumeSectionDiff(section: string, raw: string): ProposalDiff {
    const base = { kind: "update" as const, entity: "resume" as const };
    const isList = ["skills", "employmentHistory", "education"].includes(section);

    let parsed: unknown;
    if (isList) {
        try {
            parsed = JSON.parse(raw);
        } catch {
            // The tool's own validator rejects this on execute. Until then show
            // the raw text rather than pretending it parsed.
            parsed = undefined;
        }
    }

    if (!Array.isArray(parsed)) {
        return { ...base, changes: [{ label: humanLabel(section), after: raw.slice(0, 800) }] };
    }

    const items = parsed
        .map((entry: any) => {
            if (entry == null) return "";
            if (typeof entry === "string") return entry;
            switch (section) {
                case "skills":
                    return [entry.name, entry.level].filter(Boolean).join(" · ");
                case "employmentHistory": {
                    const dates = [entry.startDate, entry.endDate].filter(Boolean);
                    return (
                        [entry.jobTitle, entry.employer].filter(Boolean).join(" — ") +
                        (dates.length ? ` (${dates.join("–")})` : "")
                    );
                }
                case "education":
                    return [entry.degree, entry.school].filter(Boolean).join(" — ");
                default:
                    return "";
            }
        })
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 40);

    const noun = parsed.length === 1 ? "entry" : "entries";
    return {
        ...base,
        changes: [{ label: humanLabel(section), after: `${parsed.length} ${noun}` }],
        // Every entry rendering empty means the shape is not what we expected.
        // Falling back to the raw value here would reprint the JSON blob this
        // function exists to avoid, so say only what we actually know.
        items: items.length
            ? items
            : [`${parsed.length} ${noun}, replacing the current ${humanLabel(section).toLowerCase()}`],
    };
}

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
            return resumeSectionDiff(String(args.section), String(args.value));
        case "addResumeSkills":
            return {
                kind: "update",
                entity: "resume",
                // "Adds" rather than a count of the final list: the card has to
                // make it obvious nothing is being removed, which is the whole
                // difference between this tool and updateResumeSection.
                changes: [{ label: "Adds", after: `${args.skills.length} new skill${args.skills.length === 1 ? "" : "s"}` }],
                items: args.skills.map((s: any) =>
                    [String(s?.name ?? ""), s?.level ? String(s.level) : ""].filter(Boolean).join(" · "),
                ),
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
                    .map(([k, v]) => ({
                        label: humanLabel(k),
                        after: Array.isArray(v) ? v.join(", ") : String(v).slice(0, 800),
                    })),
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
                changes: Object.entries(args).map(([k, v]) => ({
                    label: humanLabel(k),
                    // `String()` on an object gives "[object Object]", which tells
                    // the user nothing at all. JSON at least shows the values.
                    after: (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)).slice(0, 200),
                })),
            };
    }
}

export interface CreatedProposal {
    id: string;
    tool: string;
    summary: string;
    diff: ProposalDiff;
    /** True when this is a pending card that already existed, not a new one. */
    reused?: boolean;
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

/**
 * Persist a validated write for the user to approve. Returns what the card renders.
 *
 * An identical pending proposal is returned as-is rather than duplicated.
 *
 * This is what breaks the loop the Live agent got stuck in. A write returns
 * "awaiting_approval"; the model is told not to call it again; when it did
 * anyway it got a brand-new proposal back, which reads like progress, so it
 * called again — thinking, working, thinking, working, and never a word to the
 * user. Returning the existing card makes the repeat visibly a no-op, and lets
 * the caller tell the model plainly that it is repeating itself.
 *
 * It also fixes the user-facing half: one intent should be one card, not a
 * stack of identical ones each of which would execute separately if approved.
 */
export async function createProposal(opts: {
    uid: string;
    taskId: string;
    tool: string;
    args: Record<string, unknown>;
    summary: string;
}): Promise<CreatedProposal> {
    const args = removeUndefined(opts.args);

    /*
     * One equality filter, everything else matched in memory.
     *
     * `taskId` scopes to a single request or voice session, so this reads a
     * handful of documents at most, and a single-field filter needs only the
     * automatic index — no composite index to deploy alongside the code, and
     * nothing to go wrong if that deploy is forgotten. Should a task somehow
     * exceed the cap, the worst case is a duplicate card: exactly the old
     * behaviour, never a wrong one.
     */
    const pending = await db
        .collection("agentProposals")
        .where("taskId", "==", opts.taskId)
        .limit(25)
        .get();

    const fingerprint = JSON.stringify(args);
    const duplicate = pending.docs.find((d) => {
        const p = d.data() as AgentProposal;
        if (p.uid !== opts.uid || p.tool !== opts.tool || p.status !== "pending") return false;
        if (JSON.stringify(p.args ?? {}) !== fingerprint) return false;
        // An expired card is not on screen any more, so it is not a duplicate of
        // anything the user can still act on.
        return Date.now() - p.createdAt.toMillis() <= PROPOSAL_TTL_MS;
    });

    if (duplicate) {
        const p = duplicate.data() as AgentProposal;
        return { id: p.id, tool: p.tool, summary: p.summary, diff: p.diff, reused: true };
    }

    // Top-level: users/{uid}/** is client-writable via a catch-all rule, and a
    // forgeable proposal makes the approval card meaningless.
    const ref = db.collection("agentProposals").doc();
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
