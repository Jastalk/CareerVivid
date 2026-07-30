import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

const stripeOpenRevenueRestrictedKey = defineSecret("STRIPE_OPEN_REVENUE_RESTRICTED_KEY");
const STRIPE_API_VERSION = "2026-02-25.clover";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BALANCE_TRANSACTION_PAGES = 100;

type RevenuePoint = {
  label: string;
  date: string;
  grossRevenueCents: number;
  netRevenueCents: number;
  chargeCount: number;
};

type RevenueSourceMode = "balance_transactions" | "charges";

type NormalizedRevenueTransaction = {
  currency: string;
  created: number;
  grossRevenueCents: number;
  netRevenueCents: number;
  stripeFeesCents: number;
  refundedCents: number;
  chargeCount: number;
};

type RevenueSummary = {
  grossRevenueCents: number;
  netRevenueCents: number;
  stripeFeesCents: number;
  refundedCents: number;
  chargeCount: number;
};

const startOfUtcDay = (date: Date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const startOfUtcMonth = (date: Date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

const toUnixSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const formatMonthLabel = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const isRevenueTransaction = (transaction: Stripe.BalanceTransaction) => {
  return transaction.type === "charge" || transaction.type === "payment";
};

const isRefundTransaction = (transaction: Stripe.BalanceTransaction) => {
  return transaction.type === "refund" || transaction.type === "payment_refund";
};

const isPublicRevenueTransaction = (transaction: Stripe.BalanceTransaction) => {
  return isRevenueTransaction(transaction) || isRefundTransaction(transaction);
};

async function listBalanceTransactions(stripe: Stripe) {
  const transactions: NormalizedRevenueTransaction[] = [];
  let startingAfter: string | undefined;
  let hitPageLimit = false;

  for (let page = 0; page < MAX_BALANCE_TRANSACTION_PAGES; page += 1) {
    const response = await stripe.balanceTransactions.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    transactions.push(...response.data.filter(isPublicRevenueTransaction).map(normalizeBalanceTransaction));

    if (!response.has_more) {
      return { transactions, hitPageLimit: false };
    }

    const lastTransaction = response.data[response.data.length - 1];
    if (!lastTransaction) {
      return { transactions, hitPageLimit: false };
    }

    startingAfter = lastTransaction.id;
  }

  hitPageLimit = true;
  return { transactions, hitPageLimit };
}

async function listCharges(stripe: Stripe) {
  const transactions: NormalizedRevenueTransaction[] = [];
  let startingAfter: string | undefined;
  let hitPageLimit = false;

  for (let page = 0; page < MAX_BALANCE_TRANSACTION_PAGES; page += 1) {
    const response = await stripe.charges.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    transactions.push(...response.data.filter((charge) => charge.paid).map(normalizeCharge));

    if (!response.has_more) {
      return { transactions, hitPageLimit: false };
    }

    const lastCharge = response.data[response.data.length - 1];
    if (!lastCharge) {
      return { transactions, hitPageLimit: false };
    }

    startingAfter = lastCharge.id;
  }

  hitPageLimit = true;
  return { transactions, hitPageLimit };
}

async function listRevenueTransactions(stripe: Stripe): Promise<{
  transactions: NormalizedRevenueTransaction[];
  hitPageLimit: boolean;
  sourceMode: RevenueSourceMode;
}> {
  try {
    return {
      ...(await listBalanceTransactions(stripe)),
      sourceMode: "balance_transactions",
    };
  } catch (error) {
    const stripeError = error as { statusCode?: number; type?: string };
    if (stripeError.statusCode !== 403) {
      throw error;
    }

    return {
      ...(await listCharges(stripe)),
      sourceMode: "charges",
    };
  }
}

async function countActiveSubscriptions(stripe: Stripe) {
  let count = 0;
  let startingAfter: string | undefined;

  for (let page = 0; page < 50; page += 1) {
    const response = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    count += response.data.length;

    if (!response.has_more) {
      return count;
    }

    const lastSubscription = response.data[response.data.length - 1];
    if (!lastSubscription) {
      return count;
    }

    startingAfter = lastSubscription.id;
  }

  return count;
}

function normalizeBalanceTransaction(transaction: Stripe.BalanceTransaction): NormalizedRevenueTransaction {
  if (isRevenueTransaction(transaction)) {
    return {
      currency: transaction.currency.toUpperCase(),
      created: transaction.created,
      grossRevenueCents: transaction.amount,
      netRevenueCents: transaction.net,
      stripeFeesCents: transaction.fee,
      refundedCents: 0,
      chargeCount: 1,
    };
  }

  const refundAmount = Math.abs(transaction.amount);
  return {
    currency: transaction.currency.toUpperCase(),
    created: transaction.created,
    grossRevenueCents: -refundAmount,
    netRevenueCents: transaction.net,
    stripeFeesCents: 0,
    refundedCents: refundAmount,
    chargeCount: 0,
  };
}

function normalizeCharge(charge: Stripe.Charge): NormalizedRevenueTransaction {
  const refundedCents = charge.amount_refunded || 0;
  const grossRevenueCents = Math.max(0, charge.amount - refundedCents);

  return {
    currency: charge.currency.toUpperCase(),
    created: charge.created,
    grossRevenueCents,
    netRevenueCents: grossRevenueCents,
    stripeFeesCents: 0,
    refundedCents,
    chargeCount: 1,
  };
}

function resolvePrimaryCurrency(transactions: NormalizedRevenueTransaction[]) {
  const counts = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.chargeCount <= 0) continue;
    const currency = transaction.currency;
    counts.set(currency, (counts.get(currency) || 0) + 1);
  }

  let primaryCurrency = "USD";
  let highestCount = 0;
  for (const [currency, count] of counts.entries()) {
    if (count > highestCount) {
      primaryCurrency = currency;
      highestCount = count;
    }
  }

  return primaryCurrency;
}

