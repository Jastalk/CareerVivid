/**
 * fix-clips-4-and-5.mjs
 *
 * Robustly injects Prompt 4 and Prompt 5 into Gemini Omni, waits for video generation,
 * extracts all video src URLs, crops bottom AI watermarks, and re-assembles the master film.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

async function fixClipsAndRender() {
    console.log("========================================================");
    console.log("🚀 RE-GENERATING CLIP 4 & CLIP 5 IN GEMINI OMNI");
    console.log("========================================================\n");

    // --- GENERATE CLIP 4 ---
    console.log("📝 Injecting Prompt 4 (Message Queues & Complete Deletion)...");
    const injectScript4 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await wait(3)

const res = await js(String.raw\`(() => {
  const el = document.querySelector('rich-textarea div[contenteditable="true"] p') ||
             document.querySelector('rich-textarea div[contenteditable="true"]') ||
             document.querySelector('div[contenteditable="true"]')
  if (!el) return { success: false, reason: "input el not found" }
  el.textContent = ${JSON.stringify(prompt4)}
  el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' }))
  return { success: true }
})()\`)

cliLog("Inject 4 Result: " + JSON.stringify(res))
await wait(1.5)

const sendRes = await js(String.raw\`(() => {
  const btn = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button.send-button')
  if (btn) {
    btn.click()
    return { clicked: true }
  }
  return { clicked: false }
})()\`)

cliLog("Send 4 Click Result: " + JSON.stringify(sendRes))
EOF
`;
    execSync(injectScript4, { stdio: 'inherit' });

    console.log("⏳ Waiting 50 seconds for Clip 4 rendering...");
    await new Promise(r => setTimeout(r, 50000));

    console.log("🔄 Refreshing Gemini tab for Clip 4...");
    const refreshScript4 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait("https://gemini.google.com/app/379a699b94af70ca", { timeout: 15, settle: 3 })
EOF
`;
    execSync(refreshScript4, { stdio: 'inherit' });

    // --- GENERATE CLIP 5 ---
    console.log("\n📝 Injecting Prompt 5 (Media Pipeline & Whiteboard Scene)...");
    const injectScript5 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await wait(3)

const res = await js(String.raw\`(() => {
  const el = document.querySelector('rich-textarea div[contenteditable="true"] p') ||
             document.querySelector('rich-textarea div[contenteditable="true"]') ||
             document.querySelector('div[contenteditable="true"]')
  if (!el) return { success: false, reason: "input el not found" }
  el.textContent = ${JSON.stringify(prompt5)}
  el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' }))
  return { success: true }
})()\`)

cliLog("Inject 5 Result: " + JSON.stringify(res))
await wait(1.5)

const sendRes = await js(String.raw\`(() => {
  const btn = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button.send-button')
  if (btn) {
    btn.click()
    return { clicked: true }
  }
  return { clicked: false }
})()\`)

cliLog("Send 5 Click Result: " + JSON.stringify(sendRes))
EOF
`;
    execSync(injectScript5, { stdio: 'inherit' });

    console.log("⏳ Waiting 50 seconds for Clip 5 rendering...");
    await new Promise(r => setTimeout(r, 50000));

    console.log("🔄 Refreshing Gemini tab for Clip 5...");
    const refreshScript5 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait("https://gemini.google.com/app/379a699b94af70ca", { timeout: 15, settle: 3 })
EOF
`;
    execSync(refreshScript5, { stdio: 'inherit' });

    // --- EXTRACT VIDEO URLS & PROCESS ALL 6 CLIPS ---
    console.log("\n🔍 Extracting video URLs from Gemini DOM...");
    const getUrlsScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")

const videoUrls = await js(String.raw\`(() => {
  return Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc).filter(Boolean)
})()\`)

cliLog("DOM_VIDEO_URLS:" + JSON.stringify(videoUrls))
EOF
`;
    const out = execSync(getUrlsScript, { encoding: 'utf8' }).trim();
    console.log(out);

    const match = out.match(/DOM_VIDEO_URLS:(\[.*\])/);
    if (!match) {
        throw new Error("Failed to parse video URLs from Gemini DOM output");
    }
    const allUrls = JSON.parse(match[1]);
    console.log(`Found ${allUrls.length} total video URLs in Gemini session.`);

    // Download each URL
    const cleanPaths = [];
    for (let i = 0; i < allUrls.length; i++) {
        const url = allUrls[i];
        console.log(`\n📥 Downloading video URL ${i + 1}/${allUrls.length}...`);

        execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });

        const downloadNavScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await openOrReuseTab(${JSON.stringify(url)}, { wait: false })
await wait(3)
EOF
`;
        execSync(downloadNavScript, { stdio: 'inherit' });

        await new Promise(r => setTimeout(r, 2000));
        const downloadedFile = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();

        if (downloadedFile && fs.existsSync(downloadedFile)) {
            const rawPath = path.join(CLIPS_DIR, `whatsapp-omni-raw-fresh-${i + 1}.mp4`);
            fs.copyFileSync(downloadedFile, rawPath);

            const cleanPath = path.join(CLIPS_DIR, `whatsapp-omni-clean-fresh-${i + 1}.mp4`);
            console.log(`✂️ Cropping bottom 7% AI watermark & upscaling clip ${i + 1}...`);
            const cropCmd = `ffmpeg -y -i "${rawPath}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanPath}"`;
            execSync(cropCmd, { stdio: 'pipe' });

            cleanPaths.push(cleanPath);
            console.log(`✅ Saved clean clip ${i + 1}: ${cleanPath}`);
        }
    }

    if (cleanPaths.length >= 6) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ${cleanPaths.length} Fresh Clean Video Clips...`);
        console.log(`========================================================`);

        // Use last 6 clips if there are more than 6 in history, or pick unique ones
        const selectedClips = cleanPaths.slice(-6);

        // Render with xfade
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

        const inputs = selectedClips.map(p => `-i "${p}"`).join(' ');
        const renderCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[v5]" -map "[a5]" -c:v libx264 -preset medium -crf 17 -c:a aac -b:a 192k "${MASTER_OUTPUT}"`;

        execSync(renderCmd, { stdio: 'inherit' });
        console.log(`\n🎉 PERFECT MASTER FILM RENDERED: ${MASTER_OUTPUT}`);
    }

    const handoffScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await completeTaskSpace(2, { keep: true })
EOF
`;
    execSync(handoffScript, { stdio: 'inherit' });
}

fixClipsAndRender().catch(console.error);
