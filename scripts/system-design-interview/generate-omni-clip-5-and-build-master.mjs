/**
 * generate-omni-clip-5-and-build-master.mjs
 *
 * Full pipeline for Gemini Omni model video clips:
 *   1. Waits for Clip 4 generation in current Gemini Omni chat and downloads raw video.
 *   2. Opens fresh Gemini chat, submits Prompt 5 (Media Pipeline & Whiteboard Scene), waits, and downloads raw video.
 *   3. Crops bottom 7% AI watermarks on all 6 clips.
 *   4. Concatenates all 6 clean Gemini Omni clips into final master film.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prompt5 = `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A dynamic handheld camera shot of the young male software engineer (avatar @zhujiawen519) pointing to an interactive glass whiteboard displaying image compression algorithms and CDN edge nodes lighting up.

Audio & Spoken Narration:
The engineer speaks energetically:
"For high-res photos and video, media is compressed client-side, encrypted, and uploaded in chunked byte-streams to CDN origin shields via resumable HTTP endpoints for zero bandwidth waste."`;

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const MASTER_OUTPUT = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');

async function run() {
    console.log("========================================================");
    console.log("🎬 GEMINI OMNI AUDIO-VIDEO CLIPS GENERATION & CONCAT");
    console.log("========================================================\n");

    // --- STEP 1: Wait for Clip 4 & Download ---
    console.log("⏳ Step 1: Waiting 35 seconds for Clip 4 Gemini Omni rendering...");
    await new Promise(r => setTimeout(r, 35000));

    console.log("🔄 Step 2: Reloading chat tab to reveal Clip 4 video element...");
    const reload1 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
const chatUrl = await js("location.href")
cliLog("Chat 4 URL: " + chatUrl)
await gotoAndWait(chatUrl, { timeout: 15, settle: 3 })
await wait(3)
EOF
`;
    execSync(reload1, { stdio: 'inherit' });

    console.log("📥 Step 3: Extracting Clip 4 video URL...");
    const getUrl4 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")

const videoUrl = await js(String.raw\`(() => {
  const v = document.querySelector('video')
  return v ? (v.src || v.currentSrc) : null
})()\`)

cliLog("CLIP4_URL:" + videoUrl)
EOF
`;
    const out4 = execSync(getUrl4, { encoding: 'utf8' }).trim();
    const clip4Url = out4.match(/CLIP4_URL:(https:\/\/[^\s]+)/)?.[1];
    console.log("Clip 4 URL:", clip4Url);

    if (clip4Url) {
        execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });
        const dl4Script = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await openOrReuseTab(${JSON.stringify(clip4Url)}, { wait: false })
await wait(3)
EOF
`;
        execSync(dl4Script, { stdio: 'inherit' });
        await new Promise(r => setTimeout(r, 2500));
        const dlFile4 = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
        if (dlFile4 && fs.existsSync(dlFile4)) {
            const dest4 = path.join(CLIPS_DIR, 'whatsapp-raw-4-fixed.mp4');
            fs.copyFileSync(dlFile4, dest4);
            console.log("✅ Saved raw Clip 4 fixed:", dest4);
        }
    }

    // --- STEP 2: Navigate to Fresh Chat for Clip 5 ---
    console.log("\n🚀 Step 4: Navigating to fresh Gemini chat for Clip 5...");
    const freshChatScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait("https://gemini.google.com/app", { timeout: 15, settle: 3 })
await wait(3)

cliLog("Clicking .ql-editor p...")
await click('.ql-editor p')
await wait(1)

cliLog("Inserting Prompt 5...")
await cdp('Input.insertText', { text: ${JSON.stringify(prompt5)} })
await wait(1.5)

const sendRes = await js(String.raw\`(() => {
  const btn = document.querySelector('button[aria-label="Send message"]')
  if (btn) {
    btn.click()
    return { success: true }
  }
  return { success: false }
})()\`)

cliLog("Send 5 Result: " + JSON.stringify(sendRes))
EOF
`;
    execSync(freshChatScript, { stdio: 'inherit' });

    console.log("⏳ Step 5: Waiting 45 seconds for Clip 5 Gemini Omni rendering...");
    await new Promise(r => setTimeout(r, 45000));

    console.log("🔄 Step 6: Reloading chat tab to reveal Clip 5 video element...");
    const reload2 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
const chatUrl = await js("location.href")
cliLog("Chat 5 URL: " + chatUrl)
await gotoAndWait(chatUrl, { timeout: 15, settle: 3 })
await wait(3)
EOF
`;
    execSync(reload2, { stdio: 'inherit' });

    console.log("📥 Step 7: Extracting Clip 5 video URL...");
    const getUrl5 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")

const videoUrl = await js(String.raw\`(() => {
  const v = document.querySelector('video')
  return v ? (v.src || v.currentSrc) : null
})()\`)

cliLog("CLIP5_URL:" + videoUrl)
EOF
`;
    const out5 = execSync(getUrl5, { encoding: 'utf8' }).trim();
    const clip5Url = out5.match(/CLIP5_URL:(https:\/\/[^\s]+)/)?.[1];
    console.log("Clip 5 URL:", clip5Url);

    if (clip5Url) {
        execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });
        const dl5Script = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await openOrReuseTab(${JSON.stringify(clip5Url)}, { wait: false })
await wait(3)
EOF
`;
        execSync(dl5Script, { stdio: 'inherit' });
        await new Promise(r => setTimeout(r, 2500));
        const dlFile5 = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
        if (dlFile5 && fs.existsSync(dlFile5)) {
            const dest5 = path.join(CLIPS_DIR, 'whatsapp-raw-5-fixed.mp4');
            fs.copyFileSync(dlFile5, dest5);
            console.log("✅ Saved raw Clip 5 fixed:", dest5);
        }
    }

    // --- STEP 3: Watermark Crop & Concat ---
    console.log("\n========================================================");
    console.log("✂️ Cropping bottom 7% AI watermarks & upscaling 6 clips...");
    console.log("========================================================");

    const rawClipsList = [
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-1.mp4'),          // Clip 1 (Hook)
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-2.mp4'),          // Clip 2 (WebSockets)
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-3.mp4'),          // Clip 3 (Encryption)
        path.join(CLIPS_DIR, 'whatsapp-raw-4-fixed.mp4'),         // Clip 4 (Queues & Deletion Fixed)
        path.join(CLIPS_DIR, 'whatsapp-raw-5-fixed.mp4'),         // Clip 5 (Media & Whiteboard Fixed)
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-6-outro.mp4')     // Clip 6 (Outro CTA)
    ];

    const cleanPaths = [];
    for (let i = 0; i < rawClipsList.length; i++) {
        const raw = rawClipsList[i];
        if (!fs.existsSync(raw)) {
            console.error(`❌ Missing raw clip file: ${raw}`);
            continue;
        }
        const cleanFile = path.join(CLIPS_DIR, `whatsapp-perfect-clean-${i + 1}.mp4`);
        const cropCmd = `ffmpeg -y -i "${raw}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanFile}"`;
        execSync(cropCmd, { stdio: 'pipe' });
        cleanPaths.push(cleanFile);
        console.log(`✅ Clean Clip ${i + 1} ready: ${cleanFile}`);
    }

    if (cleanPaths.length === 6) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ALL 6 Unique Clean Gemini Omni Clips...`);
        console.log(`========================================================`);

        const concatListPath = path.join(CLIPS_DIR, 'whatsapp-perfect-concat.txt');
        fs.writeFileSync(concatListPath, cleanPaths.map(f => `file '${f}'`).join('\n'));
        const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${MASTER_OUTPUT}"`;
        execSync(concatCmd, { stdio: 'inherit' });

        const finalSize = fs.statSync(MASTER_OUTPUT).size;
        console.log(`\n🎉 PERFECT MASTER FILM RENDERED: ${MASTER_OUTPUT}`);
        console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`========================================================`);
    } else {
        console.error(`⚠️ Could not compile all 6 clips, only found ${cleanPaths.length} clean clips.`);
    }

    const handoffScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await completeTaskSpace(2, { keep: true })
EOF
`;
    execSync(handoffScript, { stdio: 'inherit' });
}

run().catch(console.error);
