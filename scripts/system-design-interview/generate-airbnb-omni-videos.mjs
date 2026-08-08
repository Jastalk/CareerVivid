/**
 * generate-airbnb-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design Airbnb (Distributed Lock & Spatial Indexing)
 *   using Gemini Omni / Veo (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-airbnb--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_AIRBNB_BEATS } from './systemDesignAirbnbScript.ts';

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
    'sd-airbnb-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper mountain cabin cut-out stands in falling snow. Two paper family cut-outs hold matching keys at the door, as a red "DOUBLE BOOKING CONFLICT" badge snaps onto frame.
Negative Constraints: no camera shake, no 3D glossy render, no gibberish captions.
    `.trim(),

    'sd-airbnb-redlock-mutex': `
SHOT: Split view on newsprint paper, smooth sliding motion.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A hotel front desk paper cut-out features a key hook wall. A golden paper master key cut-out (Redlock) snaps off the hook and locks inside a 10-minute timer box.
Negative Constraints: no camera shake, no 3D digital glossy render.
    `.trim(),

    'sd-airbnb-spatial-search': `
SHOT: Top-down aerial map shot, paper magnifying glass zoom.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper map of Lake Tahoe cut-out zooms into a hexagonal spatial grid cell. Tags reading "Hot Tub" and "Wi-Fi" slide cleanly into place around a cabin icon.
Negative Constraints: no camera shake, no 3D digital render.
    `.trim(),

    'sd-airbnb-dynamic-pricing': `
SHOT: Medium wide shot, paper scale balancing animation.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper calendar cut-out shifts from May (sun icon) to December (snowflake icon). A red "$100 -> $800 SURGE" paper price tag expands violently as booking demand arrows soar.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-airbnb-storage-acid': `
SHOT: Medium wide shot, paper storage vault animation.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: High-res paper cabin photo reels slide into a cheap paper Blob storage vault, while a paper payment receipt cut-out stamps cleanly into a PostgreSQL database safe.
Negative Constraints: no camera shake, no full-sentence text.
    `.trim(),

    'sd-airbnb-outro': `
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design Airbnb...\n');

    for (const beat of SYSTEM_DESIGN_AIRBNB_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-airbnb--${beat.id}.mp4`);
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

    console.log('\n🎉 Design Airbnb Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
