import { describe, expect, it } from 'vitest';
import { createToolLoopBreaker, MAX_REPEATED_TOOL_CALLS } from './toolLoopBreaker';

const call = (name: string, args: unknown = {}) => [{ name, args }];

describe('createToolLoopBreaker', () => {
    it('allows the call and a few retries, then refuses', () => {
        const breaker = createToolLoopBreaker();

        for (let i = 0; i < MAX_REPEATED_TOOL_CALLS; i++) {
            expect(breaker.check(call('updateResumeSection', { section: 'skills' }))).toBeNull();
        }

        const refusal = breaker.check(call('updateResumeSection', { section: 'skills' }));
        expect(refusal).toContain('updateResumeSection');
        expect(refusal).toMatch(/will not be run again/i);
        expect(refusal).toMatch(/answer the user/i);
    });

    /*
     * The property that makes this safe to enforce client-side. A model that is
     * talking is making progress, however many tools it uses.
     */
    it('never fires while the agent is speaking', () => {
        const breaker = createToolLoopBreaker();

        for (let i = 0; i < 50; i++) {
            expect(breaker.check(call('getOpenWorkspace'))).toBeNull();
            breaker.spoke();
        }
    });

    it('resets when either side speaks mid-streak', () => {
        const breaker = createToolLoopBreaker();

        breaker.check(call('getOpenWorkspace'));
        breaker.check(call('getOpenWorkspace'));
        breaker.check(call('getOpenWorkspace'));
        breaker.spoke();

        // The streak is gone, so the next identical call starts from one again.
        expect(breaker.check(call('getOpenWorkspace'))).toBeNull();
    });

    it('does not count different arguments as a repeat', () => {
        const breaker = createToolLoopBreaker();

        for (let i = 0; i < 10; i++) {
            expect(breaker.check(call('getCompanyQuestions', { company: `co-${i}` }))).toBeNull();
        }
    });

    it('does not count a different tool as a repeat', () => {
        const breaker = createToolLoopBreaker();

        expect(breaker.check(call('searchCompanyGuides', { query: 'openai' }))).toBeNull();
        expect(breaker.check(call('getCompanyQuestions', { company: 'openai' }))).toBeNull();
        expect(breaker.check(call('openInterviewStage', { company: 'openai' }))).toBeNull();
        expect(breaker.check(call('getOpenWorkspace'))).toBeNull();
    });

    it('treats a repeated multi-call batch as one repeat', () => {
        const breaker = createToolLoopBreaker();
        const batch = [{ name: 'getOpenWorkspace', args: {} }, { name: 'getInterviewReport', args: {} }];

        for (let i = 0; i < MAX_REPEATED_TOOL_CALLS; i++) {
            expect(breaker.check(batch)).toBeNull();
        }
        const refusal = breaker.check(batch);
        expect(refusal).toContain('getOpenWorkspace');
        expect(refusal).toContain('getInterviewReport');
    });

    it('keeps refusing once tripped, until something is said', () => {
        const breaker = createToolLoopBreaker(1);

        expect(breaker.check(call('x'))).toBeNull();
        expect(breaker.check(call('x'))).not.toBeNull();
        expect(breaker.check(call('x'))).not.toBeNull();

        breaker.spoke();
        expect(breaker.check(call('x'))).toBeNull();
    });
});
