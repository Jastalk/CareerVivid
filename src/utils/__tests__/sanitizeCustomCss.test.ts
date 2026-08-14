import { describe, expect, it } from 'vitest';
import { sanitizeCustomCss } from '../sanitizeCustomCss';

/*
 * Every payload here was verified against a real CSS tokenizer before it was
 * written down. The three at the top all passed the previous regex-and-walker
 * implementation, which is why this file exists.
 */
describe('sanitizeCustomCss', () => {
    describe('breaking out of the scoping block', () => {
        it('refuses a bad-url token used to hide a closing brace', () => {
            // url(a'b) is ONE bad-url-token ending at the first ')'. The quote
            // inside it is not a string delimiter, so the '}' that follows is a
            // real closing brace and closes #resume-preview-N.
            const result = sanitizeCustomCss("background:url(a'b) } header, body { display:none } url(c'd)");

            expect(result.css).toBeNull();
            expect(result.rejected).toBe('unbalanced');
        });

        it('refuses a plain stray closing brace', () => {
            expect(sanitizeCustomCss('color: red } body { display: none }').rejected).toBe('unbalanced');
        });

        it('is not fooled by a brace inside a string', () => {
            expect(sanitizeCustomCss('content: "}"; color: red').css).toBe('content: "}"; color: red');
        });

        it('refuses an unterminated comment', () => {
            expect(sanitizeCustomCss('color: red; /* never closed').rejected).toBe('unterminated');
        });

        it('keeps a balanced nested at-rule', () => {
            const css = '@media (min-width: 40rem) { .cv-format-surface { color: #333; } }';
            expect(sanitizeCustomCss(css).css).toBe(css);
        });
    });

    describe('fetching over the network', () => {
        it('drops a remote url() but keeps the rest of the stylesheet', () => {
            const result = sanitizeCustomCss(
                'color: #123456;\nbackground-image: url(https://tracker.example/pixel.png);\nfont-weight: 700;',
            );

            expect(result.rejected).toBeNull();
            expect(result.css).toContain('color: #123456');
            expect(result.css).toContain('font-weight: 700');
            expect(result.css).not.toContain('tracker.example');
            expect(result.removed).toHaveLength(1);
        });

        it('drops image-set(), which takes a bare string and needs no url(', () => {
            const result = sanitizeCustomCss('background-image: image-set("https://tracker.example/p.png" 1x);');

            expect(result.css).toBeNull();
            expect(result.removed).toHaveLength(1);
        });

        it('drops -webkit-image-set() the same way', () => {
            expect(sanitizeCustomCss('background: -webkit-image-set("https://evil.example/x.png" 1x);').css).toBeNull();
        });

        it('drops a bare remote string anywhere, wherever the fetch would come from', () => {
            expect(sanitizeCustomCss('background: foo("https://evil.example/x.png");').css).toBeNull();
            expect(sanitizeCustomCss('background: foo("//evil.example/x.png");').css).toBeNull();
        });

        it('keeps an inline data: payload', () => {
            const css = 'background-image: url(data:image/gif;base64,R0lGOD);';
            expect(sanitizeCustomCss(css).css).toBe(css);
        });

        it('keeps a quoted data: payload and a quoted format() hint', () => {
            const css = 'background: url("data:image/svg+xml,%3Csvg%3E") no-repeat; font-family: "Inter", sans-serif;';
            expect(sanitizeCustomCss(css).css).toBe(css);
        });

        it('does not mistake a colon in ordinary text for a scheme', () => {
            const css = 'content: "Note: this is fine";';
            expect(sanitizeCustomCss(css).css).toBe(css);
        });
    });

    describe('at-rules', () => {
        it('drops @import', () => {
            const result = sanitizeCustomCss('@import url(https://evil.example/x.css); color: red;');
            expect(result.css).toBe('color: red;');
        });

        it('drops @import written with an identifier escape', () => {
            // `@\69 mport` is @import to the parser and invisible to /@import/i.
            const result = sanitizeCustomCss('@\\69 mport url(https://evil.example/x.css); color: red;');
            expect(result.css).toBe('color: red;');
        });

        it('drops @import spelled in mixed case', () => {
            expect(sanitizeCustomCss('@ImPoRt "https://evil.example/x.css";').css).toBeNull();
        });
    });

    it('returns null for empty and non-string input', () => {
        expect(sanitizeCustomCss(undefined).css).toBeNull();
        expect(sanitizeCustomCss('   ').css).toBeNull();
        expect(sanitizeCustomCss(null).css).toBeNull();
    });

    it('leaves ordinary generated CSS byte-for-byte alone', () => {
        const css = [
            '.cv-format-surface h2 {',
            '  background: linear-gradient(90deg, #7c3aed, #4f46e5);',
            '  -webkit-background-clip: text;',
            '  color: transparent;',
            '}',
            '.cv-format-surface section { animation: fade-in 0.4s ease both; }',
            '@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }',
        ].join('\n');

        const result = sanitizeCustomCss(css);
        expect(result.css).toBe(css);
        expect(result.removed).toEqual([]);
    });
});
