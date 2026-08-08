/**
 * build-domain1-film-fenrir.mjs
 *
 * Fast-Paced, High-Energy English YouTube Explainer Video Compiler for "The One-Person Agency".
 *
 * Key Features:
 *   - Google Cloud TTS Chirp3-HD Fenrir (High-energy YouTube Narrator Voice)
 *   - Sam O'Nella Expressive Vertex AI Gemini 2.5 Flash Stick Figure Backplates
 *   - Glassmorphic UI Diagrams, Badges & Takeaway Cards
 *   - Dual Subtitles (Primary English + Secondary Chinese)
 *   - 13/13 Domain 1 Mission Coverage Verification
 *
 * Output: public/ccaf-lessons/domain-1-fenrir.mp4
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

const OUT_DIR = path.resolve('scratchpad/film_render_fenrir');
const FINAL_MP4 = path.resolve('public/ccaf-lessons/domain-1-fenrir.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/domain-1-overview/en/chirp-fenrir');
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
    'go-find-out': { num: 'Epilogue', title: 'Epilogue · Go Build' },
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

    let visualContentHtml = '';

    if (beat.id === 'roadmap') {
        visualContentHtml = `
            <div class="card glass shadow glow-blue">
                <div class="card-badge badge-blue">FIVE ARCHITECTURE RULES</div>
                <div class="card-title">The One-Person Agency</div>
                <div class="card-sub">Mastering Single & Multi-Agent Systems in Production</div>
                <div class="flow-row">
                    <div class="flow-node node-active">1. One Loop</div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-node">2. Split Work</div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-node">3. Order & Speed</div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-node">4. The Gap</div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-node">5. Recovery</div>
                </div>
            </div>
        `;
    } else if (beat.id === 'stop-reason') {
        visualContentHtml = `
            <div class="card glass shadow glow-amber">
                <div class="card-badge badge-amber">MISSION · READ THE SIGNAL</div>
                <div class="card-title">stop_reason is the Brake — Not a Round Counter</div>
                <div class="compare-grid">
                    <div class="compare-box box-red">
                        <div class="box-head">❌ COMMON TRAP</div>
                        <div class="box-body">Loop N rounds & stop<br/><b>Consequence:</b> Missing end_turn signal</div>
                    </div>
                    <div class="compare-box box-green">
                        <div class="box-head">✅ CORRECT PATTERN</div>
                        <div class="box-body">Stop strictly on <code>end_turn</code><br/><b>Result:</b> Clean, predictable termination</div>
                    </div>
                </div>
            </div>
        `;
    } else if (beat.id === 'three-coats') {
        visualContentHtml = `
            <div class="card glass shadow glow-purple">
                <div class="card-badge badge-purple">MISSION · TWO TRUNCATIONS</div>
                <div class="card-title">Three Output Anomalies Wearing the Same Coat</div>
                <div class="three-grid">
                    <div class="grid-card border-purple">
                        <div class="grid-icon">⚠️</div>
                        <div class="grid-title">MAX_TOKENS</div>
                        <div class="grid-desc">Cut off mid-sentence<br/><span class="hl-green">Fix: Raise max_tokens</span></div>
                    </div>
                    <div class="grid-card border-amber">
                        <div class="grid-icon">⚡</div>
                        <div class="grid-title">tool_use</div>
                        <div class="grid-desc">Waiting for tool output<br/><span class="hl-green">Fix: Pass result back</span></div>
                    </div>
                    <div class="grid-card border-pink">
                        <div class="grid-icon">🛑</div>
                        <div class="grid-title">stop_sequence</div>
                        <div class="grid-desc">Conflicting stop token<br/><span class="hl-green">Fix: Clean stop tokens</span></div>
                    </div>
                </div>
            </div>
        `;
    } else if (beat.id === 'dont-delegate') {
        visualContentHtml = `
            <div class="card glass shadow glow-green">
                <div class="card-badge badge-green">MISSION · DONT DELEGATE</div>
                <div class="card-title">Rule #1: Most of the time, DON'T hire subagents!</div>
                <div class="compare-grid">
                    <div class="compare-box box-green">
                        <div class="box-head">✅ SINGLE AGENT (BEST CHOICE)</div>
                        <div class="box-body">• Full context preserved<br/>• Zero communication latency<br/>• Simple, easy debugging</div>
                    </div>
                    <div class="compare-box box-red">
                        <div class="box-head">❌ OVER-HIRING MULTI-AGENTS</div>
                        <div class="box-body">• Context lost in handoffs<br/>• High latency + cost spike<br/>• Compounding errors</div>
                    </div>
                </div>
            </div>
        `;
    } else if (beat.id === 'three-passes') {
        visualContentHtml = `
            <div class="card glass shadow glow-indigo">
                <div class="card-badge badge-indigo">MISSION · CONTRACT BREAKDOWN</div>
                <div class="card-title">If You MUST Split — Split by Thinking Mode</div>
                <div class="three-grid">
                    <div class="grid-card border-indigo">
                        <div class="grid-icon">🔍</div>
                        <div class="grid-title">Pass 1: Research</div>
                        <div class="grid-desc">Deep exploration<br/>Read-only scope</div>
                    </div>
                    <div class="grid-card border-purple">
                        <div class="grid-icon">📐</div>
                        <div class="grid-title">Pass 2: Architecture</div>
                        <div class="grid-desc">Deconstruct contract<br/>Design step-by-step</div>
                    </div>
                    <div class="grid-card border-pink">
                        <div class="grid-icon">⚙️</div>
                        <div class="grid-title">Pass 3: Execution</div>
                        <div class="grid-desc">Recruit subagent<br/>Strict scope only</div>
                    </div>
                </div>
            </div>
        `;
    } else if (beat.id === 'brief-with-goals') {
        visualContentHtml = `
            <div class="card glass shadow glow-indigo">
                <div class="card-badge badge-indigo">MISSION · RECRUIT AGENTS</div>
                <div class="card-title">Brief Subagents with GOALS — Not Micro-Scripts</div>
                <div class="banner-stack">
                    <div class="banner banner-red">❌ BAD: "Step 1 do X. Step 2 do Y. Step 3 do Z."</div>
                    <div class="banner banner-green">✅ GOOD: "Achieve Target State S. Verify with Criteria V."</div>
                </div>
            </div>
        `;
    } else if (beat.id === 'forced-first') {
        visualContentHtml = `
            <div class="card glass shadow glow-amber">
                <div class="card-badge badge-amber">MISSION · ORDER OF OPS</div>
                <div class="card-title">Has Prerequisite Data? Force tool_choice on Turn 1</div>
                <div class="code-box">
                    <div class="code-line"><span class="c-purple">Turn 1:</span> tool_choice = { type: 'tool', name: 'read_file' }</div>
                    <div class="code-line"><span class="c-blue">Turn 2+:</span> tool_choice = 'auto'</div>
                </div>
            </div>
        `;
    } else if (beat.id === 'twelve-at-once') {
        visualContentHtml = `
            <div class="card glass shadow glow-sky">
                <div class="card-badge badge-sky">MISSION · PARALLEL STRIKE</div>
                <div class="card-title">No Dependencies? Dispatch 12 Parallel Tasks!</div>
                <div class="stat-highlight">⚡ 1 Turn ➔ 12 Parallel Subagents ➔ Up to 10× Speedup</div>
            </div>
        `;
    } else if (beat.id === 'no-inheritance') {
        visualContentHtml = `
            <div class="card glass shadow glow-purple">
                <div class="card-badge badge-purple">MISSION · INTEL HANDOFF</div>
                <div class="card-title">Subagents Start with ZERO Inherited Context</div>
                <div class="banner banner-blue">🧠 Explicitly pass: schemas, key variables & rules every time</div>
            </div>
        `;
    } else if (beat.id === 'two-numbers') {
        visualContentHtml = `
            <div class="card glass shadow glow-red">
                <div class="card-badge badge-red">MISSION · CONFLICTING INTEL</div>
                <div class="card-title">Never Average Conflicting Confidence Scores!</div>
                <div class="compare-grid">
                    <div class="compare-box box-red">
                        <div class="box-head">❌ Agent A (0.9) + Agent B (0.1)</div>
                        <div class="box-body">Averaging to 0.5 is meaningless noise!</div>
                    </div>
                    <div class="compare-box box-green">
                        <div class="box-head">✅ INVESTIGATE ROOT CAUSE</div>
                        <div class="box-body">Trace WHY they disagree in source evidence</div>
                    </div>
                </div>
            </div>
        `;
    } else if (beat.id === 'citation-id') {
        visualContentHtml = `
            <div class="card glass shadow glow-green">
                <div class="card-badge badge-green">MISSION · CHAIN OF CUSTODY</div>
                <div class="card-title">Tag citation_id From the Very First Agent!</div>
                <div class="flow-row">
                    <div class="flow-node">Agent 1 (Fetch)</div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-node">Agent 2 (Analyze)</div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-node">Agent 3 (Report)</div>
                </div>
            </div>
        `;
    } else if (beat.id === 'tell-it-what-changed') {
        visualContentHtml = `
            <div class="card glass shadow glow-purple">
                <div class="card-badge badge-purple">MISSION · SCENE CHANGED</div>
                <div class="card-title">Explicit Delta Protocol: State What Changed</div>
                <div class="banner banner-green">📝 "I modified File A, File B, and File C" — focus agent on the diff</div>
            </div>
        `;
    } else if (beat.id === 'checkpoint') {
        visualContentHtml = `
            <div class="card glass shadow glow-green">
                <div class="card-badge badge-green">MISSION · PIPELINE DOWN</div>
                <div class="card-title">Clean Session Restart: Checkpoint ➔ Kill ➔ Reset</div>
                <div class="flow-row">
                    <div class="flow-node node-active">1. Git Checkpoint</div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-node">2. Kill Session</div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-node">3. Fresh Context</div>
                </div>
            </div>
        `;
    } else if (beat.id === 'go-find-out') {
        visualContentHtml = `
            <div class="card glass shadow glow-blue">
                <div class="card-badge badge-blue">RECAP · FIVE RULES</div>
                <div class="card-title">Now Go Build Something Real</div>
                <div class="recap-list">
                    <div>✅ stop_reason is your brake</div>
                    <div>✅ Don't delegate until you must</div>
                    <div>✅ Force tool_choice for prerequisites</div>
                    <div>✅ Subagents inherit nothing</div>
                    <div>✅ Checkpoint early, restart clean</div>
                </div>
            </div>
        `;
    }

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
                opacity: 0.92;
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
        <div class="overlay-container">
            <div class="top-bar">
                <div class="ch-badge">${chapterInfo.title}</div>
                <div class="brand-badge">CareerVivid Agentic Architecture · Domain 1</div>
            </div>
            <div class="center-stage">
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
    console.log('🚀 Building Domain 1 Film (Chirp3-HD Fenrir High-Energy Voice)...\n');

    const beatsToProcess = [];
    let totalSeconds = 0;

    for (const beat of DOMAIN_1_FILM.beats) {
        const audioPath = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const backplateFile = path.join(BACKPLATE_DIR, `domain-1-overview--${beat.id}.png`);

        let durationSec = beat.fixedSeconds ?? getWavDurationSeconds(audioPath);
        if (durationSec <= 0) durationSec = 6.0;

        beatsToProcess.push({
            beat,
            durationSec,
            audioPath: fs.existsSync(audioPath) ? audioPath : null,
            backplatePath: fs.existsSync(backplateFile) ? backplateFile : null,
        });

        totalSeconds += durationSec;
    }

    console.log(`📹 Total Beats: ${beatsToProcess.length}`);
    console.log(`⏱️ Estimated Duration: ${(totalSeconds / 60).toFixed(2)} mins (${totalSeconds.toFixed(1)}s)\n`);

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

    console.log('\n🎞️ Concatenating all beat MP4 files into final film...');
    const concatListPath = path.join(OUT_DIR, 'concat_list.txt');
    const concatContent = beatVideoFiles.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${FINAL_MP4}"`;
    execSync(concatCmd, { stdio: 'pipe' });

    const finalSize = fs.existsSync(FINAL_MP4) ? (fs.readFileSync(FINAL_MP4).length / (1024 * 1024)).toFixed(2) : 0;
    console.log(`\n✅ High-Energy English YouTube Video Compilation Complete!`);
    console.log(`📹 Final MP4: ${FINAL_MP4} (${finalSize} MB)`);
}

buildFilm().catch(console.error);
