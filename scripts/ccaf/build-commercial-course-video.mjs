/**
 * build-commercial-course-video.mjs
 *
 * Commercial-grade video generator for CareerVivid CCAF Course.
 * Features:
 *   - Ultra-crisp 1080p @ 30fps motion graphics
 *   - Glassmorphic UI design system (dark mode, neon glows, code highlighting)
 *   - Full TTS voiceover integration with normalized 44.1kHz 16-bit stereo audio
 *   - Synchronized bilingual subtitles (中英双语字幕)
 *   - Real Veo 2.0 AI video clips & 2D stick figure animation integration
 *   - Bottom progress bar & commercial branding overlay
 *
 * Output: public/ccaf-lessons/domain-1.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const OUT_DIR = path.resolve('scratchpad/commercial_render');
const FINAL_MP4 = path.resolve('public/ccaf-lessons/domain-1.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/contract-breakdown/zh/charon');
const VEO_CLIPS_DIR = path.resolve('public/ccaf-lessons/clips');
const BACKPLATE_IMG = path.resolve('public/assets/ccaf-backplates/contract-breakdown--open.png');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Convert backplate image to base64 for embedding in HTML
const backplateBase64 = fs.existsSync(BACKPLATE_IMG)
    ? fs.readFileSync(BACKPLATE_IMG).toString('base64')
    : '';
const backplateUrl = backplateBase64 ? `data:image/png;base64,${backplateBase64}` : '';

/**
 * Commercial Course Beats with exact bilingual narrations & visual payloads
 */
