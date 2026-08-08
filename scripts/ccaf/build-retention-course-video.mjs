/**
 * build-retention-course-video.mjs
 *
 * Re-imagines the course video pipeline from scratch using the retention-engineered
 * 10-second block architecture (from higgsfield-explainer methodology):
 *
 *   - 6 Blocks × 10 seconds = 60s video grid
 *   - Cold Open Hook in Block 1 (no boring intros)
 *   - 20-24 words per block narration (spoken in ~8-9s)
 *   - Visual scene switch every 10 seconds for high retention
 *   - Muxed with Veo 2.0 AI motion clips, Chirp3-HD TTS, and 1080p Playwright graphics
 *
 * Output: public/ccaf-lessons/domain-1.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('scratchpad/retention_render');
const FINAL_MP4 = path.resolve('public/ccaf-lessons/domain-1.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/contract-breakdown/zh/charon');
const VEO_CLIPS_DIR = path.resolve('public/ccaf-lessons/clips');
const BACKPLATE_IMG = path.resolve('public/assets/ccaf-backplates/contract-breakdown--open.png');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const backplateBase64 = fs.existsSync(BACKPLATE_IMG)
    ? fs.readFileSync(BACKPLATE_IMG).toString('base64')
    : '';
const backplateUrl = backplateBase64 ? `data:image/png;base64,${backplateBase64}` : '';

/**
 * 6 Retention-Engineered Blocks (10s each, 20-24 words narration)
 */
