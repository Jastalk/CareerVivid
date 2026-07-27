import { onRequest } from "firebase-functions/v2/https";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import * as admin from "firebase-admin";
import { CareerVividEmailModule, generateCareerVividEmail, generateCareerVividModuleEmail } from "./emailTemplates";
import { ENTERPRISE_MINIMUM_SEATS } from "./utils/planLimits";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const envPrice = (name: string) => process.env[name]?.trim() || "";

// Price IDs for the different plans. Stripe Price amounts are immutable, so the
// 2026 catalog IDs must be supplied after the new Prices are created in Stripe.
const PRICE_IDS = {
    SPRINT: "price_1ScLNsRJNflGxv32cvu6cTsK", // The 7-Day Sprint - One-time
    DOWNLOAD_ONCE: "price_1TcIecRJNflGxv32sYZFOnn5", // Download Once - $2.99
    DOWNLOAD_ONCE_LEGACY: "price_1ScLPERJNflGxv32Wxtpvg62", // Download Once - $1.99 legacy price
    NFC_CUSTOM: "price_1So67jRJNflGxv32TKsC7AbX", // Custom NFC Card - $12.90
    NFC_STANDARD: "price_1So6AtRJNflGxv32qHMPnhwz", // Standard NFC Card - $9.89
    // Active 2026 subscription catalog
    PRO_MONTHLY: envPrice("STRIPE_PRICE_PRO_MONTHLY") || "price_1TfQaqRJNflGxv32GIVnEOKu",
    PRO_ANNUAL: envPrice("STRIPE_PRICE_PRO_ANNUAL") || "price_1TfQaqRJNflGxv32OZ73C04t",
    MAX_MONTHLY: envPrice("STRIPE_PRICE_MAX_MONTHLY") || "price_1TfQarRJNflGxv32CC7MqVnt",
    MAX_ANNUAL: envPrice("STRIPE_PRICE_MAX_ANNUAL") || "price_1TfQarRJNflGxv323VMZLt0U",
    ENTERPRISE_MONTHLY: envPrice("STRIPE_PRICE_ENTERPRISE_MONTHLY") || "price_1TfQauRJNflGxv32cDBdjco9",
    // Legacy subscription listeners retained for existing subscribers and old webhooks.
    LEGACY_PRO_MONTHLY: "price_1ScLOaRJNflGxv32BwQnSBs0",
    LEGACY_PRO_LIVE: "price_1TJoONRJNflGxv32zSqxC9bZ",
    LEGACY_MAX_LIVE: "price_1TJoONRJNflGxv32wxPHw9FR",
    LEGACY_ENTERPRISE_LIVE: "price_1TJoQyRJNflGxv32FQ9TxIjq",
} as const;

// One-time payment price IDs
const ONE_TIME_PRICE_IDS = [
    PRICE_IDS.SPRINT,
    PRICE_IDS.DOWNLOAD_ONCE,
    PRICE_IDS.DOWNLOAD_ONCE_LEGACY,
    PRICE_IDS.NFC_CUSTOM,
    PRICE_IDS.NFC_STANDARD,
];

const DOWNLOAD_ONCE_PRICE_IDS = [
    PRICE_IDS.DOWNLOAD_ONCE,
    PRICE_IDS.DOWNLOAD_ONCE_LEGACY,
];

const ACTIVE_SUBSCRIPTION_PRICE_IDS = [
    PRICE_IDS.PRO_MONTHLY,
    PRICE_IDS.PRO_ANNUAL,
    PRICE_IDS.MAX_MONTHLY,
    PRICE_IDS.MAX_ANNUAL,
    PRICE_IDS.ENTERPRISE_MONTHLY,
].filter(Boolean);

const LEGACY_SUBSCRIPTION_PRICE_IDS = [
    PRICE_IDS.LEGACY_PRO_MONTHLY,
    PRICE_IDS.LEGACY_PRO_LIVE,
    PRICE_IDS.LEGACY_MAX_LIVE,
    PRICE_IDS.LEGACY_ENTERPRISE_LIVE,
];

const cleanBillingFeedback = (value: unknown, maxLength: number) =>
    typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const isPaidPlanLike = (plan?: string | null) =>
    !!plan && !["free", "none", "trial"].includes(plan);

function resolveSubscriptionPrice(priceId?: string | null): {
    plan: "pro" | "max" | "enterprise" | "pro_monthly";
    billingInterval: "month" | "year";
    legacy: boolean;
} | null {
    if (!priceId) return null;

    if (priceId === PRICE_IDS.PRO_MONTHLY) return { plan: "pro", billingInterval: "month", legacy: false };
    if (priceId === PRICE_IDS.PRO_ANNUAL) return { plan: "pro", billingInterval: "year", legacy: false };
    if (priceId === PRICE_IDS.MAX_MONTHLY) return { plan: "max", billingInterval: "month", legacy: false };
    if (priceId === PRICE_IDS.MAX_ANNUAL) return { plan: "max", billingInterval: "year", legacy: false };
    if (priceId === PRICE_IDS.ENTERPRISE_MONTHLY) return { plan: "enterprise", billingInterval: "month", legacy: false };

    if (priceId === PRICE_IDS.LEGACY_PRO_MONTHLY) return { plan: "pro_monthly", billingInterval: "month", legacy: true };
    if (priceId === PRICE_IDS.LEGACY_PRO_LIVE) return { plan: "pro", billingInterval: "month", legacy: true };
    if (priceId === PRICE_IDS.LEGACY_MAX_LIVE) return { plan: "max", billingInterval: "month", legacy: true };
    if (priceId === PRICE_IDS.LEGACY_ENTERPRISE_LIVE) return { plan: "enterprise", billingInterval: "month", legacy: true };

    return null;
}

