import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.join(process.cwd(), 'docs', 'screenshots');

const run = async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto('https://careervivid.app/dashboard', { waitUntil: 'networkidle' });
    console.log('Opened dashboard with title:', await page.title());
    await page.screenshot({ path: path.join(OUT, 'app-dashboard-test.png') });
    console.log('Saved app-dashboard-test.png');
    await browser.close();
};

run().catch(console.error);
