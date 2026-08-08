/**
 * generate-netflix-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design Netflix (Adaptive Bitrate ABR & Edge CDN)
 *   using Veo 3.1 Lite (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-netflix--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_NETFLIX_BEATS } from './systemDesignNetflixScript.ts';

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
    'sd-netflix-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Premium paper-collage animation, aged yellowed newsprint backdrop, clean paper cutouts, halftone textures.
ACTION: A paper television screen cutout displays a video play icon. Red paper buffering loading rings freeze under a paper cloud tower cutout before breaking away.
Negative Constraints: no text, no garbled letters, no duplicate words, no pseudo-latin, no camera shake, no 3D glossy render.
    `.trim(),

    'sd-netflix-transcoding': `
SHOT: Top-down architecture view, dynamic paper sliding motion.
STYLE: Premium paper-collage animation, off-white grid paper backdrop with clean paper cutouts and halftone drop shadows.
ACTION: A long paper filmstrip cutout is sliced into short paper block segments. Multiple paper worker gear cutouts spin as smaller resolution filmstrips cascade neatly down.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-netflix-abr': `
SHOT: High angle split view, paper streaming quality adjustment.
STYLE: Premium paper-collage aesthetic, clean grid backdrop, crisp paper stamps.
ACTION: A paper Wi-Fi signal gauge cutout fluctuates. A paper video frame cutout dynamically swaps from a low-res pixelated paper tile to a crisp 4K golden paper badge.
Negative Constraints: no garbled alien text, no camera shake, no 3D digital render.
    `.trim(),

    'sd-netflix-open-connect': `
SHOT: Medium shot, paper CDN edge server deployment.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone server box cut-outs.
ACTION: Red paper server box cutouts drop directly onto a world paper map at ISP node pins. Bright paper video streams connect local paper houses instantly.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-netflix-stampede-resilience': `
SHOT: Close up view, paper traffic coalescing animation.
STYLE: Premium paper-collage style, vintage newsprint backdrop, halftone funnel cut-outs.
ACTION: Dozens of paper viewer request arrows merge into a single paper funnel cutout before reaching the server box. A green paper bypass valve opens cleanly.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-netflix-benchmark': `
SHOT: Split view comparison shot, paper workbench.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone workbench cut-outs.
ACTION: On the left, a cloud server box gets overwhelmed by heavy paper video reels. On the right, paper Open Connect boxes deliver video reels smoothly across local paper paths.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-netflix-call-to-action': `
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design Netflix...\n');

    for (const beat of SYSTEM_DESIGN_NETFLIX_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-netflix--${beat.id}.mp4`);
        if (fs.existsSync(outFile) && fs.statSync(outFile).size > 100000) {
            console.log(`   ⏭️ Skipped existing clip: ${beat.id}`);
            continue;
        }
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

    console.log('\n🎉 Design Netflix Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
