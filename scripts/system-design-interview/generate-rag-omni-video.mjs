/**
 * generate-rag-omni-video.mjs
 *
 * Automated Gemini Omni production pipeline for AI Infrastructure & RAG Vector Search video:
 *   - Target Environment: Apple Park Nature-Professional Aesthetics (Tim Cook Style)
 *   - Avatar Outfit: Sleek dark fitted knit shirt
 *   - Narrative Arc: Job Seeker Pain Points -> Interactive Companion -> Empowered CTA
 *   - Post-Processing: 93% bottom AI watermark crop + 1080p scaling + concat
 *   - Output: public/system-design-lessons/design-rag-omni.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_CHAT_URL = "https://gemini.google.com/app/379a699b94af70ca";
const CLIPS_DIR = path.resolve('public/system-design-lessons/clips-rag');
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

async function runPipeline() {
    console.log("========================================================");
    console.log("🎬 CAREERVIVID AI INFRA & RAG OMNI VIDEO PIPELINE");
    console.log(`Target Chat Thread: ${TARGET_CHAT_URL}`);
    console.log("========================================================\n");

    fs.mkdirSync(CLIPS_DIR, { recursive: true });
    const rawClipPaths = [];

    // --- STEP 1: Sequentially Submit Prompts 1-6 in Single Chat Thread ---
    for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        const rawPath = path.join(CLIPS_DIR, `rag-omni-raw-${i + 1}-${beat.id}.mp4`);

        if (fs.existsSync(rawPath) && !process.env.FORCE) {
            console.log(`⏭ Beat ${i + 1}/${beats.length} (${beat.id}) raw clip already exists on disk.`);
            rawClipPaths.push(rawPath);
            continue;
        }

        console.log(`\n📝 [Beat ${i + 1}/${beats.length}] Submitting prompt for ${beat.id}...`);

        const promptScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
await openOrReuseTab(${JSON.stringify(TARGET_CHAT_URL)})
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
    return { success: true, label: btn.getAttribute('aria-label') }
  }
  return { success: false }
})()\`)

cliLog("Send Beat ${i + 1} Result: " + JSON.stringify(sendRes))
EOF
`;
        execSync(promptScript, { stdio: 'inherit' });

        console.log(`⏳ Waiting 55 seconds for Beat ${i + 1} Gemini Omni video rendering...`);
        await new Promise(r => setTimeout(r, 55000));

        console.log(`🔄 Reloading chat thread to reveal Beat ${i + 1} video element...`);
        const refreshScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
const currentUrl = await js("location.href")
await gotoAndWait(currentUrl, { timeout: 15, settle: 3 })
await wait(3)
EOF
`;
        execSync(refreshScript, { stdio: 'inherit' });

        console.log(`📥 Extracting video URL for Beat ${i + 1}...`);
        const getUrlScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)

const videoUrls = await js(String.raw\`(() => {
  return Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc).filter(Boolean)
})()\`)

cliLog("DOM_VIDEO_URLS:" + JSON.stringify(videoUrls))
EOF
`;
        const out = execSync(getUrlScript, { encoding: 'utf8' }).trim();
        const match = out.match(/DOM_VIDEO_URLS:(\[.*\])/);
        const urls = match ? JSON.parse(match[1]) : [];
        console.log(`Found ${urls.length} video URLs in chat DOM.`);

        const latestUrl = urls[urls.length - 1];
        if (latestUrl) {
            console.log(`📥 Downloading Beat ${i + 1} raw video URL: ${latestUrl.slice(0, 80)}...`);
            execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });

            const dlScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
await openOrReuseTab(${JSON.stringify(latestUrl)}, { wait: false })
await wait(3)
EOF
`;
            execSync(dlScript, { stdio: 'inherit' });
            await new Promise(r => setTimeout(r, 2500));
            const dlFile = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
            if (dlFile && fs.existsSync(dlFile)) {
                fs.copyFileSync(dlFile, rawPath);
                console.log(`✅ Saved Beat ${i + 1} raw clip: ${rawPath}`);
                rawClipPaths.push(rawPath);
            }
        }
    }

    // --- STEP 2: Watermark Cropping (93% Vertical Crop) & Concat ---
    console.log("\n========================================================");
    console.log("✂️ Cropping 93% bottom AI watermarks on all clips...");
    console.log("========================================================");

    const cleanPaths = [];
    for (let i = 0; i < rawClipPaths.length; i++) {
        const raw = rawClipPaths[i];
        if (!fs.existsSync(raw)) {
            console.error(`❌ Error: Missing raw clip file: ${raw}`);
            continue;
        }
        const cleanFile = path.join(CLIPS_DIR, `rag-perfect-clean-${i + 1}.mp4`);
        const cropCmd = `ffmpeg -y -i "${raw}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanFile}"`;
        execSync(cropCmd, { stdio: 'pipe' });
        cleanPaths.push(cleanFile);
        console.log(`✅ Clean Clip ${i + 1} ready: ${cleanFile}`);
    }

    if (cleanPaths.length === beats.length) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ${cleanPaths.length} Gemini Omni Apple Park Clips...`);
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
        console.warn(`⚠️ Warning: Only compiled ${cleanPaths.length}/${beats.length} clean clips.`);
    }

    const handoffScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(1)
await completeTaskSpace(1, { keep: true })
EOF
`;
    execSync(handoffScript, { stdio: 'inherit' });
}

runPipeline().catch(err => {
    console.error("❌ RAG Pipeline Error:", err);
    process.exit(1);
});
