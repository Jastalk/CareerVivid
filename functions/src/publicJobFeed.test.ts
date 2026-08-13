import { describe, expect, it, vi } from 'vitest';
import { MAX_PUBLIC_JOB_PAGES, normalizePage, toPublicJob } from './publicJobFeed';

vi.mock('firebase-admin', () => ({
    apps: [{}],
    firestore: Object.assign(() => ({ collection: () => ({}) }), {
        Timestamp: { now: () => ({ toMillis: () => 0 }) },
        FieldValue: { serverTimestamp: () => null },
    }),
}));

/** A stored listing, including the fields that must never reach a stranger. */
const stored = () => ({
    title: 'Senior Product Manager',
    company: 'Stripe',
    location: 'San Francisco, CA',
    workModel: 'Hybrid',
    jobType: 'Full-time',
    seniority: 'Senior',
    salary: '$180,000 - $220,000',
    postedAt: '2026-08-01',
    sourceLabel: 'Greenhouse',
    applyUrl: 'https://boards.greenhouse.io/stripe/jobs/1',
    description: 'Own the payments platform roadmap.',
    // Derived from a signed-in user's own profile:
    matchedKeywords: ['payments', 'roadmap'],
    missingKeywords: ['kubernetes'],
    signals: ['profile:seniority'],
    sourceKey: 'stripe',
    sourceJobId: '1',
    validationStatus: 'valid',
    active: true,
});