const BLOCKS = [
    {
        index: 1,
        id: 'cold_open_hook',
        kind: 'veo',
        clip: path.join(VEO_CLIPS_DIR, 'contract-breakdown--open.mp4'),
        durationSec: 10.0,
        subtitles: {
            zh: '一个看似简单的 Pull Request，却包含了代码风格、安全漏洞与文档校验三重审查，全部堆给单次 Prompt 必将惨败！',
            en: 'A complex Pull Request needs style, security, and docs checks — lumping them into one prompt is bound to fail!'
        }
    },
    {
        index: 2,
        id: 'the_problem',
        kind: 'slide',
        durationSec: 10.0,
        audio: path.join(NARRATION_DIR, 'problem.wav'),
        subtitles: {
            zh: '日志里常见的安全检查遗漏，往往不是模型不够聪明，而是上下文注意力被大量代码风格杂音所稀释。',
            en: 'Missed security checks are rarely caused by dumb models — their context attention gets diluted by style noise.'
        },
        html: `
            <div class="header-box">
                <div class="tag-badge red">BLOCK 02 · 核心痛点</div>
                <h2 class="block-title">为什么单次 Prompt 会漏掉关键安全检查？</h2>
            </div>
            <div class="flow-container">
                <div class="flow-card">
                    <div class="card-icon">📂</div>
                    <div class="card-name">Pull Request</div>
                    <div class="card-tag">待审查代码</div>
                </div>
                <div class="flow-arrow">➔</div>
                <div class="flow-card noise">
                    <div class="card-icon">🎨</div>
                    <div class="card-name">代码风格杂音</div>
                    <div class="card-tag">占据 80% 注意力</div>
                </div>
                <div class="flow-arrow">➔</div>
                <div class="flow-card danger">
                    <div class="card-icon">🛡️</div>
                    <div class="card-name">安全漏洞检查</div>
                    <div class="card-tag alert">⚠️ 被注意力稀释遗漏</div>
                </div>
            </div>
        `
    },
    {
        index: 3,
        id: 'compare_trap',
        kind: 'slide',
        durationSec: 10.0,
        audio: path.join(NARRATION_DIR, 'trap.wav'),
        subtitles: {
            zh: '路由模式只切给单人专家导致漏项，而巨型 Prompt 试图包揽一切，却让模型在多重指令中失焦迷失。',
            en: 'Routing fails by calling only one specialist; giant prompts lose focus across multiple tasks.'
        },
        html: `
            <div class="header-box">
                <div class="tag-badge yellow">BLOCK 03 · 模式陷阱对比</div>
                <h2 class="block-title">三大主流设计模式效果剖析</h2>
            </div>
            <div class="compare-grid">
                <div class="compare-card bad">
                    <div class="status-title bad-text">❌ 1. 路由模式 (Routing)</div>
                    <div class="compare-desc">仅只分发给单一分类专家</div>
                    <div class="compare-detail">缺点：无法覆盖全量三重审查</div>
                </div>
                <div class="compare-card bad">
                    <div class="status-title bad-text">❌ 2. 巨型 Prompt</div>
                    <div class="compare-desc">试图在 1 次调用中做完所有检查</div>
                    <div class="compare-detail">缺点：注意力稀释，安全检查开盲盒</div>
                </div>
                <div class="compare-card good">
                    <div class="status-title good-text">✅ 3. Prompt Chaining</div>
                    <div class="compare-desc">拆解为 3 个独立环节链式执行</div>
                    <div class="compare-detail">优势：独立上下文，100% 聚焦可靠</div>
                </div>
            </div>
        `
    },
    {
        index: 4,
        id: 'the_solution',
        kind: 'veo',
        clip: path.join(VEO_CLIPS_DIR, 'contract-breakdown--switch.mp4'),
        durationSec: 10.0,
        subtitles: {
            zh: '正确方案是 Prompt Chaining：将审查拆解为三个独立隔离环节，顺序执行，最后一步汇总综合报告。',
            en: 'The right pattern is Prompt Chaining: three isolated steps executed in sequence, synthesized at the end.'
        }
    },
    {
        index: 5,
        id: 'code_in_action',
        kind: 'slide',
        durationSec: 10.0,
        audio: path.join(NARRATION_DIR, 'the-code.wav'),
        subtitles: {
            zh: '代码实现极其干净：顺序调用 checkStyle、checkSecurity 与 checkDocs，独立上下文保证了最高专注度与可靠性。',
            en: 'Clean execution: sequentially invoke checkStyle, checkSecurity, and checkDocs with isolated contexts.'
        },
        html: `
            <div class="code-window">
                <div class="code-header">
                    <div class="mac-dots"><span></span><span></span><span></span></div>
                    <div class="code-filename">promptChainingEngine.ts — 顺序链式审查</div>
                </div>
                <div class="code-body">
                    <div class="code-line comment">// Step 1: 独立专注审查代码风格</div>
                    <div class="code-line step"><span class="kw">const</span> step1 = <span class="kw">await</span> checkStyle(prCode);</div>
                    <div class="code-line comment" style="margin-top: 10px;">// Step 2: 独立视角全面扫描 CVE 安全漏洞</div>
                    <div class="code-line step"><span class="kw">const</span> step2 = <span class="kw">await</span> checkSecurity(prCode);</div>
                    <div class="code-line comment" style="margin-top: 10px;">// Step 3: 独立校验 API 文档准确性</div>
                    <div class="code-line step"><span class="kw">const</span> step3 = <span class="kw">await</span> checkDocs(prCode);</div>
                    <div class="code-line comment" style="margin-top: 15px;">// Final: 综合三方独立审查结论</div>
                    <div class="code-line result"><span class="kw">return</span> synthesize([step1, step2, step3]);</div>
                </div>
            </div>
        `
    },
    {
        index: 6,
        id: 'payoff_takeaway',
        kind: 'slide',
        durationSec: 10.0,
        audio: path.join(NARRATION_DIR, 'takeaway.wav'),
        subtitles: {
            zh: '揭晓悬念：固定步骤加上独立视角，就是 Prompt Chaining 模式！这是 CCAF 考试 Domain 1 的核心考点。',
            en: 'Payoff: Fixed steps plus isolated perspectives equal Prompt Chaining! A core CCAF Domain 1 topic.'
        },
        html: `
            <div class="takeaway-box">
                <div class="takeaway-badge">⚡ CCAF DOMAIN 1 核心考点总结</div>
                <div class="takeaway-headline">固定步骤 + 独立视角 = Prompt Chaining</div>
                <div class="takeaway-subtext">Deterministic Multi-Step Tasks → Prompt Chaining Pattern</div>
            </div>
        `
    }
];

