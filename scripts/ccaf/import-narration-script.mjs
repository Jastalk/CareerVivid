/**
 * Pulls edits made in domain-1-narration-script.md back into domain1Script.ts.
 *
 * The markdown is the shared surface: it is where the narration is easiest to
 * read end to end, so it is where edits actually happen — by either of us. This
 * makes that safe. Without it the document is write-only and any human edit is
 * destroyed by the next export.
 *
 * Only narration is round-tripped. Visuals, image prompts, timings and the
 * mission mapping stay in the TypeScript, because those are structure rather
 * than prose and the markdown has no way to express them.
 *
 *   npx tsx scripts/ccaf/import-narration-script.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';

const MD = path.resolve('scripts/ccaf/domain-1-narration-script.md');
const TS = path.resolve('scripts/ccaf/domain1Script.ts');
const dryRun = process.argv.includes('--dry-run');

const md = fs.readFileSync(MD, 'utf-8');

/** Every `### \`beat-id\`` section, with its `>` English line and 中文字幕 line. */
const parsed = new Map();
const sections = md.split(/^### `/m).slice(1);
for (const section of sections) {
    const id = section.slice(0, section.indexOf('`'));
    const en = section.match(/^> (.+)$/m)?.[1]?.trim();
    const zh = section.match(/^中文字幕：(.+)$/m)?.[1]?.trim();
    if (id && en && zh) parsed.set(id, { en, zh });
}
if (!parsed.size) {
    console.error('❌ Parsed no beats. Has the document format changed?');
    process.exit(1);
}

let ts = fs.readFileSync(TS, 'utf-8');
const js = (t) => `'${t.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

let changed = 0;
const changedIds = [];
for (const [id, { en, zh }] of parsed) {
    const at = ts.indexOf(`id: '${id}',`);
    if (at === -1) { console.warn(`  ⚠️  ${id} is in the document but not in the script — skipped`); continue; }
    const start = ts.indexOf('narration: {', at);
    if (start === -1) continue;
    const end = ts.indexOf('},', start) + 2;
    const current = ts.slice(start, end);
    const next = `narration: {\n            en: ${js(en)},\n            zh: ${js(zh)},\n        },`;
    if (current === next) continue;
    ts = ts.slice(0, start) + next + ts.slice(end);
    changed += 1;
    changedIds.push(id);
}

if (!changed) { console.log('✓ narration already matches the document — nothing to import'); process.exit(0); }
if (dryRun) {
    console.log(`[dry run] would update ${changed} beat(s): ${changedIds.join(', ')}`);
    process.exit(0);
}
fs.writeFileSync(TS, ts);
console.log(`📥 imported ${changed} edited beat(s) from the document: ${changedIds.join(', ')}`);
console.log('   ⚠️  Re-run generate-fenrir-narration.mjs — the WAVs are now stale.');
