import { describe, expect, it, vi } from 'vitest';
import { proposeCodeEdit } from './interviewTools';
import { sanitizeWorkspace } from './workspace';

vi.mock('firebase-admin', () => ({
    apps: [{}],
    firestore: Object.assign(() => ({ collection: () => ({}) }), {
        Timestamp: { now: () => ({ toMillis: () => 0 }) },
        FieldValue: { serverTimestamp: () => null },
    }),
}));

/*
 * The agent may write into the user's editor, but only after they approve, and
 * only within limits the server enforces rather than the prompt requests.
 *
 * The line: a syntax error is not the interview question, so fixing it is
 * allowed everywhere. The algorithm IS the question, so writing it is refused
 * in a round that ends in a scored report.
 */

const ctx = (over: Record<string, unknown> = {}) => ({
    uid: 'u1',
    route: '/quest/amazon',
    workspace: {
        kind: 'coding',
        problem: 'Maximum Subarray',
        language: 'javascript',
        code: 'function maxSubArray(nums) { for let ( i = 1 ; i++ ) {} }',
        scored: true,
        ...over,
    },
} as any);

const args = (over: Record<string, unknown> = {}) =>
    proposeCodeEdit.validate!({ nextCode: 'function maxSubArray(nums) { for (let i = 1; i++;) {} }', kind: 'syntax', summary: 'fix the for-loop', ...over });

describe('proposeCodeEdit validation', () => {
    it('demands the complete buffer, not a fragment', () => {
        expect(() => proposeCodeEdit.validate!({ nextCode: '   ', kind: 'syntax', summary: 'x' })).toThrow(/complete new buffer/i);
    });

    it('demands a summary, because the user reads it before approving', () => {
        expect(() => proposeCodeEdit.validate!({ nextCode: 'const a = 1;', kind: 'syntax', summary: '  ' })).toThrow(/summary is required/i);
    });

    it('treats an unrecognised kind as syntax rather than trusting it', () => {
        expect(args({ kind: 'anything-else' }).kind).toBe('syntax');
    });

    it('refuses a buffer too large to review in a card', () => {
        expect(() => proposeCodeEdit.validate!({ nextCode: 'x'.repeat(20_001), kind: 'syntax', summary: 'big' })).toThrow(/too large/i);
    });
});

describe('the scored-round gate', () => {
    it('allows a syntax fix in a scored round', async () => {
        const result = await proposeCodeEdit.execute(ctx(), args()) as any;
        expect(result.kind).toBe('code_edit_proposal');
        expect(result.awaiting).toBe('user_approval');
        expect(result.editKind).toBe('syntax');
    });

    /*
     * "Some of the code, but not the whole solution."
     *
     * A blanket refusal of every logic edit left the agent with nothing to
     * offer, and it told the user it was "running into an issue with the tool"
     * — blaming the software for a deliberate decision. A scored round now
     * allows a nudge and refuses a handover.
     */
    it('allows a small logic nudge on top of the user own work in a scored round', async () => {
        const theirWork = Array.from({ length: 20 }, (_, i) => `  const step${i} = ${i};`).join('\n');
        const nudged = theirWork + '\n  return step19;';
        const result = await proposeCodeEdit.execute(
            ctx({ code: theirWork }),
            args({ kind: 'logic', nextCode: nudged }),
        ) as any;
        expect(result.editKind).toBe('logic');
    });

    it('refuses an edit that would write most of the solution', async () => {
        const scaffold = 'function trieOps(operations) {\n}';
        const finished = 'function trieOps(operations) {\n' + Array.from({ length: 25 }, (_, i) => `  const line${i} = ${i};`).join('\n') + '\n}';
        await expect(proposeCodeEdit.execute(ctx({ code: scaffold }), args({ kind: 'logic', nextCode: finished })))
            .rejects.toThrow(/most of the solution/i);
    });

    /* The model must not report a deliberate refusal as a broken tool. */
    it('tells the agent the refusal is not a tool failure', async () => {
        const scaffold = 'function f() {\n}';
        const finished = 'function f() {\n' + Array.from({ length: 25 }, (_, i) => `  const l${i} = ${i};`).join('\n') + '\n}';
        await expect(proposeCodeEdit.execute(ctx({ code: scaffold }), args({ kind: 'logic', nextCode: finished })))
            .rejects.toThrow(/not a tool failure/i);
    });

    it('names a smaller step as the alternative', async () => {
        const scaffold = 'function f() {\n}';
        const finished = 'function f() {\n' + Array.from({ length: 25 }, (_, i) => `  const l${i} = ${i};`).join('\n') + '\n}';
        await expect(proposeCodeEdit.execute(ctx({ code: scaffold }), args({ kind: 'logic', nextCode: finished })))
            .rejects.toThrow(/SMALLER step/i);
    });

    it('allows even a whole solution in guest practice, which persists nothing', async () => {
        const scaffold = 'function f() {\n}';
        const finished = 'function f() {\n' + Array.from({ length: 25 }, (_, i) => `  const l${i} = ${i};`).join('\n') + '\n}';
        const result = await proposeCodeEdit.execute(
            ctx({ scored: false, code: scaffold }),
            args({ kind: 'logic', nextCode: finished }),
        ) as any;
        expect(result.editKind).toBe('logic');
    });

    it('refuses when no coding round is open', async () => {
        await expect(proposeCodeEdit.execute({ uid: 'u1', workspace: null } as any, args()))
            .rejects.toThrow(/no coding round is open/i);
        await expect(proposeCodeEdit.execute(ctx({ kind: 'system_design' }), args()))
            .rejects.toThrow(/no coding round is open/i);
    });

    /*
     * The edit carries the buffer it was written against, so the client can
     * refuse to overwrite work the user did while the agent was thinking.
     */
    it('carries the base buffer so a stale apply can be caught', async () => {
        const result = await proposeCodeEdit.execute(ctx(), args()) as any;
        expect(result.baseCode).toContain('for let (');
    });

    it('tells the agent not to claim it is applied', async () => {
        const result = await proposeCodeEdit.execute(ctx(), args()) as any;
        expect(result.note).toMatch(/do not claim it is applied/i);
    });
});

