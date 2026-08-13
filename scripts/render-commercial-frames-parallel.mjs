/**
 * render-commercial-frames-parallel.mjs
 *
 * Multi-worker 60 FPS frame sequence renderer for CareerVivid Commercial.
 * Splits 2220 frames across 4 Playwright workers running in parallel.
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const FPS = 60;
const DURATION_SEC = 37.0;
const TOTAL_FRAMES = Math.ceil(FPS * DURATION_SEC);
const WORKERS = 4;

const HTML_PATH = path.resolve('public/commercial-videos/careervivid-github-style/commercial_timeline.html');
const FRAMES_DIR = path.resolve('public/commercial-videos/careervivid-github-style/frames');

fs.mkdirSync(FRAMES_DIR, { recursive: true });

async function renderWorker(workerId, startFrame, endFrame) {
    console.log(`🚀 Worker ${workerId} starting: frames ${startFrame} -> ${endFrame}...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    await page.goto(`file://${HTML_PATH}`, { waitUntil: 'load' });

    for (let f = startFrame; f < endFrame; f++) {
        const currentTimeSec = f / FPS;
        await page.evaluate((t) => window.setTimelineTime(t), currentTimeSec);

        const framePath = path.join(FRAMES_DIR, `f${String(f).padStart(5, '0')}.png`);
        await page.screenshot({ path: framePath, type: 'png', timeout: 0 });
    }

    await browser.close();
    console.log(`✅ Worker ${workerId} finished frames ${startFrame} -> ${endFrame}`);
}

async function main() {
    console.log(`⚡ Parallel 60 FPS Frame Renderer starting (${WORKERS} workers, ${TOTAL_FRAMES} frames total)...`);
    const chunkSize = Math.ceil(TOTAL_FRAMES / WORKERS);
    const tasks = [];

    for (let w = 0; w < WORKERS; w++) {
        const start = w * chunkSize;
        const end = Math.min((w + 1) * chunkSize, TOTAL_FRAMES);
        tasks.push(renderWorker(w + 1, start, end));
    }

    await Promise.all(tasks);
    console.log('🎉 ALL 2,220 COMMERCIAL FRAMES RENDERED IN PARALLEL SUCCESSFULLY!');
}

main().catch(console.error);
