/**
 * generate-clip-6-and-concat.mjs
 *
 * Generates Clip 6 (Outro), downloads it, and concatenates all 6 Gemini Omni video clips!
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prompt6 = `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A warm golden-hour panoramic shot of the young male software engineer (avatar @zhujiawen519) leaning near a panoramic office window overlooking a tech city skyline. The engineer smiles and delivers the final call to action to camera.

Audio & Spoken Narration:
The engineer speaks warmly with an engaging outro CTA:
"When users are offline, Apple APNs and Google FCM send push tokens to wake up the client app instantly. If you enjoyed this breakdown, like and subscribe for more system design breakdowns on CareerVivid!"`;

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');

async function runClip6AndConcat() {
    console.log(`========================================================`);
    console.log(`🚀 Generating Clip 6/6: [clip-6-outro]...`);
    console.log(`========================================================`);

    const injectScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await wait(2)

const promptText = ${JSON.stringify(prompt6)}

const res = await js(String.raw\`(() => {
  const p = document.querySelector('rich-textarea div[contenteditable="true"] p') || document.querySelector('div[contenteditable="true"] p')
  if (!p) return { success: false, reason: "p not found" }

  p.textContent = ${JSON.stringify(prompt6)}
  p.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' }))
  return { success: true }
})()\`)

cliLog("Inject Result: " + JSON.stringify(res))
await wait(1)

const sendRes = await js(String.raw\`(() => {
  const btn = document.querySelector('button[aria-label="Send message"]')
  if (btn) {
    btn.click()
    return { clicked: true }
  }
  return { clicked: false }
})()\`)

cliLog("Send Click Result: " + JSON.stringify(sendRes))
EOF
`;

    execSync(injectScript, { stdio: 'inherit' });

    console.log(`⏳ Waiting 50 seconds for Gemini Omni video rendering...`);
    await new Promise(r => setTimeout(r, 50000));

    console.log(`🔄 Refreshing Gemini tab...`);
    const refreshScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await gotoAndWait("https://gemini.google.com/app/379a699b94af70ca", { timeout: 15, settle: 3 })

const downloadResult = await js(String.raw\`(() => {
  const downloadBtns = Array.from(document.querySelectorAll('button[aria-label="Download video"]'))
  if (downloadBtns.length === 0) return { success: false, reason: "No download button found" }
  const lastBtn = downloadBtns[downloadBtns.length - 1]
  lastBtn.click()
  return { success: true, count: downloadBtns.length }
})()\`)

cliLog("Download Click Result: " + JSON.stringify(downloadResult))
await wait(3)
EOF
`;
    execSync(refreshScript, { stdio: 'inherit' });

    await new Promise(r => setTimeout(r, 2000));
    const newFile = execSync(`ls -t ~/Downloads/*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
    if (newFile) {
        const destClip = path.join(CLIPS_DIR, `whatsapp-omni-clip-6-outro.mp4`);
        fs.copyFileSync(newFile, destClip);
        console.log(`✅ Clip 6 downloaded & saved to: ${destClip}`);
    }

    console.log(`\n========================================================`);
    console.log(`🎬 Concatenating all 6 Gemini Omni Video Clips...`);
    console.log(`========================================================`);

    const clipFiles = [
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-1-hook.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-2-websockets.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-3-encryption.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-4-queues.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-5-media.mp4'),
        path.join(CLIPS_DIR, 'whatsapp-omni-clip-6-outro.mp4')
    ];

    const concatListPath = path.join(CLIPS_DIR, 'whatsapp-concat-list.txt');
    const validClips = clipFiles.filter(f => fs.existsSync(f));

    console.log(`📹 Found ${validClips.length}/6 valid video clips for concatenation.`);
    fs.writeFileSync(concatListPath, validClips.map(f => `file '${f}'`).join('\n'));

    const masterOutputPath = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');
    const ffmpegConcatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${masterOutputPath}"`;

    try {
        execSync(ffmpegConcatCmd, { stdio: 'inherit' });
        console.log(`\n🎉 MASTER FILM RENDERED: ${masterOutputPath}`);
        const totalSecs = validClips.length * 10;
        console.log(`📹 Total Video Duration: ~${totalSecs} Seconds (${(totalSecs / 60).toFixed(1)} Minutes)`);
        console.log(`========================================================`);
    } catch (err) {
        console.error(`❌ Concatenation error:`, err.message);
    }
}

runClip6AndConcat().catch(console.error);
