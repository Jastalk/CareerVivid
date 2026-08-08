/**
 * Post-build prerender for AEO/SEO: writes dist/quest/{slug}.html for
 * every company interview guide, each a copy of the built SPA shell with the
 * page's real <title>, meta description, canonical, OG tags, and JSON-LD
 * injected into <head>.
 *
 * Firebase Hosting serves exact static files BEFORE rewrites, so crawlers and
 * answer engines that don't execute JS get correct metadata, while human
 * visitors get the normal SPA (React takes over on hydration).
 *
 * Runs automatically at the end of scripts/build.mjs; safe to run manually:
 *   node scripts/prerender-quest-pages.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ORIGIN = 'https://careervivid.app';

const indexHtmlPath = path.join(DIST, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
    console.error('dist/index.html not found — run the build first.');
    process.exit(1);
}
const shell = fs.readFileSync(indexHtmlPath, 'utf-8');

const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Replace generic shell SEO tags instead of leaving duplicate canonicals. */
const renderPage = ({ title, description, canonical, jsonLd }) => {
    const headBits = [
        `<meta name="description" content="${escapeHtml(description)}" data-prerender="true">`,
        `<link rel="canonical" href="${canonical}" data-prerender="true">`,
        `<meta property="og:title" content="${escapeHtml(title)}" data-prerender="true">`,
        `<meta property="og:description" content="${escapeHtml(description)}" data-prerender="true">`,
        `<meta property="og:url" content="${canonical}" data-prerender="true">`,
        `<meta property="og:type" content="website" data-prerender="true">`,
        `<script type="application/ld+json" data-prerender="true">${JSON.stringify(jsonLd)}</script>`,
    ].join('\n    ');

    const pageShell = shell
        .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:title|og:description|og:url|og:type|twitter:title|twitter:description|twitter:url)["'][^>]*>\s*/gi, '')
        .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>\s*/gi, '')
        .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');

    return pageShell
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
        .replace('</head>', `    ${headBits}\n  </head>`);
};

const writePage = (routePath, html) => {
    const dir = path.join(DIST, path.dirname(routePath));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(DIST, `${routePath}.html`), html);
};

/* ---------------- Quest pages ---------------- */

const guideIndex = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'interview-guides', '_index.json'), 'utf-8'));
const guides = Object.values(guideIndex).filter(
    (entry) => entry && typeof entry === 'object' && entry.company && entry.slug,
);

const STAGE_NAMES = ['Recruiter screen', 'Coding round', 'System design', 'Behavioral round', 'Final round'];

let questCount = 0;
for (const guide of guides) {
    const canonical = `${ORIGIN}/quest/${guide.slug}`;
    const title = `${guide.company} Interview Practice — Mock the Real Loop | CareerVivid`;
    const description = `Practice ${guide.company}'s interview loop free: recruiter screen, live coding with real test execution, whiteboard system design, behavioral and final rounds. A voice AI interviews and scores you${guide.difficulty ? ` — company difficulty ${guide.difficulty}/10` : ''}.`;

    writePage(`quest/${guide.slug}`, renderPage({
        title,
        description,
        canonical,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${guide.company} interview practice`,
            url: canonical,
            description,
            isPartOf: { '@id': `${ORIGIN}/#website` },
            mainEntity: {
                '@type': 'ItemList',
                name: `${guide.company} interview loop stages`,
                numberOfItems: STAGE_NAMES.length,
                itemListElement: STAGE_NAMES.map((name, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name,
                })),
            },
        },
    }));
    questCount += 1;
}

console.log(`Prerendered ${questCount} canonical quest pages into dist/.`);
