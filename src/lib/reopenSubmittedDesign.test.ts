import { describe, expect, it, vi } from 'vitest';
import { canReopenSubmittedDesign, reopenSubmittedDesign } from './reopenSubmittedDesign';

const navigate = vi.fn();
vi.mock('../utils/navigation', () => ({ navigate: (to: string) => navigate(to) }));

const entry = (company: string) => ({ id: 'e1', job: { company } }) as any;
const design = (challengeId: string, id = 'a1') => ({
    id, questArtifact: { type: 'system_design', challengeId, elementsJson: '[]' },
}) as any;

describe('reopenSubmittedDesign', () => {
    /*
     * The button and the navigation have to agree. Offering "Open this design"
     * on a report that cannot be reopened is worse than offering nothing,
     * because the click looks broken rather than absent.
     */
    it('offers exactly what it can deliver', () => {
        const cases: Array<[any, any]> = [
            [entry('Google'), design('encrypted-messenger')],
            [entry('Google'), { id: 'a', questArtifact: { type: 'coding', challengeId: 'x' } }],
            [entry('Google'), { id: 'a' }],
            [entry('A Company That Does Not Exist'), design('encrypted-messenger')],
            [entry(''), design('encrypted-messenger')],
            [undefined, design('encrypted-messenger')],
            [entry('Google'), undefined],
        ];

        for (const [e, a] of cases) {
            navigate.mockClear();
            expect(reopenSubmittedDesign(e, a), JSON.stringify(a)).toBe(canReopenSubmittedDesign(e, a));
        }
    });

    it('routes to the company quest, naming the prompt and the submission', () => {
        navigate.mockClear();
        expect(reopenSubmittedDesign(entry('Google'), design('encrypted-messenger', 'analysis-7'))).toBe(true);

        const to = navigate.mock.calls[0][0] as string;
        const [path, query] = to.split('?');
        const params = new URLSearchParams(query);
        expect(path).toBe('/quest/google');
        expect(params.get('stage')).toBe('system_design');
        expect(params.get('systemDesignChallenge')).toBe('encrypted-messenger');
        // Which of the three attempts at this prompt, not just the prompt.
        expect(params.get('analysis')).toBe('analysis-7');
    });

    it('does not navigate for a report it cannot reopen', () => {
        navigate.mockClear();
        expect(reopenSubmittedDesign(entry('Nowhere Inc'), design('encrypted-messenger'))).toBe(false);
        expect(navigate).not.toHaveBeenCalled();
    });
});
