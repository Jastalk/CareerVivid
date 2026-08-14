import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.join(process.cwd(), 'docs', 'screenshots');

const SHOTS = [
    {
        file: 'app-dashboard.png',
        url: 'https://careervivid.app/dashboard',
        prompt: 'What should I focus on today to improve my target role readiness for Google?'
    },
    {
        file: 'app-resume-editor.png',
        url: 'https://careervivid.app/demo',
        prompt: 'How can I improve my resume score and highlight my system design experience?'
    },
    {
        file: 'app-editor-templates.png',
        url: 'https://careervivid.app/demo',
        action: 'templates',
        prompt: 'Which layout and font styling works best for senior software engineering roles?'
    },
    {
        file: 'app-interview-studio.png',
        url: 'https://careervivid.app/interview-studio',
        prompt: 'Which company interview quest or mock round should I practice first?'
    },
    {
        file: 'app-quest-google.png',
        url: 'https://careervivid.app/quest/google',
        prompt: 'What are the key preparation tips to clear all 6 stages of the Google interview quest?'
    },
    {
        file: 'app-coding-round.png',
        url: 'https://careervivid.app/quest/google',
        action: 'coding',
        prompt: 'Can you explain how to detect cycles using DFS for the Course Schedule problem?'
    },
    {
        file: 'app-system-design.png',
        url: 'https://careervivid.app/quest/google',
        action: 'system-design',
        prompt: 'How do I handle database partitioning and cache invalidation for a URL shortener at Google scale?'
    },
    {
        file: 'app-interview-report.png',
        url: 'https://careervivid.app/interview-studio',
        action: 'report',
        prompt: 'How can I improve my answer relevance and communication scores for my next interview attempt?'
    },
    {
        file: 'app-course-lesson.png',
        url: 'https://careervivid.app/learn/coding-interview-patterns/tp-viz',
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
        action: 'career-agent',
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
        await page.waitForTimeout(1500);

        if (shot.action === 'templates') {
            await page.locator('button:has-text("Layout & Style")').first().click().catch(() => {});
            await page.waitForTimeout(1000);
        } else if (shot.action === 'system-design') {
            await page.locator('button:has-text("Open whiteboard")').first().click().catch(() => {});
            await page.waitForTimeout(1500);
            const expandBtn = page.locator('button[aria-label="Expand the brief"]').first();
            if (await expandBtn.isVisible().catch(() => false)) {
                await expandBtn.click().catch(() => {});
                await page.waitForTimeout(500);
            }
            await page.locator('button:has-text("Generate with AI")').first().click().catch(() => {});
            await page.waitForTimeout(3000);
        } else if (shot.action === 'coding') {
            await page.locator('button:has-text("Open code editor")').first().click().catch(() => {});
            await page.waitForTimeout(1500);
            await page.locator('button:has-text("Run tests")').first().click().catch(() => {});
            await page.waitForTimeout(2000);
        } else if (shot.action === 'report') {
            const reportBtn = page.locator('button:has-text("Report")').first();
            if (await reportBtn.isVisible().catch(() => false)) {
                await reportBtn.click().catch(() => {});
                await page.waitForTimeout(1500);
            }
        } else if (shot.action === 'career-agent') {
            await page.locator('button:has-text("Open whiteboard")').first().click().catch(() => {});
            await page.waitForTimeout(1500);
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
            await page.waitForTimeout(300);
        }

        const outPath = path.join(OUT, shot.file);
        await page.screenshot({ path: outPath });
        console.log(`✅ Saved ${shot.file} (${fs.statSync(outPath).size} bytes)`);
    }

    await browser.close();
    console.log('🎉 All 11 screenshots successfully captured with Playwright!');
};

run().catch(console.error);
