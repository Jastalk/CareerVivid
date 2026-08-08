/**
 * generate-cache-rate-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: Caching and Rate Limiting
 *   using Gemini Omni / Veo (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-caching--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_CACHE_RATE_BEATS } from './systemDesignCacheRateScript.ts';

const OUT_DIR = 'public/system-design-lessons/clips';
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL = 'veo-3.1-lite-generate-001';

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

// Hilarious & vivid documentary paper-collage animation prompts:
const OMNI_PROMPTS = {
    'sd-cache-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A vintage paper alarm clock cut-out ticks down and strikes 12:00 MIDNIGHT. A horde of paper sneakerhead cut-outs rush toward a paper store register cut-out. A bold red paper "504 TIMEOUT" error badge slaps onto frame with snappy paper jitter.
Negative Constraints: no camera shake, no 3D glossy render, no gibberish captions.
    `.trim(),

    'sd-cache-stampede-story': `
SHOT: Medium wide shot, dynamic stop-motion motion design.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A blank black chalkboard paper cut-out swings empty. A massive paper tidal wave of crowd cut-outs surges past the chalkboard, smashing directly into a paper database manager cut-out in the back room with red ink lightning scribbles.
Negative Constraints: no camera shake, no 3D digital glossy render.
    `.trim(),

    'sd-cache-stampede-solution': `
SHOT: Locked-off shot, smooth paper sliding motion.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A paper crowd cut-out relaxes outside holding boba tea cups. Exactly ONE single paper representative cut-out wearing a golden paper hat walks up to the database manager, receives a glowing green checkmark, and yells it back to the crowd.
Negative Constraints: no camera shake, no 3D digital render.
    `.trim(),

    'sd-rate-limiting-token-bucket': `
SHOT: Medium shot, paper stop-motion mechanics.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A halftone paper nightclub bouncer cut-out in a tuxedo holds a velvet rope in front of a glowing paper API doorway. Green paper tokens drop into a paper bucket. A paper robot icon tries to sneak past and is slapped away with a red "HTTP 429" stamp into a trash bin.
Negative Constraints: no camera shake, no full-sentence text.
    `.trim(),

    'sd-cache-eviction-lru': `
SHOT: Split view on newsprint paper, smooth sliding motion.
STYLE: Documentary paper-collage explainer animation, aged off-white newsprint / grid-paper backdrop, halftone or duotone cut-outs with crisp torn outlines and drop shadows, hand-drawn black scribbles, limited palette of black ink, mustard yellow, muted teal and one accent red, stop-motion cadence at 12fps, entirely flat 2D cut-paper — never live-action, never a glossy 3D render.
ACTION: A hand-drawn black ink arm sweeps an old, yellowed paper sticky note off a desk (LRU Eviction). A fresh green sticky note card slides into place, while a red marker crosses out the old price tag.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-cache-outro': `
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
    console.log('🎥 Generating Beginner-Friendly & Humorous Veo 3.1 Lite Video Clips...\n');

    for (const beat of SYSTEM_DESIGN_CACHE_RATE_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-cache--${beat.id}.mp4`);
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

    console.log('\n🎉 Humorous Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
