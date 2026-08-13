/**
 * generate-system-design-commercial-veo.mjs
 *
 * Generates 3 Veo 3.1 Lite (veo-3.1-lite-generate-001) AI video clips for:
 *   - Beat 1: Hook (Distressed engineer at a paper-collage distributed system whiteboard with glowing red nodes)
 *   - Beat 2: Solution (Paper-collage AI brain core sending cyan energy pulses to digital terminal)
 *   - Beat 5: Outro (Golden paper trophy & system architecture victory card)
 *
 * Output: public/commercial-videos/careervivid-system-design/assets/veo/
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';

const OUT_DIR = path.resolve('public/commercial-videos/careervivid-system-design/assets/veo');
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
        id: 'veo_beat1_hook',
        prompt: `
SHOT: Medium wide shot, 12 FPS stop-motion paper collage animation.
STYLE: Premium paper-collage style, vintage newsprint backdrop, clean paper cutouts, halftone drop shadows.
ACTION: A paper engineer cutout standing in front of a giant paper server network whiteboard. Red warning indicator tags pulse on paper database boxes, and paper lightning bolts flicker between server nodes.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render.
        `.trim(),
    },
    {
        id: 'veo_beat2_solution',
        prompt: `
SHOT: Close up shot, slow pan left.
STYLE: Premium paper-collage style, dark grid paper backdrop, vibrant color accents.
ACTION: A glowing emerald and cyan paper neural network core cutout. Bright energy pulses stream out from the paper core along paper fiber cables into a sleek paper terminal screen.
Negative Constraints: no text, no letters, no numbers, no words, no symbols, no signage, no watermark, no pseudo-latin, no 3D glossy render.
        `.trim(),
    },
    {
        id: 'veo_beat5_outro',
        prompt: `
SHOT: Center framing, 10% slow camera push in.
STYLE: Premium paper-collage style, off-white grid paper, paper texture overlay.
ACTION: A golden paper trophy cutout snaps down at center frame with floating paper star cutouts. Two paper pencils slide in from the edges and rest beside a clean geometric paper architecture cutout.
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
    console.log('🎥 Generating Veo 3.1 Lite AI Video Clips for Commercial (Veo 3.1 Lite)...\\n');

    for (const b of VEO_BEATS) {
        const outFile = path.join(OUT_DIR, `${b.id}.mp4`);
        if (fs.existsSync(outFile) && fs.statSync(outFile).size > 100000) {
            console.log(`   ⏭️ Skipped existing clip: ${b.id}`);
            continue;
        }

        console.log(`🚀 Generating Veo Clip for ${b.id}`);
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
