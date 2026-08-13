/**
 * Paint over account email addresses in product screenshots.
 *
 * These go into a public repository, and git history keeps whatever ships even
 * if a later commit replaces the image. Names stay — they read as product data
 * in a resume preview. Email addresses do not: they are the part that gets
 * scraped, and there is no reason for one to be in a README.
 *
 * Uses Playwright as the image editor because the repo has no sharp or
 * ImageMagick, and adding an image dependency to blank out two rectangles would
 * be a poor trade.
 *
 * Regions are in the PNG's own pixel space. Re-measure them if a screenshot is
 * retaken at a different size — a stale rectangle silently masks the wrong
 * thing, so each run reports what it painted.
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'docs', 'screenshots');

const JOBS = [
    {
        file: 'app-dashboard.png',
        // Sidebar account block, bottom left.
        regions: [{ x: 20, y: 1520, w: 490, h: 100, fill: '#fdfcf9' }],
    },
    {
        file: 'app-resume-editor.png',
        // The address line inside the rendered resume preview.
        regions: [{ x: 1108, y: 566, w: 210, h: 34, fill: '#ffffff' }],
    },
];

const run = async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    for (const job of JOBS) {
        const file = path.join(DIR, job.file);
        const b64 = readFileSync(file).toString('base64');

        const out = await page.evaluate(async ({ b64, regions }) => {
            const img = new Image();
            img.src = 'data:image/png;base64,' + b64;
            await img.decode();

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            for (const r of regions) {
                ctx.fillStyle = r.fill;
                ctx.fillRect(r.x, r.y, r.w, r.h);
            }
            return {
                data: canvas.toDataURL('image/png').split(',')[1],
                width: canvas.width,
                height: canvas.height,
            };
        }, { b64, regions: job.regions });

        writeFileSync(file, Buffer.from(out.data, 'base64'));
        process.stdout.write(`${job.file.padEnd(26)} ${out.width}x${out.height}  masked ${job.regions.length} region(s)\n`);
    }

    await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
