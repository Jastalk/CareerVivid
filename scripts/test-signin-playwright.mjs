import { chromium } from 'playwright';

const run = async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto('https://careervivid.app/signin', { waitUntil: 'networkidle' });
    console.log('Signin title:', await page.title());
    await browser.close();
};

run().catch(console.error);
