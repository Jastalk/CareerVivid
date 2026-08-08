/**
 * generate-ubersurge-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design Uber Surge Pricing Engine & Real-Time Heatmaps
 *   using Veo 3.1 Lite (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-ubersurge--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_UBER_SURGE_BEATS } from './systemDesignUberSurgeScript.ts';

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
    'sd-ubersurge-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Premium paper-collage animation, aged yellowed newsprint backdrop, clean paper cutouts, halftone textures.
ACTION: A paper storm cloud cutout drops paper rain cutouts over a paper city grid. Hundreds of paper rider cutouts hold up red ride request signs while yellow paper taxi car cutouts slide away.
Negative Constraints: no text, no garbled letters, no duplicate words, no pseudo-latin, no camera shake, no 3D glossy render.
    `.trim(),

    'sd-ubersurge-h3-hexagons': `
SHOT: Top-down map view, dynamic paper sliding motion.
STYLE: Premium paper-collage animation, off-white grid paper backdrop with clean paper cutouts and halftone drop shadows.
ACTION: A paper city map is overlaid with a clean grid of yellow and orange paper hexagon cutouts. Small paper car cutouts slide smoothly inside the individual hexagon boundaries.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-ubersurge-flink-stream': `
SHOT: Medium shot, paper stream processing animation.
STYLE: Premium paper-collage aesthetic, clean grid backdrop, crisp paper stamps.
ACTION: Paper location ping dots stream through a paper Kafka pipe cutout into a paper Flink clock window cutout, calculating a clean paper surge ratio stamp reading 2.5x.
Negative Constraints: no garbled alien text, no camera shake, no 3D digital render.
    `.trim(),

    'sd-ubersurge-price-quote': `
SHOT: High angle shot, paper lock animation.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone lock cut-outs.
ACTION: A paper price tag cutout reading $24.50 is locked into place by a golden paper padlock cutout. A paper 5-minute timer cutout counts down steadily beside it.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-ubersurge-anti-fraud': `
SHOT: Split view, paper security shield animation.
STYLE: Premium paper-collage style, vintage newsprint backdrop, halftone shield cut-outs.
ACTION: Group of paper phone cutouts switch off simultaneously. A paper security bouncer cutout holds up a red stop sign cutout to block fake surge manipulation.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-ubersurge-benchmark': `
SHOT: Split view comparison shot, paper workbench.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone workbench cut-outs.
ACTION: On the left, a paper Google S2 quadtree map distorts near the top edge. On the right, clean uniform paper Uber H3 hexagons align with equal spacing between all centers.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-ubersurge-call-to-action': `
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design Uber Surge...\n');

    for (const beat of SYSTEM_DESIGN_UBER_SURGE_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-ubersurge--${beat.id}.mp4`);
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

    console.log('\n🎉 Design Uber Surge Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