function summarizeTransactions(
  transactions: NormalizedRevenueTransaction[],
  currency: string,
  startInclusive?: Date,
  endExclusive?: Date
): RevenueSummary {
  const startSeconds = startInclusive ? toUnixSeconds(startInclusive) : Number.NEGATIVE_INFINITY;
  const endSeconds = endExclusive ? toUnixSeconds(endExclusive) : Number.POSITIVE_INFINITY;

  return transactions.reduce<RevenueSummary>(
    (summary, transaction) => {
      if (transaction.currency !== currency) return summary;
      if (transaction.created < startSeconds || transaction.created >= endSeconds) return summary;
      summary.grossRevenueCents += transaction.grossRevenueCents;
      summary.netRevenueCents += transaction.netRevenueCents;
      summary.stripeFeesCents += transaction.stripeFeesCents;
      summary.refundedCents += transaction.refundedCents;
      summary.chargeCount += transaction.chargeCount;

      return summary;
    },
    {
      grossRevenueCents: 0,
      netRevenueCents: 0,
      stripeFeesCents: 0,
      refundedCents: 0,
      chargeCount: 0,
    }
  );
}

function buildDailyRevenue(
  transactions: NormalizedRevenueTransaction[],
  currency: string,
  today: Date
): RevenuePoint[] {
  const points: RevenuePoint[] = [];
  const start = new Date(startOfUtcDay(today).getTime() - 29 * DAY_MS);

  for (let index = 0; index < 30; index += 1) {
    const dayStart = new Date(start.getTime() + index * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const summary = summarizeTransactions(transactions, currency, dayStart, dayEnd);

    points.push({
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(dayStart),
      date: toIsoDate(dayStart),
      grossRevenueCents: summary.grossRevenueCents,
      netRevenueCents: summary.netRevenueCents,
      chargeCount: summary.chargeCount,
    });
  }

  return points;
}

function buildMonthlyRevenue(
  transactions: NormalizedRevenueTransaction[],
  currency: string,
  today: Date
): RevenuePoint[] {
  const points: RevenuePoint[] = [];
  const currentMonth = startOfUtcMonth(today);
  const firstMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 11, 1));

  for (let index = 0; index < 12; index += 1) {
    const monthStart = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
    const summary = summarizeTransactions(transactions, currency, monthStart, monthEnd);

    points.push({
      label: formatMonthLabel(monthStart),
      date: toIsoDate(monthStart),
      grossRevenueCents: summary.grossRevenueCents,
      netRevenueCents: summary.netRevenueCents,
      chargeCount: summary.chargeCount,
    });
  }

  return points;
}

export const getOpenRevenueStats = onRequest(
  {
    region: "us-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: true,
    secrets: [stripeOpenRevenueRestrictedKey],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, OPTIONS");
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const restrictedKey = stripeOpenRevenueRestrictedKey.value().trim();
    if (!restrictedKey) {
      res.status(503).json({
        ok: false,
        error: "Open revenue Stripe secret is not configured.",
        code: "stripe_secret_not_configured",
      });
      return;
    }

    try {
      const stripe = new Stripe(restrictedKey, {
        apiVersion: STRIPE_API_VERSION,
      });
      const now = new Date();
      const today = startOfUtcDay(now);
      const last30Start = new Date(today.getTime() - 29 * DAY_MS);
      const previous30Start = new Date(last30Start.getTime() - 30 * DAY_MS);
      const previous30End = last30Start;
      const monthStart = startOfUtcMonth(now);

      const [{ transactions, hitPageLimit, sourceMode }, activeSubscriptions] = await Promise.all([
        listRevenueTransactions(stripe),
        countActiveSubscriptions(stripe),
      ]);
      const primaryCurrency = resolvePrimaryCurrency(transactions);
      const allTime = summarizeTransactions(transactions, primaryCurrency);
      const last30Days = summarizeTransactions(transactions, primaryCurrency, last30Start);
      const previous30Days = summarizeTransactions(transactions, primaryCurrency, previous30Start, previous30End);
      const monthToDate = summarizeTransactions(transactions, primaryCurrency, monthStart);

      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
      res.status(200).json({
        ok: true,
        verified: true,
        source: "stripe",
        sourceMode,
        currency: primaryCurrency,
        lastUpdated: now.toISOString(),
        activeSubscriptions,
        allTime,
        last30Days,
        previous30Days,
        monthToDate,
        dailyRevenue: buildDailyRevenue(transactions, primaryCurrency, now),
        monthlyRevenue: buildMonthlyRevenue(transactions, primaryCurrency, now),
        inspectedTransactionCount: transactions.length,
        isLimitedByPageCap: hitPageLimit,
        netRevenueIncludesStripeFees: sourceMode === "balance_transactions",
        privacy: {
          customerDataIncluded: false,
          paymentDataIncluded: false,
          aggregateOnly: true,
        },
      });
      return;
    } catch (error) {
      console.error("[openRevenue] Failed to load aggregate Stripe revenue", error);
      res.status(502).json({
        ok: false,
        error: "Unable to load verified Stripe revenue right now.",
        code: "stripe_revenue_fetch_failed",
      });
      return;
    }
  }
);
