import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSearchPage } from '../../functions/src/seo/searchIndexPolicy';

/*
 * The homepage is the one page NOT rewritten to renderSeoContent — Firebase
 * serves dist/index.html for "/" directly. So its title and description live in
 * index.html, and SEARCH_PAGES["/"] only feeds the sitemap.
 *
 * That split is easy to miss: editing the policy file alone changes nothing a
 * crawler sees, which is exactly the mistake this guards. The two must agree,
 * and the tags in index.html must agree with each other — a page whose og:title
 * differs from its <title> gets a different headline when shared.
 */

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

const tagContent = (pattern: RegExp): string => {
    const match = html.match(pattern);
    if (!match) throw new Error(`index.html is missing ${pattern}`);
    return decode(match[1]).trim();
};

const title = tagContent(/<title>([^<]*)<\/title>/);
const description = tagContent(/<meta[^>]*name="description"[^>]*content="([^"]*)"/);

describe('homepage meta', () => {
    it('matches the sitemap entry, which is fed from a different file', () => {
        const page = getSearchPage('/')!;
        expect(title).toBe(page.title);
        expect(description).toBe(page.description);
    });

    it('says the same thing to search, Open Graph and Twitter', () => {
        expect(tagContent(/property="og:title"[^>]*content="([^"]*)"/)).toBe(title);
        expect(tagContent(/name="twitter:title"[^>]*content="([^"]*)"/)).toBe(title);
        expect(tagContent(/property="og:description"[^>]*content="([^"]*)"/)).toBe(description);
        expect(tagContent(/name="twitter:description"[^>]*content="([^"]*)"/)).toBe(description);
    });

    /*
     * Google truncates around 60 characters. The brand is deliberately last:
     * the result already prints "CareerVivid" twice above the title, in the
     * site-name line and the URL, so opening with it spends the most weighted
     * position on a word nobody searches yet.
     */
    it('fits what Google will show, and leads with the keyword', () => {
        expect(title.length).toBeLessThanOrEqual(60);
        expect(description.length).toBeLessThanOrEqual(155);
        expect(description.length).toBeGreaterThan(70);
        expect(title.startsWith('CareerVivid')).toBe(false);
        expect(title.endsWith('CareerVivid')).toBe(true);
    });

    it('names the three things the site is built to be found for', () => {
        for (const term of ['Resume Builder', 'Interviews', 'Jobs']) {
            expect(title, term).toContain(term);
        }
    });
});
