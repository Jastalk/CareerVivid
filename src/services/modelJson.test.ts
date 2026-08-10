import { describe, expect, it } from 'vitest';
import { ModelJsonError, parseModelJson, repairTruncatedJson, stripJsonFence } from './modelJson';

describe('stripJsonFence', () => {
    it('unwraps a fenced block with or without a language tag', () => {
        expect(stripJsonFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
        expect(stripJsonFence('```\n{"a":1}\n```')).toBe('{"a":1}');
    });

    it('leaves bare JSON alone', () => {
        expect(stripJsonFence('  {"a":1}  ')).toBe('{"a":1}');
    });
});

describe('repairTruncatedJson', () => {
    /*
     * The reported failure: "Unterminated string in JSON at position 2757".
     * The model was still writing a bullet when it ran out of room.
     */
    it('closes an object cut off mid-string', () => {
        const cut = '{"name":"Jane","summary":"Cloud engineer with seven years of exp';
        expect(JSON.parse(repairTruncatedJson(cut)!)).toEqual({ name: 'Jane' });
    });

    it('drops a half-written array element and closes the array', () => {
        const cut = '{"skills":[{"name":"AWS"},{"name":"Terra';
        expect(JSON.parse(repairTruncatedJson(cut)!)).toEqual({ skills: [{ name: 'AWS' }] });
    });

    it('keeps every complete entry before the cut', () => {
        const cut = `{"personalDetails":{"firstName":"Jane","lastName":"Doe"},` +
            `"employmentHistory":[{"jobTitle":"Cloud Engineer","employer":"Globex"},` +
            `{"jobTitle":"Platform Eng`;
        const value = JSON.parse(repairTruncatedJson(cut)!);

        expect(value.personalDetails).toEqual({ firstName: 'Jane', lastName: 'Doe' });
        expect(value.employmentHistory).toEqual([{ jobTitle: 'Cloud Engineer', employer: 'Globex' }]);
    });

    /*
     * Cutting straight after a key would produce {"a":{"b"}}, which is not JSON.
     * A closing quote only ends a value when a colon does not follow it.
     */
    it('does not cut between a key and its value', () => {
        const cut = '{"a":1,"nested":{"key":"val';
        expect(JSON.parse(repairTruncatedJson(cut)!)).toEqual({ a: 1 });
    });

    it('handles an escaped quote inside the truncated string', () => {
        const cut = '{"a":"said \\"hi\\" then","b":"unfinis';
        expect(JSON.parse(repairTruncatedJson(cut)!)).toEqual({ a: 'said "hi" then' });
    });

    it('handles a brace inside a string without miscounting depth', () => {
        const cut = '{"a":"a { brace","b":"cut';
        expect(JSON.parse(repairTruncatedJson(cut)!)).toEqual({ a: 'a { brace' });
    });

    it('closes deeply nested containers in the right order', () => {
        const cut = '{"a":[{"b":[1,2],"c":"done"},{"b":[3';
        expect(JSON.parse(repairTruncatedJson(cut)!)).toEqual({ a: [{ b: [1, 2], c: 'done' }] });
    });

    it('returns null when nothing complete arrived', () => {
        expect(repairTruncatedJson('{"firstKeyOnly')).toBeNull();
        expect(repairTruncatedJson('')).toBeNull();
    });
});

describe('parseModelJson', () => {
    it('parses a complete response without claiming repair', () => {
        expect(parseModelJson('{"a":1}')).toEqual({ value: { a: 1 }, repaired: false });
    });

    it('parses through a markdown fence', () => {
        expect(parseModelJson('```json\n{"a":1}\n```').value).toEqual({ a: 1 });
    });

    /*
     * The whole point: the user gets their resume instead of a stack trace,
     * and `repaired` lets the caller say the last section may be short.
     */
    it('salvages a truncated response and flags it', () => {
        const result = parseModelJson('{"skills":[{"name":"AWS"}],"summary":"Cloud eng');

        expect(result.value).toEqual({ skills: [{ name: 'AWS' }] });
        expect(result.repaired).toBe(true);
    });

    it('throws something diagnosable when nothing survives', () => {
        expect(() => parseModelJson('not json at all')).toThrow(ModelJsonError);
        expect(() => parseModelJson('')).toThrow(/empty response/i);
        expect(() => parseModelJson(undefined)).toThrow(ModelJsonError);
    });

    it('carries the raw text on the error so the cause is visible in logs', () => {
        try {
            parseModelJson('{"a"');
            expect.unreachable('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(ModelJsonError);
            expect((e as ModelJsonError).detail.raw).toBe('{"a"');
        }
    });
});
