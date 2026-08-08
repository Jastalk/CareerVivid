/**
 * generate-instagram-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design Instagram (Global News Feed & Image Pipeline)
 *   using Gemini Omni / Veo (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-instagram--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_INSTAGRAM_BEATS } from './systemDesignInstagramScript.ts';

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
    'sd-instagram-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper pop star cut-out posts a glowing photo on a smartphone. A wall of 300 million tiny paper mailboxes cut-outs burst open and overflow, with a red "WRITE FANOUT OVERLOAD" badge snapping onto frame.
Negative Constraints: no camera shake, no 3D glossy render, no gibberish captions.
    `.trim(),

    'sd-instagram-fanout-hybrid': `
SHOT: Split view on newsprint paper, smooth sliding motion.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: On the left, a paper mailbox cut-out receives 100 letters directly (Fan-Out on Write). On the right, a giant golden paper megaphone cut-out broadcasts a photo, while crowd icons pull copies underneath (Fan-Out on Read).
Negative Constraints: no camera shake, no 3D digital glossy render.
    `.trim(),

    'sd-instagram-image-pipeline': `
SHOT: Top-down aerial shot, paper photo processing factory.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A large 20MB paper photo cut-out enters a paper camera factory machine. Three clean paper photos slide out on a conveyor belt stamped with "Thumbnail", "Mobile", and "Web".
Negative Constraints: no camera shake, no 3D digital render.
    `.trim(),

    'sd-instagram-redis-feed': `
SHOT: Medium shot, fast-paced paper stop-motion.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A glowing blue paper Redis chip cut-out sorts paper post ID cards into a fast conveyor belt list. A paper smartphone screen scrolls seamlessly down the timeline with microsecond speed.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-instagram-storage-cdn': `
SHOT: Medium wide shot, paper storage vault animation.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: High-resolution paper photo reels slide into a cheap paper Blob storage vault. A glowing CDN edge node icon delivers photo copies instantly to a nearby neighborhood map cut-out.
Negative Constraints: no camera shake, no full-sentence text.
    `.trim(),

    'sd-instagram-outro': `
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design Instagram...\n');

    for (const beat of SYSTEM_DESIGN_INSTAGRAM_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-instagram--${beat.id}.mp4`);
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

    console.log('\n🎉 Design Instagram Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
