/**
 * build-showcase-deluxe.mjs
 *
 * Automated compilation of the NEW Deluxe 3-Minute (188-second) CareerVivid Founder & Product Showcase Commercial.
 * Features:
 * - Dynamic 2.5D Camera Drift & Focused Zooms on ATS score & Google system design nodes
 * - Tactile UI Sound Design & Foley FX (Whooshes, chime success, report chime, typing)
 * - Animated data packet flows & social proof badges (Tier-1 company pills, 4.9/5 trust rating)
 * - 100% consistent Charon narration + full multi-turn candidate-coach dialogue
 * - Output: public/commercial-videos/careervivid-founder-showcase-deluxe.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const DURATION_SEC = 188;
const BASE_DIR = path.resolve('public/commercial-videos/founder-showcase-deluxe');
const AUDIO_DIR = path.join(BASE_DIR, 'audio');
const SFX_DIR = path.join(BASE_DIR, 'sfx');
const FRAMES_DIR = path.join(BASE_DIR, 'frames');
const TIMELINE_HTML = path.join(BASE_DIR, 'showcase_timeline_deluxe.html');
const BGM_PATH = path.resolve('public/assets/bgm.mp3');
const FINAL_MP4 = path.resolve('public/commercial-videos/careervivid-founder-showcase-deluxe.mp4');

const AUDIO_TIMELINE = [
    // Section 1: Founder Origin & Broken Funnel
    { file: 'sec1_part1_hook.wav', startSec: 0.5 },
    { file: 'sec1_part2_vision.wav', startSec: 21.6 },
    // Section 2: Resume Engineering Studio
    { file: 'sec2_part1_resume_intro.wav', startSec: 35.2 },
    { file: 'sec2_part2_resume_transform.wav', startSec: 53.0 },
    // Section 3: Real Google System Design Whiteboard + Coaching Dialogue + Real Diagnostic Report
    { file: 'sec3_part1_interview_intro.wav', startSec: 71.5 },
    { file: 'sec3_part2_candidate_ans1.wav', startSec: 87.0 },
    { file: 'sec3_part3_agent_pushback.wav', startSec: 104.5 },
    { file: 'sec3_part4_candidate_ans2.wav', startSec: 120.2 },
    { file: 'sec3_part5_agent_verdict.wav', startSec: 127.8 },
    { file: 'sec3_part6_interview_recap.wav', startSec: 135.5 },
    // Section 4: Role Tracks & Complete Full Dashboard
    { file: 'sec4_part1_ecosystem.wav', startSec: 147.5 },
    { file: 'sec4_part2_data_proof.wav', startSec: 158.0 },
    // Section 5: Climax & CTA (Consistent Voice)
    { file: 'sec5_part1_climax.wav', startSec: 170.0 },
    { file: 'sec5_part2_cta.wav', startSec: 181.5 }
];

const SFX_TIMELINE = [
    { file: 'whoosh.wav', startSec: 35.0, vol: 0.3 },
    { file: 'chime_success.wav', startSec: 54.5, vol: 0.25 },
    { file: 'whoosh.wav', startSec: 71.2, vol: 0.3 },
    { file: 'typing_soft.wav', startSec: 87.0, vol: 0.18 },
    { file: 'report_chime.wav', startSec: 135.0, vol: 0.25 },
    { file: 'whoosh.wav', startSec: 147.2, vol: 0.3 },
    { file: 'whoosh.wav', startSec: 169.6, vol: 0.3 }
];

async function main() {
    console.log("========================================================");
    console.log("🎬 CAREERVIVID 3-MINUTE FOUNDER & PRODUCT SHOWCASE (DELUXE EDITION)");
    console.log(`Target Duration: ${DURATION_SEC} seconds (188s Full Film)`);
    console.log(`Features: Dynamic 2.5D Zooms, Tactile Foley SFX, Live Data Pulses, Social Proof`);
    console.log("========================================================\n");

    fs.mkdirSync(FRAMES_DIR, { recursive: true });

    // Step 1: Render Master Audio Mix with Voice + Ducked Low-Pass BGM + Tactile SFX
    console.log("🎙️ Step 1: Generating Master Deluxe Multitrack Audio Mix with Foley SFX...");
    const masterAudioWav = path.join(BASE_DIR, 'master_audio_deluxe.wav');

    const filterInputs = [];
    const filterLabels = [];

    // Add Voice Tracks
    AUDIO_TIMELINE.forEach((item, idx) => {
        const fullPath = path.join(AUDIO_DIR, item.file);
        const delayMs = Math.round(item.startSec * 1000);
        filterInputs.push(`-i "${fullPath}"`);
        filterLabels.push(`[${idx}:a]adelay=${delayMs}|${delayMs},volume=1.4[vo_${idx}]`);
    });

    // Add SFX Tracks
    const sfxStartIdx = AUDIO_TIMELINE.length;
    SFX_TIMELINE.forEach((item, idx) => {
        const inputIdx = sfxStartIdx + idx;
        const fullPath = path.join(SFX_DIR, item.file);
        const delayMs = Math.round(item.startSec * 1000);
        filterInputs.push(`-i "${fullPath}"`);
        filterLabels.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs},volume=${item.vol}[sfx_${idx}]`);
    });

    const bgmInputIdx = AUDIO_TIMELINE.length + SFX_TIMELINE.length;
    const totalMixInputs = AUDIO_TIMELINE.length + SFX_TIMELINE.length;

    const allStemLabels = [
        ...AUDIO_TIMELINE.map((_, idx) => `[vo_${idx}]`),
        ...SFX_TIMELINE.map((_, idx) => `[sfx_${idx}]`)
    ].join('');

    const complexFilter = `
${filterLabels.join(';')};
${allStemLabels}amix=inputs=${totalMixInputs}:duration=longest[stems_raw];
[stems_raw]apad=whole_dur=${DURATION_SEC}[stems_pad];
[${bgmInputIdx}:a]lowpass=f=900,highpass=f=80,volume=0.008,afade=t=in:st=0:d=3,afade=t=out:st=182.0:d=5.0[bgm_soft];
[stems_pad][bgm_soft]amix=inputs=2:duration=first[aout]
`.trim().replace(/\n/g, ' ');

    const audioCmd = `ffmpeg -y ${filterInputs.join(' ')} -i "${BGM_PATH}" -filter_complex "${complexFilter}" -map "[aout]" -ar 48000 -ac 2 -t ${DURATION_SEC} "${masterAudioWav}"`;
    execSync(audioCmd, { stdio: 'pipe' });
    console.log(`✅ Deluxe master audio mix with SFX compiled: ${masterAudioWav}`);

    // Step 2: Render Visual Frames using Playwright with Google Chrome 2
    console.log("\n🎞️ Step 2: Capturing 1080p Deluxe Visual Timeline via Playwright & Chrome...");
    const browser = await chromium.launch({
        executablePath: "/Applications/Google Chrome 2.app/Contents/MacOS/Google Chrome",
        headless: true
    });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1
    });
    const page = await context.newPage();
    await page.goto(`file://${TIMELINE_HTML}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const totalFrames = DURATION_SEC * 2; // 376 total timeline steps
    console.log(`📸 Rendering ${totalFrames} frames across ${DURATION_SEC}s timeline...`);

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        const timeSec = frameIdx / 2;
        await page.evaluate((t) => window.setSeekTime(t), timeSec);
        await page.waitForTimeout(35);

        const frameFile = path.join(FRAMES_DIR, `f_${String(frameIdx).padStart(5, '0')}.png`);
        await page.screenshot({ path: frameFile, type: 'png' });

        if (frameIdx % 60 === 0 || frameIdx === totalFrames - 1) {
            console.log(`   Captured ${frameIdx + 1}/${totalFrames} frames (${timeSec.toFixed(1)}s / ${DURATION_SEC}s)...`);
        }
    }
    await browser.close();
    console.log("✅ Deluxe visual frames captured successfully.");

    // Step 3: Compile Video Stream and Mux Audio at 1920x1080 30FPS
    console.log("\n🎥 Step 3: Encoding 1080p 30FPS Deluxe MP4 Film with FFmpeg...");
    const rawVideoMp4 = path.join(BASE_DIR, 'raw_video.mp4');

    const videoCmd = `ffmpeg -y -framerate 2 -i "${path.join(FRAMES_DIR, 'f_%05d.png')}" -vf "fps=30" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -t ${DURATION_SEC} "${rawVideoMp4}"`;
    execSync(videoCmd, { stdio: 'pipe' });

    // Step 4: Final Master Muxing: Raw Video + Master Audio + Pro Color Grade
    console.log("\n🎛️ Step 4: Applying Pro Color Grading & Muxing Deluxe Master Film...");
    const finalMuxCmd = `ffmpeg -y -i "${rawVideoMp4}" -i "${masterAudioWav}" \
      -vf "curves=lighter,eq=contrast=1.04:brightness=0.01:saturation=1.05" \
      -c:v libx264 -profile:v high -level 4.1 -preset fast -crf 17 -pix_fmt yuv420p \
      -c:a aac -b:a 256k -ar 48000 \
      -movflags +faststart \
      -t ${DURATION_SEC} "${FINAL_MP4}"`;

    execSync(finalMuxCmd, { stdio: 'inherit' });

    // Copy to Desktop
    const desktopPath = '/Users/jiawenzhu/Desktop/careervivid-founder-showcase-deluxe.mp4';
    fs.copyFileSync(FINAL_MP4, desktopPath);

    const finalSizeMB = (fs.statSync(FINAL_MP4).size / (1024 * 1024)).toFixed(2);
    const probeDur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${FINAL_MP4}"`, { encoding: 'utf8' }).trim();

    console.log("\n========================================================");
    console.log("🎉 DELUXE MASTER SHOWCASE FILM SUCCESSFULLY COMPILED!");
    console.log(`📹 File: ${FINAL_MP4}`);
    console.log(`🖥️ Desktop: ${desktopPath}`);
    console.log(`⏱️ Duration: ${parseFloat(probeDur).toFixed(2)}s | Size: ${finalSizeMB} MB`);
    console.log(`🌟 Resolution: 1920x1080 Full HD @ 30 FPS`);
    console.log("========================================================\n");
}

main().catch(err => {
    console.error("❌ Production Error:", err);
    process.exit(1);
});
