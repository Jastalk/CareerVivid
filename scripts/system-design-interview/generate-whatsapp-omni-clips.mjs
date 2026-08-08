/**
 * generate-whatsapp-omni-clips.mjs
 *
 * Automated Gemini Omni Video Generation & Compilation Pipeline for WhatsApp System Design:
 *   1. Connects to active ego-browser task space 2 (Gemini tab).
 *   2. Sequentially injects 6 structured prompts (voice narration + video featuring avatar @zhujiawen519).
 *   3. Waits ~50s per video clip, refreshes Gemini tab to render output.
 *   4. Downloads generated video clips to ~/Downloads/, moves to public/system-design-lessons/clips/.
 *   5. Concatenates all 6 clips into public/system-design-lessons/design-whatsapp-omni.mp4.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROMPTS = [
    {
        clipId: 'clip-1-hook',
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A photorealistic 4K cinematic video sequence of a young male software engineer (avatar @zhujiawen519) standing inside a modern, sunlit tech atrium with floor-to-ceiling glass walls and glowing architecture diagrams in the background. The camera glides on a smooth Steadicam push-in.

Audio & Spoken Narration:
The engineer speaks clearly with an energetic, natural professional tone:
"Ever wondered how WhatsApp handles over 100 billion messages every single day with less than 50 engineers? Let's break down the core system design architecture behind instant messaging at scale."`
    },
    {
        clipId: 'clip-2-websockets',
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A photorealistic 4K cinematic sequence of the young male software engineer (avatar @zhujiawen519) sitting at a sleek dark-mode workstation with dual curved ultra-wide monitors displaying glowing real-time network node connections. The camera does a slow cinematic dolly zoom.

Audio & Spoken Narration:
The engineer speaks directly to camera with clear articulation:
"At the core is the Erlang BEAM actor model. Each connected user holds a lightweight process consuming under two kilobytes of RAM. Millions of concurrent WebSocket connections stay active simultaneously on a single server node."`
    },
    {
        clipId: 'clip-3-encryption',
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A photorealistic 4K cinematic tracking shot following the young male software engineer (avatar @zhujiawen519) walking through a high-tech glass lounge. Elegant cryptographic lock icons and key exchange diagrams composite in the background.

Audio & Spoken Narration:
The engineer speaks with confidence:
"Privacy relies on the Signal Protocol. Every message uses the Double Ratchet algorithm with AES-256 encryption. Only the sender and recipient possess the private keys—WhatsApp servers never see raw plaintext."`
    },
    {
        clipId: 'clip-4-queues',
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic 4K low-angle glide shot framing the young male software engineer (avatar @zhujiawen519) standing in front of high-density server racks with blue and amber LED pulse lights symbolizing fast database stream routing.

Audio & Spoken Narration:
The engineer speaks clearly:
"When an offline user receives a message, it gets queued in a distributed RocksDB and ScyllaDB message store. Once delivered to the recipient, the message is instantly deleted from server storage forever."`
    },
    {
        clipId: 'clip-5-media',
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A dynamic handheld camera shot of the young male software engineer (avatar @zhujiawen519) pointing to an interactive glass whiteboard displaying image compression algorithms and CDN edge nodes lighting up.

Audio & Spoken Narration:
The engineer speaks energetically:
"For high-res photos and video, media is compressed client-side, encrypted, and uploaded in chunked byte-streams to CDN origin shields via resumable HTTP endpoints for zero bandwidth waste."`
    },
    {
        clipId: 'clip-6-outro',
        prompt: `@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A warm golden-hour panoramic shot of the young male software engineer (avatar @zhujiawen519) leaning near a panoramic office window overlooking a tech city skyline. The engineer smiles and delivers the final call to action to camera.

Audio & Spoken Narration:
The engineer speaks warmly with an engaging outro CTA:
"When users are offline, Apple APNs and Google FCM send push tokens to wake up the client app instantly. If you enjoyed this breakdown, like and subscribe for more system design breakdowns on CareerVivid!"`
    }
];

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
fs.mkdirSync(CLIPS_DIR, { recursive: true });

async function runOmniPipeline() {
    console.log(`========================================================`);
    console.log(`🎬 GEMINI OMNI WHATSAPP SYSTEM DESIGN VIDEO PIPELINE`);
    console.log(`========================================================\n`);

    // Move first test clip if exists in Downloads
    const latestTest = execSync(`ls -t ~/Downloads/*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
    if (latestTest && latestTest.includes('Test_prompt_injection')) {
        const dest1 = path.join(CLIPS_DIR, 'whatsapp-omni-clip-1-hook.mp4');
        fs.copyFileSync(latestTest, dest1);
        console.log(`✅ Clip 1 (Hook) already downloaded & saved to ${dest1}`);
    }

    // Process remaining prompts (2 to 6)
    for (let i = 1; i < PROMPTS.length; i++) {
        const item = PROMPTS[i];
        console.log(`\n========================================================`);
        console.log(`🚀 Generating Clip ${i + 1}/${PROMPTS.length}: [${item.clipId}]...`);
        console.log(`========================================================`);

        // Use ego-browser CLI heredoc to inject prompt
        const jsScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")

const promptText = ${JSON.stringify(item.prompt)}

const res = await js(String.raw\`(() => {
  const p = document.querySelector('rich-textarea div[contenteditable="true"] p') || document.querySelector('div[contenteditable="true"] p')
  if (!p) return { success: false, reason: "p not found" }

  p.textContent = ${JSON.stringify(item.prompt)}
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
        execSync(jsScript, { stdio: 'inherit', cwd: process.cwd() });

        console.log(`⏳ Waiting 50 seconds for Gemini Omni video rendering...`);
        await new Promise(r => setTimeout(r, 50000));

        console.log(`🔄 Refreshing Gemini tab to reveal completed video...`);
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
        execSync(refreshScript, { stdio: 'inherit', cwd: process.cwd() });

        // Copy newly downloaded mp4 from ~/Downloads/
        await new Promise(r => setTimeout(r, 2000));
        const newFile = execSync(`ls -t ~/Downloads/*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();
        if (newFile) {
            const destClip = path.join(CLIPS_DIR, `whatsapp-omni-${item.clipId}.mp4`);
            fs.copyFileSync(newFile, destClip);
            console.log(`✅ Clip ${i + 1} downloaded & saved to: ${destClip}`);
        }
    }

    console.log(`\n========================================================`);
    console.log(`🎬 Concatenating 6 Gemini Omni Video Clips into Final Master Film...`);
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

    fs.writeFileSync(concatListPath, validClips.map(f => `file '${f}'`).join('\n'));

    const masterOutputPath = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');
    const ffmpegConcatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${masterOutputPath}"`;

    try {
        execSync(ffmpegConcatCmd, { stdio: 'inherit' });
        console.log(`🎉 MASTER FILM RENDERED: ${masterOutputPath}`);
        console.log(`📹 Total Duration: ~60 seconds (1 Minute)`);
        console.log(`========================================================`);
    } catch (err) {
        console.error(`❌ Concatenation error:`, err.message);
    }
}

runOmniPipeline().catch(console.error);
