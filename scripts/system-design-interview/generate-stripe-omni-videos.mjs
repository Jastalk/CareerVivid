/**
 * generate-stripe-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design Stripe (Idempotency, 2PC vs Saga & Outbox CDC)
 *   using Veo 3.1 Lite (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-stripe--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_STRIPE_BEATS } from './systemDesignStripeScript.ts';

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
    'sd-stripe-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Premium paper-collage animation, aged yellowed newsprint backdrop, clean paper cutouts, halftone textures.
ACTION: A paper credit card cutout slides into a paper terminal register cutout. Multiple red paper hazard warning triangles pop up as network wire cutouts spark.
Negative Constraints: no text, no garbled letters, no duplicate words, no pseudo-latin, no camera shake, no 3D glossy render.
    `.trim(),

    'sd-stripe-idempotency': `
SHOT: Top-down architecture view, dynamic paper sliding motion.
STYLE: Premium paper-collage animation, off-white grid paper backdrop with clean paper cutouts and halftone drop shadows.
ACTION: A paper key card cutout marked with a lock icon slides into a glowing paper Redis database server cutout. Duplicate paper payment request arrows bounce off cleanly.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-stripe-saga': `
SHOT: High angle split view, paper transaction orchestration animation.
STYLE: Premium paper-collage aesthetic, clean grid backdrop, crisp paper stamps.
ACTION: A paper orchestrator arrow moves step-by-step past three paper bank vault cutouts. When the final vault shows an error flag, previous arrows reverse gracefully.
Negative Constraints: no garbled alien text, no camera shake, no 3D digital render.
    `.trim(),

    'sd-stripe-outbox-cdc': `
SHOT: Medium shot, paper event streaming animation.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone log sheet cut-outs.
ACTION: Paper transaction receipt cutouts drop into a paper outbox filing box. A paper scanner beam slides across and streams paper event dots into a Kafka pipe cutout.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-stripe-double-entry-ledger': `
SHOT: Close up view, paper accounting ledger animation.
STYLE: Premium paper-collage style, vintage newsprint backdrop, halftone checkmark cut-outs.
ACTION: A paper ledger book cutout opens. Paper dollar coin cutouts align neatly into matching debit and credit columns, balancing with zero gap.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-stripe-benchmark': `
SHOT: Split view comparison shot, paper workbench.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone workbench cut-outs.
ACTION: On the left, a paper 2PC lock holds up a line of paper payment trucks in traffic. On the right, a paper green express lane moves paper transactions effortlessly.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-stripe-call-to-action': `
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design Stripe...\n');

    for (const beat of SYSTEM_DESIGN_STRIPE_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-stripe--${beat.id}.mp4`);
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

    console.log('\n🎉 Design Stripe Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
