/**
 * ego-upload-careervivid.mjs
 *
 * Direct browser automation script using ego-browser to batch upload all 8 System Design videos
 * directly to the CareerVivid brand channel (https://www.youtube.com/@Careervivid-w8y).
 */

import { execFileSync } from 'child_process';
import path from 'path';

const LESSONS_DIR = path.resolve('public/system-design-lessons');

const VIDEOS = [
    {
        file: 'design-tiktok.mp4',
        title: 'How to Design TikTok | System Design Interview (Vector Recommendation & Sharded Counters)',
        description: `How does TikTok recommend short videos to 1 Billion users with sub-100ms latency? In this System Design Interview breakdown, we explore the Two-Stage ML Recommendation Engine (Recall + Rank), Distributed Redis Counter Sharding for viral likes, and Edge CDN Chunk Prefetching.\n\n🚀 Practice interactive system design scenarios at https://careervivid.com\n\n#SystemDesign #TikTok #SoftwareEngineering #TechInterview #DistributedSystems`,
    },
    {
        file: 'design-whatsapp.mp4',
        title: 'How to Design WhatsApp & Messenger | System Design Interview (WebSockets & Signal E2EE)',
        description: `How does WhatsApp deliver 100 Billion messages daily with zero dropped texts? In this System Design Interview breakdown, we explore stateful WebSocket Gateway Fleets, Asynchronous Message Queue Fan-Out, and Signal Protocol End-to-End Encryption.\n\n🚀 Practice interactive system design scenarios at https://careervivid.com\n\n#SystemDesign #WhatsApp #WebSockets #SoftwareEngineering #TechInterview`,
    },
    {
        file: 'design-claude-code.mp4',
        title: 'How to Design Claude Code & Autonomous AI Agents | System Design Interview',
        description: `How does Claude Code orchestrate complex coding tasks without overflowing context windows? Discover Subagent Fleet Orchestration, Context Window Compression Checkpoints, and Sandboxed Runtime Permission Hooks.\n\n🚀 Practice interactive system design scenarios at https://careervivid.com\n\n#SystemDesign #ClaudeCode #AIAgents #SubagentFleet #SoftwareEngineering`,
    },
    {
        file: 'design-uber.mp4',
        title: 'How to Design Uber | System Design Interview (Geospatial H3 Grid & Driver Matching)',
        description: `How does Uber match millions of riders and drivers in real time? Learn about Uber's Geospatial H3 Hexagonal Grid Indexing, Location Ping Ingestion, and High-Throughput Matching Queues.\n\n🚀 Practice interactive system design scenarios at https://careervivid.com\n\n#SystemDesign #Uber #Geospatial #SoftwareEngineering #TechInterview`,
    },
    {
        file: 'design-youtube.mp4',
        title: 'How to Design YouTube | System Design Interview (Video Transcoding & Adaptive HLS CDN)',
        description: `How does YouTube transcode and stream petabytes of video smoothly across weak networks? Explore Video Transcoding Pipelines, Adaptive Bitrate Streaming (HLS), and Multi-Tiered CDN Edge Caching.\n\n🚀 Practice interactive system design scenarios at https://careervivid.com\n\n#SystemDesign #YouTube #VideoStreaming #CDN #SoftwareEngineering`,
    },
    {
        file: 'design-instagram.mp4',
        title: 'How to Design Instagram | System Design Interview (Hybrid Fan-out & Feed Caches)',
        description: `How does Instagram serve feeds to 2 Billion users instantly? Learn about Hybrid Fan-out on Write vs. Fan-out on Read, In-Memory Feed Cache Architecture, and Media CDNs.\n\n🚀 Practice interactive system design scenarios at https://careervivid.com\n\n#SystemDesign #Instagram #SoftwareEngineering #TechInterview`,
    },
    {
        file: 'design-airbnb.mp4',
        title: 'How to Design Airbnb | System Design Interview (Booking Engine & Redlock Mutex)',
        description: `How does Airbnb prevent double-booking across millions of property listings? Discover Distributed Lock Managers (Redlock Mutex), Two-Phase Reservation State Machines, and Search Indexing.\n\n🚀 Practice interactive system design scenarios at https://careervivid.com\n\n#SystemDesign #Airbnb #Redlock #SoftwareEngineering #TechInterview`,
    },
    {
        file: 'design-openai.mp4',
        title: 'How to Design OpenAI ChatGPT | System Design Interview (SSE Streaming & KV Cache)',
        description: `How does ChatGPT stream real-time token responses to 100 Million weekly users? Explore Server-Sent Events (SSE), KV Cache Memory Management, and Load Balancing AI GPU Clusters.\n\n🚀 Practice interactive system design scenarios at https://careervivid.com\n\n#SystemDesign #ChatGPT #OpenAI #SSE #SoftwareEngineering`,
    },
];

