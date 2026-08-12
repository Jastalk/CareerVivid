import { describe, expect, it } from 'vitest';

/*
 * Finishing a coding problem used to end at "improve this one, or leave" —
 * a dead end at exactly the moment someone has proved they want to keep going.
 *
 * The rule the report button follows, extracted so it can be checked without
 * mounting the quest page: the problem just finished counts as solved even
 * before the server has recorded it, because the user is looking at its report.
 */

const remainingAfter = (pool: string[], solved: string[], justFinished: string): number => {
    const done = new Set([...solved, justFinished]);
    return pool.filter((id) => !done.has(id)).length;
};

const nextAfter = (pool: string[], solved: string[], justFinished: string): string | undefined => {
    const done = new Set([...solved, justFinished]);
    return pool.find((id) => !done.has(id));
};

const POOL = ['two-sum', 'max-subarray', 'lru-cache', 'trie'];

describe('choosing the next problem', () => {
    it('counts the one just finished, not only what the server has recorded', () => {
        // The report is on screen; the submission may not have round-tripped yet.
        expect(remainingAfter(POOL, [], 'max-subarray')).toBe(3);
        expect(nextAfter(POOL, [], 'max-subarray')).toBe('two-sum');
    });

    it('skips everything already solved', () => {
        expect(nextAfter(POOL, ['two-sum', 'lru-cache'], 'max-subarray')).toBe('trie');
        expect(remainingAfter(POOL, ['two-sum', 'lru-cache'], 'max-subarray')).toBe(1);
    });

    /*
     * The case that opens the "try another company" modal. Reshuffling problems
     * they have already done would look like progress and be nothing of the
     * kind.
     */
    it('reports nothing left once the pool is exhausted', () => {
        const solved = ['two-sum', 'lru-cache', 'trie'];
        expect(remainingAfter(POOL, solved, 'max-subarray')).toBe(0);
        expect(nextAfter(POOL, solved, 'max-subarray')).toBeUndefined();
    });

    it('is not confused by a duplicate in the solved list', () => {
        expect(remainingAfter(POOL, ['two-sum', 'two-sum', 'max-subarray'], 'max-subarray')).toBe(2);
    });

    it('handles a company with a single problem', () => {
        expect(remainingAfter(['only-one'], [], 'only-one')).toBe(0);
        expect(nextAfter(['only-one'], [], 'only-one')).toBeUndefined();
    });
});
