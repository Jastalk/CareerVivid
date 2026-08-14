#!/usr/bin/env node
/**
 * Checks the LIVE site after a deploy, and fails loudly if it is broken.
 *
 * Written after a deploy replaced the homepage with a five-commit-old build and
 * nobody noticed until a person opened the site, and again after every open tab
 * started reporting "MIME type text/html" for chunks the deploy had deleted.
 * Both were invisible to the build — the build was correct, for the wrong
 * source, and correct-but-incomplete respectively.
 *
 * The checks are deliberately about what a browser experiences, not about what
 * we intended to publish.
 */

const SITE = process.env.VERIFY_SITE || 'https://careervivid.app';

// Every route a visitor can land on directly. A soft 404 here — the SPA
// catch-all answering 200 with the homepage — is a silent failure, so the
// expected title is part of the check.
const ROUTES = [
    { path: '/', mustContain: 'CareerVivid' },
    { path: '/pricing', mustContain: 'Pricing' },
    { path: '/jobs', mustContain: 'Job' },
    { path: '/interview-studio', mustContain: 'Interview' },
    { path: '/learning', mustContain: 'Courses' },
    { path: '/edit/new', mustContain: 'Resume' },
    { path: '/signin', mustContain: 'Sign in' },
];

const BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const HUMAN = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const failures = [];
const fail = (msg) => { failures.push(msg); console.error(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);

const get = async (path, ua = HUMAN) => {
    const res = await fetch(`${SITE}${path}`, { headers: { 'User-Agent': ua }, redirect: 'manual' });
    return { status: res.status, type: res.headers.get('content-type') || '', body: res.status < 400 ? await res.text() : '' };
};

console.log(`\nVerifying ${SITE}\n`);

// 1. Every asset the shipped HTML asks for must actually be there.
//    This is the check that would have caught the MIME-type failure: an asset
//    that 404s is answered by the catch-all with index.html, so it arrives as
//    text/html and the browser refuses to execute it.
console.log('assets referenced by the live index.html');
const home = await get('/');
const assets = [...new Set([...home.body.matchAll(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)].map((m) => m[0]))];
if (!assets.length) fail('index.html references no /assets/ files at all — is this really the app?');
for (const asset of assets) {
    const res = await fetch(`${SITE}${asset}`);
    const type = res.headers.get('content-type') || '';
    if (!res.ok || type.includes('html')) fail(`${asset} -> ${res.status} ${type} (the catch-all answered; the file is missing)`);
}
if (!failures.length) pass(`all ${assets.length} resolve as real javascript/css`);

/*
 * 2. Routes answer, and answer as themselves.
 *
 * Checked as a crawler, not as a browser. For a browser every route is the same
 * index.html by design and React sets the title after boot, so reading <title>
 * from a human response always shows the shell and proves nothing. The crawler
 * path is where per-page HTML actually exists, so it is the only place a soft
 * 404 — the catch-all answering 200 with the homepage — is visible from outside.
 */
console.log('\nroutes (as a crawler, where per-page HTML exists)');
for (const route of ROUTES) {
    const human = await get(route.path);
    if (human.status !== 200) { fail(`${route.path} -> ${human.status} for a browser`); continue; }

    const res = await get(route.path, BOT);
    if (res.status !== 200) { fail(`${route.path} -> ${res.status} for Googlebot`); continue; }
    const title = (res.body.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    if (!title.toLowerCase().includes(route.mustContain.toLowerCase())) {
        fail(`${route.path} answered 200 but its crawler title is "${title}" — expected to mention "${route.mustContain}". A soft 404 looks exactly like this.`);
    }
}
if (!failures.length) pass(`all ${ROUTES.length} return 200, and identify as themselves to a crawler`);

/*
 * 3. A URL that is not a route must not look like a page.
 *
 * The SPA catch-all answers 200 for literally anything, which is how an
 * internal endpoint ended up in Google's index under a stale title. This does
 * not fail the deploy — it is a standing property of the routing, not a
 * regression — but it should stay visible until it is fixed.
 */
console.log('\nsoft 404s');
const junk = await get('/definitely-not-a-real-page-xyz', BOT);
if (junk.status === 200) {
    console.warn('  ! /definitely-not-a-real-page-xyz answers 200 — unknown URLs are indexable duplicates of the homepage');
} else pass(`unknown URLs return ${junk.status}`);

// 3. index.html must never be cached, or a deploy cannot reach anyone.
console.log('\ncaching');
const headers = (await fetch(SITE, { headers: { 'User-Agent': HUMAN } })).headers.get('cache-control') || '';
if (!/no-store|no-cache|max-age=0/.test(headers)) {
    fail(`index.html is cacheable (cache-control: ${headers}) — returning visitors will be pinned to an old build`);
} else pass(`index.html is not cached (${headers})`);

// 4. Crawlers must still get server-rendered copy.
console.log('\ncrawler content');
const bot = await get('/interview-studio', BOT);
if (!/<meta name="description"/.test(bot.body)) {
    fail('/interview-studio serves no meta description to Googlebot — the SEO function may not be deployed');
} else pass('the SEO renderer is answering');

console.log('');
if (failures.length) {
    console.error(`${failures.length} problem(s). The deploy is live and broken — fix forward or roll back.\n`);
    process.exit(1);
}
console.log('Live site verified.\n');
