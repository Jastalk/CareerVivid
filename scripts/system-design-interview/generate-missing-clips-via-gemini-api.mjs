/**
 * generate-missing-clips-via-gemini-api.mjs
 *
 * Direct API generator using CareerVivid's Gemini / Vertex AI Veo 3.1 API (@google/genai)
 * to produce missing Clip 4 and Clip 5, crop bottom 7% watermarks, and assemble the master film.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL = 'veo-3.1-lite-generate-001';

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const MASTER_OUTPUT = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

async function poll(op) {
    let current = op;
    while (!current.done) {
        process.stdout.write('.');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        current = await ai.operations.getVideosOperation({ operation: current });
    }
    process.stdout.write('\n');
    return current;
}

const prompts = {
    clip4: `A cinematic low-angle glide shot of a young male software engineer with short black hair and glasses standing in front of dark-mode database server racks with glowing blue and amber LED data lights, technical system architecture background, paper collage style, paper concepts, bold paper cutout vectors, clean slate background. NO TEXT, NO WORDS, NO LETTERING.`,
    clip5: `A dynamic handheld camera shot of a young male software engineer with short black hair and glasses pointing to an interactive glass whiteboard showing CDN network nodes and image compression flow, paper collage style, paper concepts, clean dark slate backdrop. NO TEXT, NO WORDS, NO LETTERING.`
};

async function generateClip(clipId, promptText) {
    const rawPath = path.join(CLIPS_DIR, `whatsapp-api-raw-${clipId}.mp4`);
    console.log(`🎥 Generating ${clipId} via Gemini Veo API (${MODEL})...`);
    console.log(`   Prompt: "${promptText.slice(0, 80)}..."`);

    const op = await ai.models.generateVideos({
        model: MODEL,
        prompt: promptText,
        config: {
            durationSeconds: 8,
            numberOfVideos: 1,
            aspectRatio: '16:9',
            personGeneration: 'allow_adult',
        },
    });

    const done = await poll(op);
    const video = done?.response?.generatedVideos?.[0]?.video;
    if (!video) throw new Error(done?.error?.message ?? 'no video in API response');

    if (video.videoBytes) {
        fs.writeFileSync(rawPath, Buffer.from(video.videoBytes, 'base64'));
    } else if (video.uri) {
        execSync(`gcloud storage cp "${video.uri}" "${rawPath}"`, { stdio: 'pipe' });
    } else {
        throw new Error('response held neither bytes nor a uri');
    }

    console.log(`✅ Saved ${clipId} raw video: ${rawPath} (${(fs.statSync(rawPath).size / 1024 / 1024).toFixed(2)} MB)`);
    return rawPath;
}

async function main() {
    console.log("========================================================");
    console.log("🎬 CAREERVIVID GEMINI VEO API VIDEO GENERATION");
    console.log("========================================================\n");

    fs.mkdirSync(CLIPS_DIR, { recursive: true });

    // Generate Clip 4 & Clip 5 via API if missing
    let raw4Path = path.join(CLIPS_DIR, 'whatsapp-raw-4-fixed.mp4');
    let raw5Path = path.join(CLIPS_DIR, 'whatsapp-raw-5-fixed.mp4');

    if (!fs.existsSync(raw4Path) || process.env.FORCE) {
        raw4Path = await generateClip('clip4', prompts.clip4);
    } else {
        console.log(`✅ Clip 4 already exists: ${raw4Path}`);
    }

    if (!fs.existsSync(raw5Path) || process.env.FORCE) {
        raw5Path = await generateClip('clip5', prompts.clip5);
    } else {
        console.log(`✅ Clip 5 already exists: ${raw5Path}`);
    }

    // Prepare all 6 clips for clean crop & concat
    console.log("\n========================================================");
    console.log("✂️ Cropping bottom 7% AI watermarks & upscaling 6 clips...");
    console.log("========================================================");

    const rawClipsList = [
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-1.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-2.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-3.mp4'),
        raw4Path,
        raw5Path,
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-6-outro.mp4')
    ];

    const cleanPaths = [];
    for (let i = 0; i < rawClipsList.length; i++) {
        const raw = rawClipsList[i];
        if (!fs.existsSync(raw)) {
            console.error(`❌ Error: Missing clip file: ${raw}`);
            continue;
        }
        const cleanFile = path.join(CLIPS_DIR, `whatsapp-perfect-clean-${i + 1}.mp4`);
        const cropCmd = `ffmpeg -y -i "${raw}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanFile}"`;
        execSync(cropCmd, { stdio: 'pipe' });
        cleanPaths.push(cleanFile);
        console.log(`✅ Clean Clip ${i + 1} ready: ${cleanFile}`);
    }

    console.log(`\n========================================================`);
    console.log(`🎬 Concatenating ${cleanPaths.length} Unique Clean Video Clips...`);
    console.log(`========================================================`);

    if (cleanPaths.length >= 4) {
        const concatListPath = path.join(CLIPS_DIR, 'whatsapp-perfect-concat.txt');
        fs.writeFileSync(concatListPath, cleanPaths.map(f => `file '${f}'`).join('\n'));
        const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${MASTER_OUTPUT}"`;
        execSync(concatCmd, { stdio: 'inherit' });
        const finalSize = fs.statSync(MASTER_OUTPUT).size;
        console.log(`\n🎉 MASTER FILM RENDERED: ${MASTER_OUTPUT}`);
        console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`========================================================`);
    }
}

main().catch(err => {
    console.error("❌ API Pipeline Error:", err);
    process.exit(1);
});
