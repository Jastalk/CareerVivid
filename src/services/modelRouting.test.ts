import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Which model runs a report is invisible at runtime — a downgrade produces a
 * report that looks fine and grades worse. These tests are the only thing that
 * notices, so they assert the wire payload rather than the exported constant.
 */

vi.mock('../firebase', () => ({
    auth: { currentUser: { getIdToken: async () => 'test-token' } },
    db: {},
}));
vi.mock('./trackingService', () => ({ trackUsage: vi.fn() }));
vi.mock('./errorService', () => ({ reportError: vi.fn() }));

const {
    callGeminiWithFallback,
    DEFAULT_TEXT_MODEL,
    REPORT_MODEL,
    RESUME_GENERATION_MODEL,
    analyzeInterviewTranscript,
} = await import('./geminiService');

/**
 * The proxy streams `<anything>__END_GEMINI__<json>`.
 *
 * Returned from a factory, never a shared instance: a Response body can only be
 * read once, so reusing one across calls fails as "ReadableStream is locked"
 * rather than as whatever the test was actually checking.
 */
const proxyBody = (payload: unknown) => () =>
    new Response(`__END_GEMINI__${JSON.stringify({ text: JSON.stringify(payload), response: {} })}`, { status: 200 });

const modelsSent = (fetchMock: ReturnType<typeof vi.fn>): string[] =>
    fetchMock.mock.calls.map(([, init]: any) => JSON.parse(init.body).data.modelName);

describe('report and resume model routing', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    it('grades an interview on the report model, not the default', async () => {
        fetchMock.mockImplementation(proxyBody({ overallScore: 83, strengths: 'x', areasForImprovement: 'y' }));

        await analyzeInterviewTranscript('u1', [{ speaker: 'ai', text: 'Hi', isFinal: true }], 'Backend Engineer');

        expect(modelsSent(fetchMock)).toEqual(['gemini-3.6-flash']);
        expect(REPORT_MODEL).toBe('gemini-3.6-flash');
    });

    /*
     * The alias map used to rewrite these two names to 2.5 before the request
     * left the browser, so asking for them was a silent no-op. If either entry
     * comes back, every assertion above still passes at the constant level —
     * this is what catches it.
     */
    it('sends the 3.x names on the wire instead of aliasing them down', async () => {
        fetchMock.mockImplementation(proxyBody({ ok: true }));

        await callGeminiWithFallback(REPORT_MODEL, DEFAULT_TEXT_MODEL, { contents: 'hi' });
        await callGeminiWithFallback(RESUME_GENERATION_MODEL, DEFAULT_TEXT_MODEL, { contents: 'hi' });

        expect(modelsSent(fetchMock)).toEqual(['gemini-3.6-flash', 'gemini-3.1-flash-lite']);
    });

    it('falls back to the default model when the project cannot serve the preferred one', async () => {
        fetchMock
            .mockImplementationOnce(() => new Response('Model not available: gemini-3.6-flash', { status: 400 }))
            .mockImplementation(proxyBody({ ok: true }));

        const result = await callGeminiWithFallback(REPORT_MODEL, DEFAULT_TEXT_MODEL, { contents: 'hi' });

        expect(JSON.parse(result.text)).toEqual({ ok: true });
        expect(modelsSent(fetchMock).at(-1)).toBe(DEFAULT_TEXT_MODEL);
    });

    /*
     * A server error is not a routing problem, and neither is a rate limit.
     * Falling back on either would quietly downgrade every report the moment
     * the good model got busy or blipped — the exact invisible substitution
     * this change exists to remove. 500 is used here rather than 429 only
     * because `retryOperation` backs off for seconds on 429 and 503.
     */
    it('does not fall back on a failure that is not about the model', async () => {
        fetchMock.mockImplementation(() => new Response('upstream exploded', { status: 500 }));

        await expect(callGeminiWithFallback(REPORT_MODEL, DEFAULT_TEXT_MODEL, { contents: 'hi' })).rejects.toThrow(/500/);

        expect(new Set(modelsSent(fetchMock))).toEqual(new Set([REPORT_MODEL]));
    });
});
