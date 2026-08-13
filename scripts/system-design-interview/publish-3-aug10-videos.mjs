/**
 * publish-3-aug10-videos.mjs
 *
 * Publishes 3 System Design Explainer Videos to YouTube (@CareerVividSystemDesign) and TikTok via CLI.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const VIDEO_PUBLISH_CONFIGS = [
    {
        id: 'sd-discord-sfu',
        masterMp4: 'public/system-design-lessons/design-discord-sfu.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-discord-sfu-thumbnail.jpg',
        ytTitle: 'How to Design Discord Real-Time Voice Engine & SFU Media Fleet',
        ytDescription: `Discover how Discord handles 15 Million concurrent voice channels with sub-30ms audio latency using Selective Forwarding Units (SFUs), lock-free C++ ring buffers, dynamic Opus jitter buffers, Anycast UDP BGP edge routing, and zero-downtime failover!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #Discord #WebRTC #Audio #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Discord Real-Time Voice Engine & SFU Fleet (15M Voice Channels) | System Design #systemdesign #discord #tech #softwareengineering #interview'
    },
    {
        id: 'sd-uber-dispatch',
        masterMp4: 'public/system-design-lessons/design-uber-dispatch.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-uber-dispatch-thumbnail.jpg',
        ytTitle: 'How to Design Uber Driver Dispatch & Real-Time Matching Engine',
        ytDescription: `Learn how Uber processes 2 Million GPS pings per second and matches riders with drivers in sub-100ms using the Bilateral Hungarian Bipartite matching algorithm, H3 hexagonal spatial indexing, Contraction Hierarchies ETA calculation, and Redis Redlock distributed mutexes!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #Uber #Geospatial #Algorithms #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Uber Driver Dispatch & Real-Time Matching (2M GPS Pings/sec) | System Design #systemdesign #uber #tech #softwareengineering #interview'
    },
    {
        id: 'sd-agent-swarms',
        masterMp4: 'public/system-design-lessons/design-agent-swarms.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-agent-swarms-thumbnail.jpg',
        ytTitle: 'How to Design AI Agent Orchestration & Subagent Swarms (50k Concurrent Trees)',
        ytDescription: `Explore how engineering teams orchestrate 50,000 concurrent AI subagents without infinite loops or runaway token costs using Kafka event-driven state machines, Postgres WAL event sourcing, sub-18ms state rehydration, Redis Redlock tool execution locks, and budget pruning!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #AIAgents #SubagentSwarms #Kafka #EventDriven #SoftwareEngineering #CareerVivid`,
        tiktokCaption: 'How to Design AI Agent Orchestration & Subagent Swarms (50k Swarms) | System Design #systemdesign #ai #agents #tech #interview'
    }
];

async function publishAll() {
    console.log('📡 CLI Publishing 3 System Design Explainer Videos to YouTube & TikTok...\n');

    for (const v of VIDEO_PUBLISH_CONFIGS) {
        const absoluteMp4 = path.resolve(v.masterMp4);
        const absoluteThumb = path.resolve(v.thumbnailJpg);

        if (!fs.existsSync(absoluteMp4)) {
            console.error(`❌ Master MP4 not found: ${absoluteMp4}`);
            continue;
        }

        console.log(`========================================================`);
        console.log(`🚀 Publishing [${v.id}]: "${v.ytTitle}"`);
        console.log(`========================================================\n`);

        // 1. YouTube Upload via CLI
        console.log(`📺 Publishing to YouTube (@CareerVividSystemDesign)...`);
        try {
            const ytOut = execFileSync('node', [
                'scripts/upload-careervivid-youtube-video.mjs',
                '--video', absoluteMp4,
                '--thumbnail', absoluteThumb,
                '--title', v.ytTitle,
                '--description', v.ytDescription
            ], { encoding: 'utf8', cwd: process.cwd() });
            console.log(ytOut);
        } catch (err) {
            console.error(`❌ YouTube Upload Error for ${v.id}:`, err.stdout || err.message);
        }

        // 2. TikTok Upload via CLI (using unified 16:9 master MP4 file)
        console.log(`\n📱 Publishing 16:9 Master Video to TikTok...`);
        try {
            const ttOut = execFileSync('node', [
                'scripts/upload-tiktok-video.mjs',
                '--video', absoluteMp4,
                '--thumbnail', absoluteThumb,
                '--caption', v.tiktokCaption
            ], { encoding: 'utf8', cwd: process.cwd() });
            console.log(ttOut);
        } catch (err) {
            console.error(`❌ TikTok Upload Error for ${v.id}:`, err.stdout || err.message);
        }

        console.log(`\n✅ Finished Publishing Pipeline for [${v.id}]\n`);
    }

    console.log('🎉 ALL 3 SYSTEM DESIGN VIDEOS PUBLISHED TO YOUTUBE & TIKTOK VIA CLI!');
}

publishAll().catch(console.error);
