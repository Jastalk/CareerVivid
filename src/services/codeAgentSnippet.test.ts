import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({
    auth: { currentUser: null },
    db: {},
}));
vi.mock('./trackingService', () => ({ trackUsage: vi.fn() }));
vi.mock('./errorService', () => ({ reportError: vi.fn() }));

const { normalizeVoiceToCodeResult, stripCodeFence } = await import('./geminiService');

describe('stripCodeFence', () => {
    /*
     * Models wrap code in markdown fences whatever the instruction says. The
     * panel renders this into a <pre>, so an un-stripped fence shows up as
     * ```javascript being line one of the user's snippet.
     */
    it('unwraps a fenced block, with or without a language tag', () => {
        expect(stripCodeFence('```javascript\nconst m = new Map();\n```')).toBe('const m = new Map();');
        expect(stripCodeFence('```\nconst m = new Map();\n```')).toBe('const m = new Map();');
        expect(stripCodeFence('```c++\nauto m = 0;\n```')).toBe('auto m = 0;');
    });

    it('leaves unfenced code exactly as written', () => {
        const code = 'function get(key) {\n    return this.map.get(key);\n}';
        expect(stripCodeFence(code)).toBe(code);
    });

    /*
     * Only the outer wrapper goes. A fence inside the snippet is the model's
     * content, and cutting into it would corrupt working code.
     */
    it('does not touch a fence in the middle of the snippet', () => {
        const code = 'const a = 1;\n// see ```docs``` for why\nconst b = 2;';
        expect(stripCodeFence(code)).toBe(code);
    });

    it('returns an empty string for anything that is not a string', () => {
        expect(stripCodeFence(undefined)).toBe('');
        expect(stripCodeFence(null)).toBe('');
        expect(stripCodeFence(42)).toBe('');
        expect(stripCodeFence('   ')).toBe('');
    });
});

describe('normalizeVoiceToCodeResult', () => {
    const full = {
        convertedCode: 'function lruCacheOps() {}',
        coachingMessage: 'What evicts first?',
        focusArea: 'Eviction order',
        whyItMatters: 'Capacity is the whole point of an LRU cache.',
        nextAction: 'Write the eviction branch.',
        suggestedTests: 'capacity 1, repeated get',
        codeSnippet: '```js\nthis.map.delete(oldestKey);\n```',
        snippetCaption: 'Evicting the oldest key',
        isOnRightTrack: true,
    };

    it('carries the snippet through, unfenced', () => {
        const result = normalizeVoiceToCodeResult(full, 'previous code');

        expect(result.codeSnippet).toBe('this.map.delete(oldestKey);');
        expect(result.snippetCaption).toBe('Evicting the oldest key');
    });

    /*
     * The panel hides the snippet block when this is empty, which is the right
     * fallback: better no block than an empty one implying the agent refused.
     */
    it('degrades to no snippet rather than a broken block', () => {
        expect(normalizeVoiceToCodeResult({ ...full, codeSnippet: undefined }, '').codeSnippet).toBe('');
        expect(normalizeVoiceToCodeResult({}, '').codeSnippet).toBe('');
        expect(normalizeVoiceToCodeResult(null, '').snippetCaption).toBe('');
    });

    it('keeps the editor untouched when the model returns no converted code', () => {
        const existing = 'function mine() { return 1; }';
        expect(normalizeVoiceToCodeResult({ ...full, convertedCode: '' }, existing).convertedCode).toBe(existing);
    });

    it('preserves the other coaching fields alongside the snippet', () => {
        const result = normalizeVoiceToCodeResult(full, '');

        expect(result.focusArea).toBe('Eviction order');
        expect(result.nextAction).toBe('Write the eviction branch.');
        expect(result.suggestedTests).toBe('capacity 1, repeated get');
        expect(result.isOnRightTrack).toBe(true);
    });
});