/*
 * sanitizeWorkspace allowlists fields, so anything it does not name is dropped
 * before the model sees it. syntaxError was added to the snapshot and silently
 * discarded here until this was fixed.
 */
describe('sanitizeWorkspace carries what the gate needs', () => {
    it('keeps the parse failure', () => {
        const w = sanitizeWorkspace({ kind: 'coding', syntaxError: { message: 'Unexpected token', line: 5, column: 9 } });
        expect(w?.syntaxError).toEqual({ message: 'Unexpected token', line: 5, column: 9 });
    });

    /* A browser can lie, so the safe direction is "assume it counts". */
    it('defaults to scored when the browser does not say', () => {
        expect(sanitizeWorkspace({ kind: 'coding' })?.scored).toBe(true);
        expect(sanitizeWorkspace({ kind: 'coding', scored: false })?.scored).toBe(false);
    });
});

/*
 * Asked to "apply that fix" to a coding round, the agent proposed replacing the
 * user's employmentHistory — their RESUME — while they were mid-interview on
 * Maximum Subarray. It reached for the nearest write tool it had, and nothing
 * connected the open round to which tools belong in it.
 */
describe('resume tools stay out of a coding round', () => {
    it('refuses updateResumeSection while a coding round is open', async () => {
        const { TOOLS_BY_NAME } = await import('./tools');
        const tool = TOOLS_BY_NAME.get('updateResumeSection')!;

        await expect(tool.precheck!(ctx(), { resumeId: 'r1', section: 'employmentHistory', value: '[]' }))
            .rejects.toThrow(/coding round is open/i);
    });

    it('names the tool the agent should have used', async () => {
        const { TOOLS_BY_NAME } = await import('./tools');
        const tool = TOOLS_BY_NAME.get('updateResumeSection')!;

        await expect(tool.precheck!(ctx(), {})).rejects.toThrow(/proposeCodeEdit/);
    });

    it('leaves resume edits alone when no coding round is open', async () => {
        const { TOOLS_BY_NAME } = await import('./tools');
        const tool = TOOLS_BY_NAME.get('updateResumeSection')!;

        await expect(tool.precheck!({ uid: 'u1', workspace: null } as any, {})).resolves.toBeUndefined();
        await expect(tool.precheck!(ctx({ kind: 'system_design' }), {})).resolves.toBeUndefined();
    });
});
