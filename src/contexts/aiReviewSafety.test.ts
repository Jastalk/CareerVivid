/**
 * The AI review must not put things on a resume that are not true.
 *
 * A suggestion that raises the score by claiming an unearned skill is worse
 * than no suggestion: the candidate carries that claim into the interview. The
 * pre-selection rule is the load-bearing part — everything used to arrive
 * checked next to a "92 → 100" promise, so accepting unverified claims in bulk
 * was the path of least resistance. These tests exist because that default is
 * easy to reintroduce without noticing.
 */

import { describe, it, expect } from 'vitest';
import { suggestionAssertsNewFact, type AISuggestion } from './AIReviewContext';

const make = (over: Partial<AISuggestion>): AISuggestion => ({
    id: 'x',
    category: 'skills',
    title: '',
    explanation: '',
    type: 'replace',
    fieldId: 'skills',
    originalText: '',
    suggestedText: '',
    tags: [],
    priority: 'medium',
    ...over,
});

describe('suggestionAssertsNewFact', () => {
    it('flags adding a skill, because only the candidate knows if they have it', () => {
        expect(suggestionAssertsNewFact(make({ type: 'add', suggestedText: 'Kubernetes' }))).toBe(true);
    });

    it('flags a bullet with an unfilled metric placeholder', () => {
        expect(suggestionAssertsNewFact(make({
            type: 'replace',
            originalText: 'Reduced build times',
            suggestedText: 'Reduced build times by [ADD NUMBER]%',
        }))).toBe(true);
    });

    it('does not flag a wording fix — there is nothing to verify', () => {
        expect(suggestionAssertsNewFact(make({
            type: 'replace',
            originalText: 'Was responsible for the deploy pipeline',
            suggestedText: 'Owned the deploy pipeline',
        }))).toBe(false);
    });

    it('does not flag a deletion — removing text cannot overstate anything', () => {
        expect(suggestionAssertsNewFact(make({ type: 'delete', originalText: 'Microsoft Word' }))).toBe(false);
    });

    it('pre-selects only the edits that cannot make the resume less true', () => {
        const suggestions = [
            make({ id: 'typo', type: 'replace', originalText: 'recieved', suggestedText: 'received' }),
            make({ id: 'skill', type: 'add', suggestedText: 'REST APIs' }),
            make({ id: 'metric', type: 'replace', originalText: 'Cut latency', suggestedText: 'Cut latency by [ADD NUMBER]%' }),
            make({ id: 'drop', type: 'delete', originalText: 'Fax' }),
        ];

        const preSelected = suggestions.filter((s) => !suggestionAssertsNewFact(s)).map((s) => s.id);

        expect(preSelected).toEqual(['typo', 'drop']);
        expect(preSelected).not.toContain('skill');
        expect(preSelected).not.toContain('metric');
    });
});
