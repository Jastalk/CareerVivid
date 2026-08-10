import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProposal, PROPOSAL_TTL_MS } from './proposals';

/*
 * The loop this fixes: a write returns "awaiting_approval"; the model is told
 * not to call it again; when it did anyway it got a BRAND NEW proposal back,
 * which reads like progress, so it called again — thinking, working, thinking,
 * working, and never a word to the user.
 *
 * A hand-rolled Firestore double rather than a mocking library: the query here
 * is four equality filters and a limit, which is small enough to model exactly
 * and leaves the assertions about behaviour rather than about call arguments.
 */
const { store, docFactory } = vi.hoisted(() => {
    const store: any[] = [];
    return {
        store,
        docFactory: () => {
            let created = 0;
            const collection = () => {
                const filters: Array<[string, unknown]> = [];
                const query: any = {
                    where: (field: string, _op: string, value: unknown) => {
                        filters.push([field, value]);
                        return query;
                    },
                    limit: () => query,
                    get: async () => ({
                        docs: store
                            .filter((row) => filters.every(([field, value]) => row[field] === value))
                            .map((row) => ({ data: () => row })),
                    }),
                };
                query.doc = () => {
                    const id = `proposal-${++created}`;
                    return { id, set: async (value: any) => { store.push({ ...value, id }); } };
                };
                return query;
            };
            return { collection };
        },
    };
});

vi.mock('firebase-admin', () => ({
    apps: [{}],
    firestore: Object.assign(docFactory, {
        // Real clock: the dedup check compares against PROPOSAL_TTL_MS, so a
        // hardcoded timestamp would read as expired and silently skip the path
        // under test.
        Timestamp: {
            now: () => ({ toMillis: () => Date.now() }),
            fromMillis: (ms: number) => ({ toMillis: () => ms }),
        },
        FieldValue: { serverTimestamp: () => null },
    }),
}));

const skillsWrite = {
    uid: 'user-1',
    taskId: 'task-1',
    tool: 'updateResumeSection',
    args: { resumeId: 'r1', section: 'skills', value: '[{"name":"System Design"}]' },
    summary: 'Update the skills on your resume',
};

describe('createProposal — duplicate pending cards', () => {
    beforeEach(() => {
        store.length = 0;
    });

    it('creates one card the first time', async () => {
        const first = await createProposal(skillsWrite);

        expect(first.reused).toBeUndefined();
        expect(store).toHaveLength(1);
    });

    it('returns the same card instead of stacking another', async () => {
        const first = await createProposal(skillsWrite);
        const second = await createProposal(skillsWrite);
        const third = await createProposal(skillsWrite);

        expect(second.id).toBe(first.id);
        expect(third.id).toBe(first.id);
        expect(second.reused).toBe(true);
        // One intent, one card — not three that would each write if approved.
        expect(store).toHaveLength(1);
    });

    it('still creates a card when the arguments differ', async () => {
        const first = await createProposal(skillsWrite);
        const second = await createProposal({
            ...skillsWrite,
            args: { ...skillsWrite.args, value: '[{"name":"Load Balancing"}]' },
        });

        expect(second.id).not.toBe(first.id);
        expect(second.reused).toBeUndefined();
        expect(store).toHaveLength(2);
    });

    it('does not collapse two different tools onto one card', async () => {
        await createProposal(skillsWrite);
        const other = await createProposal({
            ...skillsWrite,
            tool: 'addTrackedJob',
            args: { jobs: [{ jobTitle: 'Backend Engineer', companyName: 'Stripe' }] },
        });

        expect(other.reused).toBeUndefined();
        expect(store).toHaveLength(2);
    });

    it('keeps one user out of another user\'s pending cards', async () => {
        await createProposal(skillsWrite);
        const other = await createProposal({ ...skillsWrite, uid: 'user-2' });

        expect(other.reused).toBeUndefined();
        expect(store).toHaveLength(2);
    });

    /*
     * A resolved card is off the screen, so a fresh request for the same change
     * is a real new intent — most obviously "add these skills" after the user
     * discarded them once and changed their mind.
     */
    it('creates a new card once the old one is resolved', async () => {
        await createProposal(skillsWrite);
        store[0].status = 'rejected';

        const second = await createProposal(skillsWrite);
        expect(second.reused).toBeUndefined();
        expect(store).toHaveLength(2);
    });

    it('creates a new card once the old one has expired', async () => {
        await createProposal(skillsWrite);
        store[0].createdAt = { toMillis: () => Date.now() - PROPOSAL_TTL_MS - 1 };

        const second = await createProposal(skillsWrite);
        expect(second.reused).toBeUndefined();
        expect(store).toHaveLength(2);
    });
});
