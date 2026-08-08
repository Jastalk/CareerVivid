import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import * as admin from "firebase-admin";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Application Fee Percentage (e.g., 5%)
const APPLICATION_FEE_PERCENT = 0.05;
const DEFAULT_COMMERCE_URL = "https://careervivid.app/commerce";

const getSafeCommerceRedirectUrl = (redirectUrl: unknown): string => {
    if (typeof redirectUrl !== "string" || !redirectUrl.trim()) {
        return DEFAULT_COMMERCE_URL;
    }

    try {
        const parsedUrl = new URL(redirectUrl);
        const isAllowedHost = parsedUrl.hostname === "careervivid.app" ||
            parsedUrl.hostname === "localhost" ||
            parsedUrl.hostname === "127.0.0.1";
        const isAllowedProtocol = parsedUrl.protocol === "https:" ||
            (parsedUrl.protocol === "http:" && parsedUrl.hostname !== "careervivid.app");

        if (!isAllowedHost || !isAllowedProtocol) {
            return DEFAULT_COMMERCE_URL;
        }

        parsedUrl.pathname = "/commerce";
        parsedUrl.search = "";
        parsedUrl.hash = "";
        return parsedUrl.toString();
    } catch {
        return DEFAULT_COMMERCE_URL;
    }
};

/**
 * Creates a Stripe Express Connect account for the user and generates an account link for onboarding.
 */
export const createConnectAccount = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1", memory: "512MiB",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        const userId = request.auth.uid;
        const userEmail = request.auth.token.email;

        const stripe = new Stripe(stripeSecretKey.value(), {
            apiVersion: "2025-11-17.clover" as any, // Using likely 2024+ version, casting to any if strict typing fails
        });

        try {
            // 1. Check if user already has a Connect Account ID
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const userData = userDoc.data();
            let accountId = userData?.stripeConnectId;

            // 2. Create the account if it doesn't exist
            if (!accountId) {
                const account = await stripe.accounts.create({
                    type: "express",
                    email: userEmail,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                    metadata: {
                        firebaseUID: userId,
                    },
                });
                accountId = account.id;

                // Save to Firestore
                await admin.firestore().collection("users").doc(userId).set(
                    { stripeConnectId: accountId },
                    { merge: true }
                );
            }

            // 3. Create an Account Link for onboarding
            // This link expires in a few minutes, so we always generate a new one.
            const commerceRedirectUrl = getSafeCommerceRedirectUrl(request.data?.redirectUrl);
            const refreshUrl = new URL(commerceRedirectUrl);
            refreshUrl.searchParams.set("refresh", "true");
            const returnUrl = new URL(commerceRedirectUrl);
            returnUrl.searchParams.set("success", "true");

            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl.toString(),
                return_url: returnUrl.toString(),
                type: "account_onboarding",
            });

            return { url: accountLink.url };

        } catch (error: any) {
            console.error("Error creating Connect account:", error);
            throw new HttpsError("internal", `Failed to create Connect account: ${error.message}`);
        }
    }
);

/**
 * Generates a login link for the Express Dashboard.
 * Used when the user clicks "View Dashboard" or "Payouts".
 */
export const createLoginLink = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1", memory: "512MiB",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        const userId = request.auth.uid;
        const stripe = new Stripe(stripeSecretKey.value(), {
            apiVersion: "2025-11-17.clover" as any,
        });

        try {
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const accountId = userDoc.data()?.stripeConnectId;

            if (!accountId) {
                throw new HttpsError("failed-precondition", "No connected account found.");
            }

            const loginLink = await stripe.accounts.createLoginLink(accountId);
            return { url: loginLink.url };

        } catch (error: any) {
            console.error("Error creating login link:", error);
            throw new HttpsError("internal", `Failed to create login link: ${error.message}`);
        }
    }
);

/**
 * Checks the status of the connected account (e.g., are details submitted? are charges enabled?).
 */
