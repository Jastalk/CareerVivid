/**
 * render-commercial-frames.mjs
 *
 * Renders 60 FPS frame sequence for CareerVivid GitHub-Style Commercial Timeline.
 * HTML: public/commercial-videos/careervivid-github-style/commercial_timeline.html
 * Frames: public/commercial-videos/careervivid-github-style/frames/f%05d.png
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const FPS = 60;
const DURATION_SEC = 37.0;
const TOTAL_FRAMES = Math.ceil(FPS * DURATION_SEC);

const HTML_PATH = path.resolve('public/commercial-videos/careervivid-github-style/commercial_timeline.html');
const FRAMES_DIR = path.resolve('public/commercial-videos/careervivid-github-style/frames');

fs.mkdirSync(FRAMES_DIR, { recursive: true });

async function renderFrames() {
    console.log(`🎬 Rendering 60 FPS Frame Sequence (${TOTAL_FRAMES} frames, ${DURATION_SEC}s)...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    await page.goto(`file://${HTML_PATH}`, { waitUntil: 'load' });

    for (let f = 0; f < TOTAL_FRAMES; f++) {
        const currentTimeSec = f / FPS;
        await page.evaluate((t) => window.setTimelineTime(t), currentTimeSec);

        const framePath = path.join(FRAMES_DIR, `f${String(f).padStart(5, '0')}.png`);
        await page.screenshot({ path: framePath, type: 'png', timeout: 0 });

        if (f % 300 === 0 || f === TOTAL_FRAMES - 1) {
            console.log(`   📸 Rendered frame [${f + 1}/${TOTAL_FRAMES}] (${((f / TOTAL_FRAMES) * 100).toFixed(1)}%)...`);
        }
    }

    await browser.close();
    console.log('🎉 ALL 60 FPS COMMERCIAL FRAMES RENDERED SUCCESSFULLY!');
}

renderFrames().catch(console.error);
