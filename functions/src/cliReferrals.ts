/**
 * CLI Referrals API — Backend for `cv referral`
 *
 * Authentication: x-api-key header
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { secureCorsHandler } from "./utils/corsUtils.js";
import { resolveAuth } from "./utils/authUtils.js";

const corsHandler = secureCorsHandler;
const db = admin.firestore();
const PERSONAL_REFERRAL_LIMIT = 15;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReferredUser {
    uid: string;
    email: string;
    signupDate: any;
}

interface ReferralStatsResult {
    code: string;
    totalReferred: number;
    maxReferrals: number;
    referredUsers: ReferredUser[];
}

/**
 * Generate a random 8-character alphanumeric referral code
 */
function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Ensure unique referral code and create it in Firestore
 */
async function ensureUniqueReferralCode(userId: string): Promise<string> {
    let code = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const codeDoc = await db.collection('referralCodes').doc(code).get();
        if (!codeDoc.exists) {
            // Code is unique, create it
            await db.collection('referralCodes').doc(code).set({
                code,
                userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                usedCount: 0,
                maxUses: PERSONAL_REFERRAL_LIMIT,
                referredUsers: []
            });

            // Update user profile with merge to create nested fields
            await db.collection('users').doc(userId).set({
                referralCode: code,
                referralStats: {
                    totalReferred: 0,
                    maxReferrals: PERSONAL_REFERRAL_LIMIT,
                    referredUsers: []
                }
            }, { merge: true });

            return code;
        }
        code = generateReferralCode();
        attempts++;
    }

    throw new Error('Failed to generate unique referral code');
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /cliReferralStats
// Returns: { code, totalReferred, maxReferrals, referredUsers }
// ──────────────────────────────────────────────────────────────────────────────

export const cliReferralStats = functions.region("us-west1").runWith({
    timeoutSeconds: 30,
    memory: "512MB",
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        // Preflight handled automatically by secureCorsHandler
        if (req.method !== "GET") { res.status(405).json({ error: "Method Not Allowed" }); return; }

        const user = await resolveAuth(req);
        if (!user) { res.status(401).json({ error: "Unauthorized. Invalid API key or missing authentication." }); return; }

        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data() || {};

            let code = userData.referralCode;
            if (!code) {
                // If the user doesn't have a referral code yet, mint one!
                code = await ensureUniqueReferralCode(user.uid);
                // Also initialize their referral stats locally to match what we just created
                userData.referralStats = {
                    totalReferred: 0,
                    maxReferrals: PERSONAL_REFERRAL_LIMIT,
                    referredUsers: []
                };
            }

            let stats = userData.referralStats || {
                totalReferred: 0,
                maxReferrals: PERSONAL_REFERRAL_LIMIT,
                referredUsers: []
            };

            if (Number(stats.maxReferrals || 0) < PERSONAL_REFERRAL_LIMIT) {
                stats = { ...stats, maxReferrals: PERSONAL_REFERRAL_LIMIT };
                await userDoc.ref.set({ referralStats: stats }, { merge: true });
            }

            // Get detailed referred users info from referralCodes collection
            let referredUsers: ReferredUser[] = [];
            if (code) {
                const codeDoc = await db.collection('referralCodes').doc(code).get();
                if (codeDoc.exists) {
                    const data = codeDoc.data();
                    if (Number(data?.maxUses || 0) < PERSONAL_REFERRAL_LIMIT) {
                        await codeDoc.ref.set({
                            maxUses: PERSONAL_REFERRAL_LIMIT,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        }, { merge: true });
                    }
                    referredUsers = data?.referredUsers || [];

                    // Format dates for CLI consumption
                    referredUsers = referredUsers.map(u => ({
                        ...u,
                        signupDate: u.signupDate?.toDate?.()?.toISOString() || null
                    }));
                }
            }

            const result: ReferralStatsResult = {
                code,
                totalReferred: stats.totalReferred || 0,
                maxReferrals: Math.max(Number(stats.maxReferrals || 0), PERSONAL_REFERRAL_LIMIT),
                referredUsers
            };

            res.json(result);
        } catch (err: any) {
            console.error("[cliReferralStats] Error:", err.message);
            res.status(500).json({ error: "Failed to get referral stats: " + err.message });
        }
    });
});
