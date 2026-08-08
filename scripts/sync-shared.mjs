#!/usr/bin/env node
/**
 * Copies `shared/*.ts` into `functions/src/generated/`.
 *
 * The web app imports `shared/` directly through the `@shared` Vite alias. The
 * functions build cannot: it is CommonJS and its tsconfig is scoped to
 * `include: ["src"]`, so a file outside `src` is invisible to it. Widening
 * `rootDir` to the repo root would relocate the build output and break the
 * `main` entry point.
 *
 * So functions get a generated copy instead. `shared/` stays canonical and is
 * the only file anyone edits.
 *
 *   npm run sync:shared           regenerate
 *   npm run sync:shared -- --check  verify freshness (CI, predeploy)
 *
 * Replace this with npm workspaces when packages/ lands — see
 * docs/architecture/refactor-plan.md.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'shared');
const outDir = join(root, 'functions', 'src', 'generated');
const check = process.argv.includes('--check');

const banner = (name) =>
    `// AUTO-GENERATED from shared/${name} by scripts/sync-shared.mjs — DO NOT EDIT.\n` +
    `// Edit shared/${name} and run: npm run sync:shared\n\n`;

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// Tests stay out of the functions bundle — they would pull vitest into a
// deployed artifact that has no dev dependencies.
const files = readdirSync(srcDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
let stale = [];

for (const name of files) {
    const expected = banner(name) + readFileSync(join(srcDir, name), 'utf8');
    const target = join(outDir, name);
    const actual = existsSync(target) ? readFileSync(target, 'utf8') : null;

    if (actual === expected) continue;

    if (check) {
        stale.push(name);
    } else {
        writeFileSync(target, expected);
        console.log(`  synced  shared/${name} → functions/src/generated/${name}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Course catalog summary
//
// The web app loads data/courses/*.json through import.meta.glob, which
// functions cannot do. The agent's recommendLearningPath tool needs the
// catalog to recommend FROM, so emit a compact summary here rather than
// trusting the client to send one — a client-supplied catalog would let the
// caller invent courses for the model to suggest.
// ─────────────────────────────────────────────────────────────────────────────
const coursesDir = join(root, 'data', 'courses');
if (existsSync(coursesDir)) {
    const courses = readdirSync(coursesDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(join(coursesDir, f), 'utf8')))
        .filter((c) => c.status === 'published')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((c) => ({
            id: c.id,
            title: c.title,
            track: c.track ?? 'ai-agent',
            difficulty: c.difficulty,
            estimatedMinutes: c.estimatedMinutes,
            tagline: (c.tagline ?? '').slice(0, 160),
            lessons: (c.chapters ?? []).reduce((n, ch) => n + (ch.exercises?.length ?? 0), 0),
        }));

    const expected =
        `// AUTO-GENERATED from data/courses/*.json by scripts/sync-shared.mjs — DO NOT EDIT.\n` +
        `// Regenerate with: npm run sync:shared\n\n` +
        `export interface CourseSummary {\n` +
        `    id: string;\n    title: string;\n    track: string;\n    difficulty: string;\n` +
        `    estimatedMinutes: number;\n    tagline: string;\n    lessons: number;\n}\n\n` +
        `export const COURSE_CATALOG: CourseSummary[] = ${JSON.stringify(courses, null, 4)};\n`;

    const target = join(outDir, 'courseCatalog.ts');
    const actual = existsSync(target) ? readFileSync(target, 'utf8') : null;
    if (actual !== expected) {
        if (check) stale.push('courseCatalog.ts (from data/courses/)');
        else {
            writeFileSync(target, expected);
            console.log(`  synced  data/courses/*.json → functions/src/generated/courseCatalog.ts (${courses.length} courses)`);
        }
    }
}

if (check && stale.length) {
    console.error(
        `\n  ✖ functions/src/generated is stale: ${stale.join(', ')}\n` +
        `    Run: npm run sync:shared\n`,
    );
    process.exit(1);
}

if (check) console.log('  ✔ generated files are current');
else if (files.length) console.log(`  ✔ ${files.length} file(s) in sync`);