function assertCheckoutPriceAllowed(priceId: string, mode: Stripe.Checkout.SessionCreateParams.Mode) {
    if (mode === "payment") {
        if (ONE_TIME_PRICE_IDS.includes(priceId as any)) return;
        throw new HttpsError("invalid-argument", "Unsupported one-time Stripe price ID.");
    }

    if (ACTIVE_SUBSCRIPTION_PRICE_IDS.includes(priceId)) return;

    throw new HttpsError(
        "failed-precondition",
        "This subscription price is not configured in the active CareerVivid catalog. Create the Stripe Price and set the matching STRIPE_PRICE_* environment variable."
    );
}

function resolveCheckoutPriceId(priceId: string) {
    if (priceId === PRICE_IDS.LEGACY_PRO_MONTHLY || priceId === PRICE_IDS.LEGACY_PRO_LIVE) {
        return PRICE_IDS.PRO_MONTHLY;
    }

    if (priceId === PRICE_IDS.LEGACY_MAX_LIVE) {
        return PRICE_IDS.MAX_MONTHLY;
    }

    if (priceId === PRICE_IDS.LEGACY_ENTERPRISE_LIVE) {
        return PRICE_IDS.ENTERPRISE_MONTHLY;
    }

    return priceId;
}

function normalizeCheckoutQuantity(
    quantity: unknown,
    priceId: string,
    mode: Stripe.Checkout.SessionCreateParams.Mode
) {
    const requestedQuantity = Math.floor(Number(quantity || 1));
    const safeQuantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1;

    if (mode === "subscription" && priceId === PRICE_IDS.ENTERPRISE_MONTHLY) {
        return Math.max(ENTERPRISE_MINIMUM_SEATS, safeQuantity);
    }

    return safeQuantity;
}

// One visible "Download Once" purchase gets backend retry allowance for failed exports.
const PDF_DOWNLOAD_CREDITS_PER_PURCHASE = 3;

/**
 * Creates a Stripe checkout session for purchasing a plan
 */
export const createCheckoutSession = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1",
        memory: "512MiB",
    },
    async (request) => {
        // Verify authentication
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        const { priceId, successUrl, cancelUrl, quantity, metadata, mode: requestedMode } = request.data;

        if (!priceId || !successUrl || !cancelUrl) {
            throw new HttpsError(
                "invalid-argument",
                "Missing required parameters: priceId, successUrl, cancelUrl"
            );
        }

        try {
            const stripe = new Stripe(stripeSecretKey.value(), {
                apiVersion: "2026-02-25.clover",
            });

            const userId = request.auth.uid;
            const userEmail = request.auth.token.email || undefined;

            // Get or create Stripe customer
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            let stripeCustomerId = userDoc.data()?.stripeCustomerId;

            if (!stripeCustomerId) {
                const customer = await stripe.customers.create({
                    email: userEmail,
                    metadata: {
                        firebaseUID: userId,
                    },
                });
                stripeCustomerId = customer.id;

                // Save customer ID to Firestore
                await admin.firestore().collection("users").doc(userId).set(
                    { stripeCustomerId: stripeCustomerId },
                    { merge: true }
                );
            }

            const checkoutPriceId = resolveCheckoutPriceId(priceId);
            // Determine mode: use requested mode if provided, otherwise check if price is one-time
            const mode: Stripe.Checkout.SessionCreateParams.Mode =
                requestedMode === 'payment' || ONE_TIME_PRICE_IDS.includes(checkoutPriceId as any) ? "payment" : "subscription";
            assertCheckoutPriceAllowed(checkoutPriceId, mode);
            const checkoutQuantity = normalizeCheckoutQuantity(quantity, checkoutPriceId, mode);
            // Caller-supplied metadata is spread FIRST so it can never shadow the
            // fields the webhook grants entitlements from. It previously came last,
            // which meant a client could pass { priceId: <Max annual> } alongside a
            // $2.99 one-time price and be granted Max, or pass another user's
            // { userId } and hand them a plan.
            //
            // The reserved keys are also stripped, so a caller cannot smuggle one
            // through by relying on spread order alone.
            const RESERVED_METADATA_KEYS = ["userId", "priceId", "requestedPriceId", "seats"];
            const callerMetadata: Record<string, string> = {};
            for (const [key, value] of Object.entries(metadata || {})) {
                if (RESERVED_METADATA_KEYS.includes(key)) continue;
                callerMetadata[key] = String(value);
            }

            const checkoutMetadata = {
                ...callerMetadata,
                userId: userId,
                priceId: checkoutPriceId,
                requestedPriceId: priceId,
                ...(checkoutPriceId === PRICE_IDS.ENTERPRISE_MONTHLY ? { seats: String(checkoutQuantity) } : {}),
            };

            try {
                // Create checkout session
                const session = await stripe.checkout.sessions.create({
                    customer: stripeCustomerId,
                    mode: mode,
                    line_items: [{ price: checkoutPriceId, quantity: checkoutQuantity }],
                    success_url: successUrl,
                    cancel_url: cancelUrl,
                    metadata: checkoutMetadata,
                });

                return { url: session.url, sessionId: session.id };
            } catch (error: any) {
                // Handle "No such customer" error (e.g. from environment switch)
                if (error.code === 'resource_missing' && error.param === 'customer') {
                    console.warn(`Customer ${stripeCustomerId} not found in Stripe. Creating new customer...`);

                    const newCustomer = await stripe.customers.create({
                        email: userEmail,
                        metadata: { firebaseUID: userId },
                    });
                    const newCustomerId = newCustomer.id;

                    await admin.firestore().collection("users").doc(userId).set(
                        { stripeCustomerId: newCustomerId },
                        { merge: true }
                    );

                    // Retry with new customer ID
                    const session = await stripe.checkout.sessions.create({
                        customer: newCustomerId,
                        mode: mode,
                        line_items: [{ price: checkoutPriceId, quantity: checkoutQuantity }],
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        metadata: checkoutMetadata,
                    });

                    return { url: session.url, sessionId: session.id };
                }
                throw error;
            }
        } catch (error: any) {
            console.error("Error creating checkout session:", error);
            throw new HttpsError("internal", `Failed to create checkout session: ${error.message}`);
        }
    }
);

