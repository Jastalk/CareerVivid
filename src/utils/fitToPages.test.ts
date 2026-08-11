import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMATTING_SETTINGS } from '../types';
import { isAtTightestLayout, tightenLayout, trailingOverflowRatio } from './fitToPages';

const FLOORS = { pageMargin: 1.25, sectionGap: 0.9, paragraphGap: 0.25, lineHeight: 1.2, bodyScale: 0.92 };

describe('tightenLayout', () => {
    it('spends whitespace before it touches the type', () => {
        const { settings, changed } = tightenLayout(DEFAULT_FORMATTING_SETTINGS, 0.05);

        expect(settings.pageMargin).toBeLessThan(DEFAULT_FORMATTING_SETTINGS.pageMargin);
        expect(settings.sectionGap).toBeLessThan(DEFAULT_FORMATTING_SETTINGS.sectionGap);
        // Margins and gaps move first and further than line height does.
        const marginDrop = DEFAULT_FORMATTING_SETTINGS.pageMargin - settings.pageMargin;
        const lineDrop = DEFAULT_FORMATTING_SETTINGS.lineHeight - settings.lineHeight;
        expect(marginDrop).toBeGreaterThan(lineDrop);
        expect(changed).toContain('page margins');
    });

    /*
     * The one thing a resume cannot afford is to stop looking professional, so
     * every knob stops at a value that still reads well however hard it is
     * pushed.
     */
    it('never crosses a floor, however large the overflow', () => {
        let settings = { ...DEFAULT_FORMATTING_SETTINGS };
        for (let i = 0; i < 40; i++) settings = tightenLayout(settings, 0.9).settings;

        expect(settings.pageMargin).toBeGreaterThanOrEqual(FLOORS.pageMargin);
        expect(settings.sectionGap).toBeGreaterThanOrEqual(FLOORS.sectionGap);
        expect(settings.paragraphGap).toBeGreaterThanOrEqual(FLOORS.paragraphGap);
        expect(settings.lineHeight).toBeGreaterThanOrEqual(FLOORS.lineHeight);
        expect(settings.bodyScale).toBeGreaterThanOrEqual(FLOORS.bodyScale);
    });

    it('reports when there is nothing left to give', () => {
        let settings = { ...DEFAULT_FORMATTING_SETTINGS };
        for (let i = 0; i < 40; i++) settings = tightenLayout(settings, 0.9).settings;

        expect(tightenLayout(settings, 0.9).atLimit).toBe(true);
        expect(isAtTightestLayout(settings)).toBe(true);
        expect(isAtTightestLayout(DEFAULT_FORMATTING_SETTINGS)).toBe(false);
    });

    it('names what it changed, so the user can see it', () => {
        const { changed } = tightenLayout(DEFAULT_FORMATTING_SETTINGS, 0.1);
        expect(changed.length).toBeGreaterThan(0);
        for (const label of changed) expect(label).toMatch(/margins|spacing|size/);
    });

    it('always moves in one direction', () => {
        const before = { ...DEFAULT_FORMATTING_SETTINGS };
        const { settings } = tightenLayout(before, 0.02);
        for (const key of Object.keys(before) as (keyof typeof before)[]) {
            expect(settings[key], key).toBeLessThanOrEqual(before[key]);
        }
    });

    it('starts from the defaults when a resume has no settings saved', () => {
        expect(tightenLayout(undefined, 0.1).settings.lineHeight).toBeLessThanOrEqual(
            DEFAULT_FORMATTING_SETTINGS.lineHeight,
        );
    });
});

describe('trailingOverflowRatio', () => {
    /*
     * Decides whether the button is offered at all. A last page that is mostly
     * full is a page the user wrote; offering to squeeze it away would be
     * offering to mangle their resume.
     */
    it('measures how much of the last page is used', () => {
        expect(trailingOverflowRatio(1123, 1123)).toBe(0);
        expect(trailingOverflowRatio(1123 + 112, 1123)).toBeCloseTo(0.1, 2);
        expect(trailingOverflowRatio(1123 * 1.5, 1123)).toBeCloseTo(0.5, 2);
    });

    it('is zero for an exact fit or nothing at all', () => {
        expect(trailingOverflowRatio(0, 1123)).toBe(0);
        expect(trailingOverflowRatio(1123 * 2, 1123)).toBe(0);
        expect(trailingOverflowRatio(500, 0)).toBe(0);
    });
});
