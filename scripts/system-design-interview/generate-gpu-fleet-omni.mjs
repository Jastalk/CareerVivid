/**
 * generate-gpu-fleet-omni.mjs
 *
 * Automated CareerVivid Gemini Omni Batch Production:
 * Topic: Distributed GPU Fleet Scheduling & LLM Inference Engine (vLLM, PagedAttention, KV Cache, NVLink)
 * Outfit: Crisp White Button-Down Shirt (白色衬衫)
 * Aesthetics: Tim Cook @ Apple Park Nature-Professional Architecture
 * Storyline: Pain Point -> Technical Depth -> Career Agent Real-Time Companion -> Mastery -> Signature Outro CTA
 * Watermark: 93% bottom crop + 1080p 24fps upscale
 * Storage: public/system-design-lessons/clips-library/
 * Master: public/system-design-lessons/design-gpu-fleet-omni.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TOPIC_SLUG = "gpu-fleet";
const TASK_SPACE_ID = 1;
const BATCH_CLIPS_DIR = path.resolve(`public/system-design-lessons/clips-${TOPIC_SLUG}`);
const LIBRARY_CLIPS_DIR = path.resolve('public/system-design-lessons/clips-library');
const MASTER_OUTPUT = path.resolve(`public/system-design-lessons/design-${TOPIC_SLUG}-omni.mp4`);

const beats = [
    {
        id: "beat1_hook",
        name: `${TOPIC_SLUG}-clip-1-hook`,
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic 4K medium shot framing the young male software engineer avatar (@zhujiawen519) wearing a sleek crisp white button-down shirt (白色衬衫), standing inside a floor-to-ceiling glass pavilion at Apple Park surrounded by lush green redwood trees and natural morning sunlight. Warm, organic, serene, ultra-sleek and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks calmly and authoritatively in fluent English with complete sentence articulation:
"When an interviewer asks how you serve thirty thousand concurrent users on a distributed cluster of H100 GPUs, drawing a simple load balancer will get you rejected instantly."`
    },
    {
        id: "beat2_painpoint",
        name: `${TOPIC_SLUG}-clip-2-painpoint`,
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic low-angle shot framing the young male software engineer avatar (@zhujiawen519) wearing a sleek crisp white button-down shirt (白色衬衫), standing beside an outdoor architectural infinity reflection pool at Apple Park under golden hour sunlight, holding a minimalist glass tablet glowing with subtle GPU cluster telemetry. Warm, organic, serene, ultra-sleek and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks clearly in fluent English with complete sentence articulation:
"You need to explain continuous batching, PagedAttention KV-cache memory fragmentation, and how tensor parallelism communicates across eight-way NVLink interconnects."`
    },
    {
        id: "beat3_companion",
        name: `${TOPIC_SLUG}-clip-3-companion`,
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A dynamic medium tracking shot of the young male software engineer avatar (@zhujiawen519) wearing a sleek crisp white button-down shirt (白色衬衫), walking along a curved glass corridor at Apple Park overlooking a lush central fruit grove and green hills. Serene, high-end, professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks reassuringly in fluent English with complete sentence articulation:
"CareerVivid features an active, real-time AI Career Agent companion that guides you step-by-step through live system design scenarios with instant interactive feedback."`
    },
    {
        id: "beat4_solution",
        name: `${TOPIC_SLUG}-clip-4-solution`,
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A medium close-up shot of the young male software engineer avatar (@zhujiawen519) wearing a sleek crisp white button-down shirt (白色衬衫), sitting at a minimalist light-oak desk inside the Apple Park glass pavilion, gesturing naturally toward technical architecture diagrams in natural sunlight. Serene and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks authoritatively in fluent English with complete sentence articulation:
"You practice real-time VRAM allocation and dynamic request scheduling, giving you the deep intuition to crush senior AI infrastructure interviews."`
    },
    {
        id: "beat5_outro_cta",
        name: `${TOPIC_SLUG}-clip-5-outro-cta`,
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic wide shot of the young male software engineer avatar (@zhujiawen519) wearing a sleek crisp white button-down shirt (白色衬衫), standing on an open-air teak deck overlooking misty green mountain ridges at sunrise, smiling warmly and confidently at the camera. Organic, serene, inspiring, high-tech, and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks inspiringly in fluent English with complete sentence articulation:
"If you struggle, please check out CareerVivid dot app, and let CareerVivid help you gain the knowledge you struggle to gain and get that damn job quickly!"`
    }
];

function runEgoScript(script) {
    const egoCmd = `ego-browser nodejs 2>&1 <<'EOF'\n${script}\nEOF`;
    return execSync(egoCmd, { encoding: 'utf8' }).trim();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkVideoReady() {
    const checkScript = `
await claimTaskSpace(${TASK_SPACE_ID})
const currentUrl = await js("location.href")
await gotoAndWait(currentUrl, { timeout: 15, settle: 3 })
await wait(2)

const res = await js(String.raw\`(() => {
  const videos = Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc).filter(Boolean)
  const text = document.body.innerText
  const hasQuotaError = text.includes("can't generate more videos") || text.includes("reached your limit") || text.includes("try again later")
  const isGenerating = text.includes("Generating your video") || text.includes("Creating your video") || text.includes("Generating video")
  return {
    url: location.href,
    videoCount: videos.length,
    videos,
    hasQuotaError,
    isGenerating
  }
})()\`)
cliLog("CHECK_STATUS:" + JSON.stringify(res))
`;
    const out = runEgoScript(checkScript);
    const match = out.match(/CHECK_STATUS:(\{.*\})/);
    if (!match) return { videoCount: 0, videos: [], hasQuotaError: false, isGenerating: false, url: "" };
    return JSON.parse(match[1]);
}

async function submitPrompt(chatUrl, promptText) {
    const promptScript = `
await claimTaskSpace(${TASK_SPACE_ID})
if (${JSON.stringify(chatUrl)}) {
  await openOrReuseTab(${JSON.stringify(chatUrl)})
  await wait(2)
}

cliLog("Focusing editor...")
await click('.ql-editor')
await wait(1)

cliLog("Inserting prompt...")
await cdp('Input.insertText', { text: ${JSON.stringify(promptText)} })
await wait(1.5)

const sendRes = await js(String.raw\`(() => {
  const btn = document.querySelector('button[aria-label="Send message"]') || 
              document.querySelector('button[aria-label*="Send"]') ||
              Array.from(document.querySelectorAll('button')).find(b => b.ariaLabel && b.ariaLabel.toLowerCase().includes('send'))
  if (btn && !btn.disabled) {
    btn.click()
    return { success: true, label: btn.getAttribute('aria-label') }
  }
  return { success: false, found: !!btn, disabled: btn ? btn.disabled : null }
})()\`)
cliLog("SEND_RESULT:" + JSON.stringify(sendRes))
`;
    const out = runEgoScript(promptScript);
    console.log(out);
}

async function downloadVideoUrl(url, destPath) {
    execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });
    const dlScript = `
await claimTaskSpace(${TASK_SPACE_ID})
await openOrReuseTab(${JSON.stringify(url)}, { wait: false })
await wait(4)
`;
    runEgoScript(dlScript);
    await sleep(2000);
    const downloadedFile = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
    if (downloadedFile && fs.existsSync(downloadedFile)) {
        fs.copyFileSync(downloadedFile, destPath);
        return true;
    }
    return false;
}

async function main() {
    console.log("========================================================");
    console.log("🎬 CAREERVIVID GEMINI OMNI GPU FLEET PRODUCTION PIPELINE");
    console.log(`Topic: ${TOPIC_SLUG}`);
    console.log(`Avatar Outfit: Crisp White Button-Down Shirt (白色衬衫)`);
    console.log("========================================================\n");

    fs.mkdirSync(BATCH_CLIPS_DIR, { recursive: true });
    fs.mkdirSync(LIBRARY_CLIPS_DIR, { recursive: true });

    // Step 1: Open fresh blank conversation thread
    console.log("🌐 Opening fresh blank chat thread at https://gemini.google.com/app...");
    const initScript = `
await claimTaskSpace(${TASK_SPACE_ID})
await openOrReuseTab('https://gemini.google.com/app', { wait: true, timeout: 20 })
await wait(3)
const info = await pageInfo()
cliLog("INIT_URL:" + info.url)
`;
    const initOut = runEgoScript(initScript);
    console.log("Init Page:", initOut);

    let activeChatUrl = "https://gemini.google.com/app";
    const rawClipPaths = [];
    const downloadedUrls = new Set();
    let hitQuota = false;

    for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        const rawPath = path.join(BATCH_CLIPS_DIR, `${beat.name}-raw.mp4`);

        console.log(`\n--------------------------------------------------------`);
        console.log(`📝 Processing Beat ${i + 1}/${beats.length}: ${beat.id}...`);
        console.log(`--------------------------------------------------------`);

        // Submit prompt
        console.log(`🚀 Submitting Prompt for Beat ${i + 1}...`);
        await submitPrompt(activeChatUrl, beat.prompt);

        console.log(`⏳ Waiting 35s for Gemini Omni video generation to begin...`);
        await sleep(35000);

        // Update activeChatUrl from page
        let status = await checkVideoReady();
        if (status.url && status.url.startsWith("https://gemini.google.com/app/")) {
            activeChatUrl = status.url;
            console.log(`📌 Updated Active Chat Thread: ${activeChatUrl}`);
        }

        if (status.hasQuotaError) {
            console.error(`🚨 Quota limit detected after Beat ${i + 1}!`);
            hitQuota = true;
            break;
        }

        // Poll for video generation completion (up to 120s)
        let attempts = 0;
        let foundUrl = null;
        while (attempts < 12) {
            attempts++;
            console.log(`⏳ Polling video ${i + 1} status (attempt ${attempts}/12)...`);
            status = await checkVideoReady();

            if (status.hasQuotaError) {
                console.error(`🚨 Quota limit detected during polling!`);
                hitQuota = true;
                break;
            }

            if (status.videos && status.videos.length > 0) {
                for (const vUrl of status.videos) {
                    if (!downloadedUrls.has(vUrl)) {
                        foundUrl = vUrl;
                        break;
                    }
                }
            }

            if (foundUrl) {
                console.log(`🎯 Video ${i + 1} is READY! URL: ${foundUrl.slice(0, 80)}...`);
                break;
            }

            await sleep(12000);
        }

        if (foundUrl) {
            downloadedUrls.add(foundUrl);
            console.log(`📥 Downloading Beat ${i + 1} raw video clip...`);
            const ok = await downloadVideoUrl(foundUrl, rawPath);
            if (ok && fs.existsSync(rawPath)) {
                console.log(`✅ Saved Beat ${i + 1} raw clip: ${rawPath}`);
                rawClipPaths.push(rawPath);
            } else {
                console.error(`❌ Download failed for Beat ${i + 1}`);
            }
        } else {
            console.warn(`⚠️ Could not obtain video URL for Beat ${i + 1}`);
            if (status.hasQuotaError || hitQuota) {
                console.log(`🛑 Stopping batch due to quota limit.`);
                break;
            }
        }
    }

    // --- STEP 2: Watermark Cropping (93% Vertical Crop) & Concat ---
    console.log("\n========================================================");
    console.log(`✂️ Cropping 93% bottom AI watermarks on ${rawClipPaths.length} clips...`);
    console.log("========================================================");

    const cleanPaths = [];
    for (let i = 0; i < rawClipPaths.length; i++) {
        const raw = rawClipPaths[i];
        if (!fs.existsSync(raw)) continue;

        const beatName = beats[i] ? beats[i].name : `${TOPIC_SLUG}-clip-${i + 1}`;
        const cleanBatchFile = path.join(BATCH_CLIPS_DIR, `${beatName}-clean.mp4`);
        const cleanLibraryFile = path.join(LIBRARY_CLIPS_DIR, `${beatName}-clean.mp4`);

        const cropCmd = `ffmpeg -y -i "${raw}" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "${cleanBatchFile}"`;
        execSync(cropCmd, { stdio: 'pipe' });

        fs.copyFileSync(cleanBatchFile, cleanLibraryFile);
        cleanPaths.push(cleanBatchFile);
        console.log(`✅ Clean Clip ${i + 1} ready & archived to library: ${cleanLibraryFile}`);
    }

    if (cleanPaths.length > 0) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ${cleanPaths.length} Gemini Omni Apple Park Clips...`);
        console.log(`========================================================`);

        const concatListPath = path.join(BATCH_CLIPS_DIR, 'concat-list.txt');
        fs.writeFileSync(concatListPath, cleanPaths.map(f => `file '${f}'`).join('\n'));
        const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy -movflags +faststart "${MASTER_OUTPUT}"`;
        execSync(concatCmd, { stdio: 'inherit' });

        const finalSize = fs.statSync(MASTER_OUTPUT).size;
        console.log(`\n🎉 MASTER FILM RENDERED: ${MASTER_OUTPUT}`);
        console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`========================================================`);
    }

    // Always hand off ego-browser task space
    try {
        const handoffScript = `
await claimTaskSpace(${TASK_SPACE_ID})
await completeTaskSpace(${TASK_SPACE_ID}, { keep: true })
`;
        runEgoScript(handoffScript);
        console.log("🤝 ego-browser task space successfully handed off.");
    } catch (e) {
        console.warn("Notice: Task space complete result:", e.message);
    }
}

main().catch(err => {
    console.error("❌ Pipeline Error:", err);
    process.exit(1);
});
