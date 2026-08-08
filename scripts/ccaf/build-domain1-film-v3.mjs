/**
 * build-domain1-film-v3.mjs — the Omni cut.
 *
 * v2 rendered every beat as an HTML page: a still Gemini backplate with a CSS
 * Ken Burns drift faked over it. v3 replaces that bed with real generated
 * motion — Veo paper-collage footage — and keeps everything else.
 *
 * The keeping is the point. It would be easy to read the Omni skill as "throw
 * out the cards, the footage is prettier", and that would wreck the lesson:
 *
 *   - Veo cannot render text. Its prompt grammar forbids it because what it
 *     produces instead is confident gibberish. Every term this film exists to
 *     teach — stop_reason, tool_use, max_tokens, the 问题/解法/本质 panels —
 *     has to be real DOM text or it is not teachable.
 *   - The skill's answer to that is a 20px badge in the corner. That is an
 *     overview device. It works for a six-beat explainer; across eighteen
 *     definition beats it teaches nothing.
 *
 * So: footage underneath, cards on top, composited per frame.
 *
 *   1. Each unique Veo clip is turned into a seamless boomerang (forward then
 *      reversed) and cached. Looping a boomerang has no visible cut, which is
 *      why this is used instead of the skill's setpts stretch — see below.
 *   2. The card layer renders exactly as in v2: Playwright pauses every CSS
 *      animation, seeks frame by frame, and screenshots — but with
 *      omitBackground, so it comes out as transparent PNG.
 *   3. ffmpeg lays the PNG sequence over the looped footage and cuts to the
 *      narration WAV, which remains the clock.
 *
 * Why not the skill's setpts stretch: it sets the video speed to
 * narration ÷ clip. Domain 1 averages 18.4s of narration against an 8s clip,
 * so every shot would run at 0.43× — an effective 10 fps, for fourteen
 * minutes. The six-beat sample gets away with it; a feature does not.
 *
 * Run:  npx tsx scripts/ccaf/build-domain1-film-v3.mjs
 * Resumable: finished beat clips are kept; delete scratchpad/film_render_v3
 * to force a full re-render.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { DOMAIN_1_FILM, assertFullCoverage, assertContentMatchesMissions } from './domain1Script.ts';
import { CLIP_FOR } from './generate-domain1-omni-videos.mjs';
import { listDomains } from '../../src/lib/questSource.ts';

const FPS = 24;
const W = 1920;
const H = 1080;
const OUT_DIR = path.resolve('scratchpad/film_render_v3');
const BOOMERANG_DIR = path.join(OUT_DIR, 'beds');
const FINAL_MP4 = path.resolve('public/ccaf-lessons/domain-1.mp4');
const NARRATION_DIR = path.resolve('public/assets/ccaf-narration/domain-1-overview/en/chirp-fenrir');
const CLIPS_DIR = path.resolve('public/ccaf-lessons/clips');
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
    console.log('✓ coverage + content checks passed');
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
    'kettle-whistle': 'amber', 'why-hire-at-all': 'green', 'the-trade': 'red', 'three-blank-letters': 'red',
    'note-in-your-hand': 'purple', 'proofreading-pass': 'indigo', 'directions-vs-destination': 'sky',
    'ice-before-baking': 'amber', 'twelve-washing-machines': 'blue', 'shift-handover': 'purple',
    'two-witnesses': 'red', 'evidence-bag': 'indigo', 'back-from-holiday': 'purple',
    'corrupted-autosave': 'green', 'three-burnt-dishes': 'sky',
    'roadmap': 'blue', 'stop-reason': 'amber', 'three-coats': 'red', 'dont-delegate': 'purple',
    'three-passes': 'indigo', 'brief-with-goals': 'sky', 'forced-first': 'amber',
    'twelve-at-once': 'blue', 'no-inheritance': 'purple', 'two-numbers': 'red',
    'citation-id': 'indigo', 'tell-it-what-changed': 'purple', 'checkpoint': 'green',
    'three-hundred': 'sky', 'go-find-out': 'green',
};

const wavSeconds = (p) => fs.existsSync(p) ? (fs.statSync(p).size - 44) / (24000 * 2) : 0;
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mark = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<em class="hi">$1</em>');
const probeSeconds = (f) => Number(execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`, { encoding: 'utf8' }).trim()) || 0;

/**
 * Whether this beat draws a card on the right rail — which decides where the
 * frame sits inside the oversized footage bed. Kept next to the visual types it
 * mirrors so the two cannot drift apart silently: a new visual type that
 * renders a body must be added here too, or its footage will not make room for
 * it.
 */
