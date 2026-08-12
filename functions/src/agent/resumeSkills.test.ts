import { describe, expect, it, vi } from 'vitest';
import { coerceSkills, evaluateRoundEvidence, mergeSkills, RESUME_SKILL_SCORE_FLOOR } from './reportTools';
import { buildDiff } from './proposals';

vi.mock('firebase-admin', () => ({
    apps: [{}],
    firestore: Object.assign(() => ({ collection: () => ({}) }), {
        Timestamp: { now: () => ({ toMillis: () => 0 }) },
        FieldValue: { serverTimestamp: () => null },
    }),
}));

describe('mergeSkills', () => {
    const existing = [
        { id: 's0', name: 'React', level: 'Advanced' },
        { id: 's1', name: 'Node.js', level: 'Expert' },
    ];

    /*
     * The bug this exists for: the agent proposed three skills after a coding
     * round using updateResumeSection, which REPLACES the section. Approving
     * that card would have deleted every other skill on the resume — an "add"
     * that silently removes.
     */
    it('never drops a skill that was already there', () => {
        const { skills, added } = mergeSkills(existing, [{ name: 'LRU Caching', level: 'Intermediate' }]);

        expect(skills.map((s) => s.name)).toEqual(['React', 'Node.js', 'LRU Caching']);
        expect(added).toEqual(['LRU Caching']);
    });

    it('keeps the level the user already chose rather than overwriting it', () => {
        const { skills, added } = mergeSkills(existing, [{ name: 'React', level: 'Novice' }]);

        expect(skills.find((s) => s.name === 'React')!.level).toBe('Advanced');
        expect(added).toEqual([]);
    });

    it('treats punctuation and case as the same skill', () => {
        const { added } = mergeSkills(existing, [
            { name: 'node.js' },
            { name: 'NodeJS' },
            { name: 'react' },
        ]);

        expect(added).toEqual([]);
    });

    it('defaults an unknown level rather than writing one the editor cannot render', () => {
        const { skills } = mergeSkills([], [{ name: 'System Design', level: 'Wizard' }]);
        expect(skills).toEqual([{ id: 's0', name: 'System Design', level: 'Intermediate' }]);
    });

    it('re-sequences ids across the merged list', () => {
        const { skills } = mergeSkills(existing, [{ name: 'Go' }, { name: 'Rust' }]);
        expect(skills.map((s) => s.id)).toEqual(['s0', 's1', 's2', 's3']);
    });

    it('survives a resume with no skills array yet', () => {
        expect(mergeSkills(undefined, [{ name: 'Go' }]).skills).toEqual([{ id: 's0', name: 'Go', level: 'Intermediate' }]);
        expect(mergeSkills(null, []).skills).toEqual([]);
    });

    /*
     * The blob a previous call wrote is unwrapped on the next add, so the resume
     * repairs itself rather than carrying `{"name":"System Design"}` forever.
     */
    it('heals a JSON blob an earlier call left on the resume', () => {
        const { skills } = mergeSkills(
            [{ id: 's0', name: 'React', level: 'Advanced' }, { id: 's1', name: '{"name":"System Design","level":"Advanced"}' }],
            [{ name: 'Go' }],
        );

        expect(skills).toEqual([
            { id: 's0', name: 'React', level: 'Advanced' },
            { id: 's1', name: 'System Design', level: 'Advanced' },
            { id: 's2', name: 'Go', level: 'Intermediate' },
        ]);
    });

    it('leaves a real name containing a bracket alone', () => {
        const { skills } = mergeSkills([{ id: 's0', name: 'Node.js [advanced]' }], []);
        expect(skills.map((s) => s.name)).toEqual(['Node.js [advanced]']);
    });

    it('accepts plain strings, which is how some older resumes stored skills', () => {
        const { skills, added } = mergeSkills(['React'], [{ name: 'React' }, { name: 'Go' }]);

        expect(skills.map((s) => s.name)).toEqual(['React', 'Go']);
        expect(added).toEqual(['Go']);
    });
});

