import { describe, expect, it } from 'vitest';
import { joinTranscriptFragments, mergeVoiceTranscriptTurns } from './conversationFormatting';

describe('conversation formatting', () => {
    it('joins transcript fragments with natural punctuation', () => {
        expect(joinTranscriptFragments('Sounds good', '. Let me know')).toBe('Sounds good. Let me know');
        expect(joinTranscriptFragments('I would use', 'Bigtable')).toBe('I would use Bigtable');
    });

    it('merges consecutive saved voice fragments from the same speaker', () => {
        expect(mergeVoiceTranscriptTurns([
            { role: 'assistant', text: 'For the analytics', via: 'voice' },
            { role: 'assistant', text: 'part,', via: 'voice' },
            { role: 'assistant', text: "you'd add", via: 'voice' },
            { role: 'assistant', text: 'a worker service.', via: 'voice' },
        ])).toEqual([
            { role: 'assistant', text: "For the analytics part, you'd add a worker service.", via: 'voice' },
        ]);
    });

    it('keeps speaker changes and deliberate text messages separate', () => {
        expect(mergeVoiceTranscriptTurns([
            { role: 'assistant', text: 'First answer.', via: 'voice' },
            { role: 'user', text: 'Follow-up question.', via: 'voice' },
            { role: 'assistant', text: 'First typed reply.', via: 'text' },
            { role: 'assistant', text: 'Second typed reply.', via: 'text' },
        ])).toHaveLength(4);
    });

    it('preserves cards attached to merged voice fragments', () => {
        expect(mergeVoiceTranscriptTurns([
            { role: 'assistant', text: 'Here are', via: 'voice', effects: [{ kind: 'company_guides' }] },
            { role: 'assistant', text: 'the guides.', via: 'voice', effects: [{ kind: 'interview_questions' }] },
        ])[0].effects).toEqual([
            { kind: 'company_guides' },
            { kind: 'interview_questions' },
        ]);
    });
});
