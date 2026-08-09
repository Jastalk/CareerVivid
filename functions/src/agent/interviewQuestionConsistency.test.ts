import { describe, expect, it } from 'vitest';
import { getCompanyQuestions, openInterviewStage } from './interviewTools';

const context = { uid: 'test-user', taskId: 'test-task' };

describe('Career Agent technical question handoff', () => {
    it.each([
        ['coding', 'codingChallenge'],
        ['systemDesign', 'systemDesignChallenge'],
    ] as const)('opens the exact Google %s question returned in chat', async (questionStage, queryKey) => {
        const card = await getCompanyQuestions.execute(context, {
            company: 'Google',
            stage: questionStage,
            count: 1,
        }) as any;
        const question = card.questions[0];

        const opened = await openInterviewStage.execute(context, {
            company: 'Google',
            stage: question.openStage,
            questionId: question.questionId,
        }) as any;

        expect(opened.question).toBe(question.question);
        expect(opened.questionId).toBe(question.questionId);
        expect(opened.route).toContain(`stage=${question.openStage}`);
        expect(opened.route).toContain(`${queryKey}=${encodeURIComponent(question.questionId)}`);
        expect(question.route).toBe(opened.route);
    });

    it('rejects a stale or invented question id instead of opening a different problem', async () => {
        await expect(openInterviewStage.execute(context, {
            company: 'Google',
            stage: 'coding',
            questionId: 'top-k-query-stream-that-is-not-in-the-workspace',
        })).rejects.toThrow('is not available');
    });
});
