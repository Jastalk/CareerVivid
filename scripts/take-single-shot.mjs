import { execSync } from 'child_process';
import path from 'path';

const shotType = process.argv[2];

const SHOTS = {
    'app-dashboard.png': {
        url: 'https://careervivid.app/dashboard',
        prompt: 'What should I focus on today to improve my target role readiness for Google?'
    },
    'app-resume-editor.png': {
        url: 'https://careervivid.app/edit/ILXLhagUGv2aTmyDVpDo',
        prompt: 'How can I improve my resume score and highlight my system design experience?'
    },
    'app-editor-templates.png': {
        url: 'https://careervivid.app/edit/ILXLhagUGv2aTmyDVpDo',
        action: 'templates',
        prompt: 'Which layout and font styling works best for senior software engineering roles?'
    },
    'app-interview-studio.png': {
        url: 'https://careervivid.app/interview-studio',
        prompt: 'Which company interview quest or mock round should I practice first?'
    },
    'app-quest-google.png': {
        url: 'https://careervivid.app/quest/google',
        prompt: 'What are the key preparation tips to clear all 6 stages of the Google interview quest?'
    },
    'app-coding-round.png': {
        url: 'https://careervivid.app/quest/google',
        action: 'coding',
        prompt: 'Can you explain how to detect cycles using DFS for the Course Schedule problem?'
    },
    'app-system-design.png': {
        url: 'https://careervivid.app/quest/google',
        action: 'system-design',
        prompt: 'How do I handle database partitioning and cache invalidation for a URL shortener at Google scale?'
    },
    'app-interview-report.png': {
        url: 'https://careervivid.app/interview-studio',
        action: 'report',
        prompt: 'How can I improve my answer relevance and communication scores for my next interview attempt?'
    },
    'app-course-lesson.png': {
        url: 'https://careervivid.app/learning/coding-interview-patterns',
        prompt: 'How does the two-pointer technique achieve O(n) time complexity compared to brute force?'
    },
    'app-quest-progress.png': {
        url: 'https://careervivid.app/learning/quest-game',
        prompt: 'What is the fastest way to level up and earn stage badges in the 3D Brick City quest?'
    },
    'app-career-agent.png': {
        url: 'https://careervivid.app/quest/google',
        action: 'career-agent',
        prompt: 'Can you coach me step-by-step through this Google system design round?'
    }
};

const config = SHOTS[shotType];
if (!config) {
    console.error(`Unknown shot type: ${shotType}`);
    process.exit(1);
}

let actionSnippet = '';
if (config.action === 'templates') {
    actionSnippet = `
await js(String.raw\`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(el => el.textContent && el.textContent.includes('Layout & Style')); if (b) b.click(); })()\`);
await wait(1);
`;
} else if (config.action === 'coding') {
    actionSnippet = `
await js(String.raw\`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(el => el.textContent && el.textContent.includes('Open code editor')); if (b) b.click(); })()\`);
await wait(1.5);
await js(String.raw\`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(el => el.textContent && el.textContent.includes('Run tests')); if (b) b.click(); })()\`);
await wait(1.5);
`;
} else if (config.action === 'system-design') {
    actionSnippet = `
await js(String.raw\`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(el => el.textContent && el.textContent.includes('Open whiteboard')); if (b) b.click(); })()\`);
await wait(1.5);
await js(String.raw\`(() => { const expandBtn = document.querySelector('button[aria-label="Expand the brief"]'); if (expandBtn) expandBtn.click(); })()\`);
await wait(0.5);
await js(String.raw\`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(el => el.textContent && el.textContent.includes('Generate with AI')); if (b) b.click(); })()\`);
await wait(2);
`;
} else if (config.action === 'report') {
    actionSnippet = `
await js(String.raw\`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(el => el.textContent && el.textContent.includes('Report')); if (b) b.click(); })()\`);
await wait(1.5);
`;
} else if (config.action === 'career-agent') {
    actionSnippet = `
await js(String.raw\`(() => { const btns = [...document.querySelectorAll('button')]; const b = btns.find(el => el.textContent && el.textContent.includes('Open whiteboard')); if (b) b.click(); })()\`);
await wait(1.5);
`;
}

const jsCode = `
import fs from 'fs';
import path from 'path';

let task;
try {
    task = await claimTaskSpace('signed-in readme shots');
} catch (e) {
    task = await useOrCreateTaskSpace('signed-in readme shots');
}

await openOrReuseTab('${config.url}', { wait: false });
await wait(1.5);

${actionSnippet}

// Open Career Agent drawer & fill prompt
await js(String.raw\`(() => { const b = document.querySelector('button[aria-label="Open Career Agent"]') || document.querySelector('button[aria-label="Expand Career Agent"]'); if (b) b.click(); const pill = [...document.querySelectorAll('button, div')].find(el => el.textContent && el.textContent.includes('No messages yet')); if (pill) pill.click(); })()\`);
await wait(0.5);

await js(String.raw\`((text) => { const ta = document.querySelector('textarea[placeholder*="Ask anything"]'); if (ta) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); } })("${config.prompt.replace(/"/g, '\\"')}")\`);
await wait(0.5);

const res = await cdp('Page.captureScreenshot', { format: 'png' });
const outPath = '/Users/jiawenzhu/Developer/careervivid/docs/screenshots/${shotType}';
fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
cliLog('✅ Saved ${shotType} (' + fs.statSync(outPath).size + ' bytes)');
`;

const cmd = `ego-browser nodejs <<'EOF'\n${jsCode}\nEOF`;
console.log(`Executing screenshot for ${shotType}...`);
execSync(cmd, { stdio: 'inherit' });
