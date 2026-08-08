/**
 * publish-gpu-fleet.mjs
 *
 * Dedicated robust publisher for Video 3 (GPU Fleet Scheduling)
 * Uses execFile with argument arrays to avoid shell escaping issues with `<` and quotes.
 */

import path from 'path';
import { execFileSync } from 'child_process';

const videoPath = path.resolve('public/system-design-lessons/design-gpu-fleet.mp4');
const shortPath = path.resolve('public/system-design-lessons/design-gpu-fleet-short.mp4');
const thumbnailPath = path.resolve('public/system-design-lessons/design-gpu-fleet-thumbnail.jpg');

const ytTitle = 'How to Design GPU Fleet Scheduling & Multi-Tenant Kubernetes Clusters (16k H100 GPUs)';

const ytDescription = `Explore how to design a multi-tenant Kubernetes GPU Fleet Operator and Topology-Aware Gang Scheduler for 16,384 H100 GPUs across 3.2 Tbps NVLink/RoCE meshes to hit 94.2% Model Flops Utilization and achieve sub-2s spot preemption recovery.

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #GPUFleet #Kubernetes #LLM #SoftwareEngineering #TechInterview #CareerVivid`;

const tiktokCaption = 'How to Design GPU Fleet Scheduling for 16,000 H100 GPUs (94.2% MFU & NVLink Topology) | System Design #systemdesign #gpu #kubernetes #ai #softwareengineering';

async function publishGpuFleet() {
    console.log('📺 Publishing Video 3 to YouTube (@CareerVividSystemDesign)...');
    try {
        const ytOut = execFileSync('node', [
            'scripts/upload-careervivid-youtube-video.mjs',
            '--video', videoPath,
            '--thumbnail', thumbnailPath,
            '--title', ytTitle,
            '--description', ytDescription
        ], { encoding: 'utf8', cwd: process.cwd() });
        console.log(ytOut);
    } catch (err) {
        console.error('❌ YouTube Upload Error:', err.message);
        if (err.stdout) console.log(err.stdout);
        if (err.stderr) console.error(err.stderr);
    }

    console.log('\n📱 Publishing Video 3 9:16 Short to TikTok...');
    try {
        const ttOut = execFileSync('node', [
            'scripts/upload-tiktok-video.mjs',
            '--video', shortPath,
            '--thumbnail', thumbnailPath,
            '--caption', tiktokCaption
        ], { encoding: 'utf8', cwd: process.cwd() });
        console.log(ttOut);
    } catch (err) {
        console.error('❌ TikTok Upload Error:', err.message);
        if (err.stdout) console.log(err.stdout);
        if (err.stderr) console.error(err.stderr);
    }

    console.log('\n🎉 Video 3 Publishing Completed Successfully!');
}

publishGpuFleet().catch(console.error);