export const getAccountStatus = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1", memory: "512MiB",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be authenticated");
        }

        const userId = request.auth.uid;
        const stripe = new Stripe(stripeSecretKey.value(), {
            apiVersion: "2025-11-17.clover" as any,
        });

        try {
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const accountId = userDoc.data()?.stripeConnectId;

            if (!accountId) {
                return { isConnected: false, detailsSubmitted: false, chargesEnabled: false, payoutsEnabled: false };
            }

            const account = await stripe.accounts.retrieve(accountId);

            return {
                isConnected: true,
                detailsSubmitted: account.details_submitted,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                email: account.email
            };

        } catch (error: any) {
            console.error("Error retrieving account status:", error);
            throw new HttpsError("internal", `Failed to get account status: ${error.message}`);
        }
    }
);

/**
 * Creates a Checkout Session for a specific product sold by a user.
 * Routes the funds to the connected account, taking an application fee.
 */
export const createProductCheckoutSession = onCall(
    {
        secrets: [stripeSecretKey],
        region: "us-west1", memory: "512MiB",
    },
    async (request) => {
        // Note: Buyers might be unauthenticated (public purchase), but currently onCall requires auth context?
        // Wait, onCall requires an App Check token or Auth token usually, but allows unauthenticated if configured?
        // Actually, for public/guest checkout, we might need anonRequest (HTTP) function if we want truly public access without anonymous login.
        // However, standard Firebase Auth "Anonymous" login is usually best for "Guest" users.
        // For now, let's assume the buyer is logged in (even anonymously) OR we allow this function to be called publicly?
        // `onCall` checks `request.auth` by default but doesn't fail unless we throw.
        // A buyer doesn't NEED to be the owner.

        const { productId, merchantId, successUrl, cancelUrl } = request.data;

        if (!productId || !merchantId || !successUrl || !cancelUrl) {
            throw new HttpsError("invalid-argument", "Missing required parameters.");
        }

        const stripe = new Stripe(stripeSecretKey.value(), {
            apiVersion: "2025-11-17.clover" as any,
        });

        try {
            // 1. Fetch Product Data
            const productDoc = await admin.firestore()
                .collection("users").doc(merchantId)
                .collection("products").doc(productId)
                .get();

            if (!productDoc.exists) {
                throw new HttpsError("not-found", "Product not found.");
            }

            const product = productDoc.data();
            if (!product?.isActive) {
                throw new HttpsError("failed-precondition", "Product is not active.");
            }

            // 2. Fetch Merchant's Connect ID
            const merchantUserDoc = await admin.firestore().collection("users").doc(merchantId).get();
            const connectedAccountId = merchantUserDoc.data()?.stripeConnectId;

            if (!connectedAccountId) {
                throw new HttpsError("failed-precondition", "Merchant is not set up to receive payments.");
            }

            const priceInCents = product.price; // e.g. 1000 for $10.00
            const applicationFee = Math.round(priceInCents * APPLICATION_FEE_PERCENT); // e.g. 50 cents

            // 3. Create Checkout Session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card", "link" as any], // Cast 'link' if type definition is old
                line_items: [{
                    price_data: {
                        currency: product.currency || "usd",
                        product_data: {
                            name: product.title,
                            description: product.description,
                            images: product.images || [],
                        },
                        unit_amount: priceInCents,
                    },
                    quantity: 1,
                }],
                mode: "payment",
                success_url: successUrl,
                cancel_url: cancelUrl,
                payment_intent_data: {
                    application_fee_amount: applicationFee,
                    transfer_data: {
                        destination: connectedAccountId,
                    },
                },
                metadata: {
                    type: "commerce_purchase",
                    merchantId: merchantId,
                    productId: productId,
                    buyerId: request.auth?.uid || "guest",
                    productType: product.type // 'digital' or 'physical'
                },
                allow_promotion_codes: true, // Allow merchant coupons? Maybe later.
            });

            return { url: session.url, sessionId: session.id };

        } catch (error: any) {
            console.error("Error creating product checkout session:", error);
            throw new HttpsError("internal", `Checkout creation failed: ${error.message}`);
        }
    }
);
