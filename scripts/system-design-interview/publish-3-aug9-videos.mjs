/**
 * publish-3-aug9-videos.mjs
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
        ytTitle: 'How to Design YouTube Content ID & Automated Copyright Matching Engine',
        ytDescription: `Learn how engineers design YouTube Content ID to scan 500 hours of video every minute using MinHash Locality-Sensitive Hashing (LSH), spectral audio spectrogram extraction, 256 in-memory LSH shards, and automated claim routing at global scale!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #YouTube #ContentID #Copyright #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design YouTube Content ID Copyright Matching (500 Hrs/Min) | System Design #systemdesign #youtube #tech #softwareengineering #interview'
    },
    {
        id: 'sd-whatsapp-e2ee',
        masterMp4: 'public/system-design-lessons/design-whatsapp-e2ee.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-whatsapp-e2ee-thumbnail.jpg',
        ytTitle: 'How to Design WhatsApp End-to-End Encryption & Signal Protocol Infrastructure',
        ytDescription: `Discover how WhatsApp secures 100 Billion messages daily with zero server decryption using Extended Triple Diffie-Hellman (X3DH) offline key agreement, Double Ratchet AES-256-GCM KDF chains, Forward Secrecy, and out-of-band encrypted media blobs!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #WhatsApp #Security #Cryptography #SignalProtocol #SoftwareEngineering #CareerVivid`,
        tiktokCaption: 'How to Design WhatsApp End-to-End Encryption (100B Msg/Day) | System Design #systemdesign #whatsapp #security #tech #interview'
    },
    {
        id: 'sd-vector-rag',
        masterMp4: 'public/system-design-lessons/design-vector-rag.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-vector-rag-thumbnail.jpg',
        ytTitle: 'How to Design Vector DB Index Sharding & Hybrid RAG at Scale (10B Vectors @ 50k QPS)',
        ytDescription: `Explore how engineers design high-throughput Vector Databases for 10 Billion embeddings delivering sub-10ms hybrid retrieval using HNSW graph indexes, 8x Product Quantization (IVF-PQ), BM25 sparse matching, Reciprocal Rank Fusion (RRF), and cross-encoder reranking!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #VectorDB #AI #RAG #MachineLearning #SoftwareEngineering #CareerVivid`,
        tiktokCaption: 'How to Design Vector DB Index Sharding & Hybrid RAG (10B Vectors) | System Design #systemdesign #ai #rag #tech #interview'
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