describe('coerceSkills', () => {
    /*
     * The bug, exactly as it reached production: the Live API stringified the
     * object it was told to send, so the user's resume ended up with
     * `{"name":"System Design","level":"Advanced"}` printed in the skills list
     * beside "Go-to-Market Strategy". They only found out by looking.
     */
    it('unwraps a skill the Live API sent as JSON text', () => {
        expect(coerceSkills(['{"name":"System Design","level":"Advanced"}'])).toEqual([
            { name: 'System Design', level: 'Advanced' },
        ]);
    });

    it('unwraps a whole array sent as one JSON string', () => {
        expect(coerceSkills('[{"name":"Caching"},{"name":"Sharding","level":"Expert"}]')).toEqual([
            { name: 'Caching' },
            { name: 'Sharding', level: 'Expert' },
        ]);
    });

    it('still accepts the shapes that were already working', () => {
        expect(coerceSkills([{ name: 'Go', level: 'Expert' }, 'Rust'])).toEqual([
            { name: 'Go', level: 'Expert' },
            { name: 'Rust' },
        ]);
    });

    /*
     * Dropping beats guessing. A skill the agent failed to add is a nuisance the
     * user can ask for again; a skill that reads like a stack trace on a resume
     * they send to a recruiter is damage they have no reason to go looking for.
     */
    it('drops anything that still looks like markup after decoding', () => {
        expect(coerceSkills(['{"name":"System Design"'])).toEqual([]);
        expect(coerceSkills(['{broken'], )).toEqual([]);
        expect(coerceSkills(['Kafka', '{"name":']).map((s) => s.name)).toEqual(['Kafka']);
    });

    it('drops a level the editor cannot render rather than writing it through', () => {
        expect(coerceSkills([{ name: 'Go', level: 'Wizard' }])).toEqual([{ name: 'Go' }]);
    });

    it('collapses duplicates the model repeated in one call', () => {
        expect(coerceSkills(['Go', 'go', { name: 'GO' }])).toEqual([{ name: 'Go' }]);
    });

    it('returns nothing rather than throwing on junk', () => {
        expect(coerceSkills(undefined)).toEqual([]);
        expect(coerceSkills(null)).toEqual([]);
        expect(coerceSkills(42)).toEqual([{ name: '42' }]);
    });
});

describe('addResumeSkills proposal card', () => {
    /*
     * The card has to make it obvious nothing is being removed — that is the
     * entire difference between this tool and updateResumeSection, and the user
     * only has the card to go on when deciding.
     */
    it('says what is being added, not what the list becomes', () => {
        const diff = buildDiff('addResumeSkills', {
            sessionId: 'session-1',
            skills: [{ name: 'LRU Caching', level: 'Intermediate' }, { name: 'Hash Maps' }],
        });

        expect(diff.changes).toEqual([{ label: 'Adds', after: '2 new skills' }]);
        expect(diff.items).toEqual(['LRU Caching · Intermediate', 'Hash Maps']);
    });
});

describe('evaluateRoundEvidence', () => {
    const scored = (overallScore: number) => ({
        job: { title: 'Forward Deployed Engineer' },
        interviewHistory: [{ id: 'a1', timestamp: 2, overallScore }],
    });

    /*
     * 75 is the floor of the report's own "Strong" band. Below it the report is
     * telling the candidate they have work to do, so a resume claim would have
     * the agent contradicting its own grading. Deliberately above the 70
     * stage-clear threshold: clearing a round means you may move on, not that
     * you should advertise the skill.
     */
    it('sits above the stage-clear threshold', () => {
        expect(RESUME_SKILL_SCORE_FLOOR).toBe(75);
        expect(RESUME_SKILL_SCORE_FLOOR).toBeGreaterThan(70);
    });

    it('accepts a round at or above the bar', () => {
        expect(evaluateRoundEvidence(scored(RESUME_SKILL_SCORE_FLOOR))).toEqual({
            ok: true,
            role: 'Forward Deployed Engineer',
            overallScore: 75,
        });
        expect(evaluateRoundEvidence(scored(92)).ok).toBe(true);
    });

    it('refuses one below the bar and says what to do instead', () => {
        const verdict = evaluateRoundEvidence(scored(RESUME_SKILL_SCORE_FLOOR - 1));

        expect(verdict.ok).toBe(false);
        expect((verdict as any).reason).toContain('74');
        expect((verdict as any).reason).toMatch(/coach them on the gaps/i);
    });

    /*
     * The timing gate, and the one from the screenshot: the agent proposed
     * skills while the user was still writing the LRU cache. An unscored
     * session means the round is not over.
     */
    it('refuses a round that has not been scored yet', () => {
        const verdict = evaluateRoundEvidence({ job: { title: 'x' }, interviewHistory: [] });

        expect(verdict.ok).toBe(false);
        expect((verdict as any).reason).toMatch(/not been scored yet/i);
        expect((verdict as any).reason).toMatch(/never add skills mid-problem/i);
    });

    it('judges the newest attempt, not the first', () => {
        const verdict = evaluateRoundEvidence({
            job: { title: 'x' },
            interviewHistory: [
                { id: 'old', timestamp: 1, overallScore: 95 },
                { id: 'new', timestamp: 2, overallScore: 40 },
            ],
        });

        expect(verdict.ok).toBe(false);
        expect((verdict as any).reason).toContain('40');
    });

    it('treats a missing or malformed session as unscored', () => {
        expect(evaluateRoundEvidence({}).ok).toBe(false);
        expect(evaluateRoundEvidence(undefined).ok).toBe(false);
        expect(evaluateRoundEvidence({ interviewHistory: 'nope' }).ok).toBe(false);
    });

    it('treats a report with no numeric score as below the bar', () => {
        const verdict = evaluateRoundEvidence({ interviewHistory: [{ id: 'a', timestamp: 1 }] });
        expect(verdict.ok).toBe(false);
    });
});
