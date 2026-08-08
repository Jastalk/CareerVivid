/**
 * Credit ledger — reserve → settle → release.
 *
 * Replaces the bare `aiUsage.count` increment that was the only record of
 * spend. That counter could answer "how much is left" and nothing else: not
 * what a user spent credits on, not whether a price covers its model cost, not
 * whether a failed call was refunded.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Two representations, one transaction
 *
 *   users/{uid}.aiUsage.count        the balance. Fast, single-doc read, and
 *                                    the ENFORCEMENT path. Unchanged shape, so
 *                                    existing readers keep working.
 *
 *   creditLedger/{id}                the history. Per-transaction audit with
 *                                    real model cost attached. Top-level and
 *                                    server-only — see reserve() for why.
 *
 * Both are written in the same Firestore transaction, so they cannot drift.
 * Enforcement stays on the counter permanently — a balance check must not
 * become a collection scan.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why reserve first
 *
 * Credits are deducted BEFORE the model call. That is deliberate: it is what
 * stops N concurrent requests from each seeing the same balance and
 * collectively overspending the limit. The cost is that a failed call has
 * already been billed, which is why `release` exists and why every caller must
 * use try/finally.
 */

import * as admin from "firebase-admin";
import {
    type ModelUsage,
    type PlanKey,
    PLAN_MONTHLY_CREDITS,
    ENTERPRISE_MINIMUM_SEATS,
    resolvePlan,
    usageCostUsd,
    settlementAmount,
    FREE_AGENT_TURNS_PER_DAY,
} from "../generated/credits";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export type Surface = "web" | "cli" | "extension" | "mobile";
export type EntryStatus = "reserved" | "settled" | "released";
export type EntryResult = "ok" | "error" | "denied";

export interface LedgerEntry {
    uid: string;
    ts: FirebaseFirestore.Timestamp;
    status: EntryStatus;
    surface: Surface;
    action: string;
    /** Groups the many model calls of one agent task under a single unit of work. */
    taskId?: string;
    quoted: number;
    actual?: number;
    model?: string;
    usage?: ModelUsage;
    /** Real COGS in USD. The input that makes repricing evidence-based. */
    costUsd?: number;
    result?: EntryResult;
    error?: string;
    /** True when actual exceeded the quote past tolerance and we absorbed it. */
    capped?: boolean;
}

export interface ReserveRequest {
    uid: string;
    surface: Surface;
    action: string;
    credits: number;
    taskId?: string;
    model?: string;
}

export type ReserveResult =
    | { ok: true; entryId: string; quoted: number; creditsRemaining: number; monthlyLimit: number }
    | { ok: false; reason: "limit_reached" | "user_not_found"; creditsRemaining: number; monthlyLimit: number };

const currentMonth = (): string => new Date().toISOString().slice(0, 7);
const currentDay = (): string => new Date().toISOString().slice(0, 10);

/** Monthly allowance including seats and promotional top-ups. */
export function monthlyLimitFor(userData: FirebaseFirestore.DocumentData): number {
    const plan: PlanKey = resolvePlan(userData.plan);
    const base =
        plan === "enterprise"
            ? Math.max(ENTERPRISE_MINIMUM_SEATS, userData.seats || 1) * PLAN_MONTHLY_CREDITS.enterprise
            : PLAN_MONTHLY_CREDITS[plan];
    return base + (userData.promotions?.tokenCredits || 0);
}

const isAdmin = (u: FirebaseFirestore.DocumentData): boolean =>
    u.role === "admin" || (u.roles || []).includes("admin");

/**
 * Reserve credits and open a ledger entry.
 *
 * A zero-credit reservation still writes an entry — free actions are the ones
 * most worth measuring, because they are where unpriced cost hides.
 */
export async function reserve(req: ReserveRequest): Promise<ReserveResult> {
    const userRef = db.collection("users").doc(req.uid);
    // Top-level, NOT users/{uid}/creditLedger: that namespace has a
    // `match /{allChildren=**}` rule granting the owner write access, and
    // Firestore rules are additive — a stricter rule cannot take it back. A
    // client-writable ledger is not an audit trail.
    const entryRef = db.collection("creditLedger").doc();

    return db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) {
            return { ok: false as const, reason: "user_not_found" as const, creditsRemaining: 0, monthlyLimit: 0 };
        }

        const userData = snap.data()!;
        const limit = monthlyLimitFor(userData);
        const aiUsage = userData.aiUsage || {};
        const month = currentMonth();
        const used: number = aiUsage.month === month ? aiUsage.count ?? 0 : 0;

        // Reserve buffer: stop 2 credits short so a multi-call task cannot strand
        // the user mid-way through with a partially-applied change.
        if (!isAdmin(userData) && req.credits > 0 && used + req.credits > limit - 2) {
            return {
                ok: false as const,
                reason: "limit_reached" as const,
                creditsRemaining: Math.max(0, limit - used),
                monthlyLimit: limit,
            };
        }

        const entry: LedgerEntry = {
            uid: req.uid,
            ts: admin.firestore.Timestamp.now(),
            status: "reserved",
            surface: req.surface,
            action: req.action,
            quoted: req.credits,
            ...(req.taskId ? { taskId: req.taskId } : {}),
            ...(req.model ? { model: req.model } : {}),
        };
        tx.set(entryRef, entry);

        tx.set(
            userRef,
            {
                aiUsage: {
                    month,
                    count: aiUsage.month === month
                        ? admin.firestore.FieldValue.increment(req.credits)
                        : req.credits,
                    [`${req.surface}Count`]: admin.firestore.FieldValue.increment(req.credits),
                },
            },
            { merge: true },
        );

        return {
            ok: true as const,
            entryId: entryRef.id,
            quoted: req.credits,
            creditsRemaining: Math.max(0, limit - used - req.credits),
            monthlyLimit: limit,
        };
    });
}

