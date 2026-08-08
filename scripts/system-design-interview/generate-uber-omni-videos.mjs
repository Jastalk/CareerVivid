/**
 * generate-uber-omni-videos.mjs
 *
 * Generates full AI video clips for System Design: How to Design Uber
 * using Gemini Omni / Veo (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 * Prompts feature vivid documentary paper-collage animations:
 *   1. 1:00 AM Rainstorm & Spinning Globe O(N) Scanning Fail
 *   2. Earth Watermelon Sliced into H3 Hexagonal Grid Cells
 *   3. Database Hard Drive Catching Fire from GPS Avalanche & Redis RAM Savior
 *   4. Golden Padlock Lock (Distributed Mutex) matching Taxi to Rider
 *   5. Surge Pricing Balance Scale ($10 -> $40) attracting Driver Swarm
 *   6. Golden Trophy snapping down beside architecture pencils
 *
 * Output: public/system-design-lessons/clips/sd-uber--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_UBER_BEATS } from './systemDesignUberScript.ts';

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
    'sd-uber-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper smartphone cut-out shows a user standing under pouring rain at 1:00 AM. A globe paper cut-out spins madly while a red "O(N) SCANNING FAIL" paper badge slaps onto frame with snappy paper jitter.
Negative Constraints: no camera shake, no 3D glossy render, no gibberish captions.
    `.trim(),

    'sd-uber-spatial-grid': `
SHOT: Top-down aerial shot, dynamic paper slicing animation.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A giant paper watermelon cut-out representing Earth is sliced cleanly into thousands of glowing green hexagonal paper grid cells (H3 Geohashes). A hand-drawn black ink circle highlights the rider's immediate cell.
Negative Constraints: no camera shake, no 3D digital glossy render.
    `.trim(),

    'sd-uber-gps-avalanche': `
SHOT: Medium shot, fast-paced paper stop-motion.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper database hard drive cut-out catches fire with red ink flame scribbles under a storm of paper GPS ping arrows. A glowing blue Redis memory chip cut-out slides in cleanly to absorb the GPS storm safely.
Negative Constraints: no camera shake, no 3D digital render.
    `.trim(),

    'sd-uber-matching-lock': `
SHOT: Split view on newsprint paper, smooth sliding motion.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: Two paper rider icons standing on the same street corner send request signals. A golden paper padlock cut-out (Distributed Lock) snaps shut over a nearest paper taxi icon for 10 seconds before a green checkmark appears.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-uber-surge-pricing': `
SHOT: Medium wide shot, paper scale balancing animation.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: On a paper balance scale, 500 paper rider icons outweigh 10 paper taxi icons. A red "$10 -> $40 SURGE" paper price tag expands violently, triggering a swarm of paper taxi icons to drive into the high-demand hexagon zone.
Negative Constraints: no camera shake, no full-sentence text.
    `.trim(),

    'sd-uber-outro': `
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
    console.log('🎥 Generating Humorous & Vivid Veo 3.1 Lite Video Clips for Design Uber...\n');

    for (const beat of SYSTEM_DESIGN_UBER_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-uber--${beat.id}.mp4`);
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

    console.log('\n🎉 Design Uber Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
