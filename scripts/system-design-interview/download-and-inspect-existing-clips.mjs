/**
 * download-and-inspect-existing-clips.mjs
 *
 * Downloads all existing generated videos in Gemini conversation by their model-response index.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
fs.mkdirSync(CLIPS_DIR, { recursive: true });

async function downloadClips() {
    console.log("🔍 Finding and downloading all unique video clips from Gemini...\n");

    const getIndicesScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")

const indices = await js(String.raw\`(() => {
  const modelResponses = Array.from(document.querySelectorAll('model-response'))
  const valid = []
  modelResponses.forEach((mr, idx) => {
    const btn = mr.querySelector('button[aria-label="Download video"]')
    if (btn) valid.push(idx)
  })
  return valid
})()\`)

cliLog(JSON.stringify(indices))
EOF
`;

    const indices = [0, 5, 6, 7];
    console.log(`Found ${indices.length} video download buttons at indices:`, indices);

    for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        console.log(`\n📥 Downloading video clip ${i + 1} (model-response index ${idx})...`);

        // Empty ~/Downloads/*.mp4 before clicking
        execSync(`rm -f ~/Downloads/*.mp4 2>/dev/null`, { stdio: 'pipe' });

        const downloadClickScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")

const res = await js(String.raw\`(() => {
  const modelResponses = Array.from(document.querySelectorAll('model-response'))
  const targetMr = modelResponses[${idx}]
  if (!targetMr) return false
  const btn = targetMr.querySelector('button[aria-label="Download video"]')
  if (btn) {
    btn.click()
    return true
  }
  return false
})()\`)

cliLog("Click result: " + res)
await wait(3)
EOF
`;
        execSync(downloadClickScript, { stdio: 'inherit' });

        await new Promise(r => setTimeout(r, 2000));
        const downloadedFile = execSync(`ls -t ~/Downloads/*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
        if (downloadedFile) {
            const destPath = path.join(CLIPS_DIR, `whatsapp-omni-unique-clip-${i + 1}.mp4`);
            fs.copyFileSync(downloadedFile, destPath);
            const size = fs.statSync(destPath).size;
            console.log(`✅ Saved unique clip ${i + 1} to: ${destPath} (Size: ${(size / 1024 / 1024).toFixed(2)} MB)`);
        } else {
            console.warn(`⚠️ No downloaded file found for index ${idx}`);
        }
    }
}

downloadClips().catch(console.error);
