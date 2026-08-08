/**
 * generate-claudecode-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design Claude Code (Agentic AI System & Subagent Fleet)
 *   using Gemini Omni / Veo (veo-3.1-lite-generate-001) via Vertex AI @google/genai.
 *
 * Output: public/system-design-lessons/clips/sd-claudecode--<beatId>.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_DESIGN_CLAUDE_CODE_BEATS } from './systemDesignClaudeCodeScript.ts';

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
    'sd-claudecode-intro': `
SHOT: Medium shot, fast 12 FPS stop-motion paper collage.
STYLE: Premium paper-collage animation, aged yellowed newsprint backdrop, clean paper cutouts, halftone textures.
ACTION: A paper software developer cut-out tries to manage overflowing stacks of code paper scrolls and terminal windows. A single red paper stamp reading 'CONTEXT OVERFLOW' appears cleanly at center frame.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-claudecode-subagent-fleet': `
SHOT: Top-down office dispatch view, dynamic paper sliding motion.
STYLE: Premium paper-collage animation, off-white grid paper backdrop with clean paper cutouts and halftone drop shadows.
ACTION: A paper General Manager cut-out hands task cards to two distinct paper specialist subagent cut-outs. One subagent holds a sign reading 'RESEARCHER', another holds a sign reading 'DEBUGGER'.
Negative Constraints: no 3 arms, no extra limbs, no gibberish text, no camera shake.
    `.trim(),

    'sd-claudecode-context-window': `
SHOT: Medium shot, paper notepad sliding animation.
STYLE: Premium paper-collage aesthetic, clean grid backdrop, crisp paper stamps.
ACTION: A paper code log scroll displaying clean readable code syntax compresses dynamically into a compact paper summary card stamped with 'CHECKPOINT'. Older log pages slide neatly onto a paper disk storage shelf.
Negative Constraints: no garbled alien text, no camera shake, no 3D digital render.
    `.trim(),

    'sd-claudecode-safety-guards': `
SHOT: Split view on newsprint paper, paper security guard animation.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone shield cut-outs.
ACTION: A red paper command card reading "rm -rf /" approaches a server cut-out. A paper bouncer cut-out holds up a golden shield stamped with "PERMIT REQUIRED" to intercept execution.
Negative Constraints: no extra limbs, no garbled text, no camera shake, no 3D glossy render.
    `.trim(),

    'sd-claudecode-reactive-loop': `
SHOT: Medium wide shot, paper event loop animation.
STYLE: Premium paper-collage style, vintage newsprint backdrop, halftone sleeping and bell cut-outs.
ACTION: A parent agent paper cut-out sleeps peacefully with a zzz icon. A background subagent finishes its task and rings a golden callback bell cut-out, instantly waking up the parent agent with a green light.
Negative Constraints: no extra limbs, no garbled text, no camera shake.
    `.trim(),

    'sd-claudecode-failure-modes': `
SHOT: High angle wide shot, paper clock and timer animation.
STYLE: Premium paper-collage style, grid paper backdrop, halftone timer cut-outs.
ACTION: A paper subagent robot gets stuck running in a spinning paper wheel loop. A paper hourglass liveness timer cut-out triggers a red stop sign, halting the robot and resetting the workbench.
Negative Constraints: no camera shake, no 3D digital render.
    `.trim(),

    'sd-claudecode-benchmark': `
SHOT: Split view comparison shot, paper workbench.
STYLE: Premium paper-collage animation, aged newsprint backdrop, halftone workbench cut-outs.
ACTION: On the left, a single paper robot runs in an endless maze losing its map. On the right, a coordinated fleet of paper subagents pass clean task folders along an organized assembly line.
Negative Constraints: no camera shake, no 3D glossy render.
    `.trim(),

    'sd-claudecode-call-to-action': `
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
    console.log('🎥 Generating Veo 3.1 Lite Video Clips for Design Claude Code...\n');

    for (const beat of SYSTEM_DESIGN_CLAUDE_CODE_BEATS) {
        const outFile = path.join(OUT_DIR, `sd-claudecode--${beat.id}.mp4`);
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

    console.log('\n🎉 Design Claude Code Gemini Omni Video Generation Complete!');
}

generateOmniVideos();
