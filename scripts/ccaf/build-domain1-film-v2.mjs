/**
 * build-domain1-film-v2.mjs — the animated cut.
 *
 * v1 rendered one still per beat: a 4-minute film of 23 freeze-frames. v2
 * renders real motion, deterministically, with no new dependencies:
 *
 *   1. Each beat is an HTML page whose movement is declared in CSS
 *      (Ken Burns on the art, a hand-drawn wobble, the card sliding in,
 *      rows/columns revealing one by one across the narration).
 *   2. Playwright opens the page once, PAUSES every animation, then seeks
 *      them all to frame N's timestamp and screenshots — 24 fps, every run
 *      byte-identical. Remotion's model, without Remotion.
 *   3. ffmpeg turns frames + the measured WAV into the beat clip, concats,
 *      and muxes the intro BGM exactly as v1 did.
 *
 * The card sits on the right rail; the art is composed into the left third
 * (the image prompts demand it), so the figure and the teaching never fight
 * over the same pixels — the complaint that started this rewrite.
 *
 * Run:  npx tsx scripts/ccaf/build-domain1-film-v2.mjs
 * Resumable: finished beat clips are kept; delete scratchpad/film_render_v2
 * to force a full re-render.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { execCommandLine } from '../lib/safe-exec.mjs';
import { chromium } from 'playwright';
import { DOMAIN_1_FILM, assertFullCoverage, assertContentMatchesMissions } from './domain1Script.ts';
import { listDomains } from '../../src/lib/questSource.ts';

const FPS = 24;
const OUT_DIR = path.resolve('scratchpad/film_render_v2');
// One output only. The voice-tagged master was a byte-for-byte duplicate of the
// published file, so it was 50 MB of confusion about which one is current.
// The production scripts are the thing worth keeping; the video is rebuildable.
const FINAL_MP4 = path.resolve('public/ccaf-lessons/domain-1.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/domain-1-overview/en/chirp-fenrir');
const BACKPLATE_DIR = path.resolve('public/assets/ccaf-backplates');
const BGM = path.resolve('public/assets/bgm-d12.mp3');
const TERMCLIP_DIR = path.resolve('public/assets/ccaf-termclips');

// ── The guardrails run before a single frame is drawn ───────────────────────
{
    const d1 = listDomains().find(d => d.order === 1);
    assertFullCoverage(d1.missions.map(m => m.id));
    const text = {};
    for (const m of d1.missions) {
        text[m.id] = m.steps
            .map(s => [s.prompt.en, s.takeaway?.en ?? '', ...s.options.map(o => o.text.en)].join(' '))
            .join(' ');
    }
    assertContentMatchesMissions(text);
    console.log('✓ coverage + content checks passed\n');
}

const CHAPTERS = {
    'term-what-comes-back': 'Chapter 0 · What Comes Back',
    'term-why-a-loop': 'Chapter 0 · Why a Loop Exists',
    'term-two-limits': 'Chapter 0 · Two Different Limits',
    'term-whose-field': 'Chapter 0 · Whose Field Is It?',
    'why-hire-at-all': 'Chapter 0 · Why Hire At All',
    'the-trade': 'Chapter 0 · The Trade You Just Made',
    'what-is-a-turn': 'Chapter 0 · One Turn',
    'why-a-loop-exists': 'Chapter 0 · Tools and the Loop',
    'two-different-limits': 'Chapter 0 · In vs Out',
    // Metaphor beats sit under the same chapter as the concept they open.
    'kettle-whistle': 'Chapter 1 · Knowing When It Stopped',
    'three-blank-letters': 'Chapter 1 · Three Ways Output Stops',
    'note-in-your-hand': 'Chapter 2 · When NOT to Delegate',
    'proofreading-pass': 'Chapter 2 · One Job Per Pass',
    'directions-vs-destination': 'Chapter 2 · Briefing a Subagent',
    'ice-before-baking': 'Chapter 3 · Tool Dependencies',
    'twelve-washing-machines': 'Chapter 3 · Doing Things at Once',
    'shift-handover': 'Chapter 4 · Handing Over Context',
    'two-witnesses': 'Chapter 4 · When Sources Disagree',
    'evidence-bag': 'Chapter 4 · Tracing a Claim',
    'back-from-holiday': 'Chapter 5 · What Actually Changed',
    'corrupted-autosave': 'Chapter 5 · Recovering From a Crash',
    'three-burnt-dishes': 'Chapter 5 · Fixing Only the Failures',
    'open-buried': 'Prologue', 'roadmap': 'Overview · Five Chapters',
    'no-brakes': 'Chapter 1 · One Agent, One Loop', 'stop-reason': 'Chapter 1 · Branching on stop_reason',
    'three-coats': 'Chapter 1 · Three Truncation Failure Modes',
    'queue-of-helpers': 'Chapter 2 · Delegation & Subagents', 'dont-delegate': 'Chapter 2 · Do It Yourself First',
    'three-passes': 'Chapter 2 · Split by Thinking Mode', 'script-vs-goal': 'Chapter 2 · Briefing',
    'brief-with-goals': 'Chapter 2 · Goals, Not Scripts',
    'dominoes': 'Chapter 3 · Order & Speed', 'forced-first': 'Chapter 3 · Forced tool_choice',
    'twelve-at-once': 'Chapter 3 · Parallel Task Calls',
    'canyon-shout': 'Chapter 4 · The Handoff Gap', 'no-inheritance': 'Chapter 4 · Explicit Context Handoff',
    'two-numbers': 'Chapter 4 · Conflicting Findings', 'citation-id': 'Chapter 4 · Chain of Custody',
    'burst-pipes': 'Chapter 5 · When It Breaks', 'tell-it-what-changed': 'Chapter 5 · Explicit Delta Protocol',
    'checkpoint': 'Chapter 5 · Clean Session Restart', 'three-hundred': 'Chapter 5 · Batch Recovery',
    'thirteen-doors': 'Epilogue · The 13 Doors', 'go-find-out': 'Epilogue · Practice Quiz Time',
};

const ACCENT = {
    'kettle-whistle': 'amber', 'why-hire-at-all': 'green', 'the-trade': 'red', 'three-blank-letters': 'red', 'note-in-your-hand': 'purple',
    'proofreading-pass': 'indigo', 'directions-vs-destination': 'sky', 'ice-before-baking': 'amber',
    'twelve-washing-machines': 'blue', 'shift-handover': 'purple', 'two-witnesses': 'red',
    'evidence-bag': 'indigo', 'back-from-holiday': 'purple', 'corrupted-autosave': 'green',
    'three-burnt-dishes': 'sky',
    'roadmap': 'blue', 'stop-reason': 'amber', 'three-coats': 'red', 'dont-delegate': 'purple',
    'three-passes': 'indigo', 'brief-with-goals': 'sky', 'forced-first': 'amber',
    'twelve-at-once': 'blue', 'no-inheritance': 'purple', 'two-numbers': 'red',
    'citation-id': 'indigo', 'tell-it-what-changed': 'purple', 'checkpoint': 'green',
    'three-hundred': 'sky', 'go-find-out': 'green',
};

const wavSeconds = (p) => fs.existsSync(p) ? (fs.statSync(p).size - 44) / (24000 * 2) : 0;
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * `**like this**` becomes a marked phrase.
 *
 * Copied from the reference lesson that does this best: in a thirty-word
 * sentence only about five words are load-bearing, and underlining exactly
 * those is the difference between a viewer reading the line and absorbing it.
 */
