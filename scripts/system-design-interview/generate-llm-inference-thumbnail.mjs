/**
 * generate-llm-inference-thumbnail.mjs
 *
 * Two-Layer Thumbnail Compositor:
 *   Layer 1 (generate_image): Clean background plate ONLY (Zero text / Zero glyphs).
 *   Layer 2 (Playwright DOM): Crisp, bold, real DOM typography composited on top.
 *
 * Output: public/system-design-lessons/design-llm-inference-thumbnail.jpg
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT_THUMBNAIL = path.resolve('public/system-design-lessons/design-llm-inference-thumbnail.jpg');
fs.mkdirSync(path.dirname(OUT_THUMBNAIL), { recursive: true });

async function compositeThumbnail(backgroundPlatePath) {
    console.log('🖼️ Compositing Layer 2 DOM Typography over Layer 1 Background Plate...');
    const plateBuffer = fs.readFileSync(backgroundPlatePath);
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
                background: linear-gradient(180deg, rgba(9, 13, 22, 0.75) 0%, rgba(9, 13, 22, 0.40) 40%, rgba(9, 13, 22, 0.85) 100%);
            }
            .container {
                position: absolute; inset: 0;
                display: flex; flex-direction: column; justify-content: space-between;
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
                font-size: 82px; font-weight: 900; color: #ffffff;
                text-transform: uppercase; line-height: 1.0;
                text-shadow: 0 10px 30px rgba(0,0,0,0.9), 0 0 40px rgba(56, 189, 248, 0.6);
                margin-bottom: 16px; letter-spacing: -1px;
            }
            .sub-title-pill {
                display: inline-block;
                background: rgba(15, 23, 42, 0.92);
                border: 3px solid #38bdf8; color: #38bdf8;
                font-size: 32px; font-weight: 800;
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
            <div class="header-badge">SYSTEM DESIGN INTERVIEW</div>
            <div class="title-box">
                <div class="main-title">LLM INFERENCE<br/>AT SCALE</div>
                <div class="sub-title-pill">PAGEDATTENTION & CONTINUOUS BATCHING</div>
            </div>
            <div class="metrics-bar">
                <div class="metric-card">⚡ 5,000 QPS</div>
                <div class="metric-card">💾 0% MEMORY WASTE</div>
                <div class="metric-card">🚀 5X THROUGHPUT</div>
            </div>
        </div>
    </body>
    </html>
    `;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: OUT_THUMBNAIL, type: 'jpeg', quality: 95 });
    await browser.close();

    console.log(`✅ Two-layer Thumbnail Composited & Saved to: ${OUT_THUMBNAIL}`);
}

export { compositeThumbnail };
