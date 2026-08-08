/**
 * generate-youtube-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design YouTube (Video Transcoding & Global CDN)
 *   using Gemini Omni / Veo (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 * Prompts feature vivid documentary paper-collage animations:
 *   1. Mailing a 50-pound birthday cake in an envelope & smartphone loading spinner freeze
 *   2. Slicing 4K video reel like a loaf of bread into 2-second paper chunks (.ts)
 *   3. Multi-resolution encoding matrix (AV1 / VP9 / H.264)
 *   4. Elevator ABR quality scaling (1080p -> 360p) with green signal arrows
 *   5. Neighborhood convenience store CDN edge node serving MrBeast viral video slices
 *   6. Origin Shield dome protecting servers from thundering herd fans
 *   7. Tech Benchmark: Netflix scissors vs YouTube conveyor belt
 *   8. Golden trophy snapping into place beside architecture pencils
 *
 * Output: public/system-design-lessons/clips/sd-youtube--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_YOUTUBE_BEATS } from './systemDesignYouTubeScript.ts';

const OUT_DIR = 'public/system-design-lessons/clips';
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL = 'veo-3.1-lite-generate-001';

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

// Vivid documentary paper-collage animation prompts:
const OMNI_PROMPTS = {
    'sd-youtube-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper envelope cut-out bursts open as a giant 50-pound paper birthday cake tries to squeeze inside. A paper smartphone cut-out shows a spinning loading wheel with a red "BUFFERING FAIL" badge snapping onto frame.
Negative Constraints: no camera shake, no 3D glossy render, no gibberish captions.
    `.trim(),

    'sd-youtube-transcoding-hls': `
SHOT: Top-down aerial shot, dynamic paper slicing animation.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A film reel paper cut-out passes through a paper bread slicer machine, cutting it into thousands of tiny 2-second paper bread slices (.ts) stamped with "1080p", "720p", and "360p".
Negative Constraints: no camera shake, no 3D digital glossy render.
    `.trim(),

    'sd-youtube-adaptive-bitrate': `
SHOT: Medium wide shot, paper matrix encoding animation.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper film strip enters an automated paper factory. Three robotic paper arms stamp the film simultaneously into three stacked paper trays labelled "AV1 4K", "VP9 1080p", and "H.264 360p".
Negative Constraints: no camera shake, no 3D digital glossy render.
    `.trim(),

    'sd-youtube-cdn-edges': `
SHOT: Split view on newsprint paper, smooth sliding motion.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper elevator cut-out moves down as Wi-Fi signal bars drop. A paper video stream cut-out seamlessly shifts from a large "1080p" paper slice to a compact "360p" paper slice with zero delay.
Negative Constraints: no camera shake, no 3D digital render.
    `.trim(),

    'sd-youtube-cold-storage': `
SHOT: Wide map view, dynamic paper delivery arrows.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A world map paper cut-out displays red ocean internet cables. On the left, a glowing paper edge server delivers video slices instantly. On the right, a paper vault door opens to retrieve a 10-year-old video reel from a cold Blob storage shelf.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-youtube-failure-modes': `
SHOT: High angle wide shot, paper crowd animation.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A massive crowd of paper fan cut-outs charges toward a paper server building. A glowing teal paper Origin Shield dome lowers over the server, absorbing the traffic wave and collapsing duplicate requests into a single clean paper stream.
Negative Constraints: no camera shake, no 3D digital render.
    `.trim(),

    'sd-youtube-benchmark': `
SHOT: Split view comparison shot, paper workbench.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: On the left, paper scissors meticulously cut film frame-by-frame under a magnifying glass. On the right, a high-speed paper conveyor belt swiftly encodes video titles into multi-resolution streams with green speed arrows.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-youtube-call-to-action': `
SHOT: Static wide shot, slow 10% push in.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A golden paper trophy cut-out snaps down at center frame. Two paper pencils slide in from the bottom edges and settle beside a clean system design diagram cutout.
Negative Constraints: no camera shake, no full-sentence text.
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design YouTube...\n');

    for (const beat of SYSTEM_DESIGN_YOUTUBE_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-youtube--${beat.id}.mp4`);
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

    console.log('\n🎉 Design YouTube Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
