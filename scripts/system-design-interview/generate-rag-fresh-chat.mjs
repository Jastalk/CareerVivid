/**
 * generate-rag-fresh-chat.mjs
 *
 * Always opens a FRESH new Gemini chat thread (https://gemini.google.com/app)
 * to generate all 6 black-shirt Apple Park RAG Vector Search clips with 100% thread purity.
 * Crops 93% bottom watermarks and concatenates into design-rag-omni.mp4.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips-rag-fresh');
const MASTER_OUTPUT = path.resolve('public/system-design-lessons/design-rag-omni.mp4');

const beats = [
    {
        id: "beat1_hook",
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic 4K medium shot framing the young male software engineer avatar (@zhujiawen519) wearing a sleek dark fitted knit shirt, standing inside a floor-to-ceiling glass pavilion at Apple Park surrounded by lush green redwood trees and natural morning sunlight. Warm, organic, serene, ultra-sleek and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks calmly and authoritatively with complete sentence articulation:
"You're interviewing for GenAI and AI Infrastructure roles, but you haven't managed multi-GPU VRAM clusters or billion-vector indexes in production... How do you pass the AI System Design loop?"`
    },
    {
        id: "beat2_painpoint",
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic low-angle shot framing the young male software engineer avatar (@zhujiawen519) wearing a sleek dark fitted knit shirt, standing beside an outdoor architectural infinity reflection pool at Apple Park under golden hour sunlight, holding a minimalist glass tablet glowing with subtle vector embeddings. Warm, organic, serene, ultra-sleek and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks clearly with complete sentence articulation:
"Memorizing vector formulas isn't enough when an interviewer asks how to trade off search recall latency against GPU VRAM memory bandwidth during a live high-pressure interview."`
    },
    {
        id: "beat3_reassure",
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A dynamic medium tracking shot of the young male software engineer avatar (@zhujiawen519) wearing a sleek dark fitted knit shirt, walking along a curved glass corridor at Apple Park overlooking a lush central fruit grove and green hills. Serene, high-end, professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks reassuringly with complete sentence articulation:
"You don't need a cluster of a hundred A100 GPUs at work to think like a Senior AI Systems Architect."`
    },
    {
        id: "beat4_solution1",
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A medium close-up shot of the young male software engineer avatar (@zhujiawen519) wearing a sleek dark fitted knit shirt, sitting at a minimalist light-oak desk inside the Apple Park glass pavilion, gesturing naturally toward technical architecture diagrams in nature sunlight. Serene and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks authoritatively with complete sentence articulation:
"CareerVivid acts as your active AI System Design Companion — breaking down how RAG pipelines split chunk embeddings into HNSW graph indexes and compressed Product Quantization vectors."`
    },
    {
        id: "beat5_solution2",
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic wide shot of the young male software engineer avatar (@zhujiawen519) wearing a sleek dark fitted knit shirt, standing on an open-air teak deck overlooking misty green mountain ridges at sunrise. Organic, serene, high-tech, and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks confidently with complete sentence articulation:
"It guides you step-by-step through GPU VRAM buffer management and hybrid keyword-vector retrieval so you can explain every architectural tradeoff with total confidence."`
    },
    {
        id: "beat6_outro_cta",
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic medium shot of the young male software engineer avatar (@zhujiawen519) wearing a sleek dark fitted knit shirt, standing by the architectural reflection pool at sunset, smiling warmly and confidently at the camera. Serene, inspiring, high-end. No text on screen.

Audio & Spoken Narration:
The engineer speaks inspiringly with complete sentence articulation:
"Stop memorizing diagrams. Build authentic AI System Design intuition with your interactive companion today on CareerVivid dot app!"`
    }
];

async function main() {
    console.log("========================================================");
    console.log("🚀 FRESH CHAT GEMINI OMNI RAG VIDEO PIPELINE");
    console.log("========================================================\n");

    fs.mkdirSync(CLIPS_DIR, { recursive: true });

    // --- STEP 1: Open FRESH Chat Window ---
    console.log("✨ Opening a FRESH new Gemini chat window at https://gemini.google.com/app...");
    const initFreshScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
await gotoAndWait("https://gemini.google.com/app", { timeout: 15, settle: 3 })
await wait(3)

cliLog("Clicking .ql-editor p...")
await click('.ql-editor p')
await wait(1)

cliLog("Inserting Prompt 1...")
await cdp('Input.insertText', { text: ${JSON.stringify(beats[0].prompt)} })
await wait(1.5)

const sendRes = await js(String.raw\`(() => {
  const btn = document.querySelector('button[aria-label="Send message"]') || 
              document.querySelector('button[aria-label*="Send"]') ||
              Array.from(document.querySelectorAll('button')).find(b => b.ariaLabel && b.ariaLabel.toLowerCase().includes('send'))
  if (btn) {
    btn.click()
    return { success: true }
  }
  return { success: false }
})()\`)

cliLog("Send Beat 1 Result: " + JSON.stringify(sendRes))
EOF
`;
    execSync(initFreshScript, { stdio: 'inherit' });

    console.log("⏳ Waiting 55 seconds for Beat 1 rendering...");
    await new Promise(r => setTimeout(r, 55000));

    // Get the fresh chat URL
    const getChatUrlScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
const freshUrl = await js("location.href")
cliLog("FRESH_CHAT_URL:" + freshUrl)
EOF
`;
    const outUrl = execSync(getChatUrlScript, { encoding: 'utf8' }).trim();
    const matchUrl = outUrl.match(/FRESH_CHAT_URL:(https:\/\/[^\s]+)/);
    const freshChatUrl = matchUrl ? matchUrl[1] : "https://gemini.google.com/app";
    console.log(`📌 Brand-New Fresh Chat URL Captured: ${freshChatUrl}`);

    // --- STEP 2: Submit Beats 2 to 6 in this Fresh Chat Thread ---
    for (let i = 1; i < beats.length; i++) {
        const beat = beats[i];
        console.log(`\n📝 [Beat ${i + 1}/${beats.length}] Submitting prompt for ${beat.id}...`);

        const promptScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
await gotoAndWait(${JSON.stringify(freshChatUrl)}, { timeout: 15, settle: 3 })
await wait(3)

cliLog("Clicking .ql-editor p...")
await click('.ql-editor p')
await wait(1)

cliLog("Inserting Prompt ${i + 1}...")
await cdp('Input.insertText', { text: ${JSON.stringify(beat.prompt)} })
await wait(1.5)

const sendRes = await js(String.raw\`(() => {
  const btn = document.querySelector('button[aria-label="Send message"]') || 
              document.querySelector('button[aria-label*="Send"]') ||
              Array.from(document.querySelectorAll('button')).find(b => b.ariaLabel && b.ariaLabel.toLowerCase().includes('send'))
  if (btn) {
    btn.click()
    return { success: true }
  }
  return { success: false }
})()\`)

cliLog("Send Beat ${i + 1} Result: " + JSON.stringify(sendRes))
EOF
`;
        execSync(promptScript, { stdio: 'inherit' });

        console.log(`⏳ Waiting 55 seconds for Beat ${i + 1} rendering...`);
        await new Promise(r => setTimeout(r, 55000));
    }

    // --- STEP 3: Reload & Extract All 6 Video URLs ---
    console.log("\n🔄 Reloading fresh chat to extract all 6 black-shirt video URLs...");
    const reloadScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
await gotoAndWait(${JSON.stringify(freshChatUrl)}, { timeout: 15, settle: 3 })
await wait(4)

const videoUrls = await js(String.raw\`(() => {
  return Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc).filter(Boolean)
})()\`)

cliLog("FRESH_DOM_VIDEO_URLS:" + JSON.stringify(videoUrls))
EOF
`;
    const out = execSync(reloadScript, { encoding: 'utf8' }).trim();
    const match = out.match(/FRESH_DOM_VIDEO_URLS:(\[[\s\S]*?\])/);
    let urls = [];
    if (match) {
        try { urls = JSON.parse(match[1]); } catch (e) {}
    }
    console.log(`Found ${urls.length} video URLs in fresh chat thread:`, urls);

    // Download clips
    const downloadedClips = [];
    for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        const rawPath = path.join(CLIPS_DIR, `rag-fresh-raw-${i + 1}.mp4`);
        console.log(`📥 Downloading video ${i + 1}/${urls.length}...`);

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
            downloadedClips.push(rawPath);
            console.log(`✅ Saved raw clip ${i + 1}: ${rawPath}`);
        }
    }

    // --- STEP 4: Watermark Crop & Concat ---
    console.log("\n========================================================");
    console.log("✂️ Cropping 93% bottom AI watermarks & upscaling 6 fresh clips...");
    console.log("========================================================");

    const cleanPaths = [];
    for (let i = 0; i < downloadedClips.length; i++) {
        const raw = downloadedClips[i];
        const cleanFile = path.join(CLIPS_DIR, `rag-fresh-clean-${i + 1}.mp4`);
        const cropCmd = `ffmpeg -y -i "${raw}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanFile}"`;
        execSync(cropCmd, { stdio: 'pipe' });
        cleanPaths.push(cleanFile);
        console.log(`✅ Clean Clip ${i + 1} ready: ${cleanFile}`);
    }

    if (cleanPaths.length >= 6) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ${cleanPaths.length} Pure Black-Shirt Apple Park Clips...`);
        console.log(`========================================================`);

        const concatListPath = path.join(CLIPS_DIR, 'rag-fresh-concat-list.txt');
        fs.writeFileSync(concatListPath, cleanPaths.map(f => `file '${f}'`).join('\n'));
        const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy -movflags +faststart "${MASTER_OUTPUT}"`;
        execSync(concatCmd, { stdio: 'inherit' });

        const finalSize = fs.statSync(MASTER_OUTPUT).size;
        console.log(`\n🎉 PERFECT MASTER FILM RENDERED: ${MASTER_OUTPUT}`);
        console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`========================================================`);
    } else {
        console.warn(`⚠️ Warning: Only compiled ${cleanPaths.length} clean clips.`);
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
    console.error("❌ Fresh Chat Pipeline Error:", err);
    process.exit(1);
});
