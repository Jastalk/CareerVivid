#!/usr/bin/env node
/**
 * Refuses to deploy from a checkout that is not what is on origin/main.
 *
 * This exists because it already happened: a deploy was run from a folder five
 * commits behind, with an abandoned prototype still wired into the landing
 * page, and it silently replaced the live site with the old one. Nothing in the
 * build failed — the build was perfectly correct, for the wrong source.
 *
 * Run with --allow-dirty when deploying a deliberate local change.
 */

import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();
const die = (lines) => {
    console.error(`\n  Refusing to deploy.\n\n${lines.map((l) => `  ${l}`).join('\n')}\n`);
    process.exit(1);
};

const allowDirty = process.argv.includes('--allow-dirty');

let branch;
try {
    branch = run('git rev-parse --abbrev-ref HEAD');
} catch {
    die(['Not a git checkout, so there is no way to tell what this would ship.']);
}

try {
    run('git fetch origin main --quiet');
} catch {
    console.warn('  Could not reach origin — comparing against the last fetch.\n');
}

const head = run('git rev-parse HEAD');
const remote = run('git rev-parse origin/main');
const behind = Number(run('git rev-list --count HEAD..origin/main'));
const ahead = Number(run('git rev-list --count origin/main..HEAD'));
// Only what actually ships. An untracked PDF or scratch note in docs/ has no
// bearing on the built site, and blocking on it trains people to pass
// --allow-dirty by reflex, which defeats the check that matters.
const dirty = run('git status --porcelain -- src functions firebase.json package.json');

if (head !== remote) {
    const detail = [];
    if (behind) detail.push(`${behind} commit${behind > 1 ? 's' : ''} behind origin/main — this would ship an older site.`);
    if (ahead) detail.push(`${ahead} commit${ahead > 1 ? 's' : ''} ahead of origin/main — push first, so main matches what goes live.`);
    // The remedy depends on which way the divergence runs; telling someone to
    // pull when they are ahead sends them to a merge they did not need.
    const remedy = behind && ahead
        ? 'Fix it with:  git pull --rebase origin main   (then push)'
        : behind
            ? 'Fix it with:  git pull --ff-only origin main'
            : `Fix it with:  git push origin ${branch === 'main' ? 'main' : `HEAD:main`}`;
    die([
        `On ${branch}, at ${head.slice(0, 8)}; origin/main is at ${remote.slice(0, 8)}.`,
        ...detail,
        '',
        remedy,
    ]);
}

if (dirty && !allowDirty) {
    die([
        'Uncommitted source changes would go live without being on main:',
        ...dirty.split('\n').slice(0, 10),
        '',
        'Commit and push them, or re-run with:  npm run deploy -- --allow-dirty',
    ]);
}

console.log(`  Deploying ${head.slice(0, 8)} — matches origin/main.\n`);
