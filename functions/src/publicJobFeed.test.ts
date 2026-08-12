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
