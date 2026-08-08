/**
 * generate-3-fresh-thumbnails.mjs
 *
 * Composites Layer 1 background plates with Layer 2 Playwright DOM typography:
 *   1. YouTube Content ID -> public/system-design-lessons/design-ytcontentid-thumbnail.jpg
 *   2. WhatsApp E2EE -> public/system-design-lessons/design-whatsapp-e2ee-thumbnail.jpg
 *   3. Instagram Feed Ranking -> public/system-design-lessons/design-insta-feed-thumbnail.jpg
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const THUMBNAILS = [
    {
        id: 'sd-ytcontentid',
        platePath: path.resolve('/Users/jiawenzhu/.gemini/antigravity/brain/6b16172c-9d86-469a-bda7-950d72c455c5/sd_ytcontentid_bg_plate_1786002359375.jpg'),
        outPath: path.resolve('public/system-design-lessons/design-ytcontentid-thumbnail.jpg'),
        badge: 'YOUTUBE CONTENT ID',
        titleLine1: 'MINHASH LSH & SPECTRAL',
        titleLine2: 'COPYRIGHT MATCHING',
        metric: '500 HRS/MIN SCAN'
    },
    {
        id: 'sd-whatsapp-e2ee',
        platePath: path.resolve('/Users/jiawenzhu/.gemini/antigravity/brain/6b16172c-9d86-469a-bda7-950d72c455c5/sd_whatsapp_e2ee_bg_plate_1786002368892.jpg'),
        outPath: path.resolve('public/system-design-lessons/design-whatsapp-e2ee-thumbnail.jpg'),
        badge: 'WHATSAPP E2EE ARCHITECTURE',
        titleLine1: 'SIGNAL PROTOCOL & X3DH',
        titleLine2: 'DOUBLE RATCHET KEYS',
        metric: '100B MSG/DAY'
    },
    {
        id: 'sd-insta-feed',
        platePath: path.resolve('/Users/jiawenzhu/.gemini/antigravity/brain/6b16172c-9d86-469a-bda7-950d72c455c5/sd_insta_feed_bg_plate_1786002379958.jpg'),
        outPath: path.resolve('public/system-design-lessons/design-insta-feed-thumbnail.jpg'),
        badge: 'INSTAGRAM FEED RANKING',
        titleLine1: 'TWO-STAGE CANDIDATE RECALL',
        titleLine2: 'DLRM NEURAL RANKER',
        metric: '2M RANKING QPS'
    }
];

async function generateThumbnails() {
    console.log('🎨 Compositing 16:9 High-CTR Thumbnails for 3 Fresh Topics...\n');
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
                    background: linear-gradient(135deg, rgba(9, 13, 22, 0.85) 0%, rgba(9, 13, 22, 0.4) 50%, rgba(9, 13, 22, 0.8) 100%);
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
                    max-width: 1100px;
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
                    font-size: 68px;
                    font-weight: 900;
                    color: #ffffff;
                    text-transform: uppercase;
                    line-height: 1.1;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 0, 0, 0.8);
                    letter-spacing: -1px;
                }
                .highlight {
                    color: #fbbf24;
                    background: rgba(0, 0, 0, 0.7);
                    padding: 4px 16px;
                    border-radius: 6px;
                    border-left: 8px solid #fbbf24;
                }
                .metric-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 14px;
                    background: rgba(15, 23, 42, 0.9);
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
