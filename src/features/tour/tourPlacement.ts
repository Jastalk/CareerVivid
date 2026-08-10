/**
 * Where the tooltip goes relative to the control it is explaining.
 *
 * Pure, because placement is the part most likely to be subtly wrong — a
 * tooltip half off-screen, or one covering the very button the user is being
 * told to press — and those are miserable to chase in a browser.
 */

import type { AnchorRect } from './useAnchorRect';

export type Side = 'top' | 'bottom';

export interface Placement {
    side: Side;
    /** Viewport coordinates for the tooltip's top-left corner. */
    top: number;
    left: number;
}

export const TOOLTIP_WIDTH = 320;
const GAP = 14;
const EDGE = 16;

export function placeTooltip(
    anchor: AnchorRect,
    tooltipHeight: number,
    viewport: { width: number; height: number },
): Placement {
    const below = anchor.top + anchor.height + GAP;
    const above = anchor.top - GAP - tooltipHeight;

    // Below by default — it reads in the same direction as the page. Flip up
    // only when there is genuinely no room, and if neither side fits, take
    // whichever has more space rather than clamping into the control itself.
    const fitsBelow = below + tooltipHeight <= viewport.height - EDGE;
    const fitsAbove = above >= EDGE;
    const side: Side = fitsBelow ? 'bottom' : fitsAbove ? 'top' : anchor.top > viewport.height / 2 ? 'top' : 'bottom';

    const rawTop = side === 'bottom' ? below : above;
    const top = Math.min(Math.max(rawTop, EDGE), Math.max(EDGE, viewport.height - tooltipHeight - EDGE));

    // Centred on the control, then pulled back inside the viewport.
    const centred = anchor.left + anchor.width / 2 - TOOLTIP_WIDTH / 2;
    const left = Math.min(Math.max(centred, EDGE), Math.max(EDGE, viewport.width - TOOLTIP_WIDTH - EDGE));

    return { side, top, left };
}

/**
 * The four rectangles that dim and block everything except the control.
 *
 * A single element with a hole punched by clip-path would still swallow clicks
 * over the hole in some browsers. Four plain rects leave the control genuinely
 * untouched, which matters here more than usual: clicking it IS how the tour
 * advances.
 */
export function cutoutFrame(
    anchor: AnchorRect,
    padding: number,
    viewport: { width: number; height: number },
): Array<{ top: number; left: number; width: number; height: number }> {
    const top = Math.max(0, anchor.top - padding);
    const left = Math.max(0, anchor.left - padding);
    const right = Math.min(viewport.width, anchor.left + anchor.width + padding);
    const bottom = Math.min(viewport.height, anchor.top + anchor.height + padding);

    return [
        { top: 0, left: 0, width: viewport.width, height: top },
        { top: bottom, left: 0, width: viewport.width, height: Math.max(0, viewport.height - bottom) },
        { top, left: 0, width: left, height: Math.max(0, bottom - top) },
        { top, left: right, width: Math.max(0, viewport.width - right), height: Math.max(0, bottom - top) },
    ].filter((r) => r.width > 0 && r.height > 0);
}
