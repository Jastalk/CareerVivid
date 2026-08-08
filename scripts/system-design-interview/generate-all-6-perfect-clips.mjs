/**
 * generate-all-6-perfect-clips.mjs
 *
 * Automated script to finish Clip 4 download, trigger Clip 5 generation in Gemini Omni,
 * crop all 6 unique clips (removing bottom 7% AI watermark), and perform 0.5s xfade concatenation.
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
    console.log("🚀 FINISHING PERFECT 6-CLIP MASTER VIDEO GENERATION");
    console.log("========================================================\n");

    // --- STEP 1: Wait for Clip 4 rendering in current tab & download ---
    console.log("⏳ Step 1: Waiting 35 seconds for Clip 4 video rendering...");
    await new Promise(r => setTimeout(r, 35000));

    console.log("🔄 Step 2: Refreshing current tab to reveal Clip 4 download link...");
    const refresh1 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
const currentUrl = await js("location.href")
await gotoAndWait(currentUrl, { timeout: 15, settle: 3 })
await wait(3)
EOF
`;
    execSync(refresh1, { stdio: 'inherit' });

    console.log("📥 Step 3: Fetching Clip 4 video URL...");
    const getUrl4Script = `
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
    const out4 = execSync(getUrl4Script, { encoding: 'utf8' }).trim();
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

    // --- STEP 2: Navigate to fresh chat for Clip 5 ---
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
await wait(1)

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

    console.log("⏳ Step 5: Waiting 50 seconds for Clip 5 video rendering...");
    await new Promise(r => setTimeout(r, 50000));

    console.log("🔄 Step 6: Refreshing tab to reveal Clip 5 download link...");
    const refresh2 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
const currentUrl = await js("location.href")
await gotoAndWait(currentUrl, { timeout: 15, settle: 3 })
await wait(3)
EOF
`;
    execSync(refresh2, { stdio: 'inherit' });

    console.log("📥 Step 7: Fetching Clip 5 video URL...");
    const getUrl5Script = `
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
    const out5 = execSync(getUrl5Script, { encoding: 'utf8' }).trim();
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

    // --- STEP 3: Crop watermarks & Assemble Master Video ---
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
            console.error(`❌ Error: Required Clip file ${raw} not found!`);
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
        console.log(`🎬 Concatenating ALL 6 Unique Clean Video Clips...`);
        console.log(`========================================================`);

        const offset1 = 9.5;
        const offset2 = 19.0;
        const offset3 = 28.5;
        const offset4 = 38.0;
        const offset5 = 47.5;

        const filterComplex = `
[0:v][1:v] xfade=transition=fade:duration=0.5:offset=${offset1} [v1];
[0:a][1:a] acrossfade=d=0.5 [a1];
[v1][2:v] xfade=transition=fade:duration=0.5:offset=${offset2} [v2];
[a1][2:a] acrossfade=d=0.5 [a2];
[v2][3:v] xfade=transition=fade:duration=0.5:offset=${offset3} [v3];
[a2][3:a] acrossfade=d=0.5 [a3];
[v3][4:v] xfade=transition=fade:duration=0.5:offset=${offset4} [v4];
[a3][4:a] acrossfade=d=0.5 [a4];
[v4][5:v] xfade=transition=fade:duration=0.5:offset=${offset5} [v5];
[a4][5:a] acrossfade=d=0.5 [a5]
`.trim().replace(/\n/g, ' ');

        const inputs = cleanPaths.map(p => `-i "${p}"`).join(' ');
        const renderCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[v5]" -map "[a5]" -c:v libx264 -preset medium -crf 17 -c:a aac -b:a 192k "${MASTER_OUTPUT}"`;

        execSync(renderCmd, { stdio: 'inherit' });
        const finalSize = fs.statSync(MASTER_OUTPUT).size;
        console.log(`\n🎉 PERFECT MASTER FILM RENDERED: ${MASTER_OUTPUT}`);
        console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`========================================================`);
    } else {
        console.error(`⚠️ Could not compile 6 clips, only found ${cleanPaths.length} clips.`);
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
