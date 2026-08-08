/**
 * publish-3-aug7-videos.mjs
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
        ytTitle: 'How to Design Discord Real-Time Voice Engine & SFU Fleet (WebRTC & 15M Channels)',
        ytDescription: `Learn how engineers design Discord Real-Time Voice Infrastructure to handle 15 Million active voice channels at sub-30ms global audio latency using WebRTC Selective Forwarding Units (SFUs), C++ lock-free ring-buffer packet fan-out, and Anycast UDP edge routing!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #Discord #WebRTC #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Discord Real-Time Voice Engine & SFU Fleet | System Design #systemdesign #discord #webrtc #tech #interview'
    },
    {
        id: 'sd-uber-dispatch',
        masterMp4: 'public/system-design-lessons/design-uber-dispatch.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-uber-dispatch-thumbnail.jpg',
        ytTitle: 'How to Design Uber Driver Dispatch & Matching Engine (Hungarian Algorithm & 2M QPS)',
        ytDescription: `Discover how Uber matches millions of riders with nearby drivers in sub-100ms time while ingesting 2 Million location pings per second using the Bilateral Hungarian Matching Algorithm, Ringpop consistent hashing, Redis H3 spatial indexes, and Contraction Hierarchies ETA routing!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #Uber #DriverDispatch #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Uber Driver Dispatch Engine (Bilateral Hungarian Matching) | System Design #systemdesign #uber #tech #softwareengineering #interview'
    },
    {
        id: 'sd-veo-pipeline',
        masterMp4: 'public/system-design-lessons/design-veo-pipeline.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-veo-pipeline-thumbnail.jpg',
        ytTitle: 'How to Design Generative Video AI Pipelines (DiT, 3D VAE & Ring Attention)',
        ytDescription: `Explore how AI engineers design Generative Video Infrastructure (Sora & Veo) to produce photorealistic 1080p 60 FPS video at 3.2 tokens/sec using Diffusion Transformers (DiT), 3D Spatial-Temporal VAE Compression (96% VRAM reduction), and 64-GPU Ring Attention Sequence Parallelism!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #GenerativeAI #VideoAI #DiffusionTransformer #RingAttention #SoftwareEngineering #CareerVivid`,
        tiktokCaption: 'How to Design Generative Video AI Pipelines (Diffusion Transformers & Ring Attention) | System Design #systemdesign #ai #generativeai #tech #interview'
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
