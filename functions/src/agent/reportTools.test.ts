import { describe, expect, it, vi } from 'vitest';
import { toExchanges } from './reportTools';

// `reportTools` opens a Firestore handle at import. These tests cover the pure
// transcript shaping, so the handle only needs to exist, not work. `vi.mock` is
// hoisted above the import above, which is why a static import is safe here —
// and it keeps this file compilable by the functions build, which targets
// CommonJS and rejects a top-level `await import`.
vi.mock('firebase-admin', () => ({
    apps: [{}],
    firestore: () => ({ collection: () => ({}) }),
}));

const line = (speaker: 'ai' | 'user', text: string) => ({ speaker, text });

describe('toExchanges', () => {
    it('pairs each interviewer question with the answer that followed it', () => {
        expect(
            toExchanges([
                line('ai', 'How would you cache this?'),
                line('user', 'I would put Redis in front of Postgres.'),
                line('ai', 'What do you cache?'),
                line('user', 'Session data.'),
            ]),
        ).toEqual([
            { question: 'How would you cache this?', answer: 'I would put Redis in front of Postgres.' },
            { question: 'What do you cache?', answer: 'Session data.' },
        ]);
    });

    /*
     * Live audio transcription splits one spoken question across several
     * fragments. Treating each fragment as its own question would invent
     * questions that were never asked and pin the real answer to the last
     * fragment, so consecutive same-speaker lines are joined first.
     */
    it('joins a question split across transcription fragments', () => {
        expect(
            toExchanges([
                line('ai', 'Walk me through'),
                line('ai', 'how you would scale this.'),
                line('user', 'Shard by tenant.'),
            ]),
        ).toEqual([{ question: 'Walk me through how you would scale this.', answer: 'Shard by tenant.' }]);
    });

    /*
     * An unanswered question is the single most useful thing in a report — the
     * agent should be able to say "you did not answer this" — so it survives as
     * an exchange with an empty answer rather than being dropped.
     */
    it('keeps a question the candidate never answered', () => {
        expect(
            toExchanges([
                line('ai', 'Any questions for me?'),
                line('ai', 'Alright, thanks for your time.'),
            ]),
        ).toEqual([{ question: 'Any questions for me? Alright, thanks for your time.', answer: '' }]);

        expect(toExchanges([line('ai', 'Tell me about yourself.')])).toEqual([
            { question: 'Tell me about yourself.', answer: '' },
        ]);
    });

    it('drops candidate chatter before the first question', () => {
        expect(
            toExchanges([
                line('user', 'Hello? Can you hear me?'),
                line('ai', 'Yes. Tell me about yourself.'),
                line('user', 'I am a backend engineer.'),
            ]),
        ).toEqual([{ question: 'Yes. Tell me about yourself.', answer: 'I am a backend engineer.' }]);
    });

    it('ignores blank lines rather than counting them as turns', () => {
        expect(
            toExchanges([
                line('ai', 'Why this role?'),
                line('user', '   '),
                line('user', 'I want more ownership.'),
            ]),
        ).toEqual([{ question: 'Why this role?', answer: 'I want more ownership.' }]);
    });

    it('truncates rather than sending an unbounded transcript into the turn', () => {
        const [only] = toExchanges([line('ai', 'Q'.repeat(500)), line('user', 'A'.repeat(2_000))]);
        expect(only.question).toHaveLength(301); // 300 + the ellipsis
        expect(only.answer).toHaveLength(701);
        expect(only.answer.endsWith('…')).toBe(true);
    });

    it('caps how many exchanges one report contributes', () => {
        const long = Array.from({ length: 40 }, (_, i) => [line('ai', `Q${i}`), line('user', `A${i}`)]).flat();
        expect(toExchanges(long)).toHaveLength(12);
    });

    it('survives a missing or malformed transcript', () => {
        expect(toExchanges([])).toEqual([]);
        expect(toExchanges(undefined as any)).toEqual([]);
        expect(toExchanges([{ speaker: 'ai' }, { text: 'orphan' }] as any)).toEqual([]);
    });
});
