/**
 * generate-ytlive-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design YouTube Live Streaming at Scale (Low-Latency HLS & CDN Origin Shielding)
 *   using Veo 3.1 Lite (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-ytlive--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_YOUTUBE_LIVE_BEATS } from './systemDesignYouTubeLiveScript.ts';

const OUT_DIR = 'public/system-design-lessons/clips';
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL = 'veo-3.1-lite-generate-001';

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

const OMNI_PROMPTS = {
    'sd-ytlive-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Premium paper-collage animation, aged yellowed newsprint backdrop, clean paper cutouts, halftone textures.
ACTION: A paper live stream broadcaster cutout speaks into a paper microphone. Millions of tiny paper audience cutouts stream in from all edges. A red paper stamp reading 'LIVE' flashes at center frame.
Negative Constraints: no text, no garbled letters, no duplicate words, no pseudo-latin, no camera shake, no 3D glossy render.
    `.trim(),

    'sd-ytlive-ingest-gateway': `
SHOT: Top-down pipeline view, dynamic paper sliding motion.
STYLE: Premium paper-collage animation, off-white grid paper backdrop with clean paper cutouts and halftone drop shadows.
ACTION: Raw paper video reels roll into a paper ingest server cutout. The server immediately cuts the reels into small 200ms paper mini-chunks and passes them to three paper transcoding worker cutouts.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-ytlive-llhls-webrtc': `
SHOT: Medium shot, paper sliding animation.
STYLE: Premium paper-collage aesthetic, clean grid backdrop, crisp paper stamps.
ACTION: A paper HTTP/2 push arrow cut-out rapidly slides tiny 200ms paper video chunks directly into a paper smartphone screen cutout before the full segment scroll finishes rolling.
Negative Constraints: no garbled alien text, no camera shake, no 3D digital render.
    `.trim(),

    'sd-ytlive-cdn-shield': `
SHOT: High angle split view, paper CDN network animation.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone shield cut-outs.
ACTION: Hundreds of paper edge request arrows collapse into a single large paper shield cutout, which makes one single clean fetch request to a central paper origin server cutout.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-ytlive-live-chat': `
SHOT: Split view, paper chat flow animation.
STYLE: Premium paper-collage style, vintage newsprint backdrop, halftone chat bubble cut-outs.
ACTION: Multiple colorful paper chat bubbles float into a paper Redis pub/sub hub cutout. The hub filters the bubbles into an organized single file queue displaying smooth chat activity.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-ytlive-failure-modes': `
SHOT: Close up shot, paper signal and gauge animation.
STYLE: Premium paper-collage style, grid paper backdrop, halftone gauge cut-outs.
ACTION: A paper cellular signal tower cut-out drops one bar. A paper video resolution slider seamlessly drops from 4K to 720p while the paper video reel continues spinning smoothly with zero buffering pause.
Negative Constraints: no camera shake, no 3D digital render.
    `.trim(),

    'sd-ytlive-benchmark': `
SHOT: Split view comparison shot, paper workbench.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone workbench cut-outs.
ACTION: On the left, a paper Twitch WebRTC setup routes dynamic audio-video lines. On the right, an organized paper YouTube LL-HLS CDN pyramid distributes paper video chunks across global map points.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-ytlive-call-to-action': `
SHOT: Static wide shot, slow 10% push in.
STYLE: Premium paper-collage style, vintage chalkboard newsprint backdrop, halftone cap and trophy cut-outs.
ACTION: A golden paper trophy cut-out snaps down at center frame. Two paper pencils slide in from the bottom edges and settle beside a clean system design diagram cutout.
Negative Constraints: no camera shake, no garbled text.
    `.trim(),
};

async function pollOperation(operation) {
    let op = operation;
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    while (!op.done) {
        if (attempts++ >= MAX_ATTEMPTS) throw new Error('Timeout waiting for Gemini Omni video operation');
        await new Promise(r => setTimeout(r, 5000));
        op = await ai.operations.getVideosOperation({ operation: op });
        process.stdout.write('.');
    }
    console.log('');
    return op;
}

async function generateOmniVideos() {
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design YouTube Live...\n');

    for (const beat of SYSTEM_DESIGN_YOUTUBE_LIVE_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-ytlive--${beat.id}.mp4`);
        const promptText = OMNI_PROMPTS[beat.id] || beat.narration?.en;

        console.log(`🚀 Generating Omni Video for Beat: ${beat.id}`);
        console.log(`   Prompt: ${promptText.slice(0, 100)}...`);
        process.stdout.write('   Polling');

        try {
            const op = await ai.models.generateVideos({
                model: MODEL,
                prompt: promptText,
                config: {
                    durationSeconds: 8,
                    numberOfVideos: 1,
                    aspectRatio: '16:9',
                },
            });

            const doneOp = await pollOperation(op);
            const videos = doneOp?.response?.generatedVideos;
            if (!videos?.length) throw new Error('No videos returned in response');

            const video = videos[0];
            if (video.video?.videoBytes) {
                fs.writeFileSync(outFile, Buffer.from(video.video.videoBytes, 'base64'));
                console.log(`   ✅ Saved ${outFile} (${(fs.statSync(outFile).size / (1024 * 1024)).toFixed(2)} MB)`);
            } else if (video.video?.uri) {
                execSync(`gcloud storage cp "${video.video.uri}" "${outFile}"`, { stdio: 'inherit' });
                console.log(`   ✅ Downloaded ${outFile}`);
            } else {
                throw new Error('Unknown video response format');
            }
        } catch (err) {
            console.error(`   ❌ Failed ${beat.id}:`, err.message);
        }
    }

    console.log('\n🎉 Design YouTube Live Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
