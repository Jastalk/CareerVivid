import fs from 'fs';
import path from 'path';

const OUT = '/Users/jiawenzhu/Developer/careervivid/docs/screenshots';

const task = await useOrCreateTaskSpace(22);

const setupAgentChat = async (promptText) => {
    await js(String.raw`(() => {
        const b = document.querySelector('button[aria-label="Open Career Agent"]') || document.querySelector('button[aria-label="Expand Career Agent"]');
        if (b) b.click();
        const pill = [...document.querySelectorAll('button, div')].find(el => el.textContent && el.textContent.includes('No messages yet'));
        if (pill) pill.click();
    })()`);
    await wait(0.5);

    await js(String.raw`((text) => {
        const ta = document.querySelector('textarea[placeholder*="Ask anything"]');
        if (ta) {
            ta.value = text;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })("${promptText.replace(/"/g, '\\"')}")`);
    await wait(0.5);
};

const saveShot = async (filename) => {
    const res = await cdp('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(OUT, filename);
    fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
    cliLog(`✅ Saved ${filename} (${fs.statSync(outPath).size} bytes)`);
};

cliLog('Starting CareerVivid screenshot workflow...');

// 1. app-dashboard.png
await openOrReuseTab('https://careervivid.app/dashboard', { wait: true });
await wait(2);
await setupAgentChat("What should I focus on today to improve my target role readiness for Google?");
await saveShot('app-dashboard.png');

// 2. app-resume-editor.png
await openOrReuseTab('https://careervivid.app/edit/ILXLhagUGv2aTmyDVpDo', { wait: true });
await wait(3);
await setupAgentChat("How can I improve my resume score and highlight my system design experience?");
await saveShot('app-resume-editor.png');

// 3. app-editor-templates.png
await js(String.raw`(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(el => el.textContent && el.textContent.includes('Layout & Style'));
    if (b) b.click();
})()`);
await wait(1.5);
await setupAgentChat("Which layout and font styling works best for senior software engineering roles?");
await saveShot('app-editor-templates.png');

// 4. app-interview-studio.png
await openOrReuseTab('https://careervivid.app/interview-studio', { wait: true });
await wait(2.5);
await setupAgentChat("Which company interview quest or mock round should I practice first?");
await saveShot('app-interview-studio.png');

// 5. app-quest-google.png
await openOrReuseTab('https://careervivid.app/quest/google', { wait: true });
await wait(2.5);
await setupAgentChat("What are the key preparation tips to clear all 6 stages of the Google interview quest?");
await saveShot('app-quest-google.png');

// 6. app-coding-round.png
await js(String.raw`(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(el => el.textContent && el.textContent.includes('Open code editor'));
    if (b) b.click();
})()`);
await wait(2);
await js(String.raw`(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(el => el.textContent && el.textContent.includes('Run tests'));
    if (b) b.click();
})()`);
await wait(3);
await setupAgentChat("Can you explain how to detect cycles using DFS for the Course Schedule problem?");
await saveShot('app-coding-round.png');

// 7. app-system-design.png
await openOrReuseTab('https://careervivid.app/quest/google', { wait: true });
await wait(2);
await js(String.raw`(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(el => el.textContent && el.textContent.includes('Open whiteboard'));
    if (b) b.click();
})()`);
await wait(3);
// Expand brief sidebar if collapsed
await js(String.raw`(() => {
    const expandBtn = document.querySelector('button[aria-label="Expand the brief"]');
    if (expandBtn) expandBtn.click();
})()`);
await wait(0.5);
await js(String.raw`(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(el => el.textContent && el.textContent.includes('Generate with AI'));
    if (b) b.click();
})()`);
await wait(4);
await setupAgentChat("How do I handle database partitioning and cache invalidation for a URL shortener at Google scale?");
await saveShot('app-system-design.png');

// 8. app-interview-report.png
await openOrReuseTab('https://careervivid.app/interview-studio', { wait: true });
await wait(2);
await js(String.raw`(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(el => el.textContent && el.textContent.includes('Report'));
    if (b) b.click();
})()`);
await wait(2);
await setupAgentChat("How can I improve my answer relevance and communication scores for my next interview attempt?");
await saveShot('app-interview-report.png');

// 9. app-course-lesson.png
await openOrReuseTab('https://careervivid.app/learn/coding-interview-patterns/tp-viz', { wait: true });
await wait(2.5);
await js(String.raw`(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(el => el.textContent && el.textContent.includes('Move pointer'));
    if (b) { b.click(); b.click(); }
})()`);
await wait(1);
await setupAgentChat("How does the two-pointer technique achieve O(n) time complexity compared to brute force?");
await saveShot('app-course-lesson.png');

// 10. app-quest-progress.png
await openOrReuseTab('https://careervivid.app/learning/quest-game', { wait: true });
await wait(2.5);
await setupAgentChat("What is the fastest way to level up and earn stage badges in the 3D Brick City quest?");
await saveShot('app-quest-progress.png');

// 11. app-career-agent.png
await openOrReuseTab('https://careervivid.app/quest/google', { wait: true });
await wait(2);
await js(String.raw`(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(el => el.textContent && el.textContent.includes('Open whiteboard'));
    if (b) b.click();
})()`);
await wait(2);
await setupAgentChat("Can you coach me step-by-step through this Google system design round?");
await saveShot('app-career-agent.png');

cliLog('🎉 Finished updating all 11 screenshots!');
EOF