const CARD_VISUALS = new Set(['rows', 'columns', 'flow', 'define', 'card']);
const hasCard = (beat) => CARD_VISUALS.has(beat.visual?.type);

// ── Subtitles ───────────────────────────────────────────────────────────────

/**
 * Splits a beat's narration into timed on-screen segments.
 *
 * A single 18-second paragraph set at the size Chinese needs to be readable is
 * eight lines tall and eats the bottom third of the frame — over the artwork
 * the whole beat exists to show. Broadcast subtitling shows one sentence at a
 * time for exactly this reason.
 *
 * English drives the split because English is what the voice is speaking. The
 * Chinese is then cut into the same number of pieces at its own punctuation,
 * proportionally, so the two tracks stay in step even though the sentence
 * counts rarely match.
 */
function subtitleSegments(narration, duration) {
    const en = String(narration?.en ?? '').trim();
    const zh = String(narration?.zh ?? '').trim();
    if (!en && !zh) return [];

    // Keep the terminator on the sentence it belongs to.
    const enParts = en.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g)?.map(s => s.trim()).filter(Boolean) ?? [en];

    // Merge anything too short to be worth its own card into its neighbour —
    // "And that's true." should not flash by on its own.
    const merged = [];
    for (const part of enParts) {
        if (merged.length && (part.length < 45 || merged[merged.length - 1].length < 45)) {
            merged[merged.length - 1] += ' ' + part;
        } else {
            merged.push(part);
        }
    }
    const enSegs = merged.length ? merged : [en];

    const zhSegs = splitChinese(zh, enSegs.length);

    // Time each segment by its share of the spoken characters. Speech rate is
    // near enough constant within one beat that this lands within a beat or two
    // of the voice, and it never drifts because the shares always total one.
    const weights = enSegs.map(s => Math.max(s.length, 1));
    const total = weights.reduce((a, b) => a + b, 0);

    let at = 0;
    return enSegs.map((text, i) => {
        const span = (weights[i] / total) * duration;
        const seg = { en: text, zh: zhSegs[i] ?? '', start: at, end: at + span };
        at += span;
        return seg;
    });
}

