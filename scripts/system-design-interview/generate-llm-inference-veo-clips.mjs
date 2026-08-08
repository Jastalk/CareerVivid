/**
 * generate-llm-inference-veo-clips.mjs
 *
 * Generates EXACTLY 2 Veo 3.1 Lite (veo-3.1-lite-generate-001) clips:
 *   - Beat 1 HOOK (Mood/Motion: High-density datacenter server racks with glowing fiber optic cables)
 *   - Beat 8 RECAP + CTA (Mood/Motion: Golden paper trophy & system architecture victory scene)
 *
 * Hard Constraint: ZERO text, ZERO letters, ZERO numbers, ZERO logos.
 * Output: public/system-design-lessons/clips/sd-llm-inference--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';

const OUT_DIR = 'public/system-design-lessons/clips';
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL = 'veo-3.1-lite-generate-001';

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

const VEO_BEATS = [
    {
        id: 'beat-1-hook',
        prompt: `
SHOT: Medium wide shot, slow 12 FPS stop-motion paper collage animation.
STYLE: Premium paper-collage style, aged newsprint backdrop, clean paper cutouts, halftone textures.
ACTION: A paper supercomputer GPU server rack cutout with glowing blue fiber optic cables. Pulsing blue and emerald energy beams flow smoothly through the paper cables into a central paper chip cutout.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render.
        `.trim(),
    },
    {
        id: 'beat-8-recap-cta',
        prompt: `
SHOT: Static wide shot, slow 10% camera push in.
STYLE: Premium paper-collage style, vintage newsprint backdrop, halftone paper drop shadows.
ACTION: A golden paper trophy cutout snaps down at center frame. Two paper pencils slide in from the bottom edges and rest beside a clean geometric paper architecture cutout.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render.
        `.trim(),
    },
];

async function pollOperation(operation) {
    let op = operation;
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    while (!op.done) {
        if (attempts++ >= MAX_ATTEMPTS) throw new Error('Timeout waiting for Gemini Veo video operation');
        await new Promise(r => setTimeout(r, 5000));
        op = await ai.operations.getVideosOperation({ operation: op });
        process.stdout.write('.');
    }
    console.log('');
    return op;
}

async function generateVeoClips() {
    console.log('🎥 Generating Veo 3.1 Lite Clips for Beats 1 & 8 (Zero-Text Restricted Role)...\n');

    for (const b of VEO_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-llm-inference--${b.id}.mp4`);
        if (fs.existsSync(outFile) && fs.statSync(outFile).size > 100000) {
            console.log(`   ⏭️ Skipped existing clip: ${b.id}`);
            continue;
        }

        console.log(`🚀 Generating Veo Clip for Beat: ${b.id}`);
        console.log(`   Prompt: ${b.prompt.slice(0, 100)}...`);
        process.stdout.write('   Polling');

        try {
            const op = await ai.models.generateVideos({
                model: MODEL,
                prompt: b.prompt,
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
            console.error(`   ❌ Failed ${b.id}:`, err.message);
        }
    }

    console.log('\n🎉 Veo Clips Generation Complete!');
}

generateVeoClips();
