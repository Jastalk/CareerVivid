/**
 * generate-3-videos-veo-clips.mjs
 *
 * Generates Ultra High Quality Veo 3.1 Lite (veo-3.1-lite-generate-001) clips for Beats 1 & 8:
 *   1. Vector DB Index Sharding (sd-vector-rag)
 *   2. AI Agent Orchestration (sd-agent-swarms)
 *   3. GPU Fleet Scheduling (sd-gpu-fleet)
 *
 * Enforces ZERO text, ZERO letters, ZERO numbers, ZERO signage.
 * Output: public/system-design-lessons/clips/<videoId>--<beatId>.mp4
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
    // Video 1: Vector RAG
    {
        videoId: 'sd-vector-rag',
        beatId: 'beat-1-hook',
        prompt: `
SHOT: Cinematic medium wide shot, slow stop-motion 12 FPS paper collage animation.
STYLE: Premium 4k paper-collage papercraft style, studio lighting, yellowed newsprint backdrop, vibrant cyan and gold paper accents, high contrast paper drop shadows.
ACTION: A gleaming brass paper compass rests at center frame. Geometric 3D paper lattice nodes and glowing cyan fiber light threads smoothly expand outward across textured slate paper grid layers.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render, no blur.
        `.trim(),
    },
    {
        videoId: 'sd-vector-rag',
        beatId: 'beat-8-recap-cta',
        prompt: `
SHOT: Static wide shot, slow 10% camera zoom in.
STYLE: Premium 4k paper-collage style, studio overhead lighting, dark slate newsprint backdrop, paper drop shadows.
ACTION: A golden paper trophy cutout snaps down firmly at center frame. Two brass paper compasses and geometric cyan paper grid shapes align in clean symmetry around a golden paper architecture base.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render, no blur.
        `.trim(),
    },
    // Video 2: Agent Swarms
    {
        videoId: 'sd-agent-swarms',
        beatId: 'beat-1-hook',
        prompt: `
SHOT: Crisp close up shot, 12 FPS stop-motion paper animation.
STYLE: Premium 4k paper-collage papercraft style, studio lighting, golden amber paper accents, high contrast paper textures.
ACTION: A large golden paper hive gear turns smoothly as small paper worker robot cutouts dispatch along amber fiber paper conveyor paths in synchronized harmony.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render, no blur.
        `.trim(),
    },
    {
        videoId: 'sd-agent-swarms',
        beatId: 'beat-8-recap-cta',
        prompt: `
SHOT: Static wide shot, slow 10% camera zoom in.
STYLE: Premium 4k paper-collage style, studio overhead lighting, dark slate newsprint backdrop, paper drop shadows.
ACTION: A golden paper trophy cutout snaps down firmly at center frame. Golden paper gears and worker robot cutouts celebrate in formation around a clean paper architecture pedestal.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render, no blur.
        `.trim(),
    },
    // Video 3: GPU Fleet
    {
        videoId: 'sd-gpu-fleet',
        beatId: 'beat-1-hook',
        prompt: `
SHOT: Wide top-down shot, slow stop-motion 12 FPS paper animation.
STYLE: Premium 4k paper-collage papercraft style, studio lighting, neon green and cyan paper accents, dark slate newsprint grid backdrop.
ACTION: A massive high-density grid of paper supercomputer server rack cutouts with glowing cyan fiber optic paper cables pulsating in high-speed data transmission loops.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render, no blur.
        `.trim(),
    },
    {
        videoId: 'sd-gpu-fleet',
        beatId: 'beat-8-recap-cta',
        prompt: `
SHOT: Static wide shot, slow 10% camera zoom in.
STYLE: Premium 4k paper-collage style, studio overhead lighting, dark slate newsprint backdrop, paper drop shadows.
ACTION: A golden paper trophy cutout snaps down firmly at center frame. High-performance paper supercomputer server rack cutouts line up in victory formation.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render, no blur.
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
    console.log('🎥 Generating Ultra High Quality Veo 3.1 Lite Clips for Beats 1 & 8 across 3 Videos...\n');
    const FORCE_REGENERATE = process.env.FORCE === '1' || true;

    for (const b of VEO_BEATS) {
        const outFile = path.join(OUT_DIR, `${b.videoId}--${b.beatId}.mp4`);
        if (!FORCE_REGENERATE && fs.existsSync(outFile) && fs.statSync(outFile).size > 100000) {
            console.log(`   ⏭️ Skipped existing clip: ${b.videoId} ${b.beatId}`);
            continue;
        }

        console.log(`🚀 Generating Veo Clip for [${b.videoId}] Beat: ${b.beatId}`);
        console.log(`   Prompt: ${b.prompt.slice(0, 90)}...`);
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
            console.error(`   ❌ Failed ${b.videoId} ${b.beatId}:`, err.message);
        }
    }

    console.log('\n🎉 Veo Clips Generation Complete!');
}

generateVeoClips().catch(console.error);