/** Cuts Chinese into `count` pieces, preferring its own sentence punctuation. */
function splitChinese(zh, count) {
    if (!zh) return Array(count).fill('');
    if (count === 1) return [zh];

    const atoms = zh.match(/[^。！？；…]+[。！？；…]+["')\]」』]*|[^。！？；…]+$/g)?.map(s => s.trim()).filter(Boolean) ?? [zh];

    // Fewer atoms than slots: fall back to splitting on the secondary comma so
    // no slot comes out empty and unsubtitled.
    if (atoms.length < count) {
        const finer = zh.match(/[^。！？；，…]+[。！？；，…]+["')\]」』]*|[^。！？；，…]+$/g)?.map(s => s.trim()).filter(Boolean) ?? [zh];
        if (finer.length >= count) return regroup(finer, count);
        return regroup(atoms.length ? atoms : [zh], count);
    }
    return regroup(atoms, count);
}

/** Packs atoms into exactly `count` groups of roughly equal length. */
function regroup(atoms, count) {
    if (atoms.length <= count) {
        const out = atoms.slice();
        while (out.length < count) out.push('');
        return out;
    }
    const target = atoms.join('').length / count;
    const out = Array(count).fill('');
    let g = 0;
    for (const atom of atoms) {
        // Move on once this group has had its share, but never leave a later
        // group with nothing to say.
        const remainingGroups = count - g - 1;
        const remainingAtoms = atoms.length - atoms.indexOf(atom);
        if (out[g].length >= target && remainingGroups > 0 && remainingAtoms > remainingGroups) g += 1;
        out[g] += atom;
    }
    return out;
}

/** The subtitle block: one segment visible at a time, cross-faded. */
function subtitleHTML(segments, duration) {
    if (!segments.length) return { css: '', html: '' };

    const FADE = 0.22;
    const css = segments.map((s, i) => {
        const pct = (t) => Math.max(0, Math.min(100, (t / duration) * 100)).toFixed(3);
        const a = pct(s.start);
        const b = pct(Math.min(s.start + FADE, s.end));
        const c = pct(Math.max(s.end - FADE, s.start));
        const d = pct(s.end);
        return `@keyframes sub${i}{0%,${a}%{opacity:0;transform:translateY(8px)}` +
            `${b}%,${c}%{opacity:1;transform:translateY(0)}` +
            `${d}%,100%{opacity:0;transform:translateY(-6px)}}` +
            `.s${i}{animation:sub${i} ${duration}s linear forwards}`;
    }).join('');

    const html = segments.map((s, i) => `
        <div class="subline s${i}">
            ${s.zh ? `<div class="sub-zh">${mark(s.zh)}</div>` : ''}
            ${s.en ? `<div class="sub-en">${mark(s.en)}</div>` : ''}
        </div>`).join('');

    return { css, html };
}

// ── The card layer ──────────────────────────────────────────────────────────

/**
 * One beat's overlay: chapter badge, teaching card, subtitles, progress bar —
 * on a transparent background, to be composited over the Veo footage.
 *
 * This is v2's page with the art element and its Ken Burns removed. The motion
 * that used to be faked on a still now comes from the footage underneath.
 */
function buildOverlayHTML(beat, duration) {
    const accent = ACCENT[beat.id] ?? 'blue';
    const v = beat.visual;

    const items = v?.type === 'rows' ? v.rows.length : v?.type === 'columns' ? v.items.length
        : v?.type === 'flow' ? v.nodes.length : v?.type === 'define' ? v.entries.length : 1;
    const stagger = Math.min(1.6, Math.max(0.4, (duration * 0.55) / Math.max(items, 1)));
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

    const card = body ? `
        <div class="card ${accent}">
            ${(beat.teaches ?? []).length
                ? `<div class="badge ${accent}">MISSION · ${beat.teaches.join(' · ').replace(/-/g, ' ').toUpperCase()}</div>`
                : ''}
            ${body}
        </div>` : '';

    const segments = subtitleSegments(beat.narration, duration);
    const sub = subtitleHTML(segments, duration);

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
        * { margin: 0; box-sizing: border-box; }
        html, body { width: ${W}px; height: ${H}px; overflow: hidden;
            background: transparent; color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

        /* The footage is cream newsprint and the card is near-black, so the
           card needs no scrim to be legible. What it does need is for the
           footage to stop competing on the side the text lives — hence a
           gradient wash on the right only, much lighter than v2's, because
           there is real art under it now worth seeing. */
        .scrim { position: absolute; inset: 0; z-index: 4;
            background: linear-gradient(100deg, rgba(11,15,25,0) 40%, rgba(11,15,25,0.30) 58%, rgba(11,15,25,0.68) 74%);
            opacity: 0; animation: fadein 0.6s ease-out 0.15s forwards; }
        /* A soft floor under the subtitle, for the same reason. */
        .floor { position: absolute; z-index: 4; left: 0; right: 0; bottom: 0; height: 300px;
            background: linear-gradient(0deg, rgba(11,15,25,0.72) 0%, rgba(11,15,25,0.34) 55%, rgba(11,15,25,0) 100%);
            opacity: 0; animation: fadein 0.6s ease-out 0.15s forwards; }
        @keyframes fadein { to { opacity: 1; } }

        .top { position: absolute; top: 40px; left: 60px; right: 60px; z-index: 10;
            display: flex; justify-content: space-between; align-items: center;
            opacity: 0; animation: fadein 0.5s ease-out 0.1s forwards; }
        .ch { background: rgba(15,23,42,0.85); border: 2px solid #38bdf8; color: #38bdf8;
            padding: 10px 24px; border-radius: 30px; font-weight: 700; font-size: 20px; }
        .brand { background: rgba(15,23,42,0.85); border: 1px solid #334155; color: #94a3b8;
            padding: 8px 20px; border-radius: 20px; font-size: 18px; }

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
        .hi { font-style: normal; color: #fde047; border-bottom: 3px solid #f5871f;
            padding-bottom: 1px; font-weight: 800; }
        .def-en .hi { color: #fbbf24; border-bottom-width: 2px; }

        .flow { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .node { padding: 12px 18px; border: 2px solid #475569; border-radius: 12px;
            font-weight: 700; font-size: 19px; background: rgba(30,41,59,0.8); }
        .node.on { border-color: #38bdf8; color: #38bdf8; }
        .arrow { color: #64748b; font-size: 20px; }
        .headline { font-size: 40px; font-weight: 900; color: #34d399; line-height: 1.3; }

        /* One sentence at a time. The block is anchored at the bottom and grows
           upward, so a two-line segment never shoves a one-line segment around. */
        .subs { position: absolute; z-index: 10; left: 50%; bottom: 54px; width: 1500px;
            transform: translateX(-50%); }
        .subline { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; opacity: 0; }
        .sub-zh { font-size: 40px; font-weight: 800; line-height: 1.3; color: #ffffff;
            text-shadow: 0 3px 16px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9); }
        .sub-en { font-size: 20px; font-weight: 600; line-height: 1.35; color: #cbd5e1; margin-top: 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.85); }
        ${sub.css}

        .progress { position: absolute; z-index: 12; left: 0; bottom: 0; height: 7px; width: 100%;
            transform-origin: left; transform: scaleX(0);
            background: linear-gradient(90deg, #38bdf8, #34d399, #fbbf24, #f472b6);
            animation: fill ${duration}s linear forwards; }
        @keyframes fill { to { transform: scaleX(1); } }
    </style></head><body>
        ${card ? '<div class="scrim"></div>' : ''}
        ${sub.html ? '<div class="floor"></div>' : ''}
        <div class="top">
            <div class="ch">${esc(CHAPTERS[beat.id] ?? 'Domain 1')}</div>
            <div class="brand">CareerVivid Agentic Architecture · Domain 1</div>
        </div>
        ${card}
        ${sub.html ? `<div class="subs">${sub.html}</div>` : ''}
        <div class="progress"></div>
    </body></html>`;
}

// ── The footage bed ─────────────────────────────────────────────────────────

// The bed is rendered wider than the frame so each beat can choose where to sit
// inside it — see `framing()`.
const BED_W = 2304;
const BED_H = 1296;

/**
 * Turns an 8-second clip into a seamless loop unit by playing it forward and
 * then backward.
 *
 * Straight looping restarts with a hard cut every 8 seconds, which is the one
 * artefact that makes generated footage look generated. A boomerang's join is
 * a repeated frame at each end — invisible. Cached per clip, because fourteen
 * of the forty-five beats reuse another beat's shot.
 */
function boomerangBed(clipId) {
    const src = path.join(CLIPS_DIR, `d1--${clipId}.mp4`);
    if (!fs.existsSync(src)) return null;

    const bed = path.join(BOOMERANG_DIR, `${clipId}.mp4`);
    if (fs.existsSync(bed)) return bed;

    fs.mkdirSync(BOOMERANG_DIR, { recursive: true });
    execSync(
        `ffmpeg -y -i "${src}" -filter_complex ` +
        `"[0:v]scale=${BED_W}:${BED_H}:flags=lanczos,fps=${FPS},setsar=1,split[a][b];` +
        // trim=start_frame=1 on the reversed half drops the duplicated turning
        // frame, so the motion reverses cleanly instead of stuttering.
        `[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[v]" ` +
        `-map "[v]" -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p "${bed}"`,
        { stdio: 'pipe' });
    return bed;
}

/**
 * Where the 1920×1080 frame sits inside the oversized bed.
 *
 * Most shots are prompted as locked-off and centred, which puts the subject
 * directly under the card on the right rail. Rather than regenerate footage to
 * fix composition, the frame slides right within the bed on card beats — which
 * moves the subject left, out from under the card, and costs nothing.
 */
function framing(hasCard) {
    const y = Math.round((BED_H - H) / 2);
    return hasCard
        ? `crop=${W}:${H}:${BED_W - W}:${y}`   // hard right: subject shifts a full 384px left
        : `crop=${W}:${H}:${Math.round((BED_W - W) / 2)}:${y}`;
}

// ── Build ───────────────────────────────────────────────────────────────────

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });

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

    // `--beats a,b,c` renders a subset and stops before concat — for looking at
    // one change without waiting out a fourteen-minute film.
    const subset = process.argv.find(a => a.startsWith('--beats='))?.slice(8).split(',');
    const beats = subset
        ? DOMAIN_1_FILM.beats.filter(b => subset.includes(b.id))
        : DOMAIN_1_FILM.beats;
    if (subset && beats.length !== subset.length) {
        throw new Error(`unknown beat id in --beats: ${subset.filter(id => !beats.some(b => b.id === id)).join(', ')}`);
    }

    // Report missing footage up front rather than discovering it beat by beat
    // forty minutes in.
    const missing = [...new Set(beats.map(b => CLIP_FOR[b.id]).filter(Boolean))]
        .filter(c => !fs.existsSync(path.join(CLIPS_DIR, `d1--${c}.mp4`)));
    if (missing.length) {
        console.warn(`⚠️  ${missing.length} clip(s) not generated yet: ${missing.join(', ')}`);
        console.warn('   Those beats will render on a plain bed. Generate them and re-run to fill in.\n');
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: W, height: H } });

    const built = [];
    for (const [index, beat] of beats.entries()) {
        const wav = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const spoken = wavSeconds(wav);
        const duration = spoken ? spoken + 0.35 : 3.2;
        const out = path.join(OUT_DIR, `${String(index).padStart(2, '0')}-${beat.id}.mp4`);
        built.push(out);
        const tag = `[${index + 1}/${beats.length}] ${beat.id}`;
        if (fs.existsSync(out)) { console.log(`⏭  ${tag} (cached)`); continue; }

        const audioIn = spoken
            ? `-i "${wav}"`
            : `-f lavfi -i anullsrc=r=24000:cl=mono -t ${duration.toFixed(2)}`;

        // A Remotion term animation is already finished video; it only needs the
        // film's furniture laid back over it so it does not read as a different
        // production.
        if (beat.clip) {
            const src = path.join(TERMCLIP_DIR, `${beat.clip}.mp4`);
            if (!fs.existsSync(src)) throw new Error(`missing term clip: ${src}`);
            const hold = Math.max(0, duration - probeSeconds(src));
            const overlayPng = path.join(OUT_DIR, `overlay-${beat.id}.png`);
            await page.setContent(buildOverlayHTML({ ...beat, visual: null }, duration), { waitUntil: 'networkidle' });
            await page.screenshot({ path: overlayPng, omitBackground: true });

            execSync(
                `ffmpeg -y -i "${src}" ${audioIn} -i "${overlayPng}" ` +
                `-filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=${(hold + 0.4).toFixed(2)},fps=${FPS}[bg];` +
                `[bg][2:v]overlay=0:0[v]" -map "[v]" -map 1:a ` +
                `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${out}"`,
                { stdio: 'pipe' });
            console.log(`🎞  ${tag} — Remotion clip + ${duration.toFixed(1)}s voice`);
            continue;
        }

        // Render the card layer as transparent frames.
        const frames = Math.ceil(duration * FPS);
        const framesDir = path.join(OUT_DIR, `frames-${beat.id}`);
        fs.rmSync(framesDir, { recursive: true, force: true });
        fs.mkdirSync(framesDir, { recursive: true });

        await page.setContent(buildOverlayHTML(beat, duration), { waitUntil: 'networkidle' });
        await page.evaluate(() => document.getAnimations({ subtree: true }).forEach(a => a.pause()));

        const t0 = Date.now();
        for (let f = 0; f < frames; f += 1) {
            await page.evaluate((ms) =>
                document.getAnimations({ subtree: true }).forEach(a => { a.currentTime = ms; }),
                (f / FPS) * 1000);
            await page.screenshot({
                path: path.join(framesDir, `f${String(f).padStart(5, '0')}.png`),
                type: 'png', omitBackground: true,
            });
        }
        const renderFps = (frames / ((Date.now() - t0) / 1000)).toFixed(1);

        const bed = boomerangBed(CLIP_FOR[beat.id]);
        const bg = bed
            // -stream_loop repeats the boomerang until the overlay runs out;
            // `shortest=1` on the overlay input is what actually sets the length.
            ? { input: `-stream_loop -1 -i "${bed}"`, chain: `[0:v]${framing(hasCard(beat))},fps=${FPS},setsar=1[bg];` }
            // No footage: a flat dark plate rather than black, so a missing clip
            // reads as a design choice instead of a bug.
            : { input: `-f lavfi -i color=c=0x0b0f19:s=${W}x${H}:r=${FPS}`, chain: `[0:v]setsar=1[bg];` };

        execSync(
            `ffmpeg -y ${bg.input} -framerate ${FPS} -i "${framesDir}/f%05d.png" ${audioIn} ` +
            `-filter_complex "${bg.chain}[bg][1:v]overlay=0:0:shortest=1,format=yuv420p[v]" ` +
            `-map "[v]" -map 2:a -c:v libx264 -preset medium -crf 21 -c:a aac -b:a 192k -shortest "${out}"`,
            { stdio: 'pipe' });
        fs.rmSync(framesDir, { recursive: true, force: true });
        console.log(`🎬 ${tag} — ${frames} frames @ ${renderFps} fps${bed ? '' : ' (no footage)'}`);
    }
    await browser.close();

    if (subset) {
        console.log(`\n✅ ${built.length} beat(s) rendered, no concat (--beats):`);
        built.forEach(b => console.log(`   ${b}`));
        return;
    }

    console.log('\n🎞  Concatenating…');
    const list = path.join(OUT_DIR, 'concat.txt');
    fs.writeFileSync(list, built.map(c => `file '${c}'`).join('\n'));
    const raw = path.join(OUT_DIR, 'raw.mp4');
    execSync(`ffmpeg -y -f concat -safe 0 -i "${list}" -c copy "${raw}"`, { stdio: 'pipe' });

    console.log('🎵 Muxing intro BGM…');
    execSync(
        `ffmpeg -y -i "${raw}" -i "${BGM}" -filter_complex ` +
        `"[1:a]volume=0.05,afade=t=out:st=3.5:d=3.5[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]" ` +
        `-map 0:v -map "[aout]" -r ${FPS} -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p ` +
        `-c:a aac -b:a 128k -movflags +faststart "${FINAL_MP4}"`,
        { stdio: 'pipe' });

    execSync('npx tsx scripts/ccaf/export-narration-script.mjs', { stdio: 'inherit' });

    const probe = execSync(
        `ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "${FINAL_MP4}"`,
        { encoding: 'utf8' });
    console.log(`\n🎉 compiled → ${FINAL_MP4}\n${probe}`);
}

main().catch(error => { console.error(error); process.exit(1); });
