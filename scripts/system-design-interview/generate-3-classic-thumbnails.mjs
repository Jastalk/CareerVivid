/**
 * generate-3-classic-thumbnails.mjs
 *
 * Two-Layer Thumbnail Compositor for 3 Classic System Design Videos:
 *   1. YouTube Live Streaming (design-ytlive-thumbnail.jpg)
 *   2. Uber Surge Pricing (design-ubersurge-thumbnail.jpg)
 *   3. Discord Actor Model (design-discord-thumbnail.jpg)
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const THUMBNAILS_CONFIG = [
    {
        id: 'sd-ytlive',
        platePath: '/Users/jiawenzhu/.gemini/antigravity/brain/6b16172c-9d86-469a-bda7-950d72c455c5/sd_ytlive_classic_bg_plate_1785943036463.jpg',
        outJpg: path.resolve('public/system-design-lessons/design-ytlive-thumbnail.jpg'),
        badge: 'SYSTEM DESIGN INTERVIEW',
        mainTitle: 'YOUTUBE LIVE<br/>LOW-LATENCY STREAMING',
        subTitle: 'LL-HLS 200MS CHUNKS & CDN ORIGIN SHIELDING',
        metrics: ['⚡ 5M BROADCAST', '⏱️ sub-2s LATENCY', '🛡️ ORIGIN SHIELD']
    },
    {
        id: 'sd-ubersurge',
        platePath: '/Users/jiawenzhu/.gemini/antigravity/brain/6b16172c-9d86-469a-bda7-950d72c455c5/sd_ubersurge_classic_bg_plate_1785943053309.jpg',
        outJpg: path.resolve('public/system-design-lessons/design-ubersurge-thumbnail.jpg'),
        badge: 'SYSTEM DESIGN INTERVIEW',
        mainTitle: 'UBER DYNAMIC SURGE<br/>REAL-TIME HEATMAPS',
        subTitle: 'H3 RES 8 HEXAGONS & APACHE FLINK SLIDING WINDOWS',
        metrics: ['🚕 1M EVENT/SEC', '⏱️ sub-sec FARES', '🛑 ANTI-SPOOFING']
    },
    {
        id: 'sd-discord',
        platePath: '/Users/jiawenzhu/.gemini/antigravity/brain/6b16172c-9d86-469a-bda7-950d72c455c5/sd_discord_classic_bg_plate_1785943069857.jpg',
        outJpg: path.resolve('public/system-design-lessons/design-discord-thumbnail.jpg'),
        badge: 'SYSTEM DESIGN INTERVIEW',
        mainTitle: 'DISCORD MESSAGING<br/>10M CHANNELS AT SCALE',
        subTitle: 'ERLANG BEAM ACTOR MODEL & SCYLLADB STORE',
        metrics: ['💬 200M USERS', '⚡ 2KB / PROCESS', '🎙️ WEBRTC SFU']
    }
];

async function compositeThumbnails() {
    console.log('🖼️ Compositing Two-Layer Thumbnails for 3 Classic Videos...\n');
    const browser = await chromium.launch({ headless: true });

    for (const t of THUMBNAILS_CONFIG) {
        console.log(`🎨 Compositing Layer 2 DOM Typography over Layer 1 for [${t.id}]...`);
        const plateBuffer = fs.readFileSync(t.platePath);
        const plateBase64 = plateBuffer.toString('base64');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    width: 1920px; height: 1080px;
                    background-image: url('data:image/jpeg;base64,${plateBase64}');
                    background-size: cover; background-position: center;
                    font-family: -apple-system, BlinkMacSystemFont, "Montserrat", "Arial Black", sans-serif;
                    position: relative; overflow: hidden;
                }
                .overlay-shade {
                    position: absolute; inset: 0;
                    background: linear-gradient(180deg, rgba(9, 13, 22, 0.80) 0%, rgba(9, 13, 22, 0.45) 40%, rgba(9, 13, 22, 0.88) 100%);
                }
                .container {
                    position: absolute; inset: 0;
                    display: flex; flex-direction: column; justify-space: space-between;
                    padding: 60px 80px; z-index: 10;
                }
                .header-badge {
                    align-self: flex-start;
                    background: linear-gradient(90deg, #ef4444, #f59e0b);
                    color: #ffffff; font-size: 24px; font-weight: 900;
                    padding: 10px 24px; border-radius: 14px;
                    letter-spacing: 1.5px; text-transform: uppercase;
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5);
                }
                .title-box {
                    margin-top: auto; margin-bottom: 20px;
                }
                .main-title {
                    font-size: 80px; font-weight: 900; color: #ffffff;
                    text-transform: uppercase; line-height: 1.0;
                    text-shadow: 0 10px 30px rgba(0,0,0,0.9), 0 0 40px rgba(56, 189, 248, 0.6);
                    margin-bottom: 16px; letter-spacing: -1px;
                }
                .sub-title-pill {
                    display: inline-block;
                    background: rgba(15, 23, 42, 0.92);
                    border: 3px solid #38bdf8; color: #38bdf8;
                    font-size: 30px; font-weight: 800;
                    padding: 12px 30px; border-radius: 20px;
                    box-shadow: 0 12px 30px rgba(0,0,0,0.8);
                }
                .metrics-bar {
                    display: flex; gap: 24px; align-items: center;
                }
                .metric-card {
                    background: rgba(15, 23, 42, 0.92);
                    border: 2px solid #10b981; color: #34d399;
                    font-size: 24px; font-weight: 800;
                    padding: 12px 28px; border-radius: 16px;
                    backdrop-filter: blur(10px);
                }
            </style>
        </head>
        <body>
            <div class="overlay-shade"></div>
            <div class="container">
                <div class="header-badge">${t.badge}</div>
                <div class="title-box">
                    <div class="main-title">${t.mainTitle}</div>
                    <div class="sub-title-pill">${t.subTitle}</div>
                </div>
                <div class="metrics-bar">
                    ${t.metrics.map(m => `<div class="metric-card">${m}</div>`).join('')}
                </div>
            </div>
        </body>
        </html>
        `;

        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        await page.setContent(html, { waitUntil: 'load' });
        fs.mkdirSync(path.dirname(t.outJpg), { recursive: true });
        await page.screenshot({ path: t.outJpg, type: 'jpeg', quality: 95 });
        await page.close();

        console.log(`   ✅ Thumbnail Saved: ${t.outJpg}`);
    }

    await browser.close();
    console.log('\n🎉 All 3 Classic Two-Layer Thumbnails Composited Successfully!');
}

compositeThumbnails().catch(console.error);
