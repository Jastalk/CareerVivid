/**
 * submit-clip-5-and-build-final.mjs
 *
 * Downloads fresh Gemini Omni Clip 4, submits Prompt 5 in target chat 379a699b94af70ca,
 * downloads fresh Clip 5, crops bottom 7% AI watermarks, and concatenates all 6 Gemini Omni clips.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_CHAT_URL = "https://gemini.google.com/app/379a699b94af70ca";
const CLIP4_URL = "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjA5NzUzYzUzN2I2MzBkNTkxMDAwNjU4NmU5MzQwZjM2MTAyZjBjZDczZjEyMjBlZWISCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050";

const prompt5 = `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A dynamic handheld camera shot of the young male software engineer (avatar @zhujiawen519) pointing to an interactive glass whiteboard displaying image compression algorithms and CDN edge nodes lighting up.

Audio & Spoken Narration:
The engineer speaks energetically:
"For high-res photos and video, media is compressed client-side, encrypted, and uploaded in chunked byte-streams to CDN origin shields via resumable HTTP endpoints for zero bandwidth waste."`;

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const MASTER_OUTPUT = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');

async function main() {
    console.log("========================================================");
    console.log("🚀 DOWNLOADING CLIP 4 & GENERATING CLIP 5 IN CHAT 379a");
    console.log("========================================================\n");

    // --- STEP 1: Download Fresh Clip 4 ---
    console.log("📥 Step 1: Downloading fresh Gemini Omni Clip 4...");
    execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });
    const dl4Script = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await openOrReuseTab(${JSON.stringify(CLIP4_URL)}, { wait: false })
await wait(3)
EOF
`;
    execSync(dl4Script, { stdio: 'inherit' });
    await new Promise(r => setTimeout(r, 2500));
    const dlFile4 = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
    if (dlFile4 && fs.existsSync(dlFile4)) {
        const dest4 = path.join(CLIPS_DIR, 'whatsapp-omni-raw-4-fixed.mp4');
        fs.copyFileSync(dlFile4, dest4);
        console.log("✅ Saved raw Clip 4 fixed:", dest4);
    }

    // --- STEP 2: Submit Prompt 5 in target chat ---
    console.log("\n📝 Step 2: Navigating to target chat & submitting Prompt 5...");
    const script5 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait(${JSON.stringify(TARGET_CHAT_URL)}, { timeout: 15, settle: 3 })
await wait(4)

cliLog("Clicking .ql-editor p...")
await click('.ql-editor p')
await wait(1)

cliLog("Inserting Prompt 5...")
await cdp('Input.insertText', { text: ${JSON.stringify(prompt5)} })
await wait(1.5)

const sendRes = await js(String.raw\`(() => {
  const btn = document.querySelector('button[aria-label="Send message"]') ||
              document.querySelector('button[aria-label*="Send"]') ||
              Array.from(document.querySelectorAll('button')).find(b => b.ariaLabel && b.ariaLabel.toLowerCase().includes('send'))
  if (btn) {
    btn.click()
    return { success: true, label: btn.getAttribute('aria-label') }
  }
  return { success: false }
})()\`)

cliLog("Send 5 Result: " + JSON.stringify(sendRes))
EOF
`;
    execSync(script5, { stdio: 'inherit' });

    console.log("⏳ Step 3: Waiting 55 seconds for Clip 5 Gemini Omni rendering...");
    await new Promise(r => setTimeout(r, 55000));

    console.log("🔄 Step 4: Refreshing target chat...");
    const refresh2 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait(${JSON.stringify(TARGET_CHAT_URL)}, { timeout: 15, settle: 3 })
await wait(3)
EOF
`;
    execSync(refresh2, { stdio: 'inherit' });

    // --- STEP 3: Extract & Download Clip 5 ---
    console.log("\n🔍 Step 5: Extracting video URLs in target chat...");
    const getUrlsScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")

const videoUrls = await js(String.raw\`(() => {
  return Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc).filter(Boolean)
})()\`)

cliLog("ALL_VIDEO_URLS:" + JSON.stringify(videoUrls))
EOF
`;
    const out = execSync(getUrlsScript, { encoding: 'utf8' }).trim();
    const match = out.match(/ALL_VIDEO_URLS:(\[.*\])/);
    const urls = match ? JSON.parse(match[1]) : [];
    console.log(`Found ${urls.length} total video URLs in target chat:`, urls);

    if (urls.length >= 5) {
        const clip5Url = urls[urls.length - 1];
        console.log("Clip 5 URL:", clip5Url);
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
            const dest5 = path.join(CLIPS_DIR, 'whatsapp-omni-raw-5-fixed.mp4');
            fs.copyFileSync(dlFile5, dest5);
            console.log("✅ Saved raw Clip 5 fixed:", dest5);
        }
    }

    // --- STEP 4: Crop 93% Watermarks & Assemble Master Film ---
    console.log("\n========================================================");
    console.log("✂️ Cropping bottom 7% AI watermarks & upscaling 6 Gemini Omni clips...");
    console.log("========================================================");

    const rawClipsList = [
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-1.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-2.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-3.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-4-fixed.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-5-fixed.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-6-outro.mp4')
    ];

    const cleanPaths = [];
    for (let i = 0; i < rawClipsList.length; i++) {
        const raw = rawClipsList[i];
        if (!fs.existsSync(raw)) {
            console.error(`❌ Error: Missing raw clip file: ${raw}`);
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
        console.log(`🎬 Concatenating ALL 6 Unique Gemini Omni Clips...`);
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

main().catch(err => {
    console.error("❌ Pipeline Error:", err);
    process.exit(1);
});
