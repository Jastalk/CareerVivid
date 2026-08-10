import { describe, expect, it, vi } from 'vitest';
import { buildDiff } from './proposals';

// `proposals` opens a Firestore handle and pulls the tool registry at import.
// buildDiff is pure; neither needs to work for these tests. `vi.mock` is hoisted
// above the import above, which is why a static import is safe here — and it
// keeps this file compilable by the functions build, which targets CommonJS and
// rejects a top-level `await import`.
vi.mock('firebase-admin', () => ({
    apps: [{}],
    firestore: Object.assign(() => ({ collection: () => ({}) }), {
        Timestamp: { now: () => ({ toMillis: () => 0 }) },
        FieldValue: { serverTimestamp: () => null },
    }),
}));

describe('buildDiff — updateResumeSection', () => {
    /*
     * The card asks the user to approve a write. When the value arrived as a
     * JSON-encoded array it was printed verbatim, so the approval prompt read
     * `[{"name":"System Design","level":"Intermediate"}, …]`. Nobody reads that,
     * which makes the approval a rubber stamp rather than consent.
     */
    it('renders skills as readable items, never as raw JSON', () => {
        const diff = buildDiff('updateResumeSection', {
            resumeId: 'r1',
            section: 'skills',
            value: JSON.stringify([
                { name: 'System Design', level: 'Intermediate' },
                { name: 'Caching Strategies (Redis)', level: 'Intermediate' },
            ]),
        });

        expect(diff.changes).toEqual([{ label: 'Skills', after: '2 entries' }]);
        expect(diff.items).toEqual(['System Design · Intermediate', 'Caching Strategies (Redis) · Intermediate']);
        expect(JSON.stringify(diff)).not.toContain('{"name"');
    });

    it('renders employment history as role, employer, and dates', () => {
        const diff = buildDiff('updateResumeSection', {
            section: 'employmentHistory',
            value: JSON.stringify([
                { jobTitle: 'Backend Engineer', employer: 'Stripe', startDate: '2023', endDate: 'Present' },
            ]),
        });

        expect(diff.items).toEqual(['Backend Engineer — Stripe (2023–Present)']);
    });

    it('renders education as degree and school', () => {
        const diff = buildDiff('updateResumeSection', {
            section: 'education',
            value: JSON.stringify([{ degree: 'BSc Computer Science', school: 'UBC' }]),
        });

        expect(diff.items).toEqual(['BSc Computer Science — UBC']);
    });

    it('shows prose sections as prose, with a readable label', () => {
        const diff = buildDiff('updateResumeSection', {
            section: 'professionalSummary',
            value: 'Backend engineer with eight years on payments infrastructure.',
        });

        expect(diff.changes).toEqual([
            { label: 'Summary', after: 'Backend engineer with eight years on payments infrastructure.' },
        ]);
        expect(diff.items).toBeUndefined();
    });

    /*
     * The tool's validator rejects unparseable list values on execute, but the
     * card is built before that. Showing the raw text is honest; claiming a
     * count we could not read would not be.
     */
    it('falls back to the raw text when a list section will not parse', () => {
        const diff = buildDiff('updateResumeSection', { section: 'skills', value: 'React, Go, Terraform' });
        expect(diff.changes).toEqual([{ label: 'Skills', after: 'React, Go, Terraform' }]);
    });

    it('still says what changes when the entries are an unexpected shape', () => {
        const diff = buildDiff('updateResumeSection', {
            section: 'skills',
            value: JSON.stringify([{ unexpected: 'shape' }, { also: 'odd' }]),
        });

        expect(diff.items).toEqual(['2 entries, replacing the current skills']);
        expect(JSON.stringify(diff)).not.toContain('unexpected');
    });
});

describe('buildDiff — profile labels', () => {
    it('turns camelCase argument keys into words', () => {
        const diff = buildDiff('updateCareerProfile', {
            targetArchetypes: ['AI Platform', 'Solutions Architect'],
            targetSalaryMin: 180000,
        });

        expect(diff.changes).toEqual([
            { label: 'Target roles', after: 'AI Platform, Solutions Architect' },
            { label: 'Salary from', after: '180000' },
        ]);
    });

    /*
     * The default branch catches tools with no bespoke diff. `String(object)`
     * gives "[object Object]", which tells the user nothing about what they are
     * approving.
     */
    it('never renders an object as [object Object]', () => {
        const diff = buildDiff('someFutureTool', { payload: { nested: 'value' } });
        expect(diff.changes[0].after).toBe('{"nested":"value"}');
    });
});
