/**
 * generate-3-aug11-thumbnails.mjs
 *
 * Composites Layer 1 background plates with Layer 2 Playwright DOM typography:
 *   1. YT Content ID -> public/system-design-lessons/design-yt-contentid-thumbnail.jpg
 *   2. TikTok Gifting -> public/system-design-lessons/design-tiktok-gifting-thumbnail.jpg
 *   3. OpenAI Realtime -> public/system-design-lessons/design-openai-realtime-thumbnail.jpg
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const THUMBNAILS = [
    {
        id: 'sd-yt-contentid',
        platePath: path.resolve('/Users/jiawenzhu/.gemini/antigravity/brain/fce25a4b-b0bf-42c4-a911-81a3ce73e2cd/sd_yt_contentid_plate_1786457803828.jpg'),
        outPath: path.resolve('public/system-design-lessons/design-yt-contentid-thumbnail.jpg'),
        badge: 'YOUTUBE CONTENT ID ARCHITECTURE',
        titleLine1: 'MINHASH LSH FINGERPRINTING ENGINE',
        titleLine2: 'SUB-100MS RECALL ACROSS 100M TRACKS',
        metric: '500 HOURS UPLOAD / MIN'
    },
    {
        id: 'sd-tiktok-gifting',
        platePath: path.resolve('/Users/jiawenzhu/.gemini/antigravity/brain/fce25a4b-b0bf-42c4-a911-81a3ce73e2cd/sd_tiktok_gifting_plate_1786457814661.jpg'),
        outPath: path.resolve('public/system-design-lessons/design-tiktok-gifting-thumbnail.jpg'),
        badge: 'TIKTOK LIVE GIFTING ENGINE',
        titleLine1: 'LMAX DISRUPTOR & KAFKA SWARMS',
        titleLine2: 'SUB-50MS REDIS ZSET LEADERBOARD',
        metric: '500K GIFTS / SEC PEAK'
    },
    {
        id: 'sd-openai-realtime',
        platePath: path.resolve('/Users/jiawenzhu/.gemini/antigravity/brain/fce25a4b-b0bf-42c4-a911-81a3ce73e2cd/sd_openai_realtime_plate_1786457824863.jpg'),
        outPath: path.resolve('public/system-design-lessons/design-openai-realtime-thumbnail.jpg'),
        badge: 'OPENAI REALTIME VOICE ARCHITECTURE',
        titleLine1: 'WEBRTC MEDIA GATEWAY & NEURAL VAD',
        titleLine2: 'SUB-280MS VOICE-TO-VOICE LATENCY',
        metric: '100K CONCURRENT STREAMS'
    }
];

async function generateThumbnails() {
    console.log('🎨 Compositing 16:9 High-CTR Thumbnails for 3 Aug 11 Topics...\n');
    const browser = await chromium.launch();

    for (const t of THUMBNAILS) {
        console.log(`🖼️ Compositing thumbnail for [${t.id}]...`);
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });

        const base64Plate = fs.readFileSync(t.platePath).toString('base64');
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&family=JetBrains+Mono:wght@800&display=swap');
                body {
                    margin: 0;
                    padding: 0;
                    width: 1920px;
                    height: 1080px;
                    background: url('data:image/jpeg;base64,${base64Plate}') center/cover no-repeat;
                    font-family: 'Inter', sans-serif;
                    position: relative;
                    overflow: hidden;
                }
                .overlay-gradient {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(9, 13, 22, 0.88) 0%, rgba(9, 13, 22, 0.45) 50%, rgba(9, 13, 22, 0.82) 100%);
                }
                .content-box {
                    position: absolute;
                    left: 90px;
                    top: 100px;
                    bottom: 100px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    z-index: 10;
                    max-width: 1150px;
                }
                .badge {
                    display: inline-flex;
                    align-items: center;
                    background: #e11d48;
                    color: #ffffff;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 28px;
                    font-weight: 800;
                    padding: 12px 28px;
                    border-radius: 8px;
                    letter-spacing: 2px;
                    box-shadow: 0 8px 24px rgba(225, 29, 72, 0.5);
                    width: fit-content;
                }
                .title-container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .title-line {
                    font-size: 66px;
                    font-weight: 900;
                    color: #ffffff;
                    text-transform: uppercase;
                    line-height: 1.1;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 0, 0, 0.8);
                    letter-spacing: -1px;
                }
                .highlight {
                    color: #fbbf24;
                    background: rgba(0, 0, 0, 0.75);
                    padding: 4px 16px;
                    border-radius: 6px;
                    border-left: 8px solid #fbbf24;
                }
                .metric-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 14px;
                    background: rgba(15, 23, 42, 0.92);
                    border: 3px solid #38bdf8;
                    color: #38bdf8;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 32px;
                    font-weight: 800;
                    padding: 14px 32px;
                    border-radius: 50px;
                    box-shadow: 0 10px 30px rgba(56, 189, 248, 0.4);
                    width: fit-content;
                }
            </style>
        </head>
        <body>
            <div class="overlay-gradient"></div>
            <div class="content-box">
                <div class="badge">SYSTEM DESIGN • ${t.badge}</div>
                <div class="title-container">
                    <div class="title-line">${t.titleLine1}</div>
                    <div class="title-line highlight">${t.titleLine2}</div>
                </div>
                <div class="metric-pill">⚡ SCALE: ${t.metric}</div>
            </div>
        </body>
        </html>
        `;

        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.screenshot({ path: t.outPath, type: 'jpeg', quality: 95 });
        await page.close();

        console.log(`   ✅ Saved 16:9 Thumbnail: ${t.outPath} (${(fs.statSync(t.outPath).size / 1024).toFixed(1)} KB)`);
    }

    await browser.close();
    console.log('\n🎉 ALL 3 HIGH-CTR THUMBNAILS GENERATED SUCCESSFULLY!');
}

generateThumbnails().catch(console.error);