function renderBlockHtml(block) {
    const progressPct = Math.round((block.index / BLOCKS.length) * 100);
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                body {
                    width: 1920px;
                    height: 1080px;
                    background: #090b10;
                    color: #ffffff;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                /* Top Navbar */
                .top-bar {
                    height: 90px;
                    padding: 0 50px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(15, 23, 42, 0.85);
                    border-bottom: 2px solid rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(16px);
                }
                .brand { display: flex; align-items: center; gap: 16px; }
                .brand-logo {
                    width: 44px;
                    height: 44px;
                    background: linear-gradient(135deg, #625bd5, #9333ea);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 22px;
                    color: #fff;
                }
                .brand-text { font-size: 24px; font-weight: 900; color: #f8fafc; }
                .course-badge {
                    background: rgba(98, 91, 213, 0.25);
                    border: 1px solid rgba(98, 91, 213, 0.6);
                    color: #c084fc;
                    padding: 6px 20px;
                    border-radius: 30px;
                    font-size: 16px;
                    font-weight: 800;
                }

                /* Stage Container */
                .stage {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    position: relative;
                }
                .bg-backplate {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0.22;
                    filter: blur(3px) brightness(0.5);
                }

                /* Block Header */
                .header-box { text-align: center; margin-bottom: 30px; z-index: 10; }
                .tag-badge {
                    display: inline-block;
                    font-size: 14px;
                    font-weight: 800;
                    padding: 4px 14px;
                    border-radius: 20px;
                    margin-bottom: 10px;
                    letter-spacing: 1px;
                }
                .tag-badge.red { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; }
                .tag-badge.yellow { background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fcd34d; }
                .block-title { font-size: 34px; font-weight: 900; color: #f8fafc; }

                /* Flow Diagram */
                .flow-container { display: flex; align-items: center; gap: 20px; z-index: 10; }
                .flow-card {
                    background: rgba(30, 41, 59, 0.85);
                    border: 2px solid rgba(148, 163, 184, 0.2);
                    border-radius: 20px;
                    padding: 30px 36px;
                    text-align: center;
                    min-width: 250px;
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
                }
                .flow-card.noise { border-color: #3b82f6; }
                .flow-card.danger { border-color: #ef4444; background: rgba(239, 68, 68, 0.12); }
                .card-icon { font-size: 44px; margin-bottom: 10px; }
                .card-name { font-size: 24px; font-weight: 800; color: #f8fafc; margin-bottom: 6px; }
                .card-tag { font-size: 15px; font-weight: 700; color: #94a3b8; }
                .card-tag.alert { color: #fca5a5; font-weight: 900; }
                .flow-arrow { font-size: 32px; color: #64748b; font-weight: 900; }

                /* Comparison Grid */
                .compare-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 30px;
                    width: 100%;
                    max-width: 1650px;
                    z-index: 10;
                }
                .compare-card {
                    background: rgba(15, 23, 42, 0.85);
                    border-radius: 24px;
                    padding: 36px;
                    backdrop-filter: blur(14px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                }
                .compare-card.bad { border: 2px solid #ef4444; background: rgba(239, 68, 68, 0.08); }
                .compare-card.good { border: 3px solid #22c55e; background: rgba(34, 197, 94, 0.12); box-shadow: 0 0 40px rgba(34, 197, 94, 0.25); }
                .status-title { font-size: 22px; font-weight: 900; margin-bottom: 16px; }
                .bad-text { color: #ef4444; }
                .good-text { color: #22c55e; }
                .compare-desc { font-size: 22px; font-weight: 700; color: #e2e8f0; margin-bottom: 12px; line-height: 1.4; }
                .compare-detail { font-size: 18px; color: #94a3b8; line-height: 1.5; }

                /* Code Window */
                .code-window {
                    background: #1e1e2e;
                    border: 2px solid rgba(255, 255, 255, 0.15);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 1450px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
                    z-index: 10;
                }
                .code-header {
                    background: #181825;
                    padding: 16px 24px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .mac-dots { display: flex; gap: 8px; }
                .mac-dots span { width: 12px; height: 12px; border-radius: 50%; background: #45475a; }
                .mac-dots span:nth-child(1) { background: #f38ba8; }
                .mac-dots span:nth-child(2) { background: #f9e2af; }
                .mac-dots span:nth-child(3) { background: #a6e3a1; }
                .code-filename { font-family: monospace; font-size: 18px; color: #a6adc8; font-weight: 600; }
                .code-body { padding: 36px 44px; font-family: "Fira Code", monospace; font-size: 28px; line-height: 1.8; }
                .code-line { padding: 6px 16px; border-radius: 8px; }
                .code-line.comment { color: #6c7086; font-style: italic; }
                .code-line.step { background: rgba(137, 180, 250, 0.15); border-left: 6px solid #89b4fa; color: #cdd6f4; font-weight: bold; }
                .code-line.result { background: rgba(166, 227, 161, 0.18); border-left: 6px solid #a6e3a1; color: #a6e3a1; font-weight: bold; }
                .kw { color: #cba6f7; font-weight: bold; }

                /* Takeaway Box */
                .takeaway-box {
                    background: linear-gradient(135deg, #625bd5, #9333ea);
                    border-radius: 32px;
                    padding: 60px 80px;
                    text-align: center;
                    max-width: 1350px;
                    box-shadow: 0 20px 60px rgba(147, 51, 234, 0.4);
                    z-index: 10;
                }
                .takeaway-badge { font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #e9d5ff; margin-bottom: 16px; }
                .takeaway-headline { font-size: 44px; font-weight: 900; color: #ffffff; margin-bottom: 14px; }
                .takeaway-subtext { font-size: 22px; color: #d8b4fe; font-weight: 600; }

                /* Subtitle Bar & Retention Progress Track */
                .bottom-section {
                    background: rgba(15, 23, 42, 0.95);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    z-index: 20;
                }
                .subtitle-box { padding: 20px 50px; text-align: center; }
                .sub-zh { font-size: 26px; font-weight: 800; color: #f8fafc; margin-bottom: 4px; }
                .sub-en { font-size: 18px; font-weight: 600; color: #94a3b8; }
                .progress-track { height: 8px; width: 100%; background: rgba(255, 255, 255, 0.1); }
                .progress-fill { height: 100%; width: ${progressPct}%; background: linear-gradient(90deg, #625bd5, #3b82f6); }
            </style>
        </head>
        <body>
            <div class="top-bar">
                <div class="brand">
                    <div class="brand-logo">CV</div>
                    <div class="brand-text">CareerVivid CCAF Certification</div>
                </div>
                <div class="course-badge">Domain 1 · Agentic 架构与编排</div>
            </div>

            <div class="stage">
                ${backplateUrl ? `<img class="bg-backplate" src="${backplateUrl}" />` : ''}
                ${block.html}
            </div>

            <div class="bottom-section">
                <div class="subtitle-box">
                    <div class="sub-zh">${block.subtitles?.zh || ''}</div>
                    <div class="sub-en">${block.subtitles?.en || ''}</div>
                </div>
                <div class="progress-track">
                    <div class="progress-fill"></div>
                </div>
            </div>
        </body>
        </html>
    `;
}

async function buildRetentionCourseVideo() {
    console.log('🚀 Building Retention-Engineered Course Video (10s Blocks × 6)...');

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const clipFiles = [];

    for (let i = 0; i < BLOCKS.length; i++) {
        const block = BLOCKS[i];
        const clipOut = path.join(OUT_DIR, `block_${String(i + 1).padStart(2, '0')}_${block.id}.mp4`);
        clipFiles.push(clipOut);

        console.log(`🎬 Block [${block.index}/6]: ${block.id} (${block.durationSec}s)`);

        if (block.kind === 'veo') {
            console.log(`   └─ Veo 2.0 Motion Clip: ${path.basename(block.clip)}`);
            execSync(
                `ffmpeg -i "${block.clip}" ` +
                `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 ` +
                `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k ` +
                `-t ${block.durationSec} -shortest ` +
                `-pix_fmt yuv420p -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" ` +
                `-y "${clipOut}"`,
                { stdio: 'ignore' }
            );
        } else {
            console.log(`   └─ Slide Graphic + Chirp3-HD Voiceover (${path.basename(block.audio)})`);
            const htmlContent = renderBlockHtml(block);
            const imgPath = path.join(OUT_DIR, `block_${block.index}_${block.id}.png`);

            await page.setContent(htmlContent, { waitUntil: 'networkidle' });
            await page.screenshot({ path: imgPath });

            if (fs.existsSync(block.audio)) {
                execSync(
                    `ffmpeg -loop 1 -i "${imgPath}" -i "${block.audio}" ` +
                    `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k ` +
                    `-pix_fmt yuv420p -t ${block.durationSec} -shortest ` +
                    `-y "${clipOut}"`,
                    { stdio: 'ignore' }
                );
            } else {
                execSync(
                    `ffmpeg -loop 1 -i "${imgPath}" ` +
                    `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 ` +
                    `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k ` +
                    `-pix_fmt yuv420p -t ${block.durationSec} ` +
                    `-y "${clipOut}"`,
                    { stdio: 'ignore' }
                );
            }
        }
        console.log(`   ✔ Rendered: ${path.basename(clipOut)}`);
    }

    await browser.close();

    // Concat list for seamless joining
    const listFile = path.join(OUT_DIR, 'concat_list.txt');
    fs.writeFileSync(listFile, clipFiles.map(f => `file '${f}'`).join('\n'));

    console.log('\n🎞️  Concatenating all 6 blocks into final course video...');
    execSync(
        `ffmpeg -f concat -safe 0 -i "${listFile}" ` +
        `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k -pix_fmt yuv420p ` +
        `-y "${FINAL_MP4}"`,
        { stdio: 'inherit' }
    );

    const stat = fs.statSync(FINAL_MP4);
    console.log(`\n🎉 RETENTION COURSE VIDEO BUILD SUCCESS!`);
    console.log(`   File: ${FINAL_MP4}`);
    console.log(`   Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
}

buildRetentionCourseVideo().catch(err => {
    console.error('❌ Build Error:', err);
    process.exit(1);
});
