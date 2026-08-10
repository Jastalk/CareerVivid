import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The reported bug: "Unterminated string in JSON at position 2757" and a blank
 * screen after generating a resume. The model stopped mid-document, nothing
 * reported it, and JSON.parse took the whole feature down.
 *
 * These drive the real function through a stubbed proxy so the retry-then-
 * salvage ladder is exercised end to end, not just the parser under it.
 */

vi.mock('../firebase', () => ({
    auth: { currentUser: { getIdToken: async () => 'test-token' } },
    db: {},
}));
vi.mock('./trackingService', () => ({ trackUsage: vi.fn() }));
vi.mock('./errorService', () => ({ reportError: vi.fn() }));

const { generateResumeFromPrompt } = await import('./geminiService');

const WHOLE = JSON.stringify({
    personalDetails: { firstName: 'Jane', lastName: 'Doe' },
    professionalSummary: 'Cloud engineer.',
    skills: [{ name: 'AWS' }, { name: 'Terraform' }],
    employmentHistory: [{ jobTitle: 'Cloud Engineer', employer: 'Globex' }],
    education: [{ school: 'UBC' }],
});

/** Cut mid-string, the way a generation that hits its ceiling actually ends. */
const CUT = '{"personalDetails":{"firstName":"Jane","lastName":"Doe"},'
    + '"skills":[{"name":"AWS"}],'
    + '"professionalSummary":"Cloud engineer with seven years of experi';

const proxyBody = (text: string, finishReason = 'STOP') => () =>
    new Response(
        `__END_GEMINI__${JSON.stringify({
            text,
            response: { candidates: [{ finishReason }], usageMetadata: { totalTokenCount: 900 } },
        })}`,
        { status: 200 },
    );

describe('generateResumeFromPrompt — truncated responses', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    it('returns the resume when the model finishes', async () => {
        fetchMock.mockImplementation(proxyBody(WHOLE));

        const resume = await generateResumeFromPrompt('user-1', 'cloud engineer');

        expect(resume.personalDetails?.firstName).toBe('Jane');
        expect(resume.skills).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    /*
     * A generation that stops early is usually not deterministic, so one more
     * attempt normally returns a whole resume — better than salvaging a partial
     * one when the cost is a single call.
     */
    it('retries once when the first attempt is cut off, and prefers the complete retry', async () => {
        fetchMock
            .mockImplementationOnce(proxyBody(CUT, 'MAX_TOKENS'))
            .mockImplementation(proxyBody(WHOLE));

        const resume = await generateResumeFromPrompt('user-1', 'cloud engineer');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(resume.employmentHistory).toHaveLength(1);
        expect(resume.skills).toHaveLength(2);
    });

    /*
     * The behaviour that actually fixes the report. Both attempts cut off, and
     * the user still lands in the editor with their name, skills and everything
     * that arrived before the cut — instead of a SyntaxError and a blank page.
     */
    it('salvages a partial resume when the retry is also cut off', async () => {
        fetchMock.mockImplementation(proxyBody(CUT, 'MAX_TOKENS'));

        const resume = await generateResumeFromPrompt('user-1', 'cloud engineer');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(resume.personalDetails).toEqual({ firstName: 'Jane', lastName: 'Doe' });
        expect(resume.skills?.[0]?.name).toBe('AWS');
        // The half-written summary is dropped rather than half-shown.
        expect(resume.professionalSummary).toBeUndefined();
    });

    it('still assigns ids to the entries that survived', async () => {
        fetchMock.mockImplementation(proxyBody(CUT, 'MAX_TOKENS'));

        const resume = await generateResumeFromPrompt('user-1', 'cloud engineer');

        expect(resume.skills?.[0]?.id).toBeTruthy();
    });

    it('fails with a usable message when nothing at all can be recovered', async () => {
        fetchMock.mockImplementation(proxyBody('I am afraid I cannot do that.'));

        await expect(generateResumeFromPrompt('user-1', 'cloud engineer')).rejects.toThrow(
            /Failed to generate resume/i,
        );
    });

    /*
     * Every AI resume used to open as John Doe, because the prompt asked for
     * "realistic but placeholder personal details". The user's first job was
     * deleting a stranger's name off their own resume.
     */
    it('tells the model to use the real person, verbatim', async () => {
        fetchMock.mockImplementation(proxyBody(WHOLE));

        await generateResumeFromPrompt('user-1', 'product manager', {
            firstName: 'Jiawen',
            lastName: 'Zhu',
            email: 'evan@jastalk.com',
            city: 'Champaign',
        });

        const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).data.contents;
        const text = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);

        expect(text).toContain('Jiawen');
        expect(text).toContain('Zhu');
        expect(text).toContain('evan@jastalk.com');
        expect(text).toContain('Champaign');
        expect(text).toMatch(/EXACTLY as written/i);
        // The old instruction has to be gone, not merely outvoted.
        expect(text).not.toMatch(/John Doe/i);
    });

    it('leaves unknown details blank rather than inventing them', async () => {
        fetchMock.mockImplementation(proxyBody(WHOLE));

        await generateResumeFromPrompt('user-1', 'product manager', { firstName: 'Jiawen' });

        const text = JSON.stringify(JSON.parse(fetchMock.mock.calls[0][1].body).data.contents);
        expect(text).toMatch(/do not invent a phone number/i);
    });

    /*
     * A brand-new user has nothing on file. An obvious blank they must fill in
     * beats a plausible fake name they might not notice.
     */
    it('uses an obvious placeholder when nothing is known', async () => {
        fetchMock.mockImplementation(proxyBody(WHOLE));

        await generateResumeFromPrompt('user-1', 'product manager');

        const text = JSON.stringify(JSON.parse(fetchMock.mock.calls[0][1].body).data.contents);
        expect(text).toMatch(/Your Name/i);
        expect(text).not.toMatch(/John Doe/i);
    });

    it('asks for enough room that a full resume fits', async () => {
        fetchMock.mockImplementation(proxyBody(WHOLE));

        await generateResumeFromPrompt('user-1', 'cloud engineer');

        const sent = JSON.parse(fetchMock.mock.calls[0][1].body).data;
        expect(sent.config.maxOutputTokens).toBeGreaterThanOrEqual(8_192);
    });
});
