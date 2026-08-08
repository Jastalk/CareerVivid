/**
 * generate-in-single-chat-379a.mjs
 *
 * Generates Clip 4 and Clip 5 in the exact single chat window:
 * https://gemini.google.com/app/379a699b94af70ca
 * for 100% avatar consistency, downloads all clean Gemini Omni clips,
 * crops 93% bottom AI watermarks, and concatenates the master film.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_CHAT_URL = "https://gemini.google.com/app/379a699b94af70ca";

const prompt4 = `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic 4K low-angle glide shot framing the young male software engineer (avatar @zhujiawen519) standing in front of high-density server racks with blue and amber LED pulse lights.

Audio & Spoken Narration:
The engineer speaks clearly with complete sentence articulation:
"When an offline user receives a message, it gets queued in a distributed RocksDB message store. Once delivered to the recipient, the message is instantly deleted from server storage forever."`;

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
    console.log("🚀 SINGLE-CHAT GEMINI OMNI VIDEO GENERATION PIPELINE");
    console.log(`Target Chat: ${TARGET_CHAT_URL}`);
    console.log("========================================================\n");

    // --- STEP 1: Submit Prompt 4 in target chat ---
    console.log("📝 Step 1: Submitting Prompt 4 in target chat...");
    const script1 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait(${JSON.stringify(TARGET_CHAT_URL)}, { timeout: 15, settle: 3 })
await wait(3)

cliLog("Clicking .ql-editor p...")
await click('.ql-editor p')
await wait(1)

cliLog("Inserting Prompt 4...")
await cdp('Input.insertText', { text: ${JSON.stringify(prompt4)} })
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

cliLog("Send 4 Result: " + JSON.stringify(sendRes))
EOF
`;
    execSync(script1, { stdio: 'inherit' });

    console.log("⏳ Step 2: Waiting 50 seconds for Clip 4 rendering...");
    await new Promise(r => setTimeout(r, 50000));

    console.log("🔄 Step 3: Refreshing target chat...");
    const refresh1 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait(${JSON.stringify(TARGET_CHAT_URL)}, { timeout: 15, settle: 3 })
await wait(3)
EOF
`;
    execSync(refresh1, { stdio: 'inherit' });

    // --- STEP 2: Submit Prompt 5 in target chat ---
    console.log("\n📝 Step 4: Submitting Prompt 5 in target chat...");
    const script2 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await wait(2)

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
    execSync(script2, { stdio: 'inherit' });

    console.log("⏳ Step 5: Waiting 50 seconds for Clip 5 rendering...");
    await new Promise(r => setTimeout(r, 50000));

    console.log("🔄 Step 6: Refreshing target chat...");
    const refresh2 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait(${JSON.stringify(TARGET_CHAT_URL)}, { timeout: 15, settle: 3 })
await wait(3)
EOF
`;
    execSync(refresh2, { stdio: 'inherit' });

    // --- STEP 3: Extract all video URLs in target chat ---
    console.log("\n🔍 Step 7: Extracting all video URLs in target chat...");
    const getUrlsScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")

const videoUrls = await js(String.raw\`(() => {
  return Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc).filter(Boolean)
})()\`)

cliLog("CHAT_VIDEO_URLS:" + JSON.stringify(videoUrls))
EOF
`;
    const out = execSync(getUrlsScript, { encoding: 'utf8' }).trim();
    const match = out.match(/CHAT_VIDEO_URLS:(\[.*\])/);
    const urls = match ? JSON.parse(match[1]) : [];
    console.log(`Found ${urls.length} video URLs in chat 379a699b94af70ca:`, urls);

    // Download clips
    const downloadedClips = [];
    for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        console.log(`📥 Downloading video ${i + 1}/${urls.length}...`);
        execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });

        const dlScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await openOrReuseTab(${JSON.stringify(u)}, { wait: false })
await wait(3)
EOF
`;
        execSync(dlScript, { stdio: 'inherit' });
        await new Promise(r => setTimeout(r, 2500));
        const dlFile = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
        if (dlFile && fs.existsSync(dlFile)) {
            const rawPath = path.join(CLIPS_DIR, `whatsapp-singlechat-raw-${i + 1}.mp4`);
            fs.copyFileSync(dlFile, rawPath);
            downloadedClips.push(rawPath);
            console.log(`✅ Saved raw clip ${i + 1}: ${rawPath}`);
        }
    }

    // --- STEP 4: Watermark Crop & Concat ---
    console.log("\n========================================================");
    console.log("✂️ Cropping bottom 7% AI watermarks & upscaling clips...");
    console.log("========================================================");

    const cleanPaths = [];
    for (let i = 0; i < downloadedClips.length; i++) {
        const raw = downloadedClips[i];
        const cleanFile = path.join(CLIPS_DIR, `whatsapp-perfect-clean-${i + 1}.mp4`);
        const cropCmd = `ffmpeg -y -i "${raw}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanFile}"`;
        execSync(cropCmd, { stdio: 'pipe' });
        cleanPaths.push(cleanFile);
        console.log(`✅ Clean Clip ${i + 1} ready: ${cleanFile}`);
    }

    if (cleanPaths.length >= 4) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ${cleanPaths.length} Gemini Omni Clips...`);
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
