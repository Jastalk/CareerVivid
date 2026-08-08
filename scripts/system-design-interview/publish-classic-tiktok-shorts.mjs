/**
 * publish-classic-tiktok-shorts.mjs
 *
 * Dedicated publisher for Uber Surge & Discord TikTok Shorts
 */

import path from 'path';
import { execFileSync } from 'child_process';

const TIKTOK_SHORTS = [
    {
        id: 'sd-ubersurge',
        videoPath: path.resolve('public/system-design-lessons/design-ubersurge-short.mp4'),
        thumbnailPath: path.resolve('public/system-design-lessons/design-ubersurge-thumbnail.jpg'),
        caption: 'How to Design Uber Dynamic Surge Pricing (H3 Res 8 Hexagons and Apache Flink) | System Design #systemdesign #uber #softwareengineering #techinterview'
    },
    {
        id: 'sd-discord',
        videoPath: path.resolve('public/system-design-lessons/design-discord-short.mp4'),
        thumbnailPath: path.resolve('public/system-design-lessons/design-discord-thumbnail.jpg'),
        caption: 'How to Design Discord for 10M Concurrent Channels (BEAM Actor Model and ScyllaDB) | System Design #systemdesign #discord #softwareengineering #tech'
    }
];

async function publishTikTokShorts() {
    console.log('📱 Publishing Classic TikTok Shorts for Uber Surge & Discord...\n');

    for (const item of TIKTOK_SHORTS) {
        console.log(`🚀 Publishing TikTok Short for [${item.id}]...`);
        try {
            const out = execFileSync('node', [
                'scripts/upload-tiktok-video.mjs',
                '--video', item.videoPath,
                '--thumbnail', item.thumbnailPath,
                '--caption', item.caption
            ], { encoding: 'utf8', cwd: process.cwd() });
            console.log(out);
            console.log(`✅ [SUCCESS] TikTok Short published for ${item.id}\n`);
        } catch (err) {
            console.error(`❌ TikTok Upload Error for ${item.id}:`, err.message);
            if (err.stdout) console.log(err.stdout);
            if (err.stderr) console.error(err.stderr);
        }
    }

    console.log('🎉 ALL CLASSIC TIKTOK SHORTS PUBLISHED LIVE!');
}

publishTikTokShorts().catch(console.error);
