/**
 * download-all-omni-clips-and-concat-master.mjs
 *
 * Downloads all 6 genuine Gemini Omni clips generated in single chat 379a699b94af70ca,
 * crops 93% bottom AI watermarks, and concatenates the master film design-whatsapp-omni.mp4.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CLIP5_URL = "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBjZjQzYjA5NGY3YjExZGYzMDAwNjU4NmU5YmRiMDY5MDA4ODQ5ODA1YmExYmRhODESCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050";

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
const MASTER_OUTPUT = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');

async function main() {
    console.log("========================================================");
    console.log("🚀 FINALIZING ALL 6 GEMINI OMNI CLIPS & MASTER FILM");
    console.log("========================================================\n");

    // --- STEP 1: Download Fresh Clip 5 ---
    console.log("📥 Step 1: Downloading fresh Gemini Omni Clip 5...");
    execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });
    const dl5Script = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await openOrReuseTab(${JSON.stringify(CLIP5_URL)}, { wait: false })
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

    // --- STEP 2: Watermark Crop for all 6 Gemini Omni Clips ---
    console.log("\n========================================================");
    console.log("✂️ Cropping bottom 7% AI watermarks & upscaling all 6 Gemini Omni clips...");
    console.log("========================================================");

    const rawClipsList = [
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-1.mp4'),          // Clip 1 (Hook)
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-2.mp4'),          // Clip 2 (WebSockets)
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-3.mp4'),          // Clip 3 (Encryption)
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-4-fixed.mp4'),    // Clip 4 (Queues & Complete Deletion Sentence - FRESH!)
        path.join(CLIPS_DIR, 'whatsapp-omni-raw-5-fixed.mp4'),    // Clip 5 (Media & Whiteboard Scene - FRESH!)
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
