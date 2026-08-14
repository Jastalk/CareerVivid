import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.join(process.cwd(), 'docs', 'screenshots');

const SHOTS = [
    {
        file: 'app-course-lesson.png',
        url: 'https://careervivid.app/learning/coding-interview-patterns',
        prompt: 'How does the two-pointer technique achieve O(n) time complexity compared to brute force?'
    },
    {
        file: 'app-quest-progress.png',
        url: 'https://careervivid.app/learning/quest-game',
        prompt: 'What is the fastest way to level up and earn stage badges in the 3D Brick City quest?'
    },
    {
        file: 'app-career-agent.png',
        url: 'https://careervivid.app/quest/google',
        action: 'system-design',
        prompt: 'Can you coach me step-by-step through this Google system design round?'
    }
];

const run = async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    for (const shot of SHOTS) {
        console.log(`Navigating to ${shot.url} for ${shot.file}...`);
        await page.goto(shot.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForTimeout(2000);

        if (shot.action === 'system-design') {
            await page.locator('button:has-text("Open whiteboard")').first().click().catch(() => {});
            await page.waitForTimeout(1500);
            const expandBtn = page.locator('button[aria-label="Expand the brief"]').first();
            if (await expandBtn.isVisible().catch(() => false)) {
                await expandBtn.click().catch(() => {});
                await page.waitForTimeout(500);
            }
            await page.locator('button:has-text("Generate with AI")').first().click().catch(() => {});
            await page.waitForTimeout(2000);
        }

        // Open Career Agent drawer
        const agentBtn = page.locator('button[aria-label="Open Career Agent"]').first();
        if (await agentBtn.isVisible().catch(() => false)) {
            await agentBtn.click().catch(() => {});
            await page.waitForTimeout(500);
        }
        const collapsedPill = page.locator('button:has-text("No messages yet"), div:has-text("No messages yet")').first();
        if (await collapsedPill.isVisible().catch(() => false)) {
            await collapsedPill.click().catch(() => {});
            await page.waitForTimeout(500);
        }

        // Type prompt in Career Agent textarea
        const textarea = page.locator('textarea[placeholder*="Ask anything"]').first();
        if (await textarea.isVisible().catch(() => false)) {
            await textarea.fill(shot.prompt);
            await page.waitForTimeout(500);
        }

        const outPath = path.join(OUT, shot.file);
        await page.screenshot({ path: outPath });
        console.log(`✅ Saved ${shot.file} (${fs.statSync(outPath).size} bytes)`);
    }

    await browser.close();
    console.log('🎉 Finished remaining screenshots!');
};

run().catch(console.error);
