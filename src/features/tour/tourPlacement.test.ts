import { describe, expect, it } from 'vitest';
import { cutoutFrame, placeTooltip, TOOLTIP_WIDTH } from './tourPlacement';

const viewport = { width: 1440, height: 900 };
const rect = (top: number, left: number, width = 120, height = 32) => ({ top, left, width, height });

describe('placeTooltip', () => {
    it('sits below the control and centres on it', () => {
        const p = placeTooltip(rect(100, 700), 160, viewport);

        expect(p.side).toBe('bottom');
        expect(p.top).toBeGreaterThan(100 + 32);
        expect(p.left + TOOLTIP_WIDTH / 2).toBeCloseTo(700 + 60, 0);
    });

    /*
     * The Download button lives in the header; a tooltip below it is fine. The
     * failure that matters is a control near the BOTTOM, where "below" would
     * run off screen.
     */
    it('flips above when there is no room below', () => {
        const p = placeTooltip(rect(820, 700), 160, viewport);

        expect(p.side).toBe('top');
        expect(p.top + 160).toBeLessThanOrEqual(820);
    });

    it('never lets the tooltip leave the viewport horizontally', () => {
        const hugLeft = placeTooltip(rect(100, 4, 40), 160, viewport);
        const hugRight = placeTooltip(rect(100, 1420, 40), 160, viewport);

        expect(hugLeft.left).toBeGreaterThanOrEqual(0);
        expect(hugRight.left + TOOLTIP_WIDTH).toBeLessThanOrEqual(viewport.width);
    });

    it('never lets the tooltip leave the viewport vertically', () => {
        const tall = placeTooltip(rect(430, 700), 700, { width: 1440, height: 760 });

        expect(tall.top).toBeGreaterThanOrEqual(0);
        expect(tall.top + 700).toBeLessThanOrEqual(760 + 1);
    });

    /*
     * A tooltip covering the control is the one outcome that breaks the whole
     * mechanic: the user is told to click something they cannot see.
     */
    it('does not cover the control it is describing', () => {
        for (const top of [40, 200, 450, 700, 860]) {
            const anchor = rect(top, 700);
            const p = placeTooltip(anchor, 160, viewport);
            const overlaps = p.top < anchor.top + anchor.height && p.top + 160 > anchor.top;
            expect(overlaps, `overlapped at top=${top}`).toBe(false);
        }
    });
});

describe('cutoutFrame', () => {
    it('leaves the control uncovered and everything else covered', () => {
        const anchor = rect(300, 600, 200, 40);
        const frame = cutoutFrame(anchor, 8, viewport);

        const covers = (x: number, y: number) =>
            frame.some((r) => x >= r.left && x < r.left + r.width && y >= r.top && y < r.top + r.height);

        // Centre of the control — must be clickable.
        expect(covers(700, 320)).toBe(false);
        // Well outside it — must be blocked.
        expect(covers(100, 100)).toBe(true);
        expect(covers(1300, 800)).toBe(true);
        expect(covers(700, 100)).toBe(true);
        expect(covers(700, 800)).toBe(true);
    });

    it('covers the full viewport apart from the hole', () => {
        const anchor = rect(300, 600, 200, 40);
        const area = cutoutFrame(anchor, 8, viewport).reduce((sum, r) => sum + r.width * r.height, 0);
        const hole = (200 + 16) * (40 + 16);

        expect(area).toBe(viewport.width * viewport.height - hole);
    });

    it('emits no zero-size rectangles for a control against an edge', () => {
        for (const r of cutoutFrame(rect(0, 0, 100, 40), 8, viewport)) {
            expect(r.width).toBeGreaterThan(0);
            expect(r.height).toBeGreaterThan(0);
        }
    });
});
