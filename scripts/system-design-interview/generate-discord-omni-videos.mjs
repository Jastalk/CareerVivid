/**
 * generate-discord-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design Discord (10M Concurrent Voice & Text Channels)
 *   using Veo 3.1 Lite (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-discord--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_DISCORD_BEATS } from './systemDesignDiscordScript.ts';

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
    'sd-discord-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Premium paper-collage animation, aged yellowed newsprint backdrop, clean paper cutouts, halftone textures.
ACTION: Multiple paper gaming character cutouts speak into paper headsets. Dozens of colorful paper chat server icons pop up cleanly on a dark purple paper grid.
Negative Constraints: no text, no garbled letters, no duplicate words, no pseudo-latin, no camera shake, no 3D glossy render.
    `.trim(),

    'sd-discord-actor-model': `
SHOT: Top-down architecture view, dynamic paper sliding motion.
STYLE: Premium paper-collage animation, off-white grid paper backdrop with clean paper cutouts and halftone drop shadows.
ACTION: Hundreds of tiny paper process bubble cutouts expand neatly across a paper BEAM engine cutout. Each bubble handles one paper WebSocket line cleanly.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-discord-scylladb-store': `
SHOT: Medium shot, paper database storage animation.
STYLE: Premium paper-collage aesthetic, clean grid backdrop, crisp paper stamps.
ACTION: Paper message scrolls marked with Snowflake timestamps slide into neat paper ScyllaDB SSD disk drive shelf cutouts in perfect order.
Negative Constraints: no garbled alien text, no camera shake, no 3D digital render.
    `.trim(),

    'sd-discord-sfu-voice': `
SHOT: High angle split view, paper audio routing animation.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone audio wave cut-outs.
ACTION: Multiple paper audio wave lines stream into a central paper SFU server cutout, which selectively forwards audio to active paper listener cutouts.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-discord-read-pointers': `
SHOT: Split view, paper read pointer animation.
STYLE: Premium paper-collage style, vintage newsprint backdrop, halftone checkmark cut-outs.
ACTION: A paper streamer posts a message scroll. Thousands of paper user avatar cutouts update their local paper read pointer checkmarks without querying the central database.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-discord-benchmark': `
SHOT: Split view comparison shot, paper workbench.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone workbench cut-outs.
ACTION: On the left, a paper HTTP polling setup lags under heavy request traffic. On the right, a paper Discord BEAM actor model maintains persistent green WebSocket connections smoothly.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-discord-call-to-action': `
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design Discord...\n');

    for (const beat of SYSTEM_DESIGN_DISCORD_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-discord--${beat.id}.mp4`);
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

    console.log('\n🎉 Design Discord Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