/**
 * Close a reservation with what it actually cost.
 *
 * `actualCredits` defaults to the quote — correct for fixed-price actions,
 * where the quote IS the price. Pass a value only for metered work (Live voice
 * by duration, CLI turns priced from real token counts).
 */
export async function settle(opts: {
    uid: string;
    entryId: string;
    actualCredits?: number;
    model?: string;
    usage?: ModelUsage;
    result?: EntryResult;
}): Promise<{ charged: number; capped: boolean }> {
    const userRef = db.collection("users").doc(opts.uid);
    const entryRef = db.collection("creditLedger").doc(opts.entryId);

    return db.runTransaction(async (tx) => {
        const snap = await tx.get(entryRef);
        if (!snap.exists) return { charged: 0, capped: false };

        const entry = snap.data() as LedgerEntry;
        if (entry.uid !== opts.uid) return { charged: 0, capped: false };
        if (entry.status !== "reserved") {
            // Already settled or released. Settling twice would double-charge.
            return { charged: entry.actual ?? 0, capped: entry.capped ?? false };
        }

        const raw = opts.actualCredits ?? entry.quoted;
        const { charge, capped } = settlementAmount(entry.quoted, raw);
        const delta = charge - entry.quoted;

        const model = opts.model ?? entry.model;
        const costUsd = model && opts.usage ? usageCostUsd(model, opts.usage) : undefined;

        tx.update(entryRef, {
            status: "settled",
            actual: charge,
            result: opts.result ?? "ok",
            ...(capped ? { capped: true } : {}),
            ...(model ? { model } : {}),
            ...(opts.usage ? { usage: opts.usage } : {}),
            ...(costUsd !== undefined ? { costUsd } : {}),
        });

        if (delta !== 0) {
            tx.set(
                userRef,
                { aiUsage: { count: admin.firestore.FieldValue.increment(delta) } },
                { merge: true },
            );
        }

        if (capped) {
            console.warn(
                `[ledger] MISPRICED action=${entry.action} quoted=${entry.quoted} actual=${raw} ` +
                `— charged the quote and absorbed the difference. Reprice this action.`,
            );
        }

        return { charged: charge, capped };
    });
}

/**
 * Give the reservation back. Call when the work did not happen.
 *
 * A failed release must never mask the error the caller is already reporting,
 * so this swallows its own failures after logging them.
 */
export async function release(opts: {
    uid: string;
    entryId: string;
    reason: string;
    result?: EntryResult;
}): Promise<void> {
    const userRef = db.collection("users").doc(opts.uid);
    const entryRef = db.collection("creditLedger").doc(opts.entryId);

    try {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(entryRef);
            if (!snap.exists) return;

            const entry = snap.data() as LedgerEntry;
            if (entry.uid !== opts.uid) return;
            if (entry.status !== "reserved") return;

            tx.update(entryRef, {
                status: "released",
                actual: 0,
                result: opts.result ?? "error",
                error: opts.reason.slice(0, 500),
            });

            if (entry.quoted !== 0) {
                tx.set(
                    userRef,
                    { aiUsage: { count: admin.firestore.FieldValue.increment(-entry.quoted) } },
                    { merge: true },
                );
            }
        });
    } catch (e: any) {
        console.error(`[ledger] release failed uid=${opts.uid} entry=${opts.entryId}:`, e?.message);
    }
}

/**
 * Consume one free agent turn if the daily allowance has room.
 *
 * Returns whether the turn is free. Daily rather than monthly because the
 * allowance exists to bound abuse, and a monthly bucket lets it all be drained
 * on day one.
 */
export async function consumeFreeAgentTurn(uid: string): Promise<{ free: boolean; remaining: number }> {
    const userRef = db.collection("users").doc(uid);

    return db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) return { free: false, remaining: 0 };

        const today = currentDay();
        const ft = snap.data()!.aiUsage?.freeTurns || {};
        const usedToday: number = ft.date === today ? ft.count ?? 0 : 0;

        if (usedToday >= FREE_AGENT_TURNS_PER_DAY) {
            return { free: false, remaining: 0 };
        }

        tx.set(
            userRef,
            { aiUsage: { freeTurns: { date: today, count: usedToday + 1 } } },
            { merge: true },
        );

        return { free: true, remaining: FREE_AGENT_TURNS_PER_DAY - usedToday - 1 };
    });
}

/**
 * Run work with credits reserved, settling or releasing automatically.
 *
 * Every billed path should go through this. Hand-rolled try/finally is how
 * `agentCredits.ts` ended up with no refund path at all while `agentProxy.ts`
 * had one.
 */
export async function withCredits<T>(
    req: ReserveRequest,
    work: (ctx: { entryId: string }) => Promise<{ value: T; actualCredits?: number; usage?: ModelUsage; model?: string }>,
): Promise<{ ok: true; value: T; creditsRemaining: number } | { ok: false; reason: string; creditsRemaining: number; monthlyLimit: number }> {
    const res = await reserve(req);
    if (!res.ok) {
        return { ok: false, reason: res.reason, creditsRemaining: res.creditsRemaining, monthlyLimit: res.monthlyLimit };
    }

    try {
        const out = await work({ entryId: res.entryId });
        await settle({
            uid: req.uid,
            entryId: res.entryId,
            actualCredits: out.actualCredits,
            usage: out.usage,
            model: out.model ?? req.model,
            result: "ok",
        });
        return { ok: true, value: out.value, creditsRemaining: res.creditsRemaining };
    } catch (e: any) {
        await release({ uid: req.uid, entryId: res.entryId, reason: e?.message ?? String(e) });
        throw e;
    }
}
