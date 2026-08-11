import { describe, expect, it } from 'vitest';
import { A4_HEIGHT_PX, countPages, measurePaintedContentBottom } from './paginationUtils';

/*
 * The blank second page users were left staring at.
 *
 * `Math.ceil(scrollHeight / A4)` turns a single pixel of trailing padding into
 * a whole extra page — one holding nothing, which is why "delete this page"
 * was never the right fix: there is no content on it to remove. Counting
 * painted ink instead removes the cause, and needs no tolerance constant that
 * could throw away a page holding one real line.
 */

describe('countPages', () => {
    it('keeps a resume that exactly fills the page on one page', () => {
        expect(countPages(A4_HEIGHT_PX)).toBe(1);
    });

    it('adds a page only once something is actually drawn on it', () => {
        expect(countPages(A4_HEIGHT_PX + 1)).toBe(2);
        expect(countPages(A4_HEIGHT_PX * 2)).toBe(2);
        expect(countPages(A4_HEIGHT_PX * 2 + 1)).toBe(3);
    });

    it('never reports less than one page', () => {
        expect(countPages(0)).toBe(1);
        expect(countPages(-50)).toBe(1);
        expect(countPages(NaN)).toBe(1);
    });
});

/** Build a page-sized box with children at known offsets. */
const makeRoot = (): HTMLElement => {
    const root = document.createElement('div');
    Object.defineProperty(root, 'getBoundingClientRect', {
        value: () => ({ top: 0, bottom: A4_HEIGHT_PX, left: 0, right: 794, width: 794, height: A4_HEIGHT_PX }),
    });
    document.body.appendChild(root);
    return root;
};

/** jsdom has no layout, so each node is given the rect it would have had. */
const place = (el: HTMLElement | Text, bottom: number, height = 20) => {
    const rect = { top: bottom - height, bottom, left: 0, right: 400, width: 400, height };
    if (el instanceof Text) {
        // Range.getBoundingClientRect is what the measurement uses for text.
        const proto = Range.prototype as any;
        proto.getBoundingClientRect = function () {
            return (this as any).__rect ?? { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
        };
    } else {
        Object.defineProperty(el, 'getBoundingClientRect', { value: () => rect, configurable: true });
    }
};

describe('measurePaintedContentBottom', () => {
    /*
     * The exact shape of the bug: the last line of text sits on the boundary,
     * and the container is taller only because of its own bottom padding.
     */
    it('ignores trailing padding that paints nothing', () => {
        const root = makeRoot();
        const filler = document.createElement('div');
        // A transparent, border-free box contributes no ink of its own.
        place(filler, A4_HEIGHT_PX + 60, 60);
        root.appendChild(filler);

        expect(measurePaintedContentBottom(root)).toBeLessThanOrEqual(A4_HEIGHT_PX);
        expect(countPages(measurePaintedContentBottom(root))).toBe(1);
    });

    it('counts a filled box that really does run onto the next page', () => {
        const root = makeRoot();
        const sidebar = document.createElement('div');
        sidebar.style.backgroundColor = 'rgb(31, 41, 55)';
        place(sidebar, A4_HEIGHT_PX + 200, 400);
        root.appendChild(sidebar);

        // A coloured panel crossing the boundary is ink the reader would see.
        expect(measurePaintedContentBottom(root)).toBeGreaterThan(A4_HEIGHT_PX);
        expect(countPages(measurePaintedContentBottom(root))).toBe(2);
    });

    it('counts media as content', () => {
        const root = makeRoot();
        const img = document.createElement('img');
        place(img, A4_HEIGHT_PX + 120, 120);
        root.appendChild(img);

        expect(countPages(measurePaintedContentBottom(root))).toBe(2);
    });

    it('ignores anything hidden', () => {
        const root = makeRoot();
        const hidden = document.createElement('div');
        hidden.style.display = 'none';
        hidden.style.backgroundColor = 'rgb(0, 0, 0)';
        place(hidden, A4_HEIGHT_PX + 300, 300);
        root.appendChild(hidden);

        expect(countPages(measurePaintedContentBottom(root))).toBe(1);
    });

    it('returns zero rather than throwing on an empty root', () => {
        expect(measurePaintedContentBottom(makeRoot())).toBe(0);
        expect(countPages(measurePaintedContentBottom(makeRoot()))).toBe(1);
    });
});
