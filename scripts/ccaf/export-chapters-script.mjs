/**
 * export-chapters-script.mjs
 *
 * Regenerates the readable narration document from domain1Chapters.ts.
 *
 * The document is where the script gets reviewed — comments come back against
 * it, edits go into the .ts, and this runs again. It is generated, never
 * hand-edited: doing it by hand failed once already, and the reviewer spent an
 * afternoon commenting on lines the film no longer said.
 *
 * Run: npx tsx scripts/ccaf/export-chapters-script.mjs
 */

import fs from 'fs';
import path from 'path';
import { DOMAIN_1_CHAPTERS } from './domain1Chapters.ts';

const OUT = path.resolve('scripts/ccaf/domain-1-chapters-script.md');
const WPS = 2.4;   // Chirp3-HD Fenrir, words per second

const secs = (t) => t.split(/\s+/).length / WPS;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const lines = [];
lines.push('# Domain 1 — 五支短片 · 旁白定稿');
lines.push('');
lines.push('> 这份文档由 `domain1Chapters.ts` 生成，**不要直接改这里**。');
lines.push('> 在这上面提意见，改动写回 .ts，再跑 `npx tsx scripts/ccaf/export-chapters-script.mjs`。');
lines.push('');
lines.push('参照 System Design 样片的节奏：**场景 → 弯路 → 机制 → 术语 → 陷阱 → 出口**。');
lines.push('每章屏幕上最多一个标识符；其余术语只在旁白里带过一次，名字的记忆交给练习题。');
lines.push('');

let filmTotal = 0;
const summary = [];

for (const c of DOMAIN_1_CHAPTERS) {
    const words = c.beats.reduce((n, b) => n + b.narration.en.split(/\s+/).length, 0);
    const dur = words / WPS;
    filmTotal += dur;
    const termNames = c.beats.filter(b => b.term).map(b => b.term.name);
    summary.push({ n: c.order, title: c.title, beats: c.beats.length, dur, termNames });

    lines.push('---');
    lines.push('');
    lines.push(`## 第 ${c.order} 章 · ${c.title.zh}`);
    lines.push(`### ${c.title.en}`);
    lines.push('');
    lines.push(`**一句话**：${c.premise.zh}`);
    lines.push('');
    lines.push(`\`${c.beats.length}\` beats · \`~${clock(dur)}\` · 屏幕上的标识符：${termNames.length ? termNames.map(t => `\`${t}\``).join('、') : '（无）'}`);
    lines.push('');

    let at = 0;
    for (const b of c.beats) {
        const d = secs(b.narration.en);
        lines.push(`#### \`${b.id}\`  ·  ${clock(at)} → ${clock(at + d)}  (${d.toFixed(1)}s)`);
        at += d;
        if (b.teaches?.length) lines.push(`*任务：${b.teaches.map(t => `\`${t}\``).join('、')}*`);
        lines.push('');
        lines.push(`> ${b.narration.en}`);
        lines.push('');
        lines.push(`中文字幕：${b.narration.zh}`);
        lines.push('');

        if (b.term) {
            lines.push(`**术语卡 · \`${b.term.name}\`**`);
            lines.push('');
            lines.push('| | |');
            lines.push('|---|---|');
            lines.push(`| 问题 | ${b.term.problem.zh}<br/><sub>${b.term.problem.en}</sub> |`);
            lines.push(`| 解法 | ${b.term.solution.zh}<br/><sub>${b.term.solution.en}</sub> |`);
            lines.push(`| 本质 | ${b.term.essence.zh}<br/><sub>${b.term.essence.en}</sub> |`);
            lines.push('');
        }

        if (b.contrast) {
            lines.push('**对照卡**');
            lines.push('');
            lines.push(`- ❌ **${b.contrast.bad.head.zh}** — ${b.contrast.bad.body.zh}`);
            lines.push(`- ✅ **${b.contrast.good.head.zh}** — ${b.contrast.good.body.zh}`);
            lines.push('');
        }
    }
}

lines.splice(6, 0,
    '## 总览',
    '',
    '| 章 | 标题 | beats | 时长 | 屏幕上的标识符 |',
    '|---:|---|---:|---:|---|',
    ...summary.map(s =>
        `| ${s.n} | ${s.title.zh} | ${s.beats} | ~${clock(s.dur)} | ${s.termNames.map(t => `\`${t}\``).join('、') || '—'} |`),
    `| | **合计** | **${summary.reduce((n, s) => n + s.beats, 0)}** | **~${clock(filmTotal)}** | **${summary.flatMap(s => s.termNames).length} 个** |`,
    '',
    `对比改写前：**45 beats · 14:06 · 32 个标识符 · 105 行密集卡片文本**。`,
    '',
);

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`✅ ${OUT}`);
console.log(`   ${DOMAIN_1_CHAPTERS.length}/5 章 · ${summary.reduce((n, s) => n + s.beats, 0)} beats · ~${clock(filmTotal)}`);
