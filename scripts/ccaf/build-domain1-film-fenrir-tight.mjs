/**
 * build-domain1-film-fenrir-tight.mjs
 *
 * High-Energy, Storytelling YouTube Explainer Compiler for "The One-Person Agency".
 *
 * Features:
 *   - Pedagogical storytelling & background setup before technical decisions
 *   - Clear explanation of numbers (50B vs 35B market size estimation)
 *   - Smooth transition to practice quizzes at the ending
 *   - 5 New vertex AI Gemini 2.5 Flash stick figure backplates
 *   - Intro-only BGM (bgm-d12.mp3 softly playing for first stick figure, fading out by sec 7.0)
 *   - 100% clean, crisp Chirp3-HD Fenrir narration for the rest of the video
 *
 * Output: public/ccaf-lessons/domain-1-fenrir.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { DOMAIN_1_FILM, assertFullCoverage, assertContentMatchesMissions } from './domain1Script.ts';
import { listDomains } from '../../src/lib/questSource.ts';

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

// The hard-coded list above only proves a beat exists per mission. This proves
// the beat is teaching that mission's actual answer — read straight from the
// question bank, so the film cannot quietly drift away from the exam.
{
    const missionText = {};
    for (const mission of listDomains().find(d => d.order === 1).missions) {
        missionText[mission.id] = mission.steps
            .map(step => [step.prompt.en, step.takeaway?.en ?? '', ...step.options.map(o => o.text.en)].join(' '))
            .join(' ');
    }
    assertContentMatchesMissions(missionText);
    console.log('✓ content check: every beat matches the question it teaches');
}

const OUT_DIR = path.resolve('scratchpad/film_render_fenrir_tight');
const FINAL_MP4 = path.resolve('public/ccaf-lessons/domain-1-fenrir.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/domain-1-overview/en/chirp-fenrir');
const BACKPLATE_DIR = path.resolve('public/assets/ccaf-backplates');
const BGM_D12_PATH = path.resolve('public/assets/bgm-d12.mp3');

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

    'dominoes': { num: '3', title: 'Chapter 3 · Action Order & Concurrency' },
    'forced-first': { num: '3', title: 'Chapter 3 · Forced Tool Choice Protocol' },
    'twelve-at-once': { num: '3', title: 'Chapter 3 · Synchronous Parallel Raids' },

    'canyon-shout': { num: '4', title: 'Chapter 4 · Pitfalls That Fall in the Gap' },
    'no-inheritance': { num: '4', title: 'Chapter 4 · Clean Subagent Context' },
    'two-numbers': { num: '4', title: 'Chapter 4 · Resolving Conflicting Intelligence' },
    'citation-id': { num: '4', title: 'Chapter 4 · Chain of Evidence & Citation IDs' },

    'burst-pipes': { num: '5', title: 'Chapter 5 · Pipeline Collapse & Recovery' },
    'tell-it-what-changed': { num: '5', title: 'Chapter 5 · Explicit Delta Protocol' },
    'checkpoint': { num: '5', title: 'Chapter 5 · Clean Session Restart' },
    'three-hundred': { num: '5', title: 'Chapter 5 · Context Exhaustion & Recovery' },

    'thirteen-doors': { num: 'Epilogue', title: 'Epilogue · The 13 Doors' },
    'go-find-out': { num: 'Epilogue', title: 'Epilogue · Practice Quiz Time' },
};

function getWavDurationSeconds(wavPath) {
    if (!fs.existsSync(wavPath)) return 0;
    try {
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`, { encoding: 'utf8' });
        return parseFloat(out.trim()) || 0;
    } catch {
        return 0;
    }
}

function buildHTML(beat, backplateUrl, progressPercent, chapterInfo) {
    const subtitleEn = beat.narration?.en ?? '';
    const subtitleZh = beat.narration?.zh ?? '';

    // Rendered from `beat.visual`, not written out per beat.
    //
    // These cards used to be fourteen hand-written HTML blocks that happened to
    // sit next to the script. The two drifted: the script said one thing, the
    // card on screen said another, and the content check could only see the
    // script. Driving both from the same data is what makes that check mean
    // something.
    const ACCENT = {
        'roadmap': 'blue', 'stop-reason': 'amber', 'three-coats': 'red',
        'dont-delegate': 'purple', 'three-passes': 'indigo', 'brief-with-goals': 'sky',
        'forced-first': 'amber', 'twelve-at-once': 'blue', 'no-inheritance': 'purple',
        'two-numbers': 'red', 'citation-id': 'indigo', 'tell-it-what-changed': 'purple',
        'checkpoint': 'green', 'three-hundred': 'sky', 'go-find-out': 'green',
    };
    const accent = ACCENT[beat.id] ?? 'blue';
    const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const missionTag = (beat.teaches ?? []).join(' · ').replace(/-/g, ' ').toUpperCase();

    const v = beat.visual;
    let body = '';

    if (v?.type === 'rows') {
        body = v.rows.map(r => `
            <div class="compare-box ${r.verdict === 'good' ? 'box-green' : 'box-red'}">
                <div class="box-head">${r.verdict === 'good' ? '✅' : '❌'} ${esc(r.term)}</div>
                <div class="box-body">${esc(r.detail.en)}<br/><span class="sub-zh-inline">${esc(r.detail.zh)}</span></div>
            </div>`).join('');
        body = `<div class="banner-stack">${body}</div>`;
    } else if (v?.type === 'columns') {
        body = `<div class="compare-grid">${v.items.map(i => `
            <div class="compare-box ${i.verdict === 'good' ? 'box-green' : 'box-red'}">
                <div class="box-head">${i.verdict === 'good' ? '✅ DO THIS' : '❌ COMMON TRAP'}</div>
                <div class="box-body"><b>${esc(i.label.en)}</b>${i.note ? `<br/>${esc(i.note.en)}` : ''}</div>
            </div>`).join('')}</div>`;
    } else if (v?.type === 'flow') {
        body = `<div class="flow-row">${v.nodes.map((n, idx) =>
            `<div class="flow-node ${idx === 0 ? 'node-active' : ''}">${esc(n)}</div>`)
            .join('<div class="flow-arrow">➔</div>')}</div>`;
    } else if (v?.type === 'code') {
        body = `<div class="code-box">${v.lines.map(l =>
            `<div class="code-line" ${l.dim ? 'style="opacity:.55"' : ''}>${esc(l.text)}</div>`).join('')}</div>`;
    } else if (v?.type === 'card') {
        body = `<div class="banner banner-green">${esc(v.headline.en)}</div>`;
    }

    const visualContentHtml = body
        ? `<div class="card glass shadow glow-${accent}">
               ${missionTag ? `<div class="card-badge badge-${accent}">MISSION · ${missionTag}</div>` : ''}
               ${beat.overlayTitle ? `<div class="card-title">${esc(beat.overlayTitle)}</div>` : ''}
               ${body}
           </div>`
        : '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"/>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                width: 1920px; height: 1080px;
                background-color: #0b0f19;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: #ffffff;
                position: relative;
                overflow: hidden;
            }
            .backplate {
                position: absolute;
                inset: 0;
                width: 100%; height: 100%;
                object-fit: cover;
                /* Pull the framing left so the figure sits in the clear half.
                   The card used to be centred on top of the character, which
                   hid the one thing the illustration was drawn for. */
                object-position: 26% 42%;
                opacity: 0.95;
            }
            /* Darkens only the card side, so the card stays readable over a
               white illustration without dimming the character. */
            .scrim {
                position: absolute;
                inset: 0;
                background: linear-gradient(100deg,
                    rgba(11,15,25,0) 0%, rgba(11,15,25,0) 34%,
                    rgba(11,15,25,0.55) 50%, rgba(11,15,25,0.88) 68%);
                z-index: 5;
            }
            .overlay-container {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 40px 60px 50px 60px;
                z-index: 10;
            }
            .top-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ch-badge {
                background: rgba(15, 23, 42, 0.85);
                border: 2px solid #38bdf8;
                padding: 10px 24px;
                border-radius: 30px;
                font-weight: 700;
                font-size: 20px;
                color: #38bdf8;
                letter-spacing: 0.5px;
                backdrop-filter: blur(12px);
            }
            .brand-badge {
                background: rgba(15, 23, 42, 0.85);
                border: 1px solid #334155;
                padding: 8px 20px;
                border-radius: 20px;
                font-size: 18px;
                color: #94a3b8;
                backdrop-filter: blur(12px);
            }
            .center-stage {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 20px;
            }
            /* Right rail, used only when an illustration is present: the
               character owns the left, the teaching owns the right, and
               neither covers the other. Without a backplate this would just
               leave half the frame empty, so the card stays centred instead. */
            .center-stage.has-art { justify-content: flex-end; }
            .center-stage.has-art > .card { width: 860px; }
            .card {
                width: 1100px;
                padding: 36px 44px;
                border-radius: 24px;
                background: rgba(13, 17, 23, 0.88);
                backdrop-filter: blur(16px);
                border: 2px solid #334155;
            }
            .shadow { box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
            .glow-blue { border-color: #38bdf8; box-shadow: 0 0 40px rgba(56, 189, 248, 0.25); }
            .glow-amber { border-color: #f59e0b; box-shadow: 0 0 40px rgba(245, 158, 11, 0.25); }
            .glow-purple { border-color: #8b5cf6; box-shadow: 0 0 40px rgba(139, 92, 246, 0.25); }
            .glow-green { border-color: #10b981; box-shadow: 0 0 40px rgba(16, 185, 129, 0.25); }
            .glow-indigo { border-color: #6366f1; box-shadow: 0 0 40px rgba(99, 102, 241, 0.25); }
            .glow-sky { border-color: #0ea5e9; box-shadow: 0 0 40px rgba(14, 165, 233, 0.25); }
            .glow-red { border-color: #ef4444; box-shadow: 0 0 40px rgba(239, 68, 68, 0.25); }

            .card-badge {
                display: inline-block;
                padding: 6px 16px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 800;
                letter-spacing: 1px;
                margin-bottom: 16px;
            }
            .badge-blue { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid #38bdf8; }
            .badge-amber { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid #f59e0b; }
            .badge-purple { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid #8b5cf6; }
            .badge-green { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border: 1px solid #10b981; }
            .badge-indigo { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid #6366f1; }
            .badge-sky { background: rgba(14, 165, 233, 0.15); color: #7dd3fc; border: 1px solid #0ea5e9; }
            .badge-red { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid #ef4444; }

            .card-title { font-size: 34px; font-weight: 800; color: #ffffff; margin-bottom: 12px; }
            .card-sub { font-size: 20px; color: #94a3b8; margin-bottom: 24px; }

            .flow-row { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }
            .flow-node {
                background: #1e293b; border: 2px solid #334155; padding: 16px 22px;
                border-radius: 16px; font-weight: 700; font-size: 20px; color: #cbd5e1;
            }
            .node-active { border-color: #38bdf8; color: #38bdf8; background: rgba(56, 189, 248, 0.1); }
            .flow-arrow { font-size: 24px; color: #475569; }

            .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
            .compare-box { padding: 20px; border-radius: 16px; border: 2px solid; }
            .box-red { background: rgba(69, 10, 10, 0.6); border-color: #ef4444; }
            .box-green { background: rgba(6, 78, 59, 0.6); border-color: #10b981; }
            .box-head { font-weight: 800; font-size: 20px; margin-bottom: 8px; }
            .box-red .box-head { color: #fca5a5; }
            .box-green .box-head { color: #6ee7b7; }
            .box-body { font-size: 18px; color: #e2e8f0; line-height: 1.5; }

            .three-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 16px; }
            .grid-card { background: #1e293b; border-radius: 16px; padding: 20px; border: 2px solid; text-align: center; }
            .border-purple { border-color: #8b5cf6; }
            .border-amber { border-color: #f59e0b; }
            .border-pink { border-color: #ec4899; }
            .border-indigo { border-color: #6366f1; }
            .grid-icon { font-size: 36px; margin-bottom: 8px; }
            .grid-title { font-weight: 700; font-size: 20px; margin-bottom: 8px; color: #fff; }
            .grid-desc { font-size: 16px; color: #94a3b8; line-height: 1.4; }
            .hl-green { color: #10b981; font-weight: 700; }

            .banner-stack { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
            .banner { padding: 18px 24px; border-radius: 14px; font-size: 20px; font-weight: 700; border: 2px solid; }
            .banner-red { background: rgba(69, 10, 10, 0.7); border-color: #ef4444; color: #fca5a5; }
            .banner-green { background: rgba(6, 78, 59, 0.7); border-color: #10b981; color: #6ee7b7; }
            .banner-blue { background: rgba(12, 74, 110, 0.7); border-color: #0ea5e9; color: #7dd3fc; }

            .code-box { background: #0f172a; border: 2px solid #334155; padding: 20px; border-radius: 16px; font-family: monospace; font-size: 20px; margin-top: 16px; }
            .code-line { margin-bottom: 8px; }
            .c-purple { color: #c4b5fd; font-weight: bold; }
            .c-blue { color: #38bdf8; font-weight: bold; }

            .stat-highlight { background: rgba(14, 165, 233, 0.15); border: 2px solid #0ea5e9; padding: 24px; border-radius: 16px; font-size: 24px; font-weight: 800; color: #7dd3fc; text-align: center; margin-top: 16px; }

            .recap-list { display: grid; grid-template-columns: 1fr; gap: 12px; font-size: 22px; color: #6ee7b7; font-weight: 700; margin-top: 16px; }

            .banner-stack > .compare-box { margin-bottom: 12px; }
            .banner-stack > .compare-box:last-child { margin-bottom: 0; }
            .sub-zh-inline { color: #94a3b8; font-size: 0.85em; }
            .subtitle-container {
                background: rgba(15, 23, 42, 0.92);
                border: 2px solid #334155;
                padding: 16px 36px;
                border-radius: 20px;
                text-align: center;
                backdrop-filter: blur(12px);
                max-width: 1600px;
                margin: 0 auto;
            }
            .sub-en { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
            .sub-zh { font-size: 18px; color: #94a3b8; }

            .progress-bar {
                position: absolute; bottom: 0; left: 0; height: 6px;
                background: linear-gradient(90deg, #38bdf8, #10b981, #f59e0b, #ec4899);
                width: ${progressPercent}%;
                transition: width 0.3s linear;
            }
        </style>
    </head>
    <body>
        ${backplateUrl ? `<img class="backplate" src="${backplateUrl}"/>` : ''}
        ${backplateUrl && visualContentHtml ? '<div class="scrim"></div>' : ''}
        <div class="overlay-container">
            <div class="top-bar">
                <div class="ch-badge">${chapterInfo.title}</div>
                <div class="brand-badge">CareerVivid Agentic Architecture · Domain 1</div>
            </div>
            <div class="center-stage${backplateUrl && visualContentHtml ? ' has-art' : ''}">
                ${visualContentHtml}
            </div>
            <div class="subtitle-container">
                <div class="sub-en">${subtitleEn}</div>
                <div class="sub-zh">${subtitleZh}</div>
            </div>
        </div>
        <div class="progress-bar"></div>
    </body>
    </html>
    `;
}

async function buildFilm() {
    console.log('🚀 Rendering Domain 1 Film (Storytelling + New Backplates + Quiz Ending Transition)...\n');

    const beatsToProcess = [];
    let totalSeconds = 0;

    for (const beat of DOMAIN_1_FILM.beats) {
        const audioPath = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const backplateFile = path.join(BACKPLATE_DIR, `domain-1-overview--${beat.id}.png`);

        let hasAudio = fs.existsSync(audioPath);
        let durationSec = hasAudio ? getWavDurationSeconds(audioPath) : 2.5;

        beatsToProcess.push({
            beat,
            durationSec: Math.max(durationSec, 2.5),
            audioPath: hasAudio ? audioPath : null,
            backplatePath: fs.existsSync(backplateFile) ? backplateFile : null,
        });

        totalSeconds += Math.max(durationSec, 2.5);
    }

    console.log(`📹 Total Beats: ${beatsToProcess.length}`);
    console.log(`⏱️ Seamless Video Duration: ${(totalSeconds / 60).toFixed(2)} mins (${totalSeconds.toFixed(1)}s)\n`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const beatVideoFiles = [];
    let accumulatedTime = 0;

    for (let i = 0; i < beatsToProcess.length; i++) {
        const { beat, durationSec, audioPath, backplatePath } = beatsToProcess[i];
        accumulatedTime += durationSec;
        const progressPercent = Math.round((accumulatedTime / totalSeconds) * 100);
        const chapterInfo = CHAPTER_MAP_EN[beat.id] || { num: '1', title: 'Chapter 1 · Agentic Architecture' };

        console.log(`🎬 Processing Beat [${i + 1}/${beatsToProcess.length}]: ${beat.id} (${durationSec.toFixed(1)}s)...`);

        let backplateDataUrl = '';
        if (backplatePath) {
            const base64 = fs.readFileSync(backplatePath).toString('base64');
            backplateDataUrl = `data:image/png;base64,${base64}`;
        }

        const html = buildHTML(beat, backplateDataUrl, progressPercent, chapterInfo);
        await page.setContent(html, { waitUntil: 'load' });

        const frameImgPath = path.join(OUT_DIR, `beat_${String(i).padStart(2, '0')}.png`);
        await page.screenshot({ path: frameImgPath, type: 'png' });

        const beatMp4 = path.join(OUT_DIR, `beat_${String(i).padStart(2, '0')}.mp4`);

        let ffmpegCmd = '';
        if (audioPath) {
            ffmpegCmd = `ffmpeg -y -loop 1 -i "${frameImgPath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${beatMp4}"`;
        } else {
            ffmpegCmd = `ffmpeg -y -loop 1 -i "${frameImgPath}" -f lavfi -i anullsrc=r=24000:cl=mono -c:v libx264 -tune stillimage -c:a aac -t ${durationSec.toFixed(2)} -pix_fmt yuv420p "${beatMp4}"`;
        }

        execSync(ffmpegCmd, { stdio: 'pipe' });
        beatVideoFiles.push(beatMp4);
    }

    await browser.close();

    console.log('\n🎞️ Concatenating all beat MP4 files into continuous film...');
    const rawConcatMp4 = path.join(OUT_DIR, 'raw_concat.mp4');
    const concatListPath = path.join(OUT_DIR, 'concat_list.txt');
    const concatContent = beatVideoFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${rawConcatMp4}"`, { stdio: 'pipe' });

    console.log('\n🎵 Muxing soft bgm-d12.mp3 for intro stick figure, fading out by sec 7.5...');

    if (fs.existsSync(BGM_D12_PATH)) {
        const muxCmd = `ffmpeg -y -i "${rawConcatMp4}" -i "${BGM_D12_PATH}" -filter_complex "[1:a]volume=0.05,afade=t=out:st=3.5:d=3.5[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${FINAL_MP4}"`;
        execSync(muxCmd, { stdio: 'pipe' });
    } else {
        fs.copyFileSync(rawConcatMp4, FINAL_MP4);
    }

    const finalSize = fs.existsSync(FINAL_MP4) ? (fs.readFileSync(FINAL_MP4).length / (1024 * 1024)).toFixed(2) : 0;
    const finalDuration = getWavDurationSeconds(FINAL_MP4);

    console.log(`\n🎉 High-Energy Storytelling Video Successfully Compiled!`);
    console.log(`📹 Output Video: ${FINAL_MP4}`);
    console.log(`⏱️ Duration: ${(finalDuration / 60).toFixed(2)} mins (${finalDuration.toFixed(1)}s)`);
    console.log(`📦 Size: ${finalSize} MB`);
}

buildFilm().catch(console.error);
