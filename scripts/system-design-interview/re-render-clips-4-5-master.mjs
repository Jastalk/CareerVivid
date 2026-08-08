/**
 * re-render-clips-4-5-master.mjs
 *
 * Full pipeline for fixing Clip 4 (Persistence & complete deletion sentence)
 * and Clip 5 (Media Pipeline & glass whiteboard scene):
 *   1. Waits for Prompt 4 rendering & refreshes Gemini page.
 *   2. Edits last user prompt to Prompt 5 (Media Pipeline & Whiteboard Scene), submits Update.
 *   3. Waits for Prompt 5 rendering & refreshes Gemini page.
 *   4. Downloads all unique video src URLs directly via ego-browser openOrReuseTab.
 *   5. Crops bottom AI watermark completely on all clips (93% vertical crop + 1080p bicubic scale).
 *   6. Concatenates all 6 unique clips with smooth 0.5s xfade video dissolve & acrossfade audio crossfades.
 *   7. Replaces /Users/jiawenzhu/Developer/careervivid/public/system-design-lessons/design-whatsapp-omni.mp4.
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

async function pipeline() {
    console.log("========================================================");
    console.log("🎬 WHATSAPP SYSTEM DESIGN PERFECT MASTER RE-RENDER PIPELINE");
    console.log("========================================================\n");

    console.log("⏳ Step 1: Waiting 45 seconds for Prompt 4 video rendering...");
    await new Promise(r => setTimeout(r, 45000));

    console.log("🔄 Step 2: Refreshing Gemini tab to reveal Clip 4 video...");
    const refresh1 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait("https://gemini.google.com/app/379a699b94af70ca", { timeout: 15, settle: 3 })
EOF
`;
    execSync(refresh1, { stdio: 'inherit' });

    console.log("\n📝 Step 3: Editing last prompt to Prompt 5 (Media Pipeline & Whiteboard Scene)...");
    const editPrompt5Script = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await wait(2)

const editRes = await js(String.raw\`(() => {
  const editBtns = Array.from(document.querySelectorAll('button[aria-label="Edit"], button[aria-label*="Edit"]'))
  if (editBtns.length === 0) return { success: false, reason: "No edit button found" }
  const lastEdit = editBtns[editBtns.length - 1]
  lastEdit.click()
  return { success: true }
})()\`)

cliLog("Edit Click: " + JSON.stringify(editRes))
await wait(2)

const updateRes = await js(String.raw\`(() => {
  const ta = document.querySelector('textarea')
  if (!ta) return { success: false, reason: "textarea not found" }

  ta.value = ${JSON.stringify(prompt5)}
  ta.dispatchEvent(new Event('input', { bubbles: true }))

  const btns = Array.from(document.querySelectorAll('button'))
  const updateBtn = btns.find(b => b.innerText.trim() === 'Update')
  if (updateBtn) {
    updateBtn.removeAttribute('disabled')
    updateBtn.disabled = false
    updateBtn.click()
    return { success: true }
  }
  return { success: false, reason: "update btn not found" }
})()\`)

cliLog("Update Click: " + JSON.stringify(updateRes))
EOF
`;
    execSync(editPrompt5Script, { stdio: 'inherit' });

    console.log("⏳ Step 4: Waiting 50 seconds for Prompt 5 video rendering...");
    await new Promise(r => setTimeout(r, 50000));

    console.log("🔄 Step 5: Refreshing Gemini tab to reveal Clip 5 video...");
    const refresh2 = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait("https://gemini.google.com/app/379a699b94af70ca", { timeout: 15, settle: 3 })
EOF
`;
    execSync(refresh2, { stdio: 'inherit' });

    // Extract all video src URLs
    console.log("\n🔍 Step 6: Extracting all unique video URLs from Gemini DOM...");
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
    const match = out.match(/DOM_VIDEO_URLS:(\[.*\])/);
    const videoUrls = match ? JSON.parse(match[1]) : [];

    console.log(`Found ${videoUrls.length} total video URLs in Gemini session:`, videoUrls);

    // Download each URL and apply 93% vertical watermark crop
    const cleanPaths = [];
    for (let i = 0; i < videoUrls.length; i++) {
        const url = videoUrls[i];
        console.log(`\n📥 Downloading & cropping Video Clip ${i + 1}/${videoUrls.length}...`);

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
            const rawPath = path.join(CLIPS_DIR, `whatsapp-perfect-raw-${i + 1}.mp4`);
            fs.copyFileSync(downloadedFile, rawPath);

            const cleanPath = path.join(CLIPS_DIR, `whatsapp-perfect-clean-${i + 1}.mp4`);
            console.log(`✂️ Cropping bottom 7% AI watermark & upscaling clip ${i + 1}...`);
            const cropCmd = `ffmpeg -y -i "${rawPath}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanPath}"`;
            execSync(cropCmd, { stdio: 'pipe' });

            cleanPaths.push(cleanPath);
            console.log(`✅ Saved clean clip ${i + 1}: ${cleanPath}`);
        }
    }

    if (cleanPaths.length >= 6) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ${cleanPaths.length} Unique Clean Video Clips...`);
        console.log(`========================================================`);

        // Select the last 6 clips (Hook, WebSockets, Encryption, Queues, Media, Outro CTA)
        const selectedClips = cleanPaths.slice(-6);

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

        try {
            execSync(renderCmd, { stdio: 'inherit' });
            const finalSize = fs.statSync(MASTER_OUTPUT).size;
            console.log(`\n🎉 PERFECT MASTER FILM RENDERED: ${MASTER_OUTPUT}`);
            console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`========================================================`);
        } catch (err) {
            console.error(`❌ xfade failed, using clean concat fallback:`, err.message);
            const concatListPath = path.join(CLIPS_DIR, 'whatsapp-perfect-concat.txt');
            fs.writeFileSync(concatListPath, selectedClips.map(f => `file '${f}'`).join('\n'));
            const fallbackCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${MASTER_OUTPUT}"`;
            execSync(fallbackCmd, { stdio: 'inherit' });
            console.log(`✅ Fallback concat complete: ${MASTER_OUTPUT}`);
        }
    }

    const handoffScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await completeTaskSpace(2, { keep: true })
EOF
`;
    execSync(handoffScript, { stdio: 'inherit' });
}

pipeline().catch(console.error);
