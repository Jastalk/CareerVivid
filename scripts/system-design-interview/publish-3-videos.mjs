/**
 * publish-3-videos.mjs
 *
 * Publishes 3 System Design Explainer Videos to YouTube (@CareerVividSystemDesign) and TikTok via CLI.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const VIDEO_PUBLISH_CONFIGS = [
    {
        id: 'sd-vector-rag',
        masterMp4: 'public/system-design-lessons/design-vector-rag.mp4',
        shortMp4: 'public/system-design-lessons/design-vector-rag-short.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-vector-rag-thumbnail.jpg',
        ytTitle: 'How to Design Vector DB Index Sharding & Hybrid RAG at Scale (10B Vectors, HNSW & Sub-10ms Latency)',
        ytDescription: `Learn how to design a high-performance 10-Billion Vector DB Index Sharding and Hybrid RAG architecture supporting dense HNSW graph indexing, IVF-PQ 8x compression, and BM25 sparse lexical fusion at 50,000 QPS with sub-10ms p99 latency!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #VectorDB #RAG #AI #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Vector DB Index Sharding & Hybrid RAG (10B Vectors, HNSW & BM25 Fusion) | System Design #systemdesign #rag #ai #softwareengineering #interview'
    },
    {
        id: 'sd-agent-swarms',
        masterMp4: 'public/system-design-lessons/design-agent-swarms.mp4',
        shortMp4: 'public/system-design-lessons/design-agent-swarms-short.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-agent-swarms-thumbnail.jpg',
        ytTitle: 'How to Design AI Agent Orchestration & Subagent Swarms (50k Swarms & Event-Driven State Machines)',
        ytDescription: `Discover how tech leaders orchestrate 50,000 concurrent AI subagent swarms using Kafka event sourcing, Postgres WAL state rehydration in 18ms, and Redis Redlock distributed mutexes to prevent double tool execution and infinite reasoning loops.

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #AIAgents #SubagentSwarms #Kafka #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design AI Agent Swarms & Subagent Fleets (50k Swarms, Redis Redlock & WAL Event Sourcing) | System Design #systemdesign #ai #agent #softwareengineering #tech'
    },
    {
        id: 'sd-gpu-fleet',
        masterMp4: 'public/system-design-lessons/design-gpu-fleet.mp4',
        shortMp4: 'public/system-design-lessons/design-gpu-fleet-short.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-gpu-fleet-thumbnail.jpg',
        ytTitle: 'How to Design GPU Fleet Scheduling & Multi-Tenant Kubernetes Clusters (16k H100 GPUs & 3.2 Tbps NVLink)',
        ytDescription: `Explore how to design a multi-tenant Kubernetes GPU Fleet Operator and Topology-Aware Gang Scheduler for 16,384 H100 GPUs across 3.2 Tbps NVLink/RoCE meshes to hit 94.2% Model Flops Utilization and achieve < 2s spot preemption recovery.

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #GPUFleet #Kubernetes #LLM #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design GPU Fleet Scheduling for 16,000 H100 GPUs (94.2% MFU & NVLink Topology) | System Design #systemdesign #gpu #kubernetes #ai #softwareengineering'
    }
];

async function publishAll() {
    console.log('📡 CLI Publishing 3 System Design Explainer Videos to YouTube & TikTok...\n');

    for (const v of VIDEO_PUBLISH_CONFIGS) {
        console.log(`========================================================`);
        console.log(`🚀 Publishing [${v.id}]: "${v.ytTitle}"`);
        console.log(`========================================================\n`);

        // 1. YouTube Upload via CLI
        console.log(`📺 Publishing to YouTube (@CareerVividSystemDesign)...`);
        try {
            const ytOut = execFileSync('node', [
                'scripts/upload-careervivid-youtube-video.mjs',
                '--video', path.resolve(v.masterMp4),
                '--thumbnail', path.resolve(v.thumbnailJpg),
                '--title', v.ytTitle,
                '--description', v.ytDescription,
            ], { encoding: 'utf8', cwd: process.cwd(), shell: false });
            console.log(ytOut);
        } catch (err) {
            console.error(`❌ YouTube Upload Error for ${v.id}:`, err.message);
        }

        // 2. TikTok Upload via CLI
        console.log(`\n📱 Publishing 9:16 Short to TikTok...`);
        try {
            const ttOut = execFileSync('node', [
                'scripts/upload-tiktok-video.mjs',
                '--video', path.resolve(v.shortMp4),
                '--thumbnail', path.resolve(v.thumbnailJpg),
                '--caption', v.tiktokCaption,
            ], { encoding: 'utf8', cwd: process.cwd(), shell: false });
            console.log(ttOut);
        } catch (err) {
            console.error(`❌ TikTok Upload Error for ${v.id}:`, err.message);
        }

        console.log(`\n✅ Finished Publishing Pipeline for [${v.id}]\n`);
    }

    console.log('🎉 ALL 3 SYSTEM DESIGN VIDEOS PUBLISHED TO YOUTUBE & TIKTOK VIA CLI!');
}

publishAll().catch(console.error);
