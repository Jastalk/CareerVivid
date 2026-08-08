/**
 * generate-api-omni-master.mjs
 *
 * Generates missing Clip 4 and Clip 5 using the user's Gemini API key with
 * veo-3.1-lite-generate-preview and Chirp3-HD Voice Narration, crops 93% bottom watermark,
 * and concatenates all 6 clips into the master film.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';

const API_KEY = "AQ.Ab8RN6LskIsc9l49VHGlnJVQP7Fto8kruRQ2qzT5X9hAiV5lAQ";
const MODEL = "veo-3.1-lite-generate-preview";

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const MASTER_OUTPUT = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');

const ai = new GoogleGenAI({ apiKey: API_KEY });

const clipPrompts = {
    clip4: {
        visual: `A cinematic low-angle glide shot framing a young male software engineer with short black hair and glasses standing in front of dark high-density server racks with blue and amber LED pulse lights. Paper collage vector style, dark slate backdrop. NO TEXT, NO WORDS, NO LETTERING.`,
        speech: `When an offline user receives a message, it gets queued in a distributed RocksDB message store. Once delivered to the recipient, the message is instantly deleted from server storage forever.`
    },
    clip5: {
        visual: `A dynamic handheld camera shot of a young male software engineer with short black hair and glasses pointing to an interactive glass whiteboard showing CDN network nodes and image compression flow. Paper collage style, clean dark slate backdrop. NO TEXT, NO WORDS, NO LETTERING.`,
        speech: `For high-res photos and video, media is compressed client-side, encrypted, and uploaded in chunked byte-streams to CDN origin shields via resumable HTTP endpoints for zero bandwidth waste.`
    }
};

async function pollVideo(op) {
    let current = op;
    while (!current.done) {
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, 5000));
        current = await ai.operations.getVideosOperation({ operation: current });
    }
    console.log("");
    return current;
}

async function downloadFile(url, destFile) {
    const fullUrl = url.includes('key=') ? url : `${url}&key=${API_KEY}`;
    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error(`HTTP download error: ${res.status} ${res.statusText}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destFile, buffer);
    console.log(`📥 Downloaded video (${(buffer.length / 1024 / 1024).toFixed(2)} MB) to ${destFile}`);
}

async function generateTtsAudio(text, outFile) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
    }
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const token = tokenRes.token ?? tokenRes;

    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text },
            voice: { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Fenrir' },
            audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
        }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body?.error?.message ?? `TTS HTTP ${res.status}`);
    fs.writeFileSync(outFile, Buffer.from(body.audioContent, 'base64'));
    console.log(`🎙 Generated Chirp3-HD narration: ${outFile}`);
}

async function generateClipWithAudio(key, info) {
    const rawVideo = path.join(CLIPS_DIR, `whatsapp-api-raw-${key}.mp4`);
    const audioWav = path.join(CLIPS_DIR, `whatsapp-api-audio-${key}.wav`);
    const combinedMp4 = path.join(CLIPS_DIR, `whatsapp-raw-${key.slice(-1)}-fixed.mp4`);

    console.log(`🎥 Generating ${key} video via Gemini API (${MODEL})...`);
    const op = await ai.models.generateVideos({
        model: MODEL,
        prompt: info.visual,
        config: { aspectRatio: "16:9", numberOfVideos: 1 }
    });

    const done = await pollVideo(op);
    const video = done?.response?.generatedVideos?.[0]?.video;
    if (!video) throw new Error(done?.error?.message ?? 'No video returned');

    if (video.videoBytes) {
        fs.writeFileSync(rawVideo, Buffer.from(video.videoBytes, 'base64'));
    } else if (video.uri) {
        if (video.uri.startsWith('http')) {
            await downloadFile(video.uri, rawVideo);
        } else {
            execSync(`gcloud storage cp "${video.uri}" "${rawVideo}"`, { stdio: 'pipe' });
        }
    }

    console.log(`🔊 Synthesizing speech narration for ${key}...`);
    await generateTtsAudio(info.speech, audioWav);

    console.log(`🎬 Muxing video and audio into ${combinedMp4}...`);
    const muxCmd = `ffmpeg -y -i "${rawVideo}" -i "${audioWav}" -c:v copy -c:a aac -shortest "${combinedMp4}"`;
    execSync(muxCmd, { stdio: 'pipe' });
    console.log(`✅ Combined clip ready: ${combinedMp4}`);

    return combinedMp4;
}

async function main() {
    console.log("========================================================");
    console.log("🚀 CAREERVIVID API GEMINI OMNI/VEO VIDEO GENERATION");
    console.log("========================================================\n");

    fs.mkdirSync(CLIPS_DIR, { recursive: true });

    // Generate Clip 4
    await generateClipWithAudio('clip4', clipPrompts.clip4);

    // Generate Clip 5
    await generateClipWithAudio('clip5', clipPrompts.clip5);

    // Prepare all 6 clips for clean crop & concat
    console.log("\n========================================================");
    console.log("✂️ Cropping bottom 7% AI watermarks & upscaling 6 clips...");
    console.log("========================================================");

    const rawClipsList = [
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-1.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-2.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-3.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-raw-4-fixed.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-raw-5-fixed.mp4'),
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

    const concatListPath = path.join(CLIPS_DIR, 'whatsapp-perfect-concat.txt');
    fs.writeFileSync(concatListPath, cleanPaths.map(f => `file '${f}'`).join('\n'));
    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${MASTER_OUTPUT}"`;
    execSync(concatCmd, { stdio: 'inherit' });

    const finalSize = fs.statSync(MASTER_OUTPUT).size;
    console.log(`\n🎉 PERFECT MASTER FILM RENDERED: ${MASTER_OUTPUT}`);
    console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`========================================================`);
}

main().catch(err => {
    console.error("❌ API Error:", err);
    process.exit(1);
});
