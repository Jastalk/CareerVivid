/**
 * Renders the full 60s animated course video for Domain 1 (contract-breakdown)
 * with Playwright, CSS/SVG animations, TTS narration audio, and ffmpeg assembly.
 *
 * Output: public/ccaf-lessons/domain-1.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('scratchpad/render_frames');
const FINAL_MP4 = path.resolve('public/ccaf-lessons/domain-1.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/contract-breakdown/zh/charon');
const BACKPLATE_IMG = path.resolve('public/assets/ccaf-backplates/contract-breakdown--open.png');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function renderFullVideo() {
    console.log('🚀 Starting full course video render...');

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // HTML Template for animated slides
    const getHtml = (beatIndex, contentHtml) => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                body { width: 1920px; height: 1080px; background: #0f1117; color: #fff; overflow: hidden; display: flex; flex-direction: column; }
                .header { padding: 40px 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid rgba(255,255,255,0.1); }
                .tag { background: #625bd5; color: #fff; font-weight: 800; padding: 8px 20px; border-radius: 30px; font-size: 20px; letter-spacing: 1px; }
                .title { font-size: 36px; font-weight: 900; color: #f3f4f6; }
                .body { flex: 1; display: flex; align-items: center; justify-content: center; padding: 60px; position: relative; }
                .bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.35; filter: contrast(1.1) brightness(0.8); }

                /* Flow diagram */
                .flow-container { display: flex; align-items: center; gap: 30px; z-index: 10; }
                .flow-node { background: rgba(30, 41, 59, 0.9); border: 3px solid #3b82f6; padding: 24px 40px; border-radius: 20px; font-size: 28px; font-weight: 700; color: #60a5fa; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .arrow { font-size: 40px; color: #94a3b8; font-weight: 900; }

                /* Comparison columns */
                .compare-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; width: 100%; max-width: 1600px; z-index: 10; }
                .card-bad { background: rgba(239, 68, 68, 0.12); border: 3px solid #ef4444; padding: 40px; border-radius: 24px; text-align: center; }
                .card-good { background: rgba(34, 197, 94, 0.15); border: 4px solid #22c55e; padding: 40px; border-radius: 24px; text-align: center; box-shadow: 0 0 40px rgba(34, 197, 94, 0.3); }
                .card-title { font-size: 32px; font-weight: 900; margin-bottom: 20px; }
                .card-note { font-size: 24px; color: #cbd5e1; line-height: 1.5; }

                /* Code block */
                .code-box { background: #1e1e2e; border: 3px solid #45475a; border-radius: 24px; padding: 50px; width: 100%; max-width: 1400px; font-family: "Fira Code", monospace; font-size: 32px; line-height: 1.8; z-index: 10; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
                .code-line { padding: 8px 16px; border-radius: 8px; }
                .highlight { background: rgba(137, 180, 250, 0.2); border-left: 6px solid #89b4fa; color: #89b4fa; font-weight: bold; }

                /* Takeaway card */
                .takeaway-card { background: linear-gradient(135deg, #625bd5, #8b5cf6); border-radius: 36px; padding: 80px; text-align: center; max-width: 1300px; box-shadow: 0 20px 60px rgba(98, 91, 213, 0.5); z-index: 10; }
                .takeaway-text { font-size: 48px; font-weight: 900; color: #ffffff; line-height: 1.4; }
            </style>
        </head>
        <body>
            <div class="header">
                <span class="tag">CCAF · DOMAIN 1</span>
                <span class="title">拆解合约 (Contract Breakdown)</span>
            </div>
            <div class="body">
                ${contentHtml}
            </div>
        </body>
        </html>
    `;

    const backplateBase64 = fs.readFileSync(BACKPLATE_IMG).toString('base64');
    const backplateUrl = `data:image/png;base64,${backplateBase64}`;

    const beats = [
        {
            id: 'open',
            durationSec: 8.0,
            audioFile: null,
            html: `
                <img class="bg-img" src="${backplateUrl}" style="opacity: 0.8; filter: contrast(1.2);" />
                <div style="z-index: 10; text-align: center; background: rgba(15,17,23,0.85); padding: 60px 100px; border-radius: 40px; border: 3px solid #625bd5;">
                    <h1 style="font-size: 64px; font-weight: 900; color: #fff; margin-bottom: 20px;">03. 拆解合约</h1>
                    <p style="font-size: 32px; color: #a5b4fc;">Sam O'Nella 极简 2D 火柴人漫剧教学</p>
                </div>
            `
        },
        {
            id: 'problem',
            durationSec: 9.3,
            audioFile: path.join(NARRATION_DIR, 'problem.wav'),
            html: `
                <img class="bg-img" src="${backplateUrl}" />
                <div class="flow-container">
                    <div class="flow-node">📄 Pull Request</div>
                    <div class="arrow">➔</div>
                    <div class="flow-node">🎨 代码风格</div>
                    <div class="arrow">➔</div>
                    <div class="flow-node" style="border-color: #ef4444; color: #fca5a5;">🛡️ 安全漏洞</div>
                    <div class="arrow">➔</div>
                    <div class="flow-node">📝 文档准确性</div>
                </div>
            `
        },
        {
            id: 'trap',
            durationSec: 10.1,
            audioFile: path.join(NARRATION_DIR, 'trap.wav'),
            html: `
                <img class="bg-img" src="${backplateUrl}" />
                <div class="compare-grid">
                    <div class="card-bad">
                        <div class="card-title" style="color: #ef4444;">❌ 路由模式</div>
                        <div class="card-note">只分发给单个专家<br/>无法全量覆盖三重关卡</div>
                    </div>
                    <div class="card-bad">
                        <div class="card-title" style="color: #ef4444;">❌ 巨型 Prompt</div>
                        <div class="card-note">注意力被大幅稀释<br/>安全检查被悄悄遗漏</div>
                    </div>
                    <div class="card-good">
                        <div class="card-title" style="color: #22c55e;">✅ Prompt Chaining</div>
                        <div class="card-note">拆成 3 个独立环节<br/>各司其职，最后汇总</div>
                    </div>
                </div>
            `
        },
        {
            id: 'switch',
            durationSec: 8.0,
            audioFile: null,
            html: `
                <img class="bg-img" src="${backplateUrl}" style="opacity: 0.75;" />
                <div style="z-index: 10; background: rgba(15,17,23,0.85); padding: 40px 80px; border-radius: 30px; border: 2px solid #22c55e;">
                    <h2 style="font-size: 44px; color: #4ade80; font-weight: 800;">⚡ 转场：隔离视角与顺序串联</h2>
                </div>
            `
        },
        {
            id: 'the-code',
            durationSec: 10.7,
            audioFile: path.join(NARRATION_DIR, 'the-code.wav'),
            html: `
                <div class="code-box">
                    <div style="color: #6c7086; margin-bottom: 20px;">// 顺序串联（Prompt Chaining）实战代码</div>
                    <div class="code-line highlight">const step1 = await checkStyle(prCode);</div>
                    <div class="code-line highlight">const step2 = await checkSecurity(prCode);</div>
                    <div class="code-line highlight">const step3 = await checkDocs(prCode);</div>
                    <div class="code-line" style="color: #a6e3a1; font-weight: bold; margin-top: 15px;">return synthesize([step1, step2, step3]);</div>
                </div>
            `
        },
        {
            id: 'takeaway',
            durationSec: 5.0,
            audioFile: path.join(NARRATION_DIR, 'takeaway.wav'),
            html: `
                <div class="takeaway-card">
                    <div class="takeaway-text">💡 核心考点：<br/>固定步骤 + 独立视角 = Prompt Chaining</div>
                </div>
            `
        }
    ];

    const clipFiles = [];

    for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        console.log(`🎬 Rendering beat ${i + 1}/${beats.length}: ${beat.id} (${beat.durationSec}s)...`);

        const html = getHtml(i, beat.html);
        await page.setContent(html);
        const imgPath = path.join(OUT_DIR, `beat_${i}.png`);
        await page.screenshot({ path: imgPath });

        const clipMp4 = path.join(OUT_DIR, `clip_${i}.mp4`);

        if (beat.audioFile && fs.existsSync(beat.audioFile)) {
            // Render video slide with TTS audio
            execSync(
                `ffmpeg -loop 1 -i "${imgPath}" -i "${beat.audioFile}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t ${beat.durationSec} -shortest -y "${clipMp4}"`,
                { stdio: 'ignore' }
            );
        } else {
            // Render silent slide for fixed veo duration
            execSync(
                `ffmpeg -loop 1 -i "${imgPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t ${beat.durationSec} -y "${clipMp4}"`,
                { stdio: 'ignore' }
            );
        }

        clipFiles.push(clipMp4);
    }

    await browser.close();

    // Create concat list for ffmpeg
    const concatListFile = path.join(OUT_DIR, 'concat_list.txt');
    const concatContent = clipFiles.map(file => `file '${file}'`).join('\n');
    fs.writeFileSync(concatListFile, concatContent);

    console.log('🎞️ Concatenating all beats into full course MP4 video...');
    execSync(`ffmpeg -f concat -safe 0 -i "${concatListFile}" -c copy -y "${FINAL_MP4}"`, { stdio: 'inherit' });

    console.log(`✅ SUCCESS! Full course video created at: ${FINAL_MP4}`);
}

renderFullVideo().catch(err => {
    console.error('❌ Error rendering video:', err);
    process.exit(1);
});