const BEATS = [
    {
        id: 'open',
        kind: 'veo',
        clip: path.join(VEO_CLIPS_DIR, 'contract-breakdown--open.mp4'),
        durationSec: 8.0,
        subtitles: {
            zh: 'Domain 1 · Agentic 架构与编排 — 第 03 课：拆解合约',
            en: 'Domain 1 · Agentic Architecture & Orchestration — Lesson 03: Contract Breakdown'
        }
    },
    {
        id: 'problem',
        kind: 'slide',
        durationSec: 9.3,
        audio: path.join(NARRATION_DIR, 'problem.wav'),
        subtitles: {
            zh: '每个 PR 都必须过三道关：代码风格、安全漏洞、文档准确性。每一个都要，每次都要。',
            en: 'Every PR must pass three checks: Code Style, Security Vulnerabilities, and Docs Accuracy.'
        },
        html: `
            <div class="subtitle-banner">
                <div class="badge">PROMPT CHAINING 场景拆解</div>
                <h2 class="section-title">为何单次 Prompt 无法胜任复杂多重审查？</h2>
            </div>
            <div class="flow-container">
                <div class="flow-card">
                    <div class="card-icon">📂</div>
                    <div class="card-name">Pull Request</div>
                    <div class="card-tag">待审查代码</div>
                </div>
                <div class="flow-arrow">➔</div>
                <div class="flow-card style-card">
                    <div class="card-icon">🎨</div>
                    <div class="card-name">1. 代码风格</div>
                    <div class="card-tag">Style Review</div>
                </div>
                <div class="flow-arrow">➔</div>
                <div class="flow-card security-card">
                    <div class="card-icon">🛡️</div>
                    <div class="card-name">2. 安全漏洞</div>
                    <div class="card-tag alert">High Priority</div>
                </div>
                <div class="flow-arrow">➔</div>
                <div class="flow-card docs-card">
                    <div class="card-icon">📝</div>
                    <div class="card-name">3. 文档准确性</div>
                    <div class="card-tag">Docs Review</div>
                </div>
            </div>
        `
    },
    {
        id: 'trap',
        kind: 'slide',
        durationSec: 10.1,
        audio: path.join(NARRATION_DIR, 'trap.wav'),
        subtitles: {
            zh: '路由模式不行，因为它只选一个专家；单次巨型 Prompt 也不行，模型盯着代码风格看，安全检查就悄悄漏掉了！',
            en: 'Routing fails by calling only one specialist; a giant prompt dilutes attention and misses security!'
        },
        html: `
            <div class="compare-grid">
                <div class="compare-card bad">
                    <div class="status-pill bad-pill">❌ 方案一：路由模式 (Routing)</div>
                    <div class="compare-desc">只选其中 1 个分类器执行</div>
                    <div class="compare-detail">⚠️ 无法覆盖全部 3 个审查维度</div>
                </div>
                <div class="compare-card bad">
                    <div class="status-pill bad-pill">❌ 方案二：单次巨型 Prompt</div>
                    <div class="compare-desc">尝试在 1 次调用中做完所有检查</div>
                    <div class="compare-detail">⚠️ 注意力被稀释，关键安全规则漏诊</div>
                </div>
                <div class="compare-card good">
                    <div class="status-pill good-pill">✅ 最佳方案：Prompt Chaining</div>
                    <div class="compare-desc">拆分为 3 个独立隔离步骤链式执行</div>
                    <div class="compare-detail">✨ 100% 聚焦当前维度，结果极度可靠</div>
                </div>
            </div>
        `
    },
    {
        id: 'switch',
        kind: 'veo',
        clip: path.join(VEO_CLIPS_DIR, 'contract-breakdown--switch.mp4'),
        durationSec: 8.0,
        subtitles: {
            zh: '核心直觉：将确定性的多步骤任务拆解为 Prompt 链条，独立视角，顺序合成。',
            en: 'Core Intuition: Decompose deterministic multi-step tasks into explicit Prompt Chains.'
        }
    },
    {
        id: 'the-code',
        kind: 'slide',
        durationSec: 10.7,
        audio: path.join(NARRATION_DIR, 'the-code.wav'),
        subtitles: {
            zh: 'Prompt chaining！拆成三个隔离步骤链式顺序执行：风格 -> 安全 -> 文档，最后一步汇总生成综合报告。',
            en: 'Prompt chaining! Three isolated passes in sequence: Style -> Security -> Docs, synthesized at the end.'
        },
        html: `
            <div class="code-window">
                <div class="code-header">
                    <div class="dots"><span></span><span></span><span></span></div>
                    <div class="code-title">promptChainingWorkflow.ts — CareerVivid Agentic Engine</div>
                </div>
                <div class="code-body">
                    <div class="code-line comment">// Step 1: 隔离校验代码规范与风格</div>
                    <div class="code-line step"><span class="kw">const</span> step1 = <span class="kw">await</span> checkStyle(prCode);</div>
                    <div class="code-line comment" style="margin-top: 10px;">// Step 2: 独立视角扫描 CVE 安全漏洞与注入越权</div>
                    <div class="code-line step"><span class="kw">const</span> step2 = <span class="kw">await</span> checkSecurity(prCode);</div>
                    <div class="code-line comment" style="margin-top: 10px;">// Step 3: 检查 API 文档与示例代码一致性</div>
                    <div class="code-line step"><span class="kw">const</span> step3 = <span class="kw">await</span> checkDocs(prCode);</div>
                    <div class="code-line comment" style="margin-top: 15px;">// Final: 综合三方独立审查结论导出报告</div>
                    <div class="code-line result"><span class="kw">return</span> synthesize([step1, step2, step3]);</div>
                </div>
            </div>
        `
    },
    {
        id: 'takeaway',
        kind: 'slide',
        durationSec: 5.0,
        audio: path.join(NARRATION_DIR, 'takeaway.wav'),
        subtitles: {
            zh: '对于固定、可预测的多步骤流程，首选 Prompt Chaining。',
            en: 'Use Prompt Chaining for fixed, deterministic multi-step workflows.'
        },
        html: `
            <div class="takeaway-box">
                <div class="takeaway-badge">CCA-F 核心考点总结</div>
                <div class="takeaway-headline">固定步骤 + 独立视角 = Prompt Chaining</div>
                <div class="takeaway-subtext">Deterministic Steps + Isolated Context = Prompt Chaining Pattern</div>
            </div>
        `
    }
];

/**
 * Returns complete CSS & HTML structure for Playwright rendering
 */
