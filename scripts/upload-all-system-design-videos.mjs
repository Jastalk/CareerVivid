/**
 * upload-all-system-design-videos.mjs
 *
 * Batch uploads all System Design flagship videos to YouTube (@CareerVividSystemDesign)
 * using the dedicated scripts/upload-careervivid-youtube-video.mjs CLI engine.
 */

import { execSync } from 'child_process';
import path from 'path';

const UPLOADER_SCRIPT = path.resolve('scripts/upload-careervivid-youtube-video.mjs');
const LESSONS_DIR = path.resolve('public/system-design-lessons');

const VIDEOS = [
    {
        file: 'design-whatsapp.mp4',
        title: 'How to Design WhatsApp & Messenger | System Design Interview (WebSockets & Signal E2EE)',
        description: `How does WhatsApp deliver 100 Billion messages daily with zero dropped texts? In this System Design Interview breakdown, we explore stateful WebSocket Gateway Fleets, Asynchronous Message Queue Fan-Out, and Signal Protocol End-to-End Encryption.

🚀 Master System Design & Land Top Tech Offers:
• System Design Learning: https://careervivid.app/learning/system-design-interview
• Coding for Beginners: https://careervivid.app/learning/coding-interview-patterns
• 300+ Real Tech Company Interview Questions: https://careervivid.app/interview-studio

#SystemDesign #WhatsApp #WebSockets #SoftwareEngineering #TechInterview`,
    },
    {
        file: 'design-claude-code.mp4',
        title: 'How to Design Claude Code | System Design Interview (Agentic AI & Subagent Fleet)',
        description: `How does Claude Code run autonomous coding tasks across 100k-line codebases without losing context or hallucinating? In this System Design Interview breakdown, we explore Subagent Fleet Orchestration, Sliding Context Compression Checkpoints, Sandboxed Permission Hooks, and Reactive Event Loops.

🚀 Master System Design & Land Top Tech Offers:
• System Design Learning: https://careervivid.app/learning/system-design-interview
• Coding for Beginners: https://careervivid.app/learning/coding-interview-patterns
• 300+ Real Tech Company Interview Questions: https://careervivid.app/interview-studio

#SystemDesign #ClaudeCode #AIAgents #SubagentFleet #SoftwareEngineering`,
    },
    {
        file: 'design-uber.mp4',
        title: 'How to Design Uber | System Design Interview (Geospatial H3 Grid & Driver Matching)',
        description: `How does Uber match millions of riders and drivers in real time? Learn about Uber's Geospatial H3 Hexagonal Grid Indexing, Location Ping Ingestion, and High-Throughput Matching Queues.

🚀 Master System Design & Land Top Tech Offers:
• System Design Learning: https://careervivid.app/learning/system-design-interview
• Coding for Beginners: https://careervivid.app/learning/coding-interview-patterns
• 300+ Real Tech Company Interview Questions: https://careervivid.app/interview-studio

#SystemDesign #Uber #Geospatial #SoftwareEngineering #TechInterview`,
    },
    {
        file: 'design-youtube.mp4',
        title: 'How to Design YouTube | System Design Interview (Video Transcoding & Adaptive HLS CDN)',
        description: `How does YouTube transcode and stream petabytes of video smoothly across weak networks? Explore Video Transcoding Pipelines, Adaptive Bitrate Streaming (HLS), and Multi-Tiered CDN Edge Caching.

🚀 Master System Design & Land Top Tech Offers:
• System Design Learning: https://careervivid.app/learning/system-design-interview
• Coding for Beginners: https://careervivid.app/learning/coding-interview-patterns
• 300+ Real Tech Company Interview Questions: https://careervivid.app/interview-studio

#SystemDesign #YouTube #VideoStreaming #CDN #SoftwareEngineering`,
    },
    {
        file: 'design-instagram.mp4',
        title: 'How to Design Instagram | System Design Interview (Hybrid Fan-out & Feed Caches)',
        description: `How does Instagram serve feeds to 2 Billion users instantly? Learn about Hybrid Fan-out on Write vs. Fan-out on Read, In-Memory Feed Cache Architecture, and Media CDNs.

🚀 Master System Design & Land Top Tech Offers:
• System Design Learning: https://careervivid.app/learning/system-design-interview
• Coding for Beginners: https://careervivid.app/learning/coding-interview-patterns
• 300+ Real Tech Company Interview Questions: https://careervivid.app/interview-studio

#SystemDesign #Instagram #SoftwareEngineering #TechInterview`,
    },
    {
        file: 'design-airbnb.mp4',
        title: 'How to Design Airbnb | System Design Interview (Booking Engine & Redlock Mutex)',
        description: `How does Airbnb prevent double-booking across millions of property listings? Discover Distributed Lock Managers (Redlock Mutex), Two-Phase Reservation State Machines, and Search Indexing.

🚀 Master System Design & Land Top Tech Offers:
• System Design Learning: https://careervivid.app/learning/system-design-interview
• Coding for Beginners: https://careervivid.app/learning/coding-interview-patterns
• 300+ Real Tech Company Interview Questions: https://careervivid.app/interview-studio

#SystemDesign #Airbnb #Redlock #SoftwareEngineering #TechInterview`,
    },
    {
        file: 'design-openai.mp4',
        title: 'How to Design OpenAI ChatGPT | System Design Interview (SSE Streaming & KV Cache)',
        description: `How does ChatGPT stream real-time token responses to 100 Million weekly users? Explore Server-Sent Events (SSE), KV Cache Memory Management, and Load Balancing AI GPU Clusters.

🚀 Master System Design & Land Top Tech Offers:
• System Design Learning: https://careervivid.app/learning/system-design-interview
• Coding for Beginners: https://careervivid.app/learning/coding-interview-patterns
• 300+ Real Tech Company Interview Questions: https://careervivid.app/interview-studio

#SystemDesign #ChatGPT #OpenAI #SSE #SoftwareEngineering`,
    },
];

async function uploadAll() {
    console.log('🚀 Batch Uploading System Design Videos to @CareerVividSystemDesign via CLI...\n');

    const results = [];

    for (const [idx, v] of VIDEOS.entries()) {
        const filePath = path.join(LESSONS_DIR, v.file);
        console.log(`\n========================================================`);
        console.log(`[${idx + 1}/${VIDEOS.length}] Uploading: ${v.file}`);
        console.log(`Title: "${v.title}"`);
        console.log(`========================================================`);

        try {
            const cmd = `node "${UPLOADER_SCRIPT}" --video "${filePath}" --title "${v.title.replace(/"/g, '\\"')}" --description "${v.description.replace(/"/g, '\\"')}" --privacy public`;
            const out = execSync(cmd, { encoding: 'utf8' });

            const match = out.match(/https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
            const url = match ? match[0] : 'Uploaded';
            const videoId = match ? match[1] : '';

            results.push({ file: v.file, title: v.title, url, videoId, status: '✅ SUCCESS' });
            console.log(`\n🎉 Uploaded ${v.file} -> ${url}`);
        } catch (err) {
            console.error(`❌ Failed to upload ${v.file}:`, err.message);
            results.push({ file: v.file, title: v.title, url: 'N/A', videoId: '', status: '❌ FAILED' });
        }
    }

    console.log('\n========================================================');
    console.log('🎉 BATCH UPLOAD COMPLETE SUMMARY:');
    console.log('========================================================');
    console.table(results);
}

uploadAll();
