import { describe, expect, it } from 'vitest';
import {
    contrast,
    inkOn,
    INK_DARK,
    INK_LIGHT,
    isDarkColor,
    mutedInkOn,
    parseHex,
    readableAccent,
    readableBorder,
} from './templateInk';

/** Every colour the template palettes actually offer. */
const PALETTE = [
    '#2c3e50', '#34495e', '#217ca3', '#95a5a6', '#7f8c8d',
    '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c',
    '#003366', '#004080', '#336699', '#6699CC', '#99CCFF',
    '#3a3a3a', '#5a2a27', '#6d6d6d', '#ab8f7c',
    '#000000', '#555555', '#888888', '#aaaaaa',
    '#007acc', '#005f9e', '#333333', '#f0db4f', '#43853d',
    '#4a5568', '#718096', '#2d3748', '#a0aec0',
    '#ff4757', '#e84118', '#3c40c6',
    '#b8860b', '#c0c0c0', '#4a4a4a',
    '#00bcd4', '#ff9800',
];

const ratio = (a: string, b: string) => contrast(parseHex(a)!, parseHex(b)!);

describe('inkOn', () => {
    /*
     * The bug this exists for: templates hardcode `text-white` on a panel
     * painted with the theme colour. That is fine for navy and unreadable on
     * the yellow and pale blue the same palettes offer.
     */
    it('gives readable ink on every colour the palettes offer', () => {
        for (const colour of PALETTE) {
            const r = ratio(inkOn(colour), colour);
            expect(r, `${colour} -> ${inkOn(colour)} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('picks white on dark colours and near-black on light ones', () => {
        expect(inkOn('#2c3e50')).toBe(INK_LIGHT);
        expect(inkOn('#000000')).toBe(INK_LIGHT);
        expect(inkOn('#f1c40f')).toBe(INK_DARK);
        expect(inkOn('#99CCFF')).toBe(INK_DARK);
    });

    /*
     * Yellow is the case that motivated this. White on #f1c40f is 1.9:1 — the
     * text is there and cannot be read, which is worse than missing because
     * nobody notices before they send the resume.
     */
    it('rescues the colours that were failing', () => {
        for (const bad of ['#f1c40f', '#f0db4f', '#99CCFF', '#a0aec0', '#c0c0c0', '#aaaaaa']) {
            expect(ratio(INK_LIGHT, bad), `white on ${bad}`).toBeLessThan(4.5);
            expect(ratio(inkOn(bad), bad), `chosen ink on ${bad}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('falls back to dark ink rather than throwing on junk input', () => {
        expect(inkOn('')).toBe(INK_DARK);
        expect(inkOn('not-a-colour')).toBe(INK_DARK);
        expect(inkOn(undefined as any)).toBe(INK_DARK);
    });

    it('understands shorthand hex and a missing leading hash', () => {
        expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
        expect(parseHex('000')).toEqual({ r: 0, g: 0, b: 0 });
    });
});

describe('mutedInkOn', () => {
    it('reads as secondary but still clears AA on every palette colour', () => {
        for (const colour of PALETTE) {
            const muted = mutedInkOn(colour);
            expect(ratio(muted, colour), `${colour} muted ${muted}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('is softer than the primary ink, not identical to it', () => {
        // On a strong dark panel there is room to step back from pure white.
        expect(mutedInkOn('#2c3e50')).not.toBe(INK_LIGHT);
    });
});

describe('readableAccent', () => {
    /*
     * The same colour used AS text on white paper: `#aaaaaa` headings measure
     * 2.3:1, which is why several templates look washed out rather than minimal.
     */
    it('darkens a pale theme colour until body text is readable', () => {
        for (const colour of PALETTE) {
            const accent = readableAccent(colour);
            expect(ratio(accent, '#ffffff'), `${colour} -> ${accent}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('leaves a colour alone when it already reads', () => {
        expect(readableAccent('#2c3e50')).toBe('#2c3e50');
        expect(readableAccent('#003366')).toBe('#003366');
    });

    /*
     * A yellow resume should still look yellow. Only lightness moves, so the
     * colour keeps its character instead of collapsing to grey.
     */
    it('keeps the hue when it darkens', () => {
        const accent = parseHex(readableAccent('#f1c40f'))!;
        expect(accent.r).toBeGreaterThan(accent.b);
        expect(accent.g).toBeGreaterThan(accent.b);
    });

    it('allows the lower bar for large display text', () => {
        const large = readableAccent('#95a5a6', '#ffffff', 3);
        expect(ratio(large, '#ffffff')).toBeGreaterThanOrEqual(3);
        // A looser bar must not darken more than the strict one.
        expect(ratio(large, '#ffffff')).toBeLessThanOrEqual(ratio(readableAccent('#95a5a6'), '#ffffff') + 0.01);
    });

    it('works against a dark background by lightening instead', () => {
        const onDark = readableAccent('#003366', '#111827');
        expect(ratio(onDark, '#111827')).toBeGreaterThanOrEqual(4.5);
    });
});

describe('readableBorder', () => {
    it('stays visible on paper for every palette colour', () => {
        for (const colour of PALETTE) {
            expect(ratio(readableBorder(colour), '#ffffff'), colour).toBeGreaterThanOrEqual(2.2);
        }
    });
});

describe('isDarkColor', () => {
    it('agrees with the ink it would choose', () => {
        for (const colour of PALETTE) {
            expect(isDarkColor(colour)).toBe(inkOn(colour) === INK_LIGHT);
        }
    });
});
