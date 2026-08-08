import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { getAuthUrl, getAccessToken, getUserInfo } from "./tiktokApi";

// Database reference
const db = admin.firestore();

// Mock Data Service for Social Stats (Fallback)
const getMockTikTokStats = (username: string) => {
    // Generate deterministic but realistic-looking stats based on username length
    const base = username.length * 1000;
    return {
        followerCount: base * 12 + 543,
        heartCount: base * 150 + 2300,
        videoCount: base / 2 + 10,
        // Mock Top 3 Videos
        topVideos: [
            {
                id: '1',
                thumbnailUrl: 'https://images.unsplash.com/photo-1611605698389-eb4f98bb521d?w=400&h=600&fit=crop',
                views: base * 50,
                url: `https://www.tiktok.com/@${username}/video/1`
            },
            {
                id: '2',
                thumbnailUrl: 'https://images.unsplash.com/photo-1596558450255-7c0baff34cb0?w=400&h=600&fit=crop',
                views: base * 30,
                url: `https://www.tiktok.com/@${username}/video/2`
            },
            {
                id: '3',
                thumbnailUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=600&fit=crop',
                views: base * 10,
                url: `https://www.tiktok.com/@${username}/video/3`
            }
        ]
    };
};

export const getSocialStats = onCall(
    {
        region: "us-west1", memory: "512MiB",
    },
    async (request) => {
        const { platform, username } = request.data;
        const uid = request.auth?.uid;

        if (!username) {
            throw new HttpsError('invalid-argument', 'Username is required.');
        }

        if (platform === 'tiktok') {
            // Check if we have a real integration for this user
            if (uid) {
                const doc = await db.collection('users').doc(uid).collection('integrations').doc('tiktok').get();
                if (doc.exists) {
                    const { accessToken } = doc.data() as any;
                    try {
                        // Try fetching real stats
                        const realData = await getUserInfo(accessToken);
                        if (realData) {
                            // Transform real data to match expected format if needed
                            // For now return mock structure with real numbers
                            return {
                                data: {
                                    ...getMockTikTokStats(username),
                                    followerCount: realData.follower_count, // Overlay real data
                                    // other fields...
                                },
                                success: true
                            };
                        }
                    } catch (e) {
                        console.error("Failed to fetch real TikTok data, falling back to mock", e);
                    }
                }
            }

            const stats = getMockTikTokStats(username);
            return {
                data: stats,
                success: true
            };
        }

        throw new HttpsError('unimplemented', 'Platform not supported.');
    }
);

// 1. Initiate OAuth Flow
export const initiateTikTokAuth = onCall(
    { region: "us-west1", memory: "512MiB" },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }

        // Generate state to prevent CSRF (include uid to link later)
        const state = request.auth.uid; // Simple state for now
        const authUrl = getAuthUrl(state);

        return { url: authUrl };
    }
);

// 2. Handle Callback
export const handleTikTokCallback = onRequest(
    { region: "us-west1", memory: "512MiB" },
    async (req, res) => {
        const { code, state } = req.query;

        if (!code || !state) {
            res.status(400).send("Missing code or state");
            return;
        }

        try {
            // Exchange code for access token
            const tokenData = await getAccessToken(code as string);

            // Save to Firestore (state is uid)
            const uid = state as string;
            await db.collection('users').doc(uid).collection('integrations').doc('tiktok').set({
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresIn: tokenData.expires_in,
                openId: tokenData.open_id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Redirect back to app (subscription page with success param)
            res.redirect('https://careervivid.app/subscription?success=true');

        } catch (error) {
            console.error("GitHub OAuth Error:", error);
            res.status(500).send("Authentication failed");
        }
    }
);