/**
 * Handles Stripe webhook events
 */
export const stripeWebhook = onRequest(
    {
        secrets: [stripeSecretKey, stripeWebhookSecret],
        region: "us-west1",
        memory: "512MiB",
    },
    async (req, res) => {
        const stripe = new Stripe(stripeSecretKey.value(), {
            apiVersion: "2026-02-25.clover",
        });

        // Verify webhook signature
        const sig = req.headers["stripe-signature"];
        if (!sig) {
            console.error("No stripe-signature header");
            res.status(400).send("Missing stripe-signature header");
            return;
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                req.rawBody,
                sig,
                stripeWebhookSecret.value()
            );
        } catch (err: any) {
            console.error("Webhook signature verification failed:", err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        // Handle the event
        try {
            switch (event.type) {
                case "checkout.session.completed": {
                    const session = event.data.object as Stripe.Checkout.Session;
                    await handleCheckoutCompleted(session, stripe);
                    break;
                }

                case "customer.subscription.updated": {
                    const subscription = event.data.object as Stripe.Subscription;
                    await handleSubscriptionUpdated(subscription);
                    break;
                }

                case "customer.subscription.deleted": {
                    const subscription = event.data.object as Stripe.Subscription;
                    await handleSubscriptionDeleted(subscription);
                    break;
                }

                case "invoice.paid": {
                    const invoice = event.data.object as Stripe.Invoice;
                    await handleInvoicePaid(invoice);
                    break;
                }

                case "invoice.payment_failed": {
                    const invoice = event.data.object as Stripe.Invoice;
                    await handleInvoicePaymentFailed(invoice);
                    break;
                }

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            res.json({ received: true });
        } catch (error: any) {
            console.error("Error processing webhook:", error);
            res.status(500).send(`Webhook processing error: ${error.message}`);
        }
    }
);

async function grantPdfDownloadCreditForCheckoutSession(
    session: Stripe.Checkout.Session,
    userId: string,
    source: "webhook" | "return_verification",
    /** The price Stripe actually charged. Callers that have read it back from the
     *  line items pass it here; falling back to metadata keeps older callers
     *  working, but the charged price is the authority. */
    chargedPriceId?: string
): Promise<{ credited: boolean; downloadCredits: number }> {
    const priceId = chargedPriceId ?? session.metadata?.priceId;

    if (!priceId || !DOWNLOAD_ONCE_PRICE_IDS.includes(priceId as any)) {
        throw new HttpsError("invalid-argument", "Checkout session is not for a PDF download credit.");
    }

    if (session.payment_status !== "paid") {
        throw new HttpsError("failed-precondition", "Checkout session has not been paid.");
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
    const processedRef = db.collection("stripeProcessedCheckoutSessions").doc(session.id);
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;
    let credited = false;
    let downloadCredits = 0;

    await db.runTransaction(async (transaction) => {
        const [processedDoc, userDoc] = await Promise.all([
            transaction.get(processedRef),
            transaction.get(userRef),
        ]);
        const currentCredits = Number(userDoc.data()?.downloadCredits || 0);

        if (processedDoc.exists) {
            downloadCredits = currentCredits;
            return;
        }

        downloadCredits = currentCredits + PDF_DOWNLOAD_CREDITS_PER_PURCHASE;
        credited = true;

        transaction.set(userRef, {
            downloadCredits: admin.firestore.FieldValue.increment(PDF_DOWNLOAD_CREDITS_PER_PURCHASE),
            stripeCustomerId: stripeCustomerId || userDoc.data()?.stripeCustomerId || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        transaction.set(processedRef, {
            sessionId: session.id,
            userId,
            priceId,
            purchaseType: "pdf_download_credit",
            creditsGranted: PDF_DOWNLOAD_CREDITS_PER_PURCHASE,
            customer: stripeCustomerId,
            paymentIntent: paymentIntentId,
            source,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });

    return { credited, downloadCredits };
}

export const verifyPdfCreditCheckout = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1",
        memory: "512MiB",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        const sessionId = String(request.data?.sessionId || "");
        if (!sessionId.startsWith("cs_")) {
            throw new HttpsError("invalid-argument", "Missing or invalid checkout session ID.");
        }

        const stripe = new Stripe(stripeSecretKey.value(), {
            apiVersion: "2026-02-25.clover",
        });

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const sessionUserId = session.metadata?.userId;

        if (sessionUserId !== request.auth.uid) {
            throw new HttpsError("permission-denied", "Checkout session does not belong to this user.");
        }

        return grantPdfDownloadCreditForCheckoutSession(session, request.auth.uid, "return_verification");
    }
);

/**
 * Cancels a user's subscription at the end of the current billing period
 */
export const cancelSubscription = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        const userId = request.auth.uid;
        const cancellationReason = cleanBillingFeedback(request.data?.cancellationReason, 160);
        const feedbackText = cleanBillingFeedback(request.data?.feedbackText, 4000);

        try {
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const userData = userDoc.data();
            let stripeSubscriptionId = userData?.stripeSubscriptionId;
            const stripeCustomerId = userData?.stripeCustomerId;
            const userRef = admin.firestore().collection("users").doc(userId);

            const recordCancellationFeedback = async (
                status: "scheduled" | "fixed_state",
                cancelAt?: number | null
            ) => {
                if (!cancellationReason && !feedbackText) return;

                try {
                    await userRef.collection("billing_cancellation_feedback").add({
                        reason: cancellationReason || null,
                        feedbackText: feedbackText || null,
                        status,
                        cancelAt: cancelAt || null,
                        plan: userData?.plan || null,
                        subscriptionStatus: userData?.subscriptionStatus || userData?.stripeSubscriptionStatus || null,
                        stripeSubscriptionId: stripeSubscriptionId || null,
                        stripeCustomerId: stripeCustomerId || null,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                } catch (logError) {
                    console.error("Failed to record cancellation feedback:", logError);
                    // Do not block cancellation if internal feedback logging fails.
                }
            };

            const stripe = new Stripe(stripeSecretKey.value(), {
                apiVersion: "2026-02-25.clover",
            });

            // Fallback: If no subscription ID but we have a customer ID, try to find it from Stripe
            if (!stripeSubscriptionId && stripeCustomerId) {
                console.log(`No subscription ID for user ${userId}, searching via customer ${stripeCustomerId}...`);
                const subscriptions = await stripe.subscriptions.list({
                    customer: stripeCustomerId,
                    status: 'all',
                    limit: 10
                });
                const cancellableSubscription = subscriptions.data.find((subscription) =>
                    ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
                );

                if (cancellableSubscription) {
                    stripeSubscriptionId = cancellableSubscription.id;
                    console.log(`Found active subscription ${stripeSubscriptionId} for user ${userId}`);

                    // Self-repair: Save this ID back to Firestore
                    await admin.firestore().collection("users").doc(userId).update({
                        stripeSubscriptionId: stripeSubscriptionId
                    });
                }
            }

            if (!stripeSubscriptionId) {
                // If still no ID, we really can't cancel anything.
                // But if the user THINKS they are active (in Firestore), we should fix their state 
                // so they aren't stuck in "Active" limbo forever.
                const localSubscriptionStatus = userData?.subscriptionStatus || userData?.stripeSubscriptionStatus;
                if (
                    localSubscriptionStatus === 'active' ||
                    localSubscriptionStatus === 'active_canceling' ||
                    isPaidPlanLike(userData?.plan)
                ) {
                    console.warn(`User ${userId} has paid local state but no Stripe subscription found. Resetting to free.`);
                    await userRef.update({
                        subscriptionStatus: 'canceled',
                        stripeSubscriptionStatus: 'canceled',
                        plan: 'free',
                        resumeLimit: 1,
                        promotions: { isPremium: false },
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    await recordCancellationFeedback("fixed_state", null);
                    return { status: "fixed_state", message: "Subscription not found in Stripe. Local status updated to Free." };
                }

                throw new HttpsError("not-found", "No active subscription found to cancel.");
            }

            const localSubscriptionStatus = userData?.subscriptionStatus || userData?.stripeSubscriptionStatus;
            const resetPaidLocalState = async () => {
                console.warn(`User ${userId} has paid local state but no cancellable Stripe subscription. Resetting to free.`);
                await userRef.update({
                    subscriptionStatus: 'canceled',
                    stripeSubscriptionStatus: 'canceled',
                    plan: 'free',
                    resumeLimit: 1,
                    promotions: { isPremium: false },
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                await recordCancellationFeedback("fixed_state", null);
                return { status: "fixed_state", message: "No cancellable Stripe subscription was found. Local status updated to Free." };
            };

            const hasPaidLocalState =
                localSubscriptionStatus === 'active' ||
                localSubscriptionStatus === 'active_canceling' ||
                isPaidPlanLike(userData?.plan);

            let subscription: Stripe.Subscription;
            try {
                const currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
                if (!["active", "trialing", "past_due", "unpaid"].includes(currentSubscription.status)) {
                    if (hasPaidLocalState) {
                        return await resetPaidLocalState();
                    }

                    throw new HttpsError("failed-precondition", "Subscription is not active.");
                }

                // Update subscription to cancel at period end
                subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
                    cancel_at_period_end: true,
                });
            } catch (stripeError: any) {
                if (
                    hasPaidLocalState &&
                    (stripeError?.code === "resource_missing" || /No such subscription/i.test(stripeError?.message || ""))
                ) {
                    return await resetPaidLocalState();
                }

                throw stripeError;
            }

            // Update Firestore immediately to reflect key status
            await admin.firestore().collection("users").doc(userId).set(
                {
                    subscriptionStatus: "active_canceling", // Indicates active but will cancel
                    stripeSubscriptionStatus: "active_canceling",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );

            await recordCancellationFeedback("scheduled", subscription.cancel_at);

            // Send cancellation confirmation email with win-back CTA
            const cancelDate = subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric"
                })
                : "your next billing date";

            try {
                await sendCancellationConfirmationEmail(
                    userData?.email,
                    userData?.displayName || "there",
                    cancelDate
                );
            } catch (emailError) {
                console.error(`Cancellation email could not be queued for user ${userId}:`, emailError);
                // Stripe cancellation has already succeeded; do not report the whole request as failed.
            }

            return {
                status: "success",
                cancelAt: subscription.cancel_at
            };
        } catch (error: any) {
            console.error("Error canceling subscription:", error);
            throw new HttpsError("internal", `Failed to cancel subscription: ${error.message}`);
        }
    }
);

/**
 * Applies a retention discount to an active subscription
 */
export const applyDiscount = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        const { discountType } = request.data;
        if (!['RETENTION_10', 'RETENTION_20'].includes(discountType)) {
            throw new HttpsError("invalid-argument", "Invalid discount type");
        }

        const userId = request.auth.uid;
        const stripe = new Stripe(stripeSecretKey.value(), {
            apiVersion: "2026-02-25.clover",
        });

        try {
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const userData = userDoc.data();
            let stripeSubscriptionId = userData?.stripeSubscriptionId;

            // Fallback logic from cancelSubscription
            if (!stripeSubscriptionId && userData?.stripeCustomerId) {
                const subscriptions = await stripe.subscriptions.list({
                    customer: userData.stripeCustomerId,
                    status: 'active',
                    limit: 1
                });
                if (subscriptions.data.length > 0) {
                    stripeSubscriptionId = subscriptions.data[0].id;
                }
            }

            if (!stripeSubscriptionId) {
                throw new HttpsError("not-found", "No active subscription found to apply discount.");
            }

            // Ensure Coupon Exists
            const couponId = discountType === 'RETENTION_10' ? 'RETENTION_10_OFF_3_MONTHS' : 'RETENTION_20_OFF_3_MONTHS';
            const percentOff = discountType === 'RETENTION_10' ? 10 : 20;

            try {
                await stripe.coupons.retrieve(couponId);
            } catch (err) {
                // Create if missing
                await stripe.coupons.create({
                    id: couponId,
                    percent_off: percentOff,
                    duration: 'repeating',
                    duration_in_months: 3,
                    name: `${percentOff}% Off Retention Offer`
                });
            }

            // Apply to Subscription (using modern discounts array)
            // CRITICAL: We must also set cancel_at_period_end: false to ensure we UN-CANCEL if they were previously cancelling
            await stripe.subscriptions.update(stripeSubscriptionId, {
                discounts: [{ coupon: couponId }],
                cancel_at_period_end: false,
            });

            // Log it
            await admin.firestore().collection("users").doc(userId).collection("activity_logs").add({
                action: 'retention_discount_applied',
                discountType,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Ensure user status is active (in case they were active_canceling)
            await admin.firestore().collection("users").doc(userId).set({
                subscriptionStatus: 'active',
                promotions: { isPremium: true },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return { status: "success", message: `Applied ${percentOff}% discount.` };

        } catch (error: any) {
            console.error("Error applying discount:", error);

            // Handle "No such customer" or "No such subscription"
            if (error.code === 'resource_missing') {
                console.warn(`Stripe resource missing for user ${userId}. Resetting to free.`);
                await admin.firestore().collection("users").doc(userId).update({
                    subscriptionStatus: 'canceled',
                    plan: 'free',
                    resumeLimit: 1,
                    promotions: { isPremium: false }
                });
                return { status: "fixed_state", message: "Subscription not found in Stripe. Local status updated to Free." };
            }

            throw new HttpsError("internal", `Failed to apply discount: ${error.message}`);
        }
    }
);

/**
 * Handle successful checkout completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
    // Entitlements are granted from the price Stripe actually charged, read back
    // from the line items — not from session.metadata.priceId. Metadata is a
    // free-text field; deriving "what did they buy" from the charge itself means
    // a tampered or stale metadata value cannot upgrade anyone.
    let priceId: string | undefined;
    try {
        const expanded = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items"],
        });
        priceId = expanded.line_items?.data?.[0]?.price?.id ?? undefined;
    } catch (error: any) {
        console.error(`Could not read line items for session ${session.id}:`, error.message);
        return;
    }

    if (!priceId) {
        console.error(`No price on session ${session.id}; refusing to grant entitlements.`);
        return;
    }

    // Prefer the uid recorded on the Stripe customer at creation time. It is
    // written server-side in createCheckoutSession and is not part of the
    // client-controlled payload.
    let userId = session.metadata?.userId;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (customerId) {
        try {
            const customer = await stripe.customers.retrieve(customerId);
            if (!customer.deleted) {
                const linkedUid = customer.metadata?.firebaseUID;
                if (linkedUid) {
                    if (userId && linkedUid !== userId) {
                        console.error(
                            `Session ${session.id} metadata userId ${userId} does not match customer ${customerId} firebaseUID ${linkedUid}; using the customer's.`
                        );
                    }
                    userId = linkedUid;
                }
            }
        } catch (error: any) {
            console.warn(`Could not read customer ${customerId}:`, error.message);
        }
    }

    if (!userId) {
        console.error("No userId resolvable for session", session.id);
        return;
    }

    const userRef = admin.firestore().collection("users").doc(userId);

    try {
        if (priceId && DOWNLOAD_ONCE_PRICE_IDS.includes(priceId as any)) {
            const result = await grantPdfDownloadCreditForCheckoutSession(session, userId, "webhook", priceId);
            console.log(
                result.credited
                    ? `Download credit added for user ${userId}`
                    : `Download credit already processed for session ${session.id}`
            );
        } else if (priceId === PRICE_IDS.SPRINT) {
            // One-time Sprint purchase
            const expiresAt = admin.firestore.Timestamp.fromMillis(
                Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
            );

            await userRef.set(
                {
                    plan: "pro_sprint",
                    resumeLimit: 9999,
                    expiresAt: expiresAt,
                    stripeCustomerId: session.customer,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    promotions: {
                        isPremium: true,
                    },
                },
                { merge: true }
            );

            console.log(`Sprint plan activated for user ${userId}, expires at ${expiresAt.toDate()}`);
        } else {
            const subscriptionPrice = resolveSubscriptionPrice(priceId);

            if (!subscriptionPrice) {
                console.warn(`Ignoring checkout session ${session.id} for unrecognized subscription price ${priceId}`);
                return;
            }

            const seats = subscriptionPrice.plan === "enterprise"
                ? normalizeCheckoutQuantity(session.metadata?.seats, PRICE_IDS.ENTERPRISE_MONTHLY, "subscription")
                : null;

            // Subscription activated
            await userRef.set(
                {
                    plan: subscriptionPrice.plan,
                    ...(seats ? { seats } : {}),
                    resumeLimit: 9999, // Legacy unrestricted resumes (credits handle AI logic)
                    subscriptionStatus: "active",
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription,
                    stripePriceId: priceId,
                    billingInterval: subscriptionPrice.billingInterval,
                    subscriptionCatalogVersion: subscriptionPrice.legacy ? "legacy" : "2026-06-06",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    promotions: {
                        isPremium: true,
                    },
                },
                { merge: true }
            );

            console.log(`${subscriptionPrice.plan} subscription activated for user ${userId}`);
        }
    } catch (error) {
        console.error(`Error updating user ${userId}:`, error);
        throw error;
    }
}

/**
 * Handle subscription updates (e.g., renewed, downgraded, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    // Find user by Stripe customer ID
    const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(`No user found for customer ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    const status = subscription.status;
    let firestoreStatus: string = status;
    const subscriptionPriceId = subscription.items.data[0]?.price?.id;
    const subscriptionPrice = resolveSubscriptionPrice(subscriptionPriceId);

    // If subscription is active but scheduled to cancel, mark as 'active_canceling'
    if (status === 'active' && subscription.cancel_at_period_end) {
        firestoreStatus = 'active_canceling';
    }

    const isPremium = status === "active" || status === "trialing";

    const updateData: admin.firestore.UpdateData<admin.firestore.DocumentData> = {
        subscriptionStatus: firestoreStatus as any,
        stripeSubscriptionStatus: firestoreStatus as any,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscriptionPriceId || null,
        promotions: {
            isPremium: isPremium,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (subscriptionPrice) {
        updateData.plan = subscriptionPrice.plan;
        updateData.billingInterval = subscriptionPrice.billingInterval;
        updateData.subscriptionCatalogVersion = subscriptionPrice.legacy ? "legacy" : "2026-06-06";
        updateData.resumeLimit = isPremium ? 9999 : 1;

        if (subscriptionPrice.plan === "enterprise") {
            updateData.seats = normalizeCheckoutQuantity(
                subscription.items.data[0]?.quantity,
                PRICE_IDS.ENTERPRISE_MONTHLY,
                "subscription"
            );
        }
    }

    await userDoc.ref.set(updateData, { merge: true });

    console.log(`Subscription updated for user ${userId}: ${firestoreStatus} (Stripe: ${status})`);
}

/**
 * Handle subscription cancellation/deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    // Find user by Stripe customer ID
    const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(`No user found for customer ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    await userDoc.ref.set(
        {
            subscriptionStatus: "canceled",
            stripeSubscriptionStatus: "canceled",
            resumeLimit: 1, // Revert to free tier
            plan: "free",
            promotions: {
                isPremium: false,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    console.log(`Subscription canceled for user ${userId}, reverted to free tier`);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    // Find user by Stripe customer ID
    const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(`No user found for customer ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Send invoice email
    await sendInvoiceEmail(
        userData.email,
        userData.displayName || "Valued Customer",
        invoice
    );

    console.log(`Invoice ${invoice.id} paid and email sent to user ${userDoc.id}`);
}

/**
 * Handle failed invoice payment
 * Revokes premium access and notifies user
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    // Find user by Stripe customer ID
    const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error(`No user found for customer ${customerId}`);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // CRITICAL: Revoke premium access immediately
    await userDoc.ref.set({
        subscriptionStatus: "payment_failed",
        promotions: { isPremium: false },
        paymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Premium access revoked for user ${userDoc.id} due to payment failure`);

    // Send payment failed notification with update payment link
    await sendPaymentFailedEmail(
        userData.email,
        userData.displayName || "Valued Customer",
        invoice
    );

    console.log(`Payment failed email sent to user ${userDoc.id}`);
}

/**
 * Send invoice email using Firestore mail collection
 */
async function sendInvoiceEmail(
    userEmail: string,
    userName: string,
    invoice: Stripe.Invoice
) {
    const mailRef = admin.firestore().collection("mail").doc();

    const invoiceNumber = invoice.number || invoice.id;
    const amount = (invoice.amount_paid / 100).toFixed(2);
    const date = new Date(invoice.created * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const planName = getPlanName(invoice);
    const invoiceUrl = invoice.invoice_pdf || invoice.hosted_invoice_url || "#";

    await mailRef.set({
        to: userEmail,
        message: {
            subject: `Payment Received - Invoice #${invoiceNumber}`,
            html: generateInvoiceEmailHTML(userName, invoiceNumber, amount, date, planName, invoiceUrl),
            text: generateInvoiceEmailText(userName, invoiceNumber, amount, date, planName, invoiceUrl),
        },
    });

    console.log(`Invoice email queued for ${userEmail}`);
}

/**
 * Send payment failed email
 */
async function sendPaymentFailedEmail(
    userEmail: string,
    userName: string,
    invoice: Stripe.Invoice
) {
    const mailRef = admin.firestore().collection("mail").doc();

    const invoiceNumber = invoice.number || invoice.id;
    const amount = (invoice.amount_due / 100).toFixed(2);
    const invoiceUrl = invoice.hosted_invoice_url || "#";

    await mailRef.set({
        to: userEmail,
        message: {
            subject: `Payment Failed - Action Required`,
            html: generatePaymentFailedEmailHTML(userName, invoiceNumber, amount, invoiceUrl),
            text: generatePaymentFailedEmailText(userName, invoiceNumber, amount, invoiceUrl),
        },
    });

    console.log(`Payment failed email queued for ${userEmail}`);
}

/**
 * Send cancellation confirmation email with win-back CTA
 */
async function sendCancellationConfirmationEmail(
    userEmail: string | undefined,
    userName: string,
    accessEndDate: string
): Promise<void> {
    const normalizedEmail = typeof userEmail === "string" ? userEmail.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        console.warn("Skipping cancellation confirmation email because the user email is missing or invalid.");
        return;
    }

    const mailRef = admin.firestore().collection("mail").doc();
    const APP_URL = "https://careervivid.app";
    const modules: CareerVividEmailModule[] = [
        {
            type: "hero",
            eyebrow: "Billing update",
            title: "Your paid plan is scheduled to end",
            subtitle: `Your premium access remains active until ${accessEndDate}. After that, your account returns to the Free plan automatically.`,
            variant: "milestone",
            visual: {
                kind: "mockup",
                background: "warm",
                mockup: {
                    badge: "Subscription status",
                    title: "Cancellation scheduled",
                    subtitle: "You keep paid access through the current billing period.",
                    metrics: [
                        { value: "Active", label: "Until", helper: accessEndDate },
                        { value: "Free", label: "Next plan", helper: "100 credits / mo" },
                    ],
                    rows: [
                        {
                            label: "Now",
                            title: "Paid tools stay available",
                            meta: "Resume tailoring, saved workflows, and premium credits continue through the billing period.",
                            status: "success",
                        },
                        {
                            label: "Later",
                            title: "Account returns to Free",
                            meta: "Your workspace remains available with the Free plan credit allowance.",
                            status: "warning",
                        },
                    ],
                },
            },
        },
        {
            type: "body",
            paragraphs: [
                "Your subscription cancellation request has been received.",
                "Nothing else is required. You can keep using your paid features until the date shown above, and your saved CareerVivid workspace will remain available after the plan changes.",
            ],
        },
        {
            type: "status",
            title: "What happens next",
            body: "At the end of the current billing period, your paid plan stops renewing and your account moves back to Free.",
            status: "warning",
            rows: [
                { label: "Premium access through", value: accessEndDate },
                { label: "Next plan", value: "Free" },
                { label: "Free credits", value: "100 / month" },
            ],
        },
        {
            type: "cta",
            primary: { text: "Manage subscription", url: `${APP_URL}/subscription` },
            secondary: { text: "Open dashboard", url: `${APP_URL}/dashboard` },
            helper: "Changed your mind? You can choose a paid plan again from the subscription page.",
        },
    ];

    const emailHtml = generateCareerVividModuleEmail({
        title: "Your paid plan is scheduled to end",
        userName,
        preheader: `Your premium access remains active until ${accessEndDate}.`,
        modules,
        footerText: "You are receiving this required billing notification because your CareerVivid subscription was changed.",
    });

    await mailRef.set({
        to: normalizedEmail,
        message: {
            subject: `Your CareerVivid plan is scheduled to end`,
            html: emailHtml,
            text: `Hi ${userName},\n\nYour CareerVivid paid plan is scheduled to end.\n\nPremium access remains active until: ${accessEndDate}\n\nAfter that date, your account moves back to the Free plan with 100 credits per month. Your saved workspace remains available.\n\nManage subscription: ${APP_URL}/subscription\nOpen dashboard: ${APP_URL}/dashboard\n\nThe CareerVivid Team`
        },
        metadata: {
            category: "billing",
            required: true,
            template: "subscription_cancellation_scheduled",
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Cancellation confirmation email queued for ${normalizedEmail}`);
}

/**
 * Get plan name from invoice
 */
function getPlanName(invoice: Stripe.Invoice): string {
    const lineItem = invoice.lines.data[0];
    if (lineItem?.description) {
        return lineItem.description;
    }
    // Access price as any since Stripe types don't include it properly
    const price = (lineItem as any)?.price;
    if (price?.nickname) {
        return price.nickname;
    }
    return "Premium Plan";
}

/**
 * Generate HTML email for invoice paid
 */
function generateInvoiceEmailHTML(
    userName: string,
    invoiceNumber: string,
    amount: string,
    date: string,
    planName: string,
    invoiceUrl: string
): string {
    return generateCareerVividEmail({
        title: "Payment received",
        userName,
        eyebrow: "Receipt",
        preheader: `Your CareerVivid invoice ${invoiceNumber} has been paid.`,
        messageLines: [
            "Thank you. Your payment was received and your CareerVivid account has been updated.",
            "You can download the invoice for your records from the link below."
        ],
        boxContent: {
            title: "Invoice details",
            type: "success",
            lines: [
                `<strong>Invoice number:</strong> ${invoiceNumber}`,
                `<strong>Amount paid:</strong> $${amount}`,
                `<strong>Payment date:</strong> ${date}`,
                `<strong>Plan:</strong> ${planName}`
            ]
        },
        mainButton: {
            text: "Download invoice",
            url: invoiceUrl
        },
        footerText: "This is an automated billing receipt from CareerVivid."
    });
}

/**
 * Generate text email for invoice paid
 */
function generateInvoiceEmailText(
    userName: string,
    invoiceNumber: string,
    amount: string,
    date: string,
    planName: string,
    invoiceUrl: string
): string {
    return `
Payment Received

Hello ${userName},

Thank you for your payment! Your invoice has been paid successfully and your account has been updated.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Amount Paid: $${amount}
- Payment Date: ${date}
- Plan: ${planName}

Download your invoice: ${invoiceUrl}

If you have any questions about your invoice or payment, please don't hesitate to contact our support team.

Best regards,
The CareerVivid Team

---
This is an automated message from CareerVivid
Contact us at support@careervivid.app
    `;
}

/**
 * Generate HTML email for payment failed
 */
function generatePaymentFailedEmailHTML(
    userName: string,
    invoiceNumber: string,
    amount: string,
    invoiceUrl: string
): string {
    const APP_URL = "https://careervivid.app";

    return generateCareerVividEmail({
        title: "Payment needs attention",
        userName: userName,
        eyebrow: "Billing issue",
        preheader: "We could not process your recent CareerVivid payment.",
        messageLines: [
            "We were unable to process your payment for the following invoice.",
            "<strong>Your premium access has been temporarily paused.</strong>"
        ],
        boxContent: {
            title: "Invoice details",
            type: "critical",
            lines: [
                `<strong>Invoice number:</strong> ${invoiceNumber}`,
                `<strong>Amount due:</strong> $${amount}`,
                `<strong>Status:</strong> Payment failed`
            ]
        },
        mainButton: {
            text: "Update payment method",
            url: invoiceUrl
        },
        secondaryButton: {
            text: "View plans",
            url: `${APP_URL}/subscription`
        },
        footerText: "Contact support@careervivid.app if you believe this notice is incorrect."
    });
}

/**
 * Generate text email for payment failed
 */
function generatePaymentFailedEmailText(
    userName: string,
    invoiceNumber: string,
    amount: string,
    invoiceUrl: string
): string {
    return `
Payment Failed - Action Required

Hello ${userName},

We were unable to process your payment for the following invoice. Please update your payment method to avoid service interruption.

Action Required:
- Invoice Number: ${invoiceNumber}
- Amount Due: $${amount}
- Status: Payment Failed

What to do next:
1. Update your payment method in your account settings
2. Ensure your card has sufficient funds
3. Check that your billing information is correct

Update payment method: ${invoiceUrl}

If you continue to experience issues, please contact our support team for assistance.

Best regards,
The CareerVivid Team

---
This is an automated message from CareerVivid
Contact us at support@careervivid.app
    `;
}

/**
 * Fetches financial metrics from Stripe for the Strategy Dashboard
 * Calculates MRR, Churn Rate, and Average LTV
 */
export const getFinancialMetrics = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1",
    },
    async (request) => {
        // Verify authentication
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        try {
            const stripe = new Stripe(stripeSecretKey.value(), {
                apiVersion: "2026-02-25.clover",
            });

            // 1. Calculate Monthly Recurring Revenue (MRR)
            const activeSubs = await stripe.subscriptions.list({
                status: 'active',
                limit: 100,
                expand: ['data.plan']
            });

            let mrr = 0;
            let activeSubscriberCount = 0;

            activeSubs.data.forEach(sub => {
                const price = sub.items.data[0].price;
                if (price.unit_amount && (price.recurring?.interval === 'month' || price.recurring?.interval === 'year')) {
                    let monthlyAmount = price.unit_amount;
                    if (price.recurring.interval === 'year') {
                        monthlyAmount = Math.round(monthlyAmount / 12);
                    }
                    mrr += monthlyAmount;
                    activeSubscriberCount++;
                }
            });

            // 2. Calculate Churn Rate
            const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
            const canceledSubs = await stripe.subscriptions.list({
                status: 'canceled',
                created: { gte: thirtyDaysAgo },
                limit: 100
            });

            const canceledCount = canceledSubs.data.length;
            const totalConsidered = activeSubscriberCount + canceledCount;
            const churnRate = totalConsidered > 0
                ? ((canceledCount / totalConsidered) * 100).toFixed(1)
                : "0.0";

            // 3. Estimate LTV
            const arpu = activeSubscriberCount > 0 ? mrr / activeSubscriberCount : 0;
            let ltv = 0;
            const churnDecimal = parseFloat(churnRate) / 100;

            if (churnDecimal > 0) {
                ltv = arpu / churnDecimal;
            } else {
                ltv = arpu * 12;
            }

            return {
                activeRevenue: (mrr / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                churn: `${churnRate}%`,
                ltv: (ltv / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                subscriberCount: activeSubscriberCount
            };

        } catch (error: any) {
            console.error("Error fetching financial metrics:", error);
            throw new HttpsError("internal", `Failed to fetch financial metrics: ${error.message}`);
        }
    }
);