const mark = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<em class="hi">$1</em>');

/**
 * One beat's page. All motion is CSS keyframes; nothing depends on wall-clock
 * time, so the renderer can seek to any instant and get the same pixels.
 */
function buildHTML(beat, index, durationSec) {
    // A metaphor beat and its landing beat share one illustration, so the shot
    // appears to hold while the explanation lands — and no extra art is needed.
    const artId = beat.artFrom ?? beat.id;
    const art = path.join(BACKPLATE_DIR, `domain-1-overview--${artId}.png`);
    // Inlined as a data URI: setContent pages live at about:blank, and Chromium
    // silently refuses to load file:// subresources from there — the first test
    // render came back with every backplate missing and no error anywhere.
    const artUrl = fs.existsSync(art)
        ? `data:image/png;base64,${fs.readFileSync(art).toString('base64')}`
        : null;
    const accent = ACCENT[beat.id] ?? 'blue';
    const isStory = beat.kind === 'veo';
    const v = beat.visual;

    // Items reveal one by one across the first 60% of the narration, so the
    // card builds while the voice explains rather than dumping all at once.
    const items = v?.type === 'rows' ? v.rows.length : v?.type === 'columns' ? v.items.length
        : v?.type === 'flow' ? v.nodes.length : 1;
    const stagger = Math.min(1.6, Math.max(0.4, (durationSec * 0.55) / Math.max(items, 1)));
    const delay = (i) => (0.9 + i * stagger).toFixed(2);

    let body = '';
    if (v?.type === 'rows') {
        body = `<div class="stack">${v.rows.map((r, i) => `
            <div class="item box ${r.verdict === 'good' ? 'good' : 'bad'}" style="animation-delay:${delay(i)}s">
                <div class="box-head">${r.verdict === 'good' ? '✅' : '❌'} ${esc(r.term)}</div>
                <div class="box-body">${esc(r.detail.en)}<br/><span class="zh">${esc(r.detail.zh)}</span></div>
            </div>`).join('')}</div>`;
    } else if (v?.type === 'columns') {
        body = `<div class="stack">${v.items.map((c, i) => `
            <div class="item box ${c.verdict === 'good' ? 'good' : 'bad'}" style="animation-delay:${delay(i)}s">
                <div class="box-head">${c.verdict === 'good' ? '✅ DO THIS' : '❌ COMMON TRAP'}</div>
                <div class="box-body"><b>${esc(c.label.en)}</b>${c.note ? `<br/>${esc(c.note.en)}` : ''}</div>
            </div>`).join('')}</div>`;
    } else if (v?.type === 'flow') {
        body = `<div class="flow">${v.nodes.map((n, i) => `
            ${i ? `<div class="item arrow" style="animation-delay:${delay(i - 0.4)}s">➔</div>` : ''}
            <div class="item node ${i === 0 ? 'on' : ''}" style="animation-delay:${delay(i)}s">${esc(n)}</div>`).join('')}</div>`;
    } else if (v?.type === 'define') {
        // 问题 → 解法 → 本质. Chinese leads because the audience reads it first;
        // the English sits under it for the spoken track to line up against.
        const panel = (key, cls, text) => `
            <div class="def-row">
                <span class="def-k ${cls}">${key}</span>
                <span class="def-body"><span class="def-zh">${mark(text.zh)}</span>
                <span class="def-en">${mark(text.en)}</span></span>
            </div>`;
        body = `<div class="stack">${v.entries.map((e, i) => `
            <div class="item def" style="animation-delay:${delay(i)}s">
                <div class="def-term">${esc(e.term)}</div>
                ${panel('问题', 'problem', e.problem)}
                ${panel('解法', 'solution', e.solution)}
                ${panel('本质', 'essence', e.essence)}
            </div>`).join('')}</div>`;
    } else if (v?.type === 'card') {
        body = `<div class="item headline" style="animation-delay:0.9s">${esc(v.headline.en)}</div>`;
    }

    const card = body && !isStory ? `
        <div class="card ${accent}">
            ${(beat.teaches ?? []).length
                ? `<div class="badge ${accent}">MISSION · ${beat.teaches.join(' · ').replace(/-/g, ' ').toUpperCase()}</div>`
                : ''}
            ${body}
        </div>` : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
        * { margin: 0; box-sizing: border-box; }
        html, body { width: 1920px; height: 1080px; overflow: hidden;
            background: #0b0f19; color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

        /* The art breathes: a slow Ken Burns drift plus a two-step wobble that
           reads as a hand-drawn "boiling line". Directions alternate per beat
           so consecutive shots never move the same way. */
        .artwrap { position: absolute; inset: 0; overflow: hidden; }
        .art { position: absolute; inset: -4%; width: 108%; height: 108%;
            object-fit: cover; object-position: ${isStory ? 'center 40%' : '18% 40%'};
            animation: ken ${durationSec}s linear forwards; }
        @keyframes ken {
            from { transform: scale(1.04) translate(${index % 2 ? '-0.8%' : '0.8%'}, 0.4%); }
            to   { transform: scale(1.12) translate(${index % 2 ? '1.2%' : '-1.2%'}, -0.8%); }
        }
        .wobble { position: absolute; inset: 0;
            animation: wob 0.66s steps(2, jump-none) infinite; }
        @keyframes wob { from { transform: translate(0, 0) rotate(0.12deg); }
                         to   { transform: translate(1.5px, -1px) rotate(-0.12deg); } }

        /* Right-side scrim only where the card lives — the figure on the left
           stays at full brightness. */
        .scrim { position: absolute; inset: 0; z-index: 4;
            background: linear-gradient(100deg, rgba(11,15,25,0) 38%, rgba(11,15,25,0.42) 55%, rgba(11,15,25,0.85) 72%);
            opacity: 0; animation: fadein 0.6s ease-out 0.15s forwards; }
        @keyframes fadein { to { opacity: 1; } }

        .top { position: absolute; top: 40px; left: 60px; right: 60px; z-index: 10;
            display: flex; justify-content: space-between; align-items: center;
            opacity: 0; animation: fadein 0.5s ease-out 0.1s forwards; }
        .ch { background: rgba(15,23,42,0.85); border: 2px solid #38bdf8; color: #38bdf8;
            padding: 10px 24px; border-radius: 30px; font-weight: 700; font-size: 20px; }
        .brand { background: rgba(15,23,42,0.85); border: 1px solid #334155; color: #94a3b8;
            padding: 8px 20px; border-radius: 20px; font-size: 18px; }

        /* The card glides in from the right and settles with a soft overshoot,
           tilted half a degree so it sits in the hand-drawn world rather than
           stamped on top of it. */
        .card { position: absolute; z-index: 6; top: 50%; right: 70px; width: 780px;
            transform: translateY(-50%) rotate(-0.6deg);
            background: rgba(13,17,23,0.90); border: 2px solid #334155; border-radius: 24px;
            padding: 30px 36px; backdrop-filter: blur(14px);
            box-shadow: 0 24px 60px rgba(0,0,0,0.55);
            opacity: 0; animation: cardin 0.7s cubic-bezier(0.22, 1.25, 0.36, 1) 0.35s forwards; }
        @keyframes cardin {
            from { opacity: 0; transform: translate(90px, -50%) rotate(1.2deg); }
            to   { opacity: 1; transform: translate(0, -50%) rotate(-0.6deg); } }
        .card.blue { border-color: #38bdf8; box-shadow: 0 0 44px rgba(56,189,248,0.22); }
        .card.amber { border-color: #f59e0b; box-shadow: 0 0 44px rgba(245,158,11,0.22); }
        .card.red { border-color: #ef4444; box-shadow: 0 0 44px rgba(239,68,68,0.22); }
        .card.green { border-color: #10b981; box-shadow: 0 0 44px rgba(16,185,129,0.22); }
        .card.purple { border-color: #8b5cf6; box-shadow: 0 0 44px rgba(139,92,246,0.22); }
        .card.indigo { border-color: #6366f1; box-shadow: 0 0 44px rgba(99,102,241,0.22); }
        .card.sky { border-color: #0ea5e9; box-shadow: 0 0 44px rgba(14,165,233,0.22); }

        .badge { display: inline-block; padding: 6px 16px; border-radius: 12px; margin-bottom: 18px;
            font-size: 15px; font-weight: 800; letter-spacing: 1px; }
        .badge.blue { background: rgba(56,189,248,0.16); color: #38bdf8; }
        .badge.amber { background: rgba(245,158,11,0.16); color: #f59e0b; }
        .badge.red { background: rgba(239,68,68,0.16); color: #f87171; }
        .badge.green { background: rgba(16,185,129,0.16); color: #34d399; }
        .badge.purple { background: rgba(139,92,246,0.16); color: #a78bfa; }
        .badge.indigo { background: rgba(99,102,241,0.16); color: #818cf8; }
        .badge.sky { background: rgba(14,165,233,0.16); color: #38bdf8; }

        /* Every list item pops in on its own delay — the reveal IS the pacing. */
        .item { opacity: 0; animation: pop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) forwards; }
        @keyframes pop { from { opacity: 0; transform: translateY(16px) scale(0.96); }
                         to   { opacity: 1; transform: translateY(0) scale(1); } }

        .stack .box { margin-bottom: 14px; border-radius: 14px; padding: 16px 20px; }
        .stack .box:last-child { margin-bottom: 0; }
        .box.bad { background: rgba(127,29,29,0.35); border: 2px solid rgba(239,68,68,0.6); }
        .box.good { background: rgba(6,78,59,0.4); border: 2px solid rgba(16,185,129,0.6); }
        .box-head { font-weight: 800; font-size: 21px; margin-bottom: 6px; }
        .box.bad .box-head { color: #f87171; } .box.good .box-head { color: #34d399; }
        .box-body { font-size: 18px; line-height: 1.45; color: #e2e8f0; }
        .zh { color: #94a3b8; font-size: 0.85em; }

        /* A term, then what it means in words the viewer already owns, then
           what breaks if they get it wrong. The plain line carries no API
           names on purpose — that is the whole point of the card. */
        .def { margin-bottom: 14px; padding: 16px 20px; border-radius: 14px;
            background: rgba(30,41,59,0.72); border-left: 5px solid #38bdf8; }
        .def:last-child { margin-bottom: 0; }
        .def-term { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 22px; font-weight: 800; color: #7dd3fc; margin-bottom: 8px; }
        .def-row { display: flex; gap: 12px; margin-top: 11px; align-items: baseline; }
        .def-k { flex: 0 0 46px; font-size: 17px; font-weight: 900; padding-top: 1px; }
        .def-k.problem { color: #f87171; } .def-k.solution { color: #38bdf8; }
        .def-k.essence { color: #fbbf24; }
        .def-body { display: block; }
        .def-zh { display: block; font-size: 21px; line-height: 1.4; color: #f8fafc; font-weight: 600; }
        .def-en { display: block; font-size: 15px; line-height: 1.35; color: #8fa0b5; margin-top: 2px; }
        /* The marked phrase: the five words that carry the sentence. */
        .hi { font-style: normal; color: #fde047; border-bottom: 3px solid #f5871f;
            padding-bottom: 1px; font-weight: 800; }
        .def-en .hi { color: #fbbf24; border-bottom-width: 2px; }
        .def-sting { font-size: 16px; color: #fca5a5; margin-top: 8px; font-style: italic; }

        .flow { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .node { padding: 12px 18px; border: 2px solid #475569; border-radius: 12px;
            font-weight: 700; font-size: 19px; background: rgba(30,41,59,0.8); }
        .node.on { border-color: #38bdf8; color: #38bdf8; }
        .arrow { color: #64748b; font-size: 20px; }
        .headline { font-size: 40px; font-weight: 900; color: #34d399; line-height: 1.3; }

        .subtitle { position: absolute; z-index: 10; left: 50%; bottom: 46px; width: 1560px;
            transform: translateX(-50%); text-align: center;
            background: rgba(11,15,25,0.82); border-radius: 18px; padding: 18px 30px;
            backdrop-filter: blur(10px);
            opacity: 0; animation: subup 0.5s ease-out 0.15s forwards; }
        @keyframes subup { from { opacity: 0; transform: translate(-50%, 14px); }
                           to   { opacity: 1; transform: translate(-50%, 0); } }
        /* Chinese leads at a size that reads in one glance — the reference
           lesson uses a single large line and it is far easier to follow than
           two stacked small ones. English drops to a supporting size. */
        .sub-zh { font-size: 38px; font-weight: 800; line-height: 1.32; color: #ffffff;
            text-shadow: 0 2px 12px rgba(0,0,0,0.6); }
        .sub-en { font-size: 19px; font-weight: 600; line-height: 1.35; color: #9fb0c4; margin-top: 8px; }

        .progress { position: absolute; z-index: 12; left: 0; bottom: 0; height: 7px; width: 100%;
            transform-origin: left; transform: scaleX(0);
            background: linear-gradient(90deg, #38bdf8, #34d399, #fbbf24, #f472b6);
            animation: fill ${durationSec}s linear forwards; }
        @keyframes fill { to { transform: scaleX(1); } }
    </style></head><body>
        ${artUrl ? `<div class="artwrap"><div class="wobble"><img class="art" src="${artUrl}"/></div></div>` : ''}
        ${card ? '<div class="scrim"></div>' : ''}
        <div class="top">
            <div class="ch">${esc(CHAPTERS[beat.id] ?? 'Domain 1')}</div>
            <div class="brand">CareerVivid Agentic Architecture · Domain 1</div>
        </div>
        ${card}
        ${beat.narration ? `<div class="subtitle">
            <div class="sub-zh">${mark(beat.narration.zh)}</div>
            <div class="sub-en">${mark(beat.narration.en)}</div>
        </div>` : ''}
        <div class="progress"></div>
    </body></html>`;
}

/**
 * Just the film's furniture — chapter badge, brand badge, subtitle, progress
 * bar — on a transparent background, so it can be composited over a finished
 * Remotion clip and the term beats stop looking like a different video.
 */
function buildOverlayHTML(beat) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
        * { margin: 0; box-sizing: border-box; }
        html, body { width: 1920px; height: 1080px; background: transparent; color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .top { position: absolute; top: 40px; left: 60px; right: 60px;
            display: flex; justify-content: space-between; align-items: center; }
        .ch { background: rgba(15,23,42,0.9); border: 2px solid #38bdf8; color: #38bdf8;
            padding: 10px 24px; border-radius: 30px; font-weight: 700; font-size: 20px; }
        .brand { background: rgba(15,23,42,0.9); border: 1px solid #334155; color: #94a3b8;
            padding: 8px 20px; border-radius: 20px; font-size: 18px; }
        .subtitle { position: absolute; left: 50%; bottom: 46px; width: 1560px;
            transform: translateX(-50%); text-align: center;
            background: rgba(11,15,25,0.88); border-radius: 18px; padding: 18px 30px; }
        /* Chinese leads at a size that reads in one glance — the reference
           lesson uses a single large line and it is far easier to follow than
           two stacked small ones. English drops to a supporting size. */
        .sub-zh { font-size: 38px; font-weight: 800; line-height: 1.32; color: #ffffff;
            text-shadow: 0 2px 12px rgba(0,0,0,0.6); }
        .sub-en { font-size: 19px; font-weight: 600; line-height: 1.35; color: #9fb0c4; margin-top: 8px; }
    </style></head><body>
        <div class="top">
            <div class="ch">${esc(CHAPTERS[beat.id] ?? 'Domain 1 · Key Terms')}</div>
            <div class="brand">CareerVivid Agentic Architecture · Domain 1</div>
        </div>
        ${beat.narration ? `<div class="subtitle">
            <div class="sub-zh">${mark(beat.narration.zh)}</div>
            <div class="sub-en">${mark(beat.narration.en)}</div>
        </div>` : ''}
    </body></html>`;
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    // One build at a time. Two concurrent runs share OUT_DIR and delete each
    // other's frame directories mid-write, which produces a sequence starting
    // at frame 29 and an ffmpeg failure that blames a missing file rather than
    // the real cause. Cheap lock, hours saved.
    const lock = path.join(OUT_DIR, '.build.lock');
    if (fs.existsSync(lock)) {
        const owner = fs.readFileSync(lock, 'utf-8').trim();
        let alive = false;
        try { process.kill(Number(owner), 0); alive = true; } catch { alive = false; }
        if (alive) {
            console.error(`❌ Another build is already running (pid ${owner}).`);
            console.error('   Wait for it, or stop it first. Two builds corrupt each other.');
            process.exit(1);
        }
        console.warn(`⚠️  Clearing a stale lock from pid ${owner}.`);
    }
    fs.writeFileSync(lock, String(process.pid));
    const releaseLock = () => { try { fs.unlinkSync(lock); } catch {} };
    process.on('exit', releaseLock);
    process.on('SIGINT', () => { releaseLock(); process.exit(130); });
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    const clips = [];
    for (const [index, beat] of DOMAIN_1_FILM.beats.entries()) {
        const wav = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const spoken = wavSeconds(wav);
        // Narrated beats breathe for a third of a second after the voice ends;
        // silent story beats hold just long enough to land the gag.
        const duration = spoken ? spoken + 0.35 : 3.2;
        const clip = path.join(OUT_DIR, `${String(index).padStart(2, '0')}-${beat.id}.mp4`);
        clips.push({ clip, beat });
        if (fs.existsSync(clip)) { console.log(`⏭  [${index + 1}/${DOMAIN_1_FILM.beats.length}] ${beat.id} (cached)`); continue; }

        // A Remotion term animation: already a finished video, so it skips the
        // HTML renderer entirely and only needs the narration laid over it.
        // `tpad` freezes the last frame if the voice outruns the animation,
        // which keeps audio as the clock even for fixed-length clips.
        if (beat.clip) {
            const src = path.join(TERMCLIP_DIR, `${beat.clip}.mp4`);
            if (!fs.existsSync(src)) throw new Error(`missing term clip: ${src}`);
            const clipSecs = Number(execSync(
                `ffprobe -v error -show_entries format=duration -of csv=p=0 "${src}"`,
                { encoding: 'utf8' }).trim());
            const hold = Math.max(0, duration - clipSecs);

            // The Remotion clip is a full frame, so it covers the film's own
            // chapter badge and bilingual subtitle. Losing the Chinese line on
            // precisely the four beats that exist to explain jargon is the
            // opposite of the point, so the UI is re-composited on top as a
            // transparent PNG rendered by the same page builder.
            const overlayPng = path.join(OUT_DIR, `overlay-${beat.id}.png`);
            await page.setContent(buildOverlayHTML(beat), { waitUntil: 'networkidle' });
            await page.screenshot({ path: overlayPng, omitBackground: true });

            execSync(
                `ffmpeg -y -i "${src}" -i "${wav}" -i "${overlayPng}" ` +
                `-filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=${(hold + 0.4).toFixed(2)},fps=${FPS}[bg];` +
                `[bg][2:v]overlay=0:0[v]" ` +
                `-map "[v]" -map 1:a -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p ` +
                `-c:a aac -b:a 192k -shortest "${clip}"`,
                { stdio: 'pipe' });
            console.log(`🎞  [${index + 1}/${DOMAIN_1_FILM.beats.length}] ${beat.id} — Remotion clip ${clipSecs.toFixed(1)}s + ${duration.toFixed(1)}s voice`);
            continue;
        }

        const frames = Math.ceil(duration * FPS);
        const framesDir = path.join(OUT_DIR, `frames-${beat.id}`);
        fs.rmSync(framesDir, { recursive: true, force: true });
        fs.mkdirSync(framesDir, { recursive: true });

        await page.setContent(buildHTML(beat, index, duration), { waitUntil: 'networkidle' });
        // Freeze the world: from here on, time only moves when we say so.
        await page.evaluate(() => document.getAnimations({ subtree: true }).forEach(a => a.pause()));

        const t0 = Date.now();
        for (let f = 0; f < frames; f += 1) {
            await page.evaluate((ms) =>
                document.getAnimations({ subtree: true }).forEach(a => { a.currentTime = ms; }),
                (f / FPS) * 1000);
            await page.screenshot({
                path: path.join(framesDir, `f${String(f).padStart(5, '0')}.jpg`),
                type: 'jpeg', quality: 85,
            });
        }
        const fps = (frames / ((Date.now() - t0) / 1000)).toFixed(1);

        const audioIn = spoken
            ? `-i "${wav}"`
            : `-f lavfi -i anullsrc=r=24000:cl=mono -t ${duration.toFixed(2)}`;
        execCommandLine(
            `ffmpeg -y -framerate ${FPS} -i "${framesDir}/f%05d.jpg" ${audioIn} ` +
            `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${clip}"`,
            { stdio: 'pipe' });
        fs.rmSync(framesDir, { recursive: true, force: true });
        console.log(`🎬 [${index + 1}/${DOMAIN_1_FILM.beats.length}] ${beat.id} — ${frames} frames @ ${fps} fps render`);
    }
    await browser.close();

    console.log('\n🎞  Concatenating…');
    const list = path.join(OUT_DIR, 'concat.txt');
    fs.writeFileSync(list, clips.map(c => `file '${c.clip}'`).join('\n'));
    const raw = path.join(OUT_DIR, 'raw.mp4');
    execSync(`ffmpeg -y -f concat -safe 0 -i "${list}" -c copy "${raw}"`, { stdio: 'pipe' });

    console.log('🎵 Muxing intro BGM…');
    execSync(
        `ffmpeg -y -i "${raw}" -i "${BGM}" -filter_complex ` +
        `"[1:a]volume=0.05,afade=t=out:st=3.5:d=3.5[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]" ` +
        // Re-encode rather than stream-copy: `+faststart` moves the moov atom to
        // the front so a browser can begin playback while still downloading,
        // and crf 26 is visually lossless on flat cartoon art while cutting the
        // file from 54 MB to about 22 MB. `-r 24` normalises the timebase that
        // concat leaves behind.
        `-map 0:v -map "[aout]" -r 24 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p ` +
        `-c:a aac -b:a 128k -movflags +faststart "${FINAL_MP4}"`,
        { stdio: 'pipe' });

    // Keep the readable script in step with the film. Doing this by hand failed
    // once already — the beats moved to third person and the exported document
    // still showed the old second-person lines.
    execSync('npx tsx scripts/ccaf/export-narration-script.mjs', { stdio: 'inherit' });

    const probe = execSync(
        `ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "${FINAL_MP4}"`,
        { encoding: 'utf8' });
    console.log(`\n🎉 compiled → ${FINAL_MP4}\n${probe}`);
}

main().catch(e => { console.error(e); process.exit(1); });