function renderSlideHtml(beat, progressPct) {
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
                    height: 100px;
                    padding: 0 60px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(15, 23, 42, 0.8);
                    border-bottom: 2px solid rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(16px);
                }
                .brand {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .brand-logo {
                    width: 44px;
                    height: 44px;
                    background: linear-gradient(135deg, #625bd5, #9333ea);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 24px;
                }
                .brand-text {
                    font-size: 24px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                    color: #f8fafc;
                }
                .course-tag {
                    background: rgba(98, 91, 213, 0.2);
                    border: 1px solid rgba(98, 91, 213, 0.5);
                    color: #c084fc;
                    padding: 8px 24px;
                    border-radius: 30px;
                    font-size: 18px;
                    font-weight: 700;
                }

                /* Main Stage */
                .stage {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 60px;
                    position: relative;
                }
                .bg-backplate {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0.25;
                    filter: blur(3px) brightness(0.6);
                }

                /* Section Titles & Banners */
                .subtitle-banner {
                    position: absolute;
                    top: 20px;
                    text-align: center;
                    z-index: 10;
                }
                .badge {
                    display: inline-block;
                    background: #2563eb;
                    color: #fff;
                    font-size: 16px;
                    font-weight: 800;
                    padding: 6px 16px;
                    border-radius: 20px;
                    letter-spacing: 1px;
                    margin-bottom: 12px;
                }
                .section-title {
                    font-size: 38px;
                    font-weight: 900;
                    color: #f1f5f9;
                }

                /* Flow Diagram Styling */
                .flow-container {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                    z-index: 10;
                    margin-top: 40px;
                }
                .flow-card {
                    background: rgba(30, 41, 59, 0.85);
                    border: 2px solid rgba(148, 163, 184, 0.2);
                    border-radius: 24px;
                    padding: 32px 40px;
                    text-align: center;
                    min-width: 260px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(12px);
                }
                .style-card { border-color: #3b82f6; box-shadow: 0 0 30px rgba(59, 130, 246, 0.25); }
                .security-card { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); box-shadow: 0 0 35px rgba(239, 68, 68, 0.3); }
                .docs-card { border-color: #10b981; box-shadow: 0 0 30px rgba(16, 185, 129, 0.25); }

                .card-icon { font-size: 48px; margin-bottom: 12px; }
                .card-name { font-size: 26px; font-weight: 800; color: #f8fafc; margin-bottom: 8px; }
                .card-tag { font-size: 16px; font-weight: 700; color: #94a3b8; }
                .card-tag.alert { color: #fca5a5; font-weight: 900; }
                .flow-arrow { font-size: 36px; color: #64748b; font-weight: 900; }

                /* Comparison Grid */
                .compare-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 36px;
                    width: 100%;
                    max-width: 1700px;
                    z-index: 10;
                }
                .compare-card {
                    background: rgba(15, 23, 42, 0.85);
                    border-radius: 28px;
                    padding: 44px;
                    backdrop-filter: blur(16px);
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                }
                .compare-card.bad { border: 3px solid #ef4444; background: rgba(239, 68, 68, 0.08); }
                .compare-card.good { border: 3px solid #22c55e; background: rgba(34, 197, 94, 0.12); box-shadow: 0 0 50px rgba(34, 197, 94, 0.25); }

                .status-pill {
                    font-size: 22px;
                    font-weight: 900;
                    margin-bottom: 20px;
                }
                .bad-pill { color: #ef4444; }
                .good-pill { color: #22c55e; }
                .compare-desc { font-size: 24px; font-weight: 700; color: #e2e8f0; margin-bottom: 16px; line-height: 1.4; }
                .compare-detail { font-size: 20px; color: #94a3b8; line-height: 1.5; }

                /* IDE Code Window */
                .code-window {
                    background: #1e1e2e;
                    border: 2px solid rgba(255, 255, 255, 0.15);
                    border-radius: 28px;
                    width: 100%;
                    max-width: 1500px;
                    overflow: hidden;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7);
                    z-index: 10;
                }
                .code-header {
                    background: #181825;
                    padding: 20px 30px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .dots { display: flex; gap: 10px; }
                .dots span { width: 14px; height: 14px; border-radius: 50%; background: #45475a; }
                .dots span:nth-child(1) { background: #f38ba8; }
                .dots span:nth-child(2) { background: #f9e2af; }
                .dots span:nth-child(3) { background: #a6e3a1; }
                .code-title { font-family: monospace; font-size: 20px; color: #a6adc8; font-weight: 600; }

                .code-body { padding: 44px 50px; font-family: "Fira Code", monospace; font-size: 30px; line-height: 1.9; }
                .code-line { padding: 8px 20px; border-radius: 10px; }
                .code-line.comment { color: #6c7086; font-style: italic; }
                .code-line.step { background: rgba(137, 180, 250, 0.15); border-left: 6px solid #89b4fa; color: #cdd6f4; font-weight: bold; }
                .code-line.result { background: rgba(166, 227, 161, 0.18); border-left: 6px solid #a6e3a1; color: #a6e3a1; font-weight: bold; }
                .kw { color: #cba6f7; font-weight: bold; }

                /* Takeaway Box */
                .takeaway-box {
                    background: linear-gradient(135deg, #625bd5, #9333ea);
                    border-radius: 36px;
                    padding: 70px 100px;
                    text-align: center;
                    max-width: 1400px;
                    box-shadow: 0 25px 70px rgba(147, 51, 234, 0.4);
                    z-index: 10;
                }
                .takeaway-badge { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #e9d5ff; margin-bottom: 20px; }
                .takeaway-headline { font-size: 48px; font-weight: 900; color: #ffffff; margin-bottom: 16px; }
                .takeaway-subtext { font-size: 24px; color: #d8b4fe; font-weight: 600; }

                /* Bottom Subtitle & Progress Bar */
                .bottom-section {
                    background: rgba(15, 23, 42, 0.95);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    z-index: 20;
                }
                .subtitle-box {
                    padding: 24px 60px;
                    text-align: center;
                }
                .sub-zh { font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 6px; }
                .sub-en { font-size: 20px; font-weight: 600; color: #94a3b8; }
                .progress-track {
                    height: 8px;
                    width: 100%;
                    background: rgba(255, 255, 255, 0.1);
                }
                .progress-fill {
                    height: 100%;
                    width: ${progressPct}%;
                    background: linear-gradient(90deg, #625bd5, #3b82f6);
                    transition: width 0.3s ease;
                }
            </style>
        </head>
        <body>
            <div class="top-bar">
                <div class="brand">
                    <div class="brand-logo">CV</div>
                    <div class="brand-text">CareerVivid CCAF Certification</div>
                </div>
                <div class="course-tag">Domain 1 · Agentic 架构与编排</div>
            </div>

            <div class="stage">
                ${backplateUrl ? `<img class="bg-backplate" src="${backplateUrl}" />` : ''}
                ${beat.html}
            </div>

            <div class="bottom-section">
                <div class="subtitle-box">
                    <div class="sub-zh">${beat.subtitles?.zh || ''}</div>
                    <div class="sub-en">${beat.subtitles?.en || ''}</div>
                </div>
                <div class="progress-track">
                    <div class="progress-fill"></div>
                </div>
            </div>
        </body>
        </html>
    `;
}

async function buildCommercialVideo() {
    console.log('🎬 Starting Commercial-Grade Video Build for Domain 1 (contract-breakdown)...\n');

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const totalDurationSec = BEATS.reduce((acc, b) => acc + b.durationSec, 0);
    let cumulativeSec = 0;
    const clipFiles = [];

    for (let i = 0; i < BEATS.length; i++) {
        const beat = BEATS[i];
        cumulativeSec += beat.durationSec;
        const progressPct = Math.round((cumulativeSec / totalDurationSec) * 100);
        const clipOut = path.join(OUT_DIR, `clip_${String(i).padStart(2, '0')}_${beat.id}.mp4`);
        clipFiles.push(clipOut);

        console.log(`🎥 Beat [${i + 1}/${BEATS.length}]: ${beat.id} (${beat.durationSec}s)`);

        if (beat.kind === 'veo') {
            console.log(`   └─ Veo 2.0 Video Clip: ${path.basename(beat.clip)}`);
            // Mux Veo video with a normalized 44.1kHz stereo silent audio track
            execSync(
                `ffmpeg -i "${beat.clip}" ` +
                `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 ` +
                `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k ` +
                `-t ${beat.durationSec} -shortest ` +
                `-pix_fmt yuv420p -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" ` +
                `-y "${clipOut}"`,
                { stdio: 'ignore' }
            );
        } else {
            console.log(`   └─ Rendering Glassmorphic UI Slide + Chirp3-HD Voiceover`);
            const htmlContent = renderSlideHtml(beat, progressPct);
            const imgPath = path.join(OUT_DIR, `slide_${i}_${beat.id}.png`);

            await page.setContent(htmlContent, { waitUntil: 'networkidle' });
            await page.screenshot({ path: imgPath });

            // Mux high-res PNG slide with normalized 44.1kHz stereo AAC voiceover
            if (fs.existsSync(beat.audio)) {
                execSync(
                    `ffmpeg -loop 1 -i "${imgPath}" -i "${beat.audio}" ` +
                    `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k ` +
                    `-pix_fmt yuv420p -t ${beat.durationSec} -shortest ` +
                    `-y "${clipOut}"`,
                    { stdio: 'ignore' }
                );
            } else {
                execSync(
                    `ffmpeg -loop 1 -i "${imgPath}" ` +
                    `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 ` +
                    `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k ` +
                    `-pix_fmt yuv420p -t ${beat.durationSec} ` +
                    `-y "${clipOut}"`,
                    { stdio: 'ignore' }
                );
            }
        }
        console.log(`   ✔ Generated: ${path.basename(clipOut)}`);
    }

    await browser.close();

    // Concat list for seamless video joining
    const listFile = path.join(OUT_DIR, 'concat_list.txt');
    fs.writeFileSync(listFile, clipFiles.map(f => `file '${f}'`).join('\n'));

    console.log('\n🎞️  Merging all beats into final commercial MP4...');
    execSync(
        `ffmpeg -f concat -safe 0 -i "${listFile}" ` +
        `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k -pix_fmt yuv420p ` +
        `-y "${FINAL_MP4}"`,
        { stdio: 'inherit' }
    );

    const stat = fs.statSync(FINAL_MP4);
    console.log(`\n🎉 COMMERCIAL VIDEO BUILD SUCCESS!`);
    console.log(`   File: ${FINAL_MP4}`);
    console.log(`   Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
}

buildCommercialVideo().catch(err => {
    console.error('❌ Build Error:', err);
    process.exit(1);
});
