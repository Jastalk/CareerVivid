/**
 * generate-3-aug11-veo-clips.mjs
 *
 * Generates Veo 3.1 Lite (veo-3.1-lite-generate-001) paper-collage animation clips
 * for Beats 1 (Hook) and 8 (Outro CTA) across the 3 fresh System Design topics for Aug 11:
 *   1. YouTube Content ID & Automated Copyright Matching (sd-yt-contentid)
 *   2. TikTok Live Gifting & Real-Time Leaderboard System (sd-tiktok-gifting)
 *   3. OpenAI Realtime Voice WebRTC Gateway & Audio Streaming (sd-openai-realtime)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { YOUTUBE_CONTENT_ID_SCRIPT } from './systemDesignYtContentIdScript.ts';
import { TIKTOK_GIFTING_SCRIPT } from './systemDesignTikTokGiftingScript.ts';
import { OPENAI_REALTIME_SCRIPT } from './systemDesignOpenAIRealtimeScript.ts';

const OUT_DIR = path.resolve('public/system-design-lessons/clips');
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL = 'veo-3.1-lite-generate-001';

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

const SCRIPTS = [
    YOUTUBE_CONTENT_ID_SCRIPT,
    TIKTOK_GIFTING_SCRIPT,
    OPENAI_REALTIME_SCRIPT
];

async function pollOperation(operation) {
    let op = operation;
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    while (!op.done) {
        if (attempts++ >= MAX_ATTEMPTS) throw new Error('Timeout waiting for Gemini Veo video operation');
        await new Promise(r => setTimeout(r, 5000));
        op = await ai.operations.getVideosOperation({ operation: op });
        process.stdout.write('.');
    }
    console.log('');
    return op;
}

async function generateVeoClips() {
    console.log('🎥 Generating Veo 3.1 Lite Stop-Motion Clips for Beats 1 & 8...\n');

    for (const spec of SCRIPTS) {
        console.log(`========================================================`);
        console.log(`🚀 Topic: [${spec.id}] - ${spec.title}`);
        console.log(`========================================================`);

        const veoBeats = spec.beats.filter(b => b.renderer === 'VEO' || b.veoPrompt);

        for (const beat of veoBeats) {
            const fileName = `${spec.id}--${beat.id}.mp4`;
            const filePath = path.join(OUT_DIR, fileName);

            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100000) {
                console.log(`   ⏭️ Exists: ${fileName} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB), skipping.`);
                continue;
            }

            console.log(`\n🚀 Generating Omni Video for Beat: ${beat.id}`);
            console.log(`   Prompt: ${beat.veoPrompt.slice(0, 120)}...`);
            process.stdout.write('   Polling');

            try {
                let operation = await ai.models.generateVideos({
                    model: MODEL,
                    prompt: beat.veoPrompt,
                    config: {
                        durationSeconds: 8,
                        numberOfVideos: 1,
                        aspectRatio: '16:9',
                        personGeneration: 'dont_allow'
                    }
                });

                const doneOp = await pollOperation(operation);
                const videos = doneOp?.response?.generatedVideos;
                if (!videos?.length) throw new Error('No videos returned in response');

                const video = videos[0];
                if (video.video?.videoBytes) {
                    fs.writeFileSync(filePath, Buffer.from(video.video.videoBytes, 'base64'));
                    console.log(`   ✅ Saved ${filePath} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB)`);
                } else if (video.video?.uri) {
                    execSync(`gcloud storage cp "${video.video.uri}" "${filePath}"`, { stdio: 'pipe' });
                    console.log(`   ✅ Downloaded ${filePath}`);
                } else {
                    throw new Error('Unknown video response format');
                }

            } catch (err) {
                console.error(`   ❌ Failed to generate clip for ${beat.id}:`, err.message);
            }
        }
    }

    console.log('\n🎉 VEO 3.1 LITE CLIPS READY FOR ALL 3 AUG 11 TOPICS!');
}

generateVeoClips().catch(console.error);
