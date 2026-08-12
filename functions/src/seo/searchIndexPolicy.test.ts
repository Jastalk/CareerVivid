import { describe, expect, it } from 'vitest';
import { SEARCH_PAGES, getSearchPage, type SearchPageDefinition } from './searchIndexPolicy';
import { QUEST_ROUTE_SLUGS } from './questRoutes.generated';

/*
 * Measured against Googlebot before this existed:
 *
 *   /interview-studio   58 words
 *   /pricing            58 words   — containing no prices
 *   /job-market         46 words
 *   /product            54 words
 *
 * Each served an H1, one sentence, and a link pointing back at itself. They
 * were indexed and had nothing to rank for, which is the whole reason Google's
 * AI Overview described CareerVivid from the Chrome Web Store listing instead
 * of from any page CareerVivid owns.
 */

/** Every word a crawler would read on the page. */
const wordsOn = (page: SearchPageDefinition): number => {
    const text = [
        page.heading,
        page.summary,
        ...(page.sections ?? []).flatMap((s) => [s.heading, s.body ?? '', ...(s.bullets ?? [])]),
        ...(page.faqs ?? []).flatMap((f) => [f.question, f.answer]),
    ].join(' ');
    return text.split(/\s+/).filter(Boolean).length;
};

/** The pages that have to answer a commercial query, not just exist. */
const MONEY_PAGES = ['/pricing', '/interview-studio', '/product', '/resume-builder', '/jobs'];

const page = (path: string): SearchPageDefinition => {
    const found = getSearchPage(path);
    if (!found) throw new Error(`${path} is missing from SEARCH_PAGES`);
    return found;
};

describe('crawler-facing content', () => {
    it.each(MONEY_PAGES)('%s says enough to rank for anything', (path) => {
        expect(wordsOn(page(path))).toBeGreaterThan(250);
    });

    it.each(MONEY_PAGES)('%s answers real questions', (path) => {
        expect(page(path).faqs?.length ?? 0).toBeGreaterThanOrEqual(3);
    });

    /*
     * Every link used to point at the page itself, so crawlers found no way
     * deeper into the site and no page passed authority to any other.
     */
    it.each(MONEY_PAGES)('%s links somewhere other than itself', (path) => {
        const links = page(path).links ?? [];
        expect(links.length).toBeGreaterThan(0);
        expect(links.every((l) => l.href !== path)).toBe(true);
    });

    it('has no duplicate paths', () => {
        const paths = SEARCH_PAGES.map((p) => p.path);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('never writes a title Google will truncate', () => {
        for (const p of SEARCH_PAGES) {
            expect(p.title.length, `${p.path} title`).toBeLessThanOrEqual(65);
            expect(p.description.length, `${p.path} description`).toBeLessThanOrEqual(200);
        }
    });

    /*
     * Auth screens are excluded on purpose. Nobody searches for a login form,
     * and padding its description to hit a number would be writing for the test
     * rather than for a reader.
     */
    it('gives every page that should attract search traffic a real description', () => {
        const utility = new Set(['/signin', '/signup']);
        for (const p of SEARCH_PAGES.filter((x) => !utility.has(x.path))) {
            expect(p.description.length, `${p.path} description`).toBeGreaterThan(70);
        }
    });

    it('points every internal link at a path that exists', () => {
        // Routes that are real pages but deliberately not in SEARCH_PAGES.
        const known = new Set([...SEARCH_PAGES.map((p) => p.path), '/learning', '/community']);
        for (const p of SEARCH_PAGES) {
            for (const link of p.links ?? []) {
                expect(known.has(link.href), `${p.path} -> ${link.href}`).toBe(true);
            }
        }
    });
});

/*
 * /job-market is a ProtectedRoute. It sat in the sitemap carrying Google's
 * "Explore the job market" sitelink, so every searcher who clicked it hit a
 * login wall — a click spent for nothing, and the kind of page Google learns
 * to stop showing.
 */
describe('nothing behind a login wall is advertised to search engines', () => {
    const GATED = ['/job-market', '/jobmarket', '/dashboard', '/newresume', '/jobs/recommend', '/job-tracker'];

    it.each(GATED)('%s is not in SEARCH_PAGES', (path) => {
        expect(SEARCH_PAGES.some((p) => p.path === path)).toBe(false);
    });

    it('no page links to one either', () => {
        for (const p of SEARCH_PAGES) {
            for (const link of p.links ?? []) {
                expect(GATED, `${p.path} -> ${link.href}`).not.toContain(link.href);
            }
        }
    });

    it('sends the job-market intent to the public list instead', () => {
        const jobs = getSearchPage('/jobs');
        expect(jobs?.title).toContain('Job Market');
        expect(jobs?.includeInSitemap).toBe(true);
    });
});

/*
 * /interview-studio is the hub above 301 company guides, built for
 * "[company] interview questions". A hub that names companies without linking
 * them is a keyword list — the links are the entire point, because they are
 * how a crawler reaches the pages that answer the query.
 */
describe('the interview hub links onward', () => {
    const hub = page('/interview-studio');

    it('links every named company to its own guide', () => {
        const companyLinks = (hub.sections ?? []).flatMap((s) => s.links ?? [])
            .filter((l) => l.href.startsWith('/quest/'));

        expect(companyLinks.length).toBeGreaterThanOrEqual(12);
        for (const link of companyLinks) {
            expect(link.href, link.label).toMatch(/^\/quest\/[a-z0-9-]+$/);
        }
    });

    /*
     * Hand-written slugs against a generated list. "meta" and "facebook" are
     * both wrong — the real slug is "meta-facebook" — and a hub page whose
     * links 404 is worse than one that links nothing.
     */
    it('points every company link at a guide that exists', () => {
        const slugs = new Set(QUEST_ROUTE_SLUGS);
        const links = (hub.sections ?? []).flatMap((s) => s.links ?? [])
            .filter((l) => l.href.startsWith('/quest/'));

        for (const link of links) {
            expect(slugs.has(link.href.replace('/quest/', '')), `${link.label} -> ${link.href}`).toBe(true);
        }
    });

    it('names the companies people actually search for', () => {
        const labels = (hub.sections ?? []).flatMap((s) => (s.links ?? []).map((l) => l.label));
        for (const name of ['Google', 'Meta', 'OpenAI', 'Anthropic', 'Amazon']) {
            expect(labels, name).toContain(name);
        }
    });

    /*
     * The provenance claim is the strongest thing this page says and the one a
     * competitor would challenge, so it is stated once, plainly, and the FAQ
     * answers it directly rather than implying it.
     */
    it('says where the questions came from', () => {
        expect(JSON.stringify(hub)).toContain('reported by candidates who interviewed');
        expect(hub.faqs?.some((f) => /where do .*questions come from/i.test(f.question))).toBe(true);
    });
});
