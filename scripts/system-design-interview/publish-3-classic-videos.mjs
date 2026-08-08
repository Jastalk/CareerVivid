/**
 * publish-3-classic-videos.mjs
 *
 * Dedicated robust publisher for 3 Classic System Design Videos:
 *   1. YouTube Live Streaming (sd-ytlive)
 *   2. Uber Dynamic Surge Pricing (sd-ubersurge)
 *   3. Discord Actor Model (sd-discord)
 *
 * Uses execFileSync with argument arrays to avoid shell escaping issues.
 */

import path from 'path';
import { execFileSync } from 'child_process';

const VIDEOS = [
    {
        id: 'sd-ytlive',
        videoPath: path.resolve('public/system-design-lessons/design-youtube-live.mp4'),
        shortPath: path.resolve('public/system-design-lessons/design-ytlive-short.mp4'),
        thumbnailPath: path.resolve('public/system-design-lessons/design-ytlive-thumbnail.jpg'),
        ytTitle: 'How to Design YouTube Live Streaming at Scale (Low-Latency HLS & CDN Origin Shielding)',
        ytDescription: `Explore how to design YouTube Live Streaming at global scale handling 5 Million concurrent viewers with sub-2-second latency using Low-Latency HLS (LL-HLS), RTMP ingest gateways, CDN origin shielding, and decoupled WebSocket chat fan-out.

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #YouTube #LiveStreaming #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design YouTube Live Streaming at Scale (LL-HLS & CDN Origin Shielding) | System Design #systemdesign #youtubelive #softwareengineering #tech'
    },
    {
        id: 'sd-ubersurge',
        videoPath: path.resolve('public/system-design-lessons/design-uber-surge.mp4'),
        shortPath: path.resolve('public/system-design-lessons/design-ubersurge-short.mp4'),
        thumbnailPath: path.resolve('public/system-design-lessons/design-ubersurge-thumbnail.jpg'),
        ytTitle: "How to Design Uber's Dynamic Surge Pricing Engine & Real-Time Heatmaps",
        ytDescription: `Explore how to design Uber Dynamic Surge Pricing balancing driver supply and rider demand using Uber H3 Resolution 8 Hexagonal Spatial Indexing, Apache Flink 10-second sliding event-time windows, Redis quote locking, and anti-spoofing map matching.

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #Uber #SurgePricing #Geospatial #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Uber Dynamic Surge Pricing (H3 Res 8 Hexagons & Apache Flink) | System Design #systemdesign #uber #softwareengineering #techinterview'
    },
    {
        id: 'sd-discord',
        videoPath: path.resolve('public/system-design-lessons/design-discord.mp4'),
        shortPath: path.resolve('public/system-design-lessons/design-discord-short.mp4'),
        thumbnailPath: path.resolve('public/system-design-lessons/design-discord-thumbnail.jpg'),
        ytTitle: 'How to Design Discord (10M Concurrent Voice & Text Channels)',
        ytDescription: `Explore how to design Discord handling 10 Million concurrent voice and text channels using the Erlang/Elixir BEAM Actor Model (2KB process-per-channel), ScyllaDB distributed message store with Snowflake clustering keys, WebRTC SFUs, and CRDT read pointers.

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #Discord #ActorModel #WebRTC #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Discord for 10M Concurrent Channels (BEAM Actor Model & ScyllaDB) | System Design #systemdesign #discord #softwareengineering #tech'
    }
];

async function publishClassicVideos() {
    console.log('📡 CLI Publishing 3 Classic System Design Explainer Videos to YouTube & TikTok...\n');

    for (const v of VIDEOS) {
        console.log(`========================================================`);
        console.log(`🚀 Publishing [${v.id}]: "${v.ytTitle}"`);
        console.log(`========================================================\n`);

        console.log(`📺 Publishing to YouTube (@CareerVividSystemDesign)...`);
        try {
            const ytOut = execFileSync('node', [
                'scripts/upload-careervivid-youtube-video.mjs',
                '--video', v.videoPath,
                '--thumbnail', v.thumbnailPath,
                '--title', v.ytTitle,
                '--description', v.ytDescription
            ], { encoding: 'utf8', cwd: process.cwd() });
            console.log(ytOut);
        } catch (err) {
            console.error(`❌ YouTube Upload Error for ${v.id}:`, err.message);
            if (err.stdout) console.log(err.stdout);
            if (err.stderr) console.error(err.stderr);
        }

        console.log(`\n📱 Publishing 9:16 Short to TikTok...`);
        try {
            const ttOut = execFileSync('node', [
                'scripts/upload-tiktok-video.mjs',
                '--video', v.shortPath,
                '--thumbnail', v.thumbnailPath,
                '--caption', v.tiktokCaption
            ], { encoding: 'utf8', cwd: process.cwd() });
            console.log(ttOut);
        } catch (err) {
            console.error(`❌ TikTok Upload Error for ${v.id}:`, err.message);
            if (err.stdout) console.log(err.stdout);
            if (err.stderr) console.error(err.stderr);
        }

        console.log(`\n✅ Finished Publishing Pipeline for [${v.id}]\n`);
    }

    console.log('🎉 ALL 3 CLASSIC SYSTEM DESIGN VIDEOS PUBLISHED TO YOUTUBE & TIKTOK VIA CLI!');
}

publishClassicVideos().catch(console.error);
