/**
 * upload-missing-3.mjs
 *
 * Uploads the 3 missing videos (TikTok, WhatsApp, Claude Code) to the active Careervivid channel.
 */

import { execFileSync } from 'child_process';
import path from 'path';

const UPLOADER_SCRIPT = '/Users/jiawenzhu/.config/hackathon-youtube-uploader/uploader.js';
const LESSONS_DIR = path.resolve('public/system-design-lessons');

const MISSING_VIDEOS = [
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
];

async function main() {
    console.log('🚀 Uploading 3 Missing System Design Videos to Careervivid Channel...\n');

    for (const [idx, v] of MISSING_VIDEOS.entries()) {
        const filePath = path.join(LESSONS_DIR, v.file);
        console.log(`\n========================================================`);
        console.log(`[${idx + 1}/${MISSING_VIDEOS.length}] Uploading: ${v.file}`);
        console.log(`Title: "${v.title}"`);
        console.log(`========================================================`);

        try {
            const out = execFileSync('node', [
                UPLOADER_SCRIPT,
                '--video', filePath,
                '--title', v.title,
                '--description', v.description,
                '--privacy', 'public',
            ], { encoding: 'utf8', shell: false });

            const match = out.match(/https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
            const url = match ? match[0] : 'Uploaded';

            console.log(`\n🎉 Uploaded ${v.file} -> ${url}`);
        } catch (err) {
            console.error(`❌ Failed to upload ${v.file}:`, err.message);
        }
    }
}

main();