describe('toPublicJob', () => {
    /*
     * The whole reason this shapes rather than spreads. matchedKeywords and
     * signals are computed against a specific user's profile; putting them on
     * an unauthenticated response would leak one user's data to everyone, and a
     * delete-these-fields approach leaks whatever field is added next.
     */
    it('returns only the allowlisted fields', () => {
        const job = toPublicJob('job-1', stored())!;

        expect(Object.keys(job).sort()).toEqual([
            'applyUrl', 'company', 'description', 'id', 'jobType',
            'location', 'postedAt', 'salary', 'seniority', 'sourceLabel',
            'title', 'workModel',
        ]);
    });

    it('never carries profile-derived fields', () => {
        const job = toPublicJob('job-1', stored()) as unknown as Record<string, unknown>;

        for (const leak of ['matchedKeywords', 'missingKeywords', 'signals', 'sourceKey', 'sourceJobId']) {
            expect(job[leak], leak).toBeUndefined();
        }
    });

    it('drops a listing with no title or nowhere to apply', () => {
        expect(toPublicJob('a', { ...stored(), title: '' })).toBeNull();
        expect(toPublicJob('b', { ...stored(), applyUrl: '' })).toBeNull();
        expect(toPublicJob('c', {})).toBeNull();
    });

    it('trims a long description on a word boundary', () => {
        const long = { ...stored(), description: `${'word '.repeat(120)}end` };
        const job = toPublicJob('job-1', long)!;

        expect(job.description.length).toBeLessThanOrEqual(261);
        expect(job.description.endsWith('…')).toBe(true);
        expect(job.description).not.toMatch(/wor…$/);
    });

    it('leaves a short description alone', () => {
        expect(toPublicJob('job-1', stored())!.description).toBe('Own the payments platform roadmap.');
    });

    /*
     * What the live feed actually returns. Greenhouse, Lever and Ashby all hand
     * back raw HTML, so cards were rendering
     * `<h2>Who we are</h2> <h3>About Stripe</h3> <p>Stripe is a financial…`
     * as visible text — on the page whose entire job is making the listings
     * look worth trusting.
     */
    it('strips the HTML the scrapers hand back', () => {
        const html = { ...stored(), description: '<h2>Who we are</h2> <h3>About Stripe</h3><p>Stripe is a financial infrastructure platform.</p>' };
        expect(toPublicJob('job-1', html)!.description)
            .toBe('Who we are About Stripe Stripe is a financial infrastructure platform.');
    });

    it('does not run two sentences together where a block tag was', () => {
        const html = { ...stored(), description: '<p>We build payments.</p><p>We are hiring.</p>' };
        expect(toPublicJob('job-1', html)!.description).toBe('We build payments. We are hiring.');
    });

    it('decodes the entities that survive scraping', () => {
        const html = { ...stored(), description: 'Stripe&nbsp;&amp; friends &#39;build&#39; things' };
        expect(toPublicJob('job-1', html)!.description).toBe("Stripe & friends 'build' things");
    });

    it('never lets a script tag through as text', () => {
        const html = { ...stored(), description: '<script>alert(1)</script>Real copy.' };
        expect(toPublicJob('job-1', html)!.description).toBe('Real copy.');
    });

    /*
     * CodeQL #152. Every case below survived the old single-pass stripper and
     * rendered as visible text on the public jobs page.
     */
    it('does not spill the inside of an HTML comment onto the card', () => {
        // The comment contains a '>', so /<[^>]+>/ ended the match early and
        // left " next quarter -->" behind as body text.
        const html = { ...stored(), description: 'We are hiring.<!-- move > next quarter -->Apply now.' };
        expect(toPublicJob('j', html)!.description).toBe('We are hiring. Apply now.');
    });

    it('drops a script the scraper truncated before its closing tag', () => {
        const html = { ...stored(), description: 'Real copy.<script>var tracker = 1;' };
        expect(toPublicJob('j', html)!.description).toBe('Real copy.');
    });

    it('removes a tag that only appears once an outer tag is gone', () => {
        const html = { ...stored(), description: 'lead<<b>i>eng' };
        expect(toPublicJob('j', html)!.description).not.toContain('<');
    });

    /*
     * A bare '>' is left alone on purpose. Malformed markup can leave one
     * behind, but "revenue > $1M" and "scale > 10k RPS" are things job ads
     * actually say, and deleting the character costs more than the stray does.
     * What must not survive is a complete tag.
     */
    it('keeps a greater-than sign that is part of the sentence', () => {
        const html = { ...stored(), description: '<p>Own revenue > $1M and scale > 10k RPS.</p>' };
        expect(toPublicJob('j', html)!.description).toBe('Own revenue > $1M and scale > 10k RPS.');
    });

    /*
     * The mirror case, and the one that is easy to break while fixing the
     * others: a '<' with no closing '>' looks exactly like a scrape cut
     * mid-tag, so an unguarded pattern for that eats the rest of the sentence.
     */
    it('keeps a less-than sign that is part of the sentence', () => {
        const html = { ...stored(), description: '<p>Latency < 100ms and cost < $1M.</p>' };
        expect(toPublicJob('j', html)!.description).toBe('Latency < 100ms and cost < $1M.');
    });

    it('keeps a trailing comparison that is not a tag at all', () => {
        const html = { ...stored(), description: 'You will keep p99 <' };
        expect(toPublicJob('j', html)!.description).toBe('You will keep p99 <');
    });

    /*
     * The worst of the three, and the oldest: /<[^>]+>/ matches "< 100ms,
     * uptime >" and deletes the middle of the sentence. A job ad states a
     * latency budget far more often than a card renders a tag.
     */
    it('does not treat a pair of comparisons as a tag and eat what is between', () => {
        const html = { ...stored(), description: '<p>Latency < 100ms, uptime > 99.9%.</p>' };
        expect(toPublicJob('j', html)!.description).toBe('Latency < 100ms, uptime > 99.9%.');
    });

    it('still strips a real tag that sits next to a comparison', () => {
        const html = { ...stored(), description: '<p>Keep p99 < 50ms.</p><div>Own it.</div>' };
        expect(toPublicJob('j', html)!.description).toBe('Keep p99 < 50ms. Own it.');
    });

    it('leaves no markup behind when the markup was encoded', () => {
        const html = { ...stored(), description: 'Copy.&lt;script&gt;alert(1)&lt;/script&gt;' };
        const out = toPublicJob('j', html)!.description;
        expect(out).not.toContain('<');
        expect(out).not.toContain('alert(1)');
    });

    it('does not leave a tag the scrape cut in half', () => {
        const html = { ...stored(), description: 'Own the roadmap.<div class="job-desc' };
        expect(toPublicJob('j', html)!.description).toBe('Own the roadmap.');
    });

    /*
     * The old catch-all replaced any unrecognised entity with a space, so a
     * copyright line lost its symbol and every curly apostrophe punched a hole
     * through the middle of a word.
     */
    it('decodes numeric entities instead of blanking them', () => {
        const html = { ...stored(), description: 'We&#8217;re hiring &#x2014; join us.' };
        expect(toPublicJob('j', html)!.description).toBe('We\u2019re hiring \u2014 join us.');
    });

    it('keeps an entity it does not know rather than eating it', () => {
        const html = { ...stored(), description: '&copy; 2026 Stripe. Salary &euro;90,000.' };
        expect(toPublicJob('j', html)!.description).toBe('\u00a9 2026 Stripe. Salary &euro;90,000.');
    });

    /*
     * Scrapers write "Not listed" into the salary field rather than leaving it
     * empty, and a truthy string renders — so the card showed "Not listed" in
     * the slot where a number goes, which reads worse than an empty slot.
     */
    it('drops a salary that is not a salary', () => {
        for (const junk of ['Not listed', 'not specified', 'N/A', '—', '-', 'TBD', '  ']) {
            expect(toPublicJob('j', { ...stored(), salary: junk })!.salary, junk).toBe('');
        }
    });

    it('keeps a real salary', () => {
        expect(toPublicJob('j', stored())!.salary).toBe('$180,000 - $220,000');
        expect(toPublicJob('j', { ...stored(), salary: 'Not less than $100,000' })!.salary)
            .toBe('Not less than $100,000');
    });

    /*
     * Cards were printing `2026-07-01T11:25:04-04:00`. Formatted on the server
     * so the crawler HTML and the rendered page agree, and without
     * toLocaleDateString, whose output depends on the server's locale.
     */
    it('turns a timestamp into a date a person reads', () => {
        expect(toPublicJob('j', { ...stored(), postedAt: '2026-07-01T11:25:04-04:00' })!.postedAt)
            .toBe('Jul 1, 2026');
        expect(toPublicJob('j', { ...stored(), postedAt: '2026-12-25' })!.postedAt).toBe('Dec 25, 2026');
    });

    it('leaves an already-readable date alone and drops nonsense', () => {
        expect(toPublicJob('j', { ...stored(), postedAt: 'Posted recently' })!.postedAt).toBe('Posted recently');
        expect(toPublicJob('j', { ...stored(), postedAt: '' })!.postedAt).toBe('');
    });

    it('collapses the whitespace scraped pages are full of', () => {
        const messy = { ...stored(), description: 'Own   the\n\n payments\tplatform.' };
        expect(toPublicJob('job-1', messy)!.description).toBe('Own the payments platform.');
    });
});

describe('normalizePage', () => {
    /*
     * The page number arrives from the URL, so it arrives as anything. Offset
     * paging costs a read per skipped document, which makes an unclamped page
     * number a way to bill someone else's Firestore.
     */
    it('clamps anything a URL can carry to a real page', () => {
        expect(normalizePage(undefined)).toBe(1);
        expect(normalizePage('')).toBe(1);
        expect(normalizePage('0')).toBe(1);
        expect(normalizePage('-5')).toBe(1);
        expect(normalizePage('abc')).toBe(1);
        expect(normalizePage(['2', '3'])).toBe(1);
        expect(normalizePage(1e9)).toBe(MAX_PUBLIC_JOB_PAGES);
        expect(normalizePage('99999')).toBe(MAX_PUBLIC_JOB_PAGES);
    });

    it('accepts a page number written as a string, which is how URLs send it', () => {
        expect(normalizePage('3')).toBe(3);
        expect(normalizePage(3)).toBe(3);
        expect(normalizePage('3.7')).toBe(3);
    });
});
