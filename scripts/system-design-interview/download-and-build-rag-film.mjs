/**
 * download-and-build-rag-film.mjs
 *
 * Downloads the 6 exact Gemini Omni clips generated in single chat 379a699b94af70ca
 * for RAG Vector Search & AI Infra, crops 93% bottom AI watermarks, and concatenates
 * the master film public/system-design-lessons/design-rag-omni.mp4.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const videoUrls = [
    "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjA1YWM2Njk1ZWEwYTA5YjU5MDAwNjU4YmFlZjU2NTZiZTAzYzlkNTI5N2MxZjVmZjMSCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050",
    "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBjMDg3MjNlMzVmMTczMWQ5MDAwNjU4YmFmOTgyMzg0NzA1MjY4NmRjNzcwZmI2NGYSCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050",
    "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjA3ZTk3ZDhmYTkyNWFiNTQ2MDAwNjU4YmYzMTg0M2I2MjA4OGU5ZWQ3YTUyMGE3NmQSCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050",
    "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBhN2U3NDExYjEwOWE0M2Q0MDAwNjU5MjQwNGIxYWY4NjA2NzkzMGNkNGIwNjk2ZWMSCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050",
    "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBhOTFkODhlNWU0MjA4ODcyMDAwNjU5MjQwYzdmY2U3ZTA1NmE4NDMzNmYyMTJhNWISCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050",
    "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBlMDAwMzFhODA3NmZkYzJhMDAwNjU5MjQxNGI1NzQyYzAzYzljNjZiMzYyNWE4MjESCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050"
];

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips-rag');
const MASTER_OUTPUT = path.resolve('public/system-design-lessons/design-rag-omni.mp4');

async function main() {
    console.log("========================================================");
    console.log("🚀 DOWNLOADING 6 RAG GEMINI OMNI CLIPS & BUILDING MASTER FILM");
    console.log("========================================================\n");

    fs.mkdirSync(CLIPS_DIR, { recursive: true });
    const rawPaths = [];

    // --- STEP 1: Download each video URL ---
    for (let i = 0; i < videoUrls.length; i++) {
        const u = videoUrls[i];
        const rawPath = path.join(CLIPS_DIR, `rag-omni-raw-${i + 1}.mp4`);
        console.log(`📥 Downloading Clip ${i + 1}/${videoUrls.length}...`);

        execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });
        const dlScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
await openOrReuseTab(${JSON.stringify(u)}, { wait: false })
await wait(3)
EOF
`;
        execSync(dlScript, { stdio: 'inherit' });
        await new Promise(r => setTimeout(r, 2500));
        const dlFile = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
        if (dlFile && fs.existsSync(dlFile)) {
            fs.copyFileSync(dlFile, rawPath);
            rawPaths.push(rawPath);
            console.log(`✅ Saved raw clip ${i + 1}: ${rawPath}`);
        }
    }

    // --- STEP 2: Watermark Cropping (93% Vertical Crop) ---
    console.log("\n========================================================");
    console.log("✂️ Cropping 93% bottom AI watermarks & scaling to 1080p...");
    console.log("========================================================");

    const cleanPaths = [];
    for (let i = 0; i < rawPaths.length; i++) {
        const raw = rawPaths[i];
        const cleanFile = path.join(CLIPS_DIR, `rag-perfect-clean-${i + 1}.mp4`);
        const cropCmd = `ffmpeg -y -i "${raw}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanFile}"`;
        execSync(cropCmd, { stdio: 'pipe' });
        cleanPaths.push(cleanFile);
        console.log(`✅ Clean Clip ${i + 1} ready: ${cleanFile}`);
    }

    // --- STEP 3: Concatenate into Master Video ---
    if (cleanPaths.length === videoUrls.length) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ${cleanPaths.length} Clean Gemini Omni Apple Park Clips...`);
        console.log(`========================================================`);

        const concatListPath = path.join(CLIPS_DIR, 'rag-concat-list.txt');
        fs.writeFileSync(concatListPath, cleanPaths.map(f => `file '${f}'`).join('\n'));
        const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy -movflags +faststart "${MASTER_OUTPUT}"`;
        execSync(concatCmd, { stdio: 'inherit' });

        const finalSize = fs.statSync(MASTER_OUTPUT).size;
        console.log(`\n🎉 MASTER FILM RENDERED SUCCESSFULLY: ${MASTER_OUTPUT}`);
        console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`========================================================`);
    } else {
        console.warn(`⚠️ Warning: Only compiled ${cleanPaths.length}/${videoUrls.length} clean clips.`);
    }

    const handoffScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
await completeTaskSpace(1, { keep: true })
EOF
`;
    execSync(handoffScript, { stdio: 'inherit' });
}

main().catch(err => {
    console.error("❌ Download & Build Error:", err);
    process.exit(1);
});
