import { chromium } from 'playwright';
import path from 'node:path';

const userDataDir = '/Users/jiawenzhu/Library/Application Support/Google/Chrome/Default';

const run = async () => {
    // Launch persistent context using Chrome user data
    const context = await chromium.launchPersistentContext('/tmp/playwright-user-data', {
        headless: true,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
    });
    const page = context.pages()[0] || await context.newPage();
    await page.goto('https://careervivid.app/dashboard', { waitUntil: 'networkidle' });
    console.log('Title:', await page.title());
    await context.close();
};

run().catch(console.error);
