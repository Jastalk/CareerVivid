import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * The agent told a user mid-coding-round:
 *
 *   "It looks like you're in the coding workspace, not the system design
 *    whiteboard. Can you tell me what code you've added?"
 *
 * The code was already in its context. Two things caused it, and both are
 * guarded here:
 *
 *  1. reviewOpenWorkspace threw "Open a system-design whiteboard before asking
 *     for a diagram review" for anything that was not system_design — so in a
 *     coding round the agent's only signal about the workspace was an error
 *     telling it the user was somewhere else.
 *  2. Every line of workspace guidance in both prompts described a canvas.
 *     Nothing mentioned code, so the model had no instruction that fit.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const interviewTools = read('functions/src/agent/interviewTools.ts');
const PROMPTS = {
    live: read('functions/src/agent/careerAgentLive.ts'),
    text: read('functions/src/agent/turnRunner.ts'),
};

describe('reviewOpenWorkspace covers both kinds of round', () => {
    /*
     * Matches the THROW, not the prose — the doc comment above the tool quotes
     * the old error on purpose, to record what the bug was.
     */
    it('no longer rejects a workspace for not being a whiteboard', () => {
        expect(interviewTools).not.toMatch(/throw new Error\(\s*"Open a system-design whiteboard/);
    });

    it('has a coding review path', () => {
        expect(interviewTools).toContain('reviewCodingWorkspace');
        expect(interviewTools).toMatch(/workspace\.kind === "coding"/);
    });

    /*
     * The user is mid-interview. Handing them a working function ends the round
     * and teaches nothing, so the coding reviewer is told not to.
     */
    it('tells the coding reviewer not to write the solution', () => {
        const start = interviewTools.indexOf('async function reviewCodingWorkspace');
        const body = interviewTools.slice(start, start + 3500);
        expect(body).toMatch(/Never write the algorithm/);
    });

    it('reports which kind it reviewed', () => {
        expect(interviewTools).toContain('workspaceKind: "coding"');
        expect(interviewTools).toContain('workspaceKind: "system_design"');
    });

    it('describes itself as covering code, not only diagrams', () => {
        const start = interviewTools.indexOf('name: "reviewOpenWorkspace"');
        const desc = interviewTools.slice(start, start + 700);
        expect(desc).toMatch(/coding/i);
    });
});

describe.each(Object.entries(PROMPTS))('%s prompt', (_name, prompt) => {
    it('tells the agent to check which kind of round is open', () => {
        expect(prompt).toMatch(/open_workspace\.kind/);
    });

    it('describes the coding round, not just the whiteboard', () => {
        expect(prompt).toMatch(/kind "coding"/);
        expect(prompt).toMatch(/kind "system_design"/);
    });

    /*
     * The exact sentence the user heard. It has to be named, because "do not
     * ask them to describe the diagram" did not generalise to code.
     */
    it('forbids asking for something it was already given', () => {
        expect(prompt).toMatch(/never ask the user to describe, read out, or paste/i);
    });

    it('gives a coaching example for a coding round', () => {
        expect(prompt).toMatch(/Coding:/);
    });
});

/*
 * The second failure, on the same round. With the code finally visible, the
 * agent was shown a buffer containing `for let (` — which does not parse — and
 * said:
 *
 *   "The code looks correct to me. Sometimes the platform's formatting is
 *    particular, but the logic is sound."
 *
 * Wrong twice: the code did not run, and the logic was wrong too (currentMax
 * started at 0 instead of nums[0], so [2, 3] returns 3 instead of 5). It
 * blamed the tool because nothing told it the buffer failed to parse.
 */
describe('the agent can tell whether the code runs', () => {
    it('is given the parse failure, not just the code', () => {
        expect(interviewTools).toMatch(/syntaxError: workspace\.syntaxError/);
    });

    it('reports runs/does-not-run as its own field', () => {
        const start = interviewTools.indexOf('async function reviewCodingWorkspace');
        const body = interviewTools.slice(start, start + 3500);
        expect(body).toMatch(/runs:\s*\{ type: "BOOLEAN"/);
        expect(body).toMatch(/required: \["runs",/);
    });

    it('separates making it run from solving it', () => {
        const start = interviewTools.indexOf('async function reviewCodingWorkspace');
        const body = interviewTools.slice(start, start + 3500);
        expect(body).toMatch(/A syntax error is not the interview/);
        expect(body).toMatch(/Never write the algorithm/);
    });

    it('forbids calling code correct without tracing an input', () => {
        const start = interviewTools.indexOf('async function reviewCodingWorkspace');
        const body = interviewTools.slice(start, start + 3500);
        expect(body).toMatch(/Never claim code is correct without checking it/);
    });
});

describe.each(Object.entries(PROMPTS))('%s prompt: run vs solve', (_name, prompt) => {
    it('lets the agent hand over a syntax fix outright', () => {
        expect(prompt).toMatch(/a syntax error is not the interview question/i);
    });

    it('still refuses to write the algorithm', () => {
        expect(prompt).toMatch(/Never write the loop body/i);
    });

    /* The exact reassurance the user was given over code that did not parse. */
    it('forbids "looks correct" without tracing a case', () => {
        expect(prompt).toMatch(/NEVER say code "looks correct" without tracing an input/);
    });

    it('forbids blaming the tool', () => {
        expect(prompt).toMatch(/Blaming the tool is never the answer/);
    });
});