console.log('🚀 Launching ego-browser upload pipeline for CareerVivid channel...\n');

for (const [idx, v] of VIDEOS.entries()) {
    const videoPath = path.join(LESSONS_DIR, v.file);
    console.log(`\n========================================================`);
    console.log(`[${idx + 1}/${VIDEOS.length}] Uploading to @Careervivid-w8y: ${v.file}`);
    console.log(`Title: "${v.title}"`);
    console.log(`========================================================`);

    const script = `
const task = await useOrCreateTaskSpace('upload careervivid channel videos')

await openOrReuseTab('https://studio.youtube.com', { wait: true, timeout: 20 })
cliLog('Navigated to Studio: ' + (await pageInfo()).url)

// Click Create button
await js(String.raw\`(() => {
  const btns = Array.from(document.querySelectorAll('ytcp-button, button, a'));
  const createBtn = btns.find(b => (b.innerText || b.getAttribute('aria-label') || '').includes('CREATE') || (b.innerText || '').includes('Create'));
  if (createBtn) createBtn.click();
})()\`)
await wait(2)

// Click Upload videos
await js(String.raw\`(() => {
  const items = Array.from(document.querySelectorAll('tp-yt-paper-item, ytcp-text-menu-item, a, button'));
  const uploadItem = items.find(i => (i.innerText || '').includes('Upload videos'));
  if (uploadItem) uploadItem.click();
})()\`)
await wait(3)

// Select file
cliLog('Uploading file: ' + ${JSON.stringify(videoPath)})
await uploadFile('input[type="file"]', ${JSON.stringify(videoPath)})
await wait(6)

// Fill Title
await js(String.raw\`(() => {
  const textboxes = Array.from(document.querySelectorAll('#textbox'));
  if (textboxes.length >= 1) {
    textboxes[0].innerText = ${JSON.stringify(v.title)};
    textboxes[0].dispatchEvent(new Event('input', { bubbles: true }));
  }
})()\`)

// Fill Description
await js(String.raw\`(() => {
  const textboxes = Array.from(document.querySelectorAll('#textbox'));
  if (textboxes.length >= 2) {
    textboxes[1].innerText = ${JSON.stringify(v.description)};
    textboxes[1].dispatchEvent(new Event('input', { bubbles: true }));
  }
})()\`)

// Select No, it's not made for kids
await js(String.raw\`(() => {
  const radios = Array.from(document.querySelectorAll('tp-yt-paper-radio-button, radiobutton, #radioContainer'));
  const target = radios.find(r => (r.innerText || '').includes("not made for kids"));
  if (target) target.click();
})()\`)

await wait(3)

// Click Next 3 times
for (let i = 0; i < 3; i++) {
  await js(String.raw\`(() => {
    const nextBtn = document.querySelector('#next-button, button[aria-label*="Next"], #next-button button');
    if (nextBtn) nextBtn.click();
  })()\`)
  await wait(3)
}

// Select Public
await js(String.raw\`(() => {
  const radios = Array.from(document.querySelectorAll('tp-yt-paper-radio-button, radiobutton, #radioContainer, #public-radio-button'));
  const publicRadio = radios.find(r => (r.innerText || r.getAttribute('name') || '').includes('PUBLIC') || (r.innerText || '').includes('Public'));
  if (publicRadio) publicRadio.click();
})()\`)

await wait(2)

// Click Publish / Save
await js(String.raw\`(() => {
  const pubBtn = document.querySelector('#done-button, button[aria-label*="Publish"], button[aria-label*="Save"], #done-button button');
  if (pubBtn) pubBtn.click();
})()\`)

await wait(5)
cliLog('✅ Upload completed for ' + ${JSON.stringify(v.file)})
try { await completeTaskSpace(task.id, { keep: true }) } catch (e) {}
`;

    try {
        execFileSync('ego-browser', ['nodejs'], {
            stdio: ['pipe', 'inherit', 'inherit'],
            cwd: process.cwd(),
            input: script,
            shell: false,
        });
        console.log(`🎉 Finished uploading ${v.file}`);
    } catch (e) {
        console.error(`❌ Error uploading ${v.file}:`, e.message);
    }
}
