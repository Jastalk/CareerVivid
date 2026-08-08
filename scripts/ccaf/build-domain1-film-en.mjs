/**
 * build-domain1-film-en.mjs
 *
 * Fast-Paced, Ultra-Realistic English Film Compiler for "The One-Person Agency".
 *
 * Key Features:
 *   - English Hyper-Realistic Journey TTS Voiceover (journey-f)
 *   - Primary English Subtitles + Secondary Chinese Subtitles
 *   - English Glassmorphic Diagrams, Badges & Takeaway Cards
 *   - Sam O'Nella Expressive Vertex AI Gemini Backplates
 *   - 13/13 Domain 1 Mission Coverage Contract (assertFullCoverage)
 *
 * Output: public/ccaf-lessons/domain-1-en.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { DOMAIN_1_FILM, assertFullCoverage } from './domain1Script.ts';

const ALL_DOMAIN_1_MISSIONS = [
    'read-the-signal',
    'two-truncations',
    'dont-delegate',
    'follow-thread',
    'contract-breakdown',
    'recruit-agents',
    'order-of-ops',
    'parallel-strike',
    'intel-handoff',
    'conflicting-intel',
    'chain-of-custody',
    'scene-changed',
    'pipeline-down'
];

assertFullCoverage(ALL_DOMAIN_1_MISSIONS);

const OUT_DIR = path.resolve('scratchpad/fast_film_render_en');
const FINAL_MP4 = path.resolve('public/ccaf-lessons/domain-1-en.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/domain-1-overview/en/journey-f');
const BACKPLATE_DIR = path.resolve('public/assets/ccaf-backplates');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const CHAPTER_MAP_EN = {
    'open-buried': { num: '0', title: 'Prologue · The Buried Desk' },
    'roadmap': { num: '0', title: 'Overview · Five Architecture Rules' },

    'no-brakes': { num: '1', title: 'Chapter 1 · One Agent, One Loop' },
    'stop-reason': { num: '1', title: 'Chapter 1 · Branching on stop_reason' },
    'three-coats': { num: '1', title: 'Chapter 1 · Three Truncation Failure Modes' },

    'queue-of-helpers': { num: '2', title: 'Chapter 2 · Delegation & Subagents' },
    'dont-delegate': { num: '2', title: 'Chapter 2 · When NOT to Delegate' },
    'three-passes': { num: '2', title: 'Chapter 2 · Splitting by Thinking Mode' },
    'script-vs-goal': { num: '2', title: 'Chapter 2 · Script vs Goal Guidance' },
    'brief-with-goals': { num: '2', title: 'Chapter 2 · Goal-Oriented Prompts' },

    'dominoes': { num: '3', title: 'Chapter 3 · Execution Order & Speed' },
    'forced-first': { num: '3', title: 'Chapter 3 · Forced Tool Choice in Turn 1' },
    'twelve-at-once': { num: '3', title: 'Chapter 3 · High-Parallel Task Striking' },

    'canyon-shout': { num: '4', title: 'Chapter 4 · Information Gaps & Handoffs' },
    'no-inheritance': { num: '4', title: 'Chapter 4 · Context Isolation Rules' },
    'two-numbers': { num: '4', title: 'Chapter 4 · Resolving Conflicting Intelligence' },
    'citation-id': { num: '4', title: 'Chapter 4 · Chain of Custody & Citation IDs' },

    'burst-pipes': { num: '5', title: 'Chapter 5 · Recovery & Pipeline Failures' },
    'tell-it-what-changed': { num: '5', title: 'Chapter 5 · Explicit State Diffs' },
    'checkpoint': { num: '5', title: 'Chapter 5 · Checkpoint & Clean Sessions' },
    'three-hundred': { num: '5', title: 'Chapter 5 · Targeted Custom ID Retries' },

    'thirteen-doors': { num: 'Epilogue', title: 'Epilogue · Thirteen Open Doors' },
    'go-find-out': { num: 'Epilogue', title: 'Epilogue · Inspecting the Signals' },
};

function renderBeatHtmlEn(beat, progressPct) {
    const chapter = CHAPTER_MAP_EN[beat.id] || { num: '—', title: 'The One-Person Agency' };

    const backplatePath = path.join(BACKPLATE_DIR, `domain-1-overview--${beat.id}.png`);
    let backplateUrl = '';
    if (fs.existsSync(backplatePath)) {
        const base64 = fs.readFileSync(backplatePath).toString('base64');
        backplateUrl = `data:image/png;base64,${base64}`;
    }

    let visualHtml = '';
    if (beat.visual) {
        const v = beat.visual;
        if (v.type === 'flow') {
            visualHtml = `
                <div class="flow-container">
                    ${v.nodes.map((node, idx) => `
                        <div class="flow-node">${node}</div>
                        ${idx < v.nodes.length - 1 ? '<div class="flow-arrow">➔</div>' : ''}
                    `).join('')}
                </div>
            `;
        } else if (v.type === 'columns') {
            visualHtml = `
                <div class="compare-grid">
                    ${v.items.map(item => `
                        <div class="compare-card ${item.verdict}">
                            <div class="card-status">${item.verdict === 'good' ? '✅ Correct Strategy' : '❌ Common Trap'}</div>
                            <div class="card-label">${item.label.en}</div>
                            ${item.note ? `<div class="card-note">${item.note.en}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (v.type === 'rows') {
            visualHtml = `
                <div class="rows-container">
                    ${v.rows.map(row => `
                        <div class="row-item ${row.verdict || ''}">
                            <div class="row-term">${row.term}</div>
                            <div class="row-detail">${row.detail.en}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (v.type === 'card') {
            visualHtml = `
                <div class="card-box">
                    <div class="card-headline">${v.headline.en}</div>
                    <div class="card-sub">${v.headline.zh}</div>
                </div>
            `;
        }
    }

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
                    background: #08090e;
                    color: #ffffff;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                /* English Top Bar */
                .top-bar {
                    height: 85px;
                    padding: 0 45px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(15, 23, 42, 0.9);
                    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(16px);
                }
                .brand { display: flex; align-items: center; gap: 16px; }
                .brand-logo {
                    width: 42px;
                    height: 42px;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 22px;
                    color: #fff;
                    box-shadow: 0 0 20px rgba(37, 99, 235, 0.5);
                }
                .brand-title { font-size: 24px; font-weight: 900; color: #f8fafc; letter-spacing: -0.5px; }
                .chapter-badge {
                    background: rgba(37, 99, 235, 0.3);
                    border: 1.5px solid rgba(37, 99, 235, 0.7);
                    color: #93c5fd;
                    padding: 6px 22px;
                    border-radius: 30px;
                    font-size: 17px;
                    font-weight: 800;
                    box-shadow: 0 0 15px rgba(37, 99, 235, 0.3);
                }

                /* Stage Container */
                .stage {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 30px;
                    position: relative;
                }
                .bg-img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: ${beat.kind === 'veo' ? '0.9' : '0.35'};
                    filter: ${beat.kind === 'veo' ? 'contrast(1.1) brightness(0.95)' : 'blur(2px) brightness(0.6)'};
                }

                /* Flow Nodes */
                .flow-container { display: flex; align-items: center; gap: 20px; z-index: 10; flex-wrap: wrap; justify-content: center; }
                .flow-node {
                    background: rgba(30, 41, 59, 0.92);
                    border: 2px solid #3b82f6;
                    border-radius: 18px;
                    padding: 22px 34px;
                    font-size: 26px;
                    font-weight: 800;
                    color: #60a5fa;
                    box-shadow: 0 12px 30px rgba(0,0,0,0.6);
                }
                .flow-arrow { font-size: 32px; color: #94a3b8; font-weight: 900; }

                /* Compare Grid */
                .compare-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; width: 100%; max-width: 1650px; z-index: 10; }
                .compare-card {
                    background: rgba(15, 23, 42, 0.9);
                    border-radius: 22px;
                    padding: 32px;
                    backdrop-filter: blur(14px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
                }
                .compare-card.bad { border: 2px solid #ef4444; background: rgba(239, 68, 68, 0.1); }
                .compare-card.good { border: 3px solid #22c55e; background: rgba(34, 197, 94, 0.15); box-shadow: 0 0 35px rgba(34, 197, 94, 0.3); }
                .card-status { font-size: 20px; font-weight: 900; margin-bottom: 12px; }
                .compare-card.bad .card-status { color: #ef4444; }
                .compare-card.good .card-status { color: #22c55e; }
                .card-label { font-size: 24px; font-weight: 800; color: #f8fafc; margin-bottom: 10px; line-height: 1.4; }
                .card-note { font-size: 18px; color: #cbd5e1; line-height: 1.5; }

                /* Rows Table */
                .rows-container { display: flex; flex-direction: column; gap: 18px; width: 100%; max-width: 1500px; z-index: 10; }
                .row-item {
                    background: rgba(30, 41, 59, 0.9);
                    border-left: 6px solid #3b82f6;
                    border-radius: 16px;
                    padding: 22px 32px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.4);
                }
                .row-item.good { border-left-color: #22c55e; background: rgba(34, 197, 94, 0.12); }
                .row-item.bad { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.12); }
                .row-term { font-size: 26px; font-weight: 800; color: #f8fafc; font-family: monospace; }
                .row-detail { font-size: 22px; color: #cbd5e1; font-weight: 600; }

                /* Card Box */
                .card-box {
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    border-radius: 32px;
                    padding: 60px 90px;
                    text-align: center;
                    max-width: 1400px;
                    box-shadow: 0 25px 70px rgba(37, 99, 235, 0.5);
                    z-index: 10;
                }
                .card-headline { font-size: 52px; font-weight: 900; color: #ffffff; margin-bottom: 14px; }
                .card-sub { font-size: 26px; color: #93c5fd; font-weight: 600; }

                /* Primary English Subtitle Bar */
                .bottom-section {
                    background: rgba(15, 23, 42, 0.95);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    z-index: 20;
                }
                .subtitle-box { padding: 18px 50px; text-align: center; }
                .sub-en { font-size: 28px; font-weight: 800; color: #ffffff; margin-bottom: 4px; line-height: 1.3; }
                .sub-zh { font-size: 19px; font-weight: 600; color: #94a3b8; }
                .progress-track { height: 8px; width: 100%; background: rgba(255, 255, 255, 0.1); }
                .progress-fill { height: 100%; width: ${progressPct}%; background: linear-gradient(90deg, #2563eb, #38bdf8); transition: width 0.2s linear; }
            </style>
        </head>
        <body>
            <div class="top-bar">
                <div class="brand">
                    <div class="brand-logo">CV</div>
                    <div class="brand-title">The One-Person Agency · Agentic Architecture & Orchestration</div>
                </div>
                <div class="chapter-badge">${chapter.title}</div>
            </div>

            <div class="stage">
                ${backplateUrl ? `<img class="bg-img" src="${backplateUrl}" />` : ''}
                ${visualHtml}
            </div>

            <div class="bottom-section">
                <div class="subtitle-box">
                    <div class="sub-en">${beat.narration?.en || ''}</div>
                    <div class="sub-zh">${beat.narration?.zh || ''}</div>
                </div>
                <div class="progress-track">
                    <div class="progress-fill"></div>
                </div>
            </div>
        </body>
        </html>
    `;
}

async function buildFastFilmEn() {
    console.log(`🚀 Building English Film with Journey-F Human Voice (${DOMAIN_1_FILM.beats.length} Beats)...\n`);

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const totalBeats = DOMAIN_1_FILM.beats.length;
    const clipFiles = [];

    for (let i = 0; i < totalBeats; i++) {
        const beat = DOMAIN_1_FILM.beats[i];
        const progressPct = Math.round(((i + 1) / totalBeats) * 100);
        const clipOut = path.join(OUT_DIR, `beat_${String(i + 1).padStart(2, '0')}_${beat.id}.mp4`);
        clipFiles.push(clipOut);

        const visualDuration = beat.narration ? 3.0 : 2.8;
        const audioPath = path.join(NARRATION_DIR, `${beat.id}.wav`);

        console.log(`🎥 [${i + 1}/${totalBeats}] English Beat: ${beat.id}`);

        const htmlContent = renderBeatHtmlEn(beat, progressPct);
        const imgPath = path.join(OUT_DIR, `slide_${i + 1}_${beat.id}.png`);

        await page.setContent(htmlContent, { waitUntil: 'networkidle' });
        await page.screenshot({ path: imgPath });

        if (fs.existsSync(audioPath)) {
            // Mux with English Journey-F TTS WAV, zero dead air
            execSync(
                `ffmpeg -loop 1 -i "${imgPath}" -i "${audioPath}" ` +
                `-c:v libx264 -preset ultrafast -crf 19 -c:a aac -ar 44100 -ac 2 -b:a 192k ` +
                `-pix_fmt yuv420p -shortest ` +
                `-y "${clipOut}"`,
                { stdio: 'ignore' }
            );
            console.log(`   🎙️ Muxed with English Journey-F Voice (${path.basename(audioPath)})`);
        } else {
            // Visual beat (2.8s)
            execSync(
                `ffmpeg -loop 1 -i "${imgPath}" ` +
                `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 ` +
                `-c:v libx264 -preset ultrafast -crf 19 -c:a aac -ar 44100 -ac 2 -b:a 192k ` +
                `-pix_fmt yuv420p -t ${visualDuration} ` +
                `-y "${clipOut}"`,
                { stdio: 'ignore' }
            );
            console.log(`   ⚡ Visual Beat (${visualDuration}s)`);
        }
    }

    await browser.close();

    // Concat list
    const listFile = path.join(OUT_DIR, 'concat_list.txt');
    fs.writeFileSync(listFile, clipFiles.map(f => `file '${f}'`).join('\n'));

    console.log('\n🎞️  Concatenating all English beats into final MP4...');
    execSync(
        `ffmpeg -f concat -safe 0 -i "${listFile}" ` +
        `-c:v libx264 -preset slow -crf 18 -c:a aac -ar 44100 -ac 2 -b:a 192k -pix_fmt yuv420p ` +
        `-y "${FINAL_MP4}"`,
        { stdio: 'inherit' }
    );

    const stat = fs.statSync(FINAL_MP4);
    console.log(`\n🎉 ENGLISH FILM BUILD SUCCESS!`);
    console.log(`   File: ${FINAL_MP4}`);
    console.log(`   Size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
}

buildFastFilmEn().catch(err => {
    console.error('❌ English Build Error:', err);
    process.exit(1);
});
