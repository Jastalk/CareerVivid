/**
 * publish-3-fresh-videos.mjs
 *
 * Publishes 3 System Design Explainer Videos to YouTube (@CareerVividSystemDesign) and TikTok via CLI.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const VIDEO_PUBLISH_CONFIGS = [
    {
        id: 'sd-ytcontentid',
        masterMp4: 'public/system-design-lessons/design-ytcontentid.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-ytcontentid-thumbnail.jpg',
        ytTitle: 'How to Design YouTube Content ID & Automated Copyright Matching (MinHash LSH & 100B Matches/Day)',
        ytDescription: `Learn how engineers design YouTube Content ID to scan 500 hours of uploaded video per minute using 128-bit MinHash Locality-Sensitive Hashing, 256-shard LSH indexing, and time-offset histogram matching at sub-100ms latency across 100M reference tracks!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #YouTube #ContentID #MinHash #LSH #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design YouTube Content ID (MinHash LSH & Audio Fingerprinting) | System Design #systemdesign #youtube #tech #softwareengineering #interview'
    },
    {
        id: 'sd-whatsapp-e2ee',
        masterMp4: 'public/system-design-lessons/design-whatsapp-e2ee.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-whatsapp-e2ee-thumbnail.jpg',
        ytTitle: 'How to Design WhatsApp End-to-End Encryption & Signal Protocol (X3DH & Double Ratchet)',
        ytDescription: `Discover how WhatsApp secures 100 Billion daily messages for 2 Billion users using the Signal Protocol, Extended Triple Diffie-Hellman (X3DH) offline key agreement, and the Double Ratchet key chain with zero server decryption overhead!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #WhatsApp #Encryption #SignalProtocol #DoubleRatchet #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design WhatsApp End-to-End Encryption (Signal Protocol & Double Ratchet) | System Design #systemdesign #whatsapp #security #encryption #tech'
    },
    {
        id: 'sd-insta-feed',
        masterMp4: 'public/system-design-lessons/design-insta-feed.mp4',
        thumbnailJpg: 'public/system-design-lessons/design-insta-feed-thumbnail.jpg',
        ytTitle: 'How to Design Instagram Feed Ranking & Recommendation Engine (Two-Stage Recall & DLRM Ranker)',
        ytDescription: `Explore how Instagram ranks and delivers personalized post and reel feeds for 500 Million daily active users at 2 Million QPS with sub-180ms p99 latency using Two-Stage Candidate Retrieval, Real-Time Redis/Cassandra Feature Stores, and DLRM GPU Scoring!

🚀 Master System Design & Land Top Tech Offers:

System Design Learning:
https://careervivid.app/learning/system-design-interview

Coding for Beginners:
https://careervivid.app/learning/coding-interview-patterns

300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #Instagram #Recommendation #DLRM #AI #SoftwareEngineering #TechInterview #CareerVivid`,
        tiktokCaption: 'How to Design Instagram Feed Ranking Engine (Candidate Recall & DLRM Neural Ranker) | System Design #systemdesign #instagram #ai #softwareengineering #interview'
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
        const ytCmd = `node scripts/upload-careervivid-youtube-video.mjs --video "${absoluteMp4}" --thumbnail "${absoluteThumb}" --title "${v.ytTitle.replace(/"/g, '\\"')}" --description "${v.ytDescription.replace(/"/g, '\\"')}"`;
        try {
            const ytOut = execSync(ytCmd, { encoding: 'utf8', cwd: process.cwd() });
            console.log(ytOut);
        } catch (err) {
            console.error(`❌ YouTube Upload Error for ${v.id}:`, err.message);
        }

        // 2. TikTok Upload via CLI (using unified 16:9 master MP4 file)
        console.log(`\n📱 Publishing 16:9 Master Video to TikTok...`);
        const tiktokCmd = `node scripts/upload-tiktok-video.mjs --video "${absoluteMp4}" --thumbnail "${absoluteThumb}" --caption "${v.tiktokCaption.replace(/"/g, '\\"')}"`;
        try {
            const ttOut = execSync(tiktokCmd, { encoding: 'utf8', cwd: process.cwd() });
            console.log(ttOut);
        } catch (err) {
            console.error(`❌ TikTok Upload Error for ${v.id}:`, err.message);
        }

        console.log(`\n✅ Finished Publishing Pipeline for [${v.id}]\n`);
    }

    console.log('🎉 ALL 3 SYSTEM DESIGN VIDEOS PUBLISHED TO YOUTUBE & TIKTOK VIA CLI!');
}

publishAll().catch(console.error);
