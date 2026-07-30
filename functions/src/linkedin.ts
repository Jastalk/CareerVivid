import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { RestliClient } from 'linkedin-api-client';
import { defineSecret } from "firebase-functions/params";

const db = admin.firestore();

const linkedinClientId = defineSecret('LINKEDIN_CLIENT_ID');
const linkedinClientSecret = defineSecret('LINKEDIN_CLIENT_SECRET');

const DEFAULT_REDIRECT_URI = 'https://careervivid.app/admin';

// 1. Get Auth URL
export const getLinkedInAuthUrl = onCall(
    { region: "us-west1", memory: "512MiB", secrets: [linkedinClientId] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }

        const { redirectUri } = request.data;
        const currentRedirectUri = redirectUri || DEFAULT_REDIRECT_URI;
        const state = request.auth.uid; // Simple state linking to user
        const scope = 'w_member_social r_liteprofile'; // Or just w_member_social depending on your LinkedIn App products

        const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinClientId.value()}&redirect_uri=${encodeURIComponent(currentRedirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;

        return { url: authUrl };
    }
);

// 2. Handle the OAuth Callback and get the token
export const handleLinkedInCallback = onCall(
    { region: "us-west1", memory: "512MiB", secrets: [linkedinClientId, linkedinClientSecret] },
    async (request) => {
        const { code, state, redirectUri } = request.data;
        const currentRedirectUri = redirectUri || DEFAULT_REDIRECT_URI;
        const uid = request.auth?.uid;

        if (!uid || state !== uid) {
            throw new HttpsError('unauthenticated', 'Invalid state or user session.');
        }

        if (!code) {
            throw new HttpsError('invalid-argument', 'Missing authorization code.');
        }

        try {
            // Exchange code for token
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('redirect_uri', currentRedirectUri);
            params.append('client_id', linkedinClientId.value());
            params.append('client_secret', linkedinClientSecret.value());

            const tokenResp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params
            });

            const tokenData = await tokenResp.json();

            if (tokenData.error) {
                console.error("LinkedIn Token Error:", tokenData);
                throw new Error(tokenData.error_description || "Failed to exchange code");
            }

            const { access_token, expires_in } = tokenData;

            // Fetch the user's URN (required for posting)
            const profileResp = await fetch('https://api.linkedin.com/v2/me', {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });
            const profileData = await profileResp.json();
            const personUrn = `urn:li:person:${profileData.id}`;

            // Save the integration payload to Firestore
            await db.collection('users').doc(uid).collection('integrations').doc('linkedin').set({
                connected: true,
                accessToken: access_token,
                personUrn: personUrn,
                expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + (expires_in * 1000)),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };

        } catch (error: any) {
            console.error("LinkedIn OAuth Error:", error);
            throw new HttpsError('internal', error.message || 'Authentication failed');
        }
    }
);

// 3. Publish a Post to LinkedIn
export const publishLinkedInPost = onCall(
    { region: "us-west1", memory: "512MiB", timeoutSeconds: 60 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be logged in.');
        }

        const uid = request.auth.uid;
        const { text, articleUrl } = request.data;

        if (!text) {
            throw new HttpsError('invalid-argument', 'Post text is required.');
        }

        try {
            // Retrieve token
            const doc = await db.collection('users').doc(uid).collection('integrations').doc('linkedin').get();
            if (!doc.exists) {
                throw new Error('LinkedIn not connected');
            }

            const { accessToken, personUrn } = doc.data() as any;

            const client = new RestliClient();

            // Build ugcPosts payload
            const payload = {
                author: personUrn,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: text
                        },
                        shareMediaCategory: articleUrl ? "ARTICLE" : "NONE",
                        media: articleUrl ? [
                            {
                                status: "READY",
                                description: {
                                    text: "Read the full article"
                                },
                                originalUrl: articleUrl
                            }
                        ] : []
                    }
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            };

            const response = await client.create({
                resourcePath: '/ugcPosts',
                entity: payload,
                accessToken: accessToken,
            });

            const postId = response?.createdEntityId;

            return { success: true, postId };

        } catch (error: any) {
            console.error("LinkedIn Publishing Error:", error);
            throw new HttpsError('internal', error.message || 'Failed to publish post');
        }
    }
);
