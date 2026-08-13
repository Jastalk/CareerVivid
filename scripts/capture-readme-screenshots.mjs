/**
 * Refresh the product screenshots the README embeds.
 *
 * They were all captured by hand on one day and then went a month stale — the
 * README showed a product that no longer existed. A script makes refreshing
 * them a command rather than an afternoon, so they can be redone whenever the
 * UI moves.
 *
 * Public pages only. Signed-in surfaces would need credentials and would put
 * one person's real resumes and job matches into a public repository.
 *
 * Usage:
 *   node scripts/capture-readme-screenshots.mjs             # production
 *   node scripts/capture-readme-screenshots.mjs http://localhost:3001
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'https://careervivid.app';
const OUT = path.join(process.cwd(), 'docs', 'screenshots');

/** `fullPage` only where the whole page is the point; otherwise the fold. */
const SHOTS = [
    { file: 'resume-builder.png', path: '/resume-builder', fullPage: false },
    { file: 'resume-templates.png', path: '/resume-builder#templates', fullPage: false, scrollTo: '#templates' },
    { file: 'public-jobs.png', path: '/jobs', fullPage: false },
    { file: 'interview-studio-hub.png', path: '/interview-studio', fullPage: false },
    { file: 'pricing.png', path: '/pricing', fullPage: false },
];

const run = async () => {
    await mkdir(OUT, { recursive: true });
    const browser = await chromium.launch();
    // 2x so the images stay sharp on the retina displays most readers use.
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
        /*
         * A real browser's user agent, deliberately.
         *
         * Playwright's default contains "HeadlessChrome", which isbot() matches
         * — so renderSeoContent served the crawler HTML and every screenshot
         * came out as unstyled semantic markup instead of the product. The SEO
         * fallback working correctly is what broke this.
         */
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    for (const shot of SHOTS) {
        const url = `${BASE}${shot.path}`;
        process.stdout.write(`${shot.file.padEnd(28)} ${url}\n`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
        // Job cards and template swatches arrive after first paint.
        await page.waitForTimeout(3_000);

        if (shot.scrollTo) {
            await page.locator(shot.scrollTo).scrollIntoViewIfNeeded().catch(() => {});
            await page.waitForTimeout(1_000);
        }

        await page.screenshot({ path: path.join(OUT, shot.file), fullPage: shot.fullPage });
    }

    await browser.close();
    process.stdout.write(`\nWrote ${SHOTS.length} screenshots to docs/screenshots/\n`);
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
