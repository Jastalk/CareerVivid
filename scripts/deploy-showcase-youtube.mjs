/**
 * deploy-showcase-youtube.mjs
 *
 * Uploads the updated CareerVivid Founder Showcase (v2) to @CareerVividSystemDesign
 * and sets the custom thumbnail and rich description.
 */

import fs from 'fs';
import path from 'path';
import { google } from '/Users/jiawenzhu/.config/hackathon-youtube-uploader/node_modules/googleapis/build/src/index.js';

const CONFIG_DIR = '/Users/jiawenzhu/.config/careervivid-youtube-uploader';
const CLIENT_SECRET_PATH = path.join(CONFIG_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');

const VIDEO_PATH = path.resolve('public/commercial-videos/careervivid-founder-showcase-v2-web.mp4');
const THUMBNAIL_PATH = path.resolve('public/commercial-videos/founder-showcase-deluxe/assets/youtube_thumbnail.jpg');

const TITLE = 'Why I Built CareerVivid: The AI System Engineering Job Prep Platform';
const DESCRIPTION = `Why is an engineer who builds complex distributed systems rethinking the entire tech job hunt? 

Traditional tech interview preparation relies on passive memorization while hiring committees test real-time architectural intuition and quantified execution. CareerVivid bridges the gap with full-duplex AI coaching, context-aware resume engineering, and real system design whiteboards.

⏱️ TIMESTAMPS:
0:00 - The Broken Tech Hiring Funnel (Founder Origin)
0:35 - Context-Aware Resume Engineering Studio (54% ➔ 92% ATS Surge)
1:11 - Live Google System Design Whiteboard & Real-Time AI Coach
1:44 - Instant Diagnostic Interview Report & Rubric Grading
2:27 - Full Dashboard, Adaptive Role Tracks & 22,000+ Verified Loops
2:50 - Built By Engineers. Master Your Technical Narrative.

🚀 System Design Learning Path:
https://careervivid.app/learning/system-design-interview

💻 Coding Interview Patterns for Beginners:
https://careervivid.app/learning/coding-interview-patterns

🏢 300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

📄 Try the Resume Engineering Studio:
https://careervivid.app/edit/zeVfp5J9PGBNeU1RqvWy

🌐 Start Practicing for Free:
https://careervivid.app

#SystemDesign #SoftwareEngineering #TechInterview #CareerVivid #CodingInterview #FAANG #GoogleInterview #DistributedSystems`;

async function main() {
    console.log("📡 Connecting to YouTube API...");
    const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH));
    const { client_secret, client_id } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8080');
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);

    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    // Verify channel
    const channelRes = await youtube.channels.list({ mine: true, part: 'snippet' });
    const channel = channelRes.data.items?.[0];
    console.log(`Connected to: "${channel?.snippet?.title}" (${channel?.snippet?.customUrl || channel?.id})`);

    // Optional: Also update existing video V-GlVWJEk_k metadata if it exists on this channel
    try {
        console.log(`\n🔄 Updating existing video (V-GlVWJEk_k) metadata...`);
        await youtube.videos.update({
            part: 'snippet',
            requestBody: {
                id: 'V-GlVWJEk_k',
                snippet: {
                    title: TITLE,
                    description: DESCRIPTION,
                    categoryId: '28',
                    tags: ['SystemDesign', 'SoftwareEngineering', 'TechInterview', 'CareerVivid', 'CodingInterview', 'Google']
                }
            }
        });
        console.log(`✅ Existing video V-GlVWJEk_k metadata updated!`);
    } catch (e) {
        console.log(`Note on existing video V-GlVWJEk_k: ${e.message}`);
    }

    // Upload the new video file
    console.log(`\n🚀 Uploading new master video: ${path.basename(VIDEO_PATH)}...`);
    const fileSize = fs.statSync(VIDEO_PATH).size;

    const uploadRes = await youtube.videos.insert(
        {
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: TITLE,
                    description: DESCRIPTION,
                    categoryId: '28',
                    tags: ['SystemDesign', 'SoftwareEngineering', 'TechInterview', 'CareerVivid', 'CodingInterview', 'FAANG', 'GoogleInterview', 'DistributedSystems']
                },
                status: {
                    privacyStatus: 'public',
                    selfDeclaredMadeForKids: false
                }
            },
            media: {
                body: fs.createReadStream(VIDEO_PATH)
            }
        }
    );

    const newVideoId = uploadRes.data.id;
    const newVideoUrl = `https://www.youtube.com/watch?v=${newVideoId}`;
    console.log(`\n🎉 New Video Uploaded Successfully!`);
    console.log(`Video ID:  ${newVideoId}`);
    console.log(`Video URL: ${newVideoUrl}`);

    // Upload Thumbnail
    if (fs.existsSync(THUMBNAIL_PATH)) {
        console.log(`🖼️ Uploading custom thumbnail...`);
        await youtube.thumbnails.set({
            videoId: newVideoId,
            media: {
                body: fs.createReadStream(THUMBNAIL_PATH)
            }
        });
        console.log(`✅ Thumbnail attached successfully!`);
    }

    console.log("\n========================================================");
    console.log("🌟 YOUTUBE DEPLOYMENT COMPLETE!");
    console.log(`Channel: ${channel?.snippet?.title}`);
    console.log(`Live Link: ${newVideoUrl}`);
    console.log("========================================================\n");
}

main().catch(err => {
    console.error("❌ Deployment failed:", err.message);
    process.exit(1);
});
