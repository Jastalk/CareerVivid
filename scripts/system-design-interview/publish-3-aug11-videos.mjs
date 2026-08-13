/**
 * publish-3-aug11-videos.mjs
 *
 * Publishes 3 System Design Explainer Videos to YouTube (@CareerVividSystemDesign) and TikTok via CLI.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const VIDEO_PUBLISH_CONFIGS = [
    {
        id: 'sd-yt-contentid',
        masterMp4: 'public/system-design-lessons/design-yt-contentid.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-yt-contentid-thumbnail.jpg',
        ytTitle: 'How to Design YouTube Content ID & Automated Copyright Matching Pipeline',
        ytDescription: `Learn how YouTube scans 500 hours of video uploaded every minute and matches 100 Billion items daily using MinHash Locality-Sensitive Hashing (LSH), 128-bit acoustic & visual fingerprints, sharded in-memory indexes, time-offset histogram alignment, and Kafka claim event streams!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #YouTube #Algorithms #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design YouTube Content ID & Automated Copyright Matching (500 Hrs/Min) | System Design #systemdesign #youtube #tech #softwareengineering #interview'
    },
    {
        id: 'sd-tiktok-gifting',
        masterMp4: 'public/system-design-lessons/design-tiktok-gifting.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-tiktok-gifting-thumbnail.jpg',
        ytTitle: 'How to Design TikTok Live Gifting & Real-Time Leaderboard System',
        ytDescription: `Explore how TikTok handles 500,000 gift transactions per second during viral live streams without database row locking or memory drift! Featuring LMAX Disruptor lock-free ring buffers, Kafka stream partition ordering, Redis Cluster ZSET leaderboard push fleets, and Debezium CDC outbox audit logs!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #TikTok #DistributedSystems #Redis #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design TikTok Live Gifting & Real-Time Leaderboards (500K QPS Peak) | System Design #systemdesign #tiktok #tech #softwareengineering #interview'
    },
    {
        id: 'sd-openai-realtime',
        masterMp4: 'public/system-design-lessons/design-openai-realtime.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-openai-realtime-thumbnail.jpg',
        ytTitle: 'How to Design OpenAI Realtime Voice WebRTC Gateway & Audio Streaming',
        ytDescription: `Discover how OpenAI Realtime achieves sub-280ms voice-to-voice conversation latency using full-duplex WebRTC SFU edge gateways, neural audio tokenization, inline Voice Activity Detection (VAD) hard cancellation buses, and GPU PagedAttention KV-cache prefix reuse!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #OpenAI #WebRTC #VoiceAI #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design OpenAI Realtime Voice WebRTC Gateway (280ms Voice Latency) | System Design #systemdesign #openai #ai #tech #interview'
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
