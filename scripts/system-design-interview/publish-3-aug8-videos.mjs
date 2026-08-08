/**
 * publish-3-aug8-videos.mjs
 *
 * Publishes 3 System Design Explainer Videos to YouTube (@CareerVividSystemDesign) and TikTok via CLI.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const VIDEO_PUBLISH_CONFIGS = [
    {
        id: 'sd-tiktok-gifting',
        masterMp4: 'public/system-design-lessons/design-tiktok-gifting.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-tiktok-gifting-thumbnail.jpg',
        ytTitle: 'How to Design TikTok Live Gifting & Real-Time Leaderboards (500K QPS & LMAX Ring Buffers)',
        ytDescription: `Learn how engineers design TikTok Live Gifting & Real-Time Leaderboards to process half a million QPS without database locks using LMAX Disruptor ring buffers, partition-keyed Kafka streaming, Redis Cluster Sorted Sets (ZSET), and WebSocket push gateways!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #TikTok #HighConcurrency #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design TikTok Live Gifting Engine (500k QPS & LMAX Ring Buffers) | System Design #systemdesign #tiktok #tech #softwareengineering #interview'
    },
    {
        id: 'sd-openai-realtime',
        masterMp4: 'public/system-design-lessons/design-openai-realtime.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-openai-realtime-thumbnail.jpg',
        ytTitle: 'How to Design OpenAI Realtime Voice WebRTC Gateway & Audio Streaming Architecture',
        ytDescription: `Discover how AI engineers build OpenAI Realtime Voice Infrastructure for 280ms end-to-end speech latency using WebRTC SFU edge gateways, continuous neural audio tokenization, inline Voice Activity Detection (VAD) truncation, and Packet Loss Concealment (PLC)!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #OpenAI #WebRTC #VoiceAI #SoftwareEngineering #CareerVivid`,
        tiktokCaption: 'How to Design OpenAI Realtime Voice WebRTC Gateway (280ms Latency) | System Design #systemdesign #openai #ai #tech #interview'
    },
    {
        id: 'sd-uber-h3',
        masterMp4: 'public/system-design-lessons/design-uber-h3.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-uber-h3-thumbnail.jpg',
        ytTitle: 'How to Design Uber H3 Hexagonal Geospatial Indexing & Dynamic Surge Heatmaps',
        ytDescription: `Explore how Uber handles millions of GPS updates per second using Uber H3 discrete global hexagonal grids (64-bit uint indexes), equidistant spatial neighbor traversal, sharded Redis supply-demand counters, and multi-resolution parent cell surge smoothing!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #Uber #Geospatial #UberH3 #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Uber H3 Hexagonal Geospatial Indexing & Dynamic Surge | System Design #systemdesign #uber #tech #geospatial #interview'
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
