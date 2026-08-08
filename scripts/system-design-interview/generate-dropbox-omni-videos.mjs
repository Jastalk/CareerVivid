/**
 * generate-dropbox-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design Dropbox (Block Storage, CDC Chunking & Metadata Sync)
 *   using Veo 3.1 Lite (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-dropbox--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_DROPBOX_BEATS } from './systemDesignDropboxScript.ts';

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
    'sd-dropbox-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Premium paper-collage animation, aged yellowed newsprint backdrop, clean paper cutouts, halftone textures.
ACTION: A massive paper file binder cutout struggles to squeeze through a small paper pipe cutout. Heavy red paper bandwidth meter arrows overflow and shake.
Negative Constraints: no text, no garbled letters, no duplicate words, no pseudo-latin, no camera shake, no 3D glossy render.
    `.trim(),

    'sd-dropbox-cdc': `
SHOT: Top-down architecture view, dynamic paper sliding motion.
STYLE: Premium paper-collage animation, off-white grid paper backdrop with clean paper cutouts and halftone drop shadows.
ACTION: A long paper document strip passes under a paper cutter blade cutout with Rabin scanner marks. The document breaks into 4 neat blue paper block cutouts.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-dropbox-dedup': `
SHOT: High angle split view, paper block deduplication.
STYLE: Premium paper-collage aesthetic, clean grid backdrop, crisp paper stamps.
ACTION: A new paper block cutout with a hash stamp arrives at a paper storage cabinet cutout. A matching paper block already exists inside, so only a thin paper link ribbon attaches.
Negative Constraints: no garbled alien text, no camera shake, no 3D digital render.
    `.trim(),

    'sd-dropbox-sync-engine': `
SHOT: Medium shot, paper delta sync animation.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone server box cut-outs.
ACTION: A paper laptop cutout finishes uploading a block. A paper notification envelope cut-out pops out of a central server box and flies instantly to a paper smartphone cutout.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-dropbox-conflict-resolution': `
SHOT: Close up view, paper conflict resolution animation.
STYLE: Premium paper-collage style, vintage newsprint backdrop, halftone checkmark cut-outs.
ACTION: Two paper pencil cutouts edit duplicate paper document sheets simultaneously. A paper vector clock stamp marks both, spawning a neat paper conflict copy cutout.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-dropbox-benchmark': `
SHOT: Split view comparison shot, paper workbench.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone workbench cut-outs.
ACTION: On the left, a generic cloud storage bucket gets crowded with duplicate file boxes. On the right, a sleek paper Magic Pocket rack organizes block storage effortlessly.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-dropbox-call-to-action': `
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design Dropbox...\n');

    for (const beat of SYSTEM_DESIGN_DROPBOX_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-dropbox--${beat.id}.mp4`);
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

    console.log('\n🎉 Design Dropbox Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
