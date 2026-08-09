import { describe, expect, it } from 'vitest';
import { normalizeSpokenCompanyQuery, shouldUseAdvancedCareerModel } from './interviewIntent';

describe('normalizeSpokenCompanyQuery', () => {
    it.each(['OpenAI', 'open ai', 'open A I', 'open eye', 'Can I do an open eye interview?'])(
        'maps the speech variant %s to OpenAI',
        (input) => expect(normalizeSpokenCompanyQuery(input)).toBe('openai'),
    );

    it('leaves other normalized company names unchanged', () => {
        expect(normalizeSpokenCompanyQuery('  Google DeepMind ')).toBe('google deepmind');
    });
});

describe('shouldUseAdvancedCareerModel', () => {
    it('escalates interview and active-workspace turns', () => {
        expect(shouldUseAdvancedCareerModel('Can I do an open eye interview?', false)).toBe(true);
        expect(shouldUseAdvancedCareerModel('Is this correct?', true)).toBe(true);
    });

    it('keeps simple navigation chat on the economical model', () => {
        expect(shouldUseAdvancedCareerModel('Take me to settings', false)).toBe(false);
    });
});
