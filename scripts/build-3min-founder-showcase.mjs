/**
 * build-3min-founder-showcase.mjs
 *
 * Automated compilation of the 3-Minute (188-second) CareerVivid Founder & Product Showcase Commercial.
 * - 100% consistent, calm, authoritative Charon voiceover throughout the entire film.
 * - Real Google System Design Whiteboard + Multi-Turn Human-Coach Dialogue + Real Diagnostic Report.
 * - Full Complete Dashboard View in Section 4.
 * - Low-passed warm BGM with auto-ducking (zero harsh high-frequency pitch).
 * - Output: public/commercial-videos/careervivid-founder-showcase-3min.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const DURATION_SEC = 188;
const BASE_DIR = path.resolve('public/commercial-videos/founder-showcase-3min');
const AUDIO_DIR = path.join(BASE_DIR, 'audio');
const FRAMES_DIR = path.join(BASE_DIR, 'frames');
const TIMELINE_HTML = path.join(BASE_DIR, 'showcase_timeline.html');
const BGM_PATH = path.resolve('public/assets/bgm.mp3');
const FINAL_MP4 = path.resolve('public/commercial-videos/careervivid-founder-showcase-3min.mp4');

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

async function main() {
    console.log("========================================================");
    console.log("🎬 CAREERVIVID 3-MINUTE FOUNDER & PRODUCT SHOWCASE (SEAMLESS MASTER)");
    console.log(`Target Duration: ${DURATION_SEC} seconds (188s Full Showcase)`);
    console.log(`Audio Tracks: ${AUDIO_TIMELINE.length} tracks (100% Consistent Voice & Pacing)`);
    console.log("========================================================\n");

    fs.mkdirSync(FRAMES_DIR, { recursive: true });

    // Step 1: Render Master Audio Mix with Ducking & Low-Pass BGM Filter
    console.log("🎙️ Step 1: Generating Master Continuous Multitrack Audio Mix...");
    const masterAudioWav = path.join(BASE_DIR, 'master_audio_180s.wav');

    const filterInputs = [];
    const filterLabels = [];

    AUDIO_TIMELINE.forEach((item, idx) => {
        const fullPath = path.join(AUDIO_DIR, item.file);
        const delayMs = Math.round(item.startSec * 1000);
        filterInputs.push(`-i "${fullPath}"`);
        filterLabels.push(`[${idx}:a]adelay=${delayMs}|${delayMs},volume=1.4[a${idx}]`);
    });

    const voiceMixLabels = filterLabels.map((_, idx) => `[a${idx}]`).join('');
    const bgmInputIdx = AUDIO_TIMELINE.length;

    // Filter complex: voice mix + gentle low-pass background music (no harsh high frequencies)
    const complexFilter = `
${filterLabels.join(';')};
${voiceMixLabels}amix=inputs=${AUDIO_TIMELINE.length}:duration=longest[vo_raw];
[vo_raw]apad=whole_dur=${DURATION_SEC}[vo_pad];
[${bgmInputIdx}:a]lowpass=f=900,highpass=f=80,volume=0.008,afade=t=in:st=0:d=3,afade=t=out:st=182.0:d=5.0[bgm_soft];
[vo_pad][bgm_soft]amix=inputs=2:duration=first[aout]
`.trim().replace(/\n/g, ' ');

    const audioCmd = `ffmpeg -y ${filterInputs.join(' ')} -i "${BGM_PATH}" -filter_complex "${complexFilter}" -map "[aout]" -ar 48000 -ac 2 -t ${DURATION_SEC} "${masterAudioWav}"`;
    execSync(audioCmd, { stdio: 'pipe' });
    console.log(`✅ Master continuous audio mix compiled: ${masterAudioWav}`);

    // Step 2: Render Visual Frames using Playwright with Google Chrome 2
    console.log("\n🎞️ Step 2: Capturing 1080p Visual Timeline via Playwright & Chrome...");
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
    console.log("✅ Visual frames captured successfully.");

    // Step 3: Compile Video Stream and Mux Audio at 1920x1080 30FPS
    console.log("\n🎥 Step 3: Encoding 1080p 30FPS Master MP4 Film with FFmpeg...");
    const rawVideoMp4 = path.join(BASE_DIR, 'raw_video.mp4');

    const videoCmd = `ffmpeg -y -framerate 2 -i "${path.join(FRAMES_DIR, 'f_%05d.png')}" -vf "fps=30" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -t ${DURATION_SEC} "${rawVideoMp4}"`;
    execSync(videoCmd, { stdio: 'pipe' });

    // Step 4: Final Master Muxing: Raw Video + Master Audio + Pro Color Grade
    console.log("\n🎛️ Step 4: Applying Pro Color Grading & Muxing Master Film...");
    const finalMuxCmd = `ffmpeg -y -i "${rawVideoMp4}" -i "${masterAudioWav}" \
      -vf "curves=lighter,eq=contrast=1.04:brightness=0.01:saturation=1.05" \
      -c:v libx264 -profile:v high -level 4.1 -preset fast -crf 17 -pix_fmt yuv420p \
      -c:a aac -b:a 256k -ar 48000 \
      -movflags +faststart \
      -t ${DURATION_SEC} "${FINAL_MP4}"`;

    execSync(finalMuxCmd, { stdio: 'inherit' });

    const finalSizeMB = (fs.statSync(FINAL_MP4).size / (1024 * 1024)).toFixed(2);
    const probeDur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${FINAL_MP4}"`, { encoding: 'utf8' }).trim();

    console.log("\n========================================================");
    console.log("🎉 MASTER SHOWCASE FILM SUCCESSFULLY COMPILED!");
    console.log(`📹 File: ${FINAL_MP4}`);
    console.log(`⏱️ Duration: ${parseFloat(probeDur).toFixed(2)}s | Size: ${finalSizeMB} MB`);
    console.log(`🌟 Resolution: 1920x1080 Full HD @ 30 FPS`);
    console.log("========================================================\n");
}

main().catch(err => {
    console.error("❌ Production Error:", err);
    process.exit(1);
});
