#!/usr/bin/env node
/**
 * Drops build assets no recent index.html references.
 *
 * `emptyOutDir: false` keeps old chunks so tabs open across a deploy keep
 * working. Without a prune, dist grows forever. This keeps anything the current
 * build uses plus anything touched in the last N days, so the previous few
 * deploys stay recoverable.
 */
import { readdirSync, readFileSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 7);
const dry = process.argv.includes('--dry-run');

if (!existsSync(join(DIST, 'index.html'))) {
    console.error('No dist/index.html — build first.');
    process.exit(1);
}

const referenced = new Set(
    [...readFileSync(join(DIST, 'index.html'), 'utf8').matchAll(/assets\/([A-Za-z0-9._-]+\.(?:js|css))/g)].map((m) => m[1]),
);

const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
let removed = 0;
let bytes = 0;

for (const name of readdirSync(join(DIST, 'assets'))) {
    if (referenced.has(name)) continue;
    const path = join(DIST, 'assets', name);
    const stat = statSync(path);
    if (stat.mtimeMs > cutoff) continue;
    bytes += stat.size;
    removed += 1;
    if (!dry) unlinkSync(path);
}

console.log(
    `${dry ? 'Would remove' : 'Removed'} ${removed} asset(s), ${(bytes / 1024 / 1024).toFixed(1)} MB — ` +
    `kept everything this build uses and anything newer than ${KEEP_DAYS} days.`,
);
