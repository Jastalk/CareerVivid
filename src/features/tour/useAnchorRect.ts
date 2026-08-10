/**
 * Track where a `data-tour` control is on screen, live.
 *
 * The spotlight has to stay glued to a control that moves for reasons this
 * module cannot subscribe to: panels sliding open, the preview scrolling, a
 * template re-render changing a toolbar's height. Rather than guess at every
 * cause, sample the rect on an animation frame while the tour is active. It is
 * one getBoundingClientRect per frame against a single element — far cheaper
 * than being wrong, and it stops the moment the tour does.
 *
 * The element is re-queried each frame on purpose: React remounts controls when
 * a panel opens, and a cached node would be detached and still report its old
 * position.
 */

import { useEffect, useState } from 'react';

export interface AnchorRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const same = (a: AnchorRect | null, b: AnchorRect | null): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        Math.abs(a.top - b.top) < 0.5 &&
        Math.abs(a.left - b.left) < 0.5 &&
        Math.abs(a.width - b.width) < 0.5 &&
        Math.abs(a.height - b.height) < 0.5
    );
};

export const readAnchorRect = (anchor: string): AnchorRect | null => {
    const el = document.querySelector(`[data-tour="${anchor}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // A control inside a collapsed panel still exists but has no box. Treating
    // that as "not found" keeps the spotlight from opening on a zero-size hole.
    if (r.width < 1 || r.height < 1) return null;
    return { top: r.top, left: r.left, width: r.width, height: r.height };
};

export function useAnchorRect(anchor: string | undefined): AnchorRect | null {
    const [rect, setRect] = useState<AnchorRect | null>(() => (anchor ? readAnchorRect(anchor) : null));

    useEffect(() => {
        if (!anchor) {
            setRect(null);
            return;
        }

        let frame = 0;
        let current: AnchorRect | null = null;

        const tick = () => {
            const next = readAnchorRect(anchor);
            if (!same(current, next)) {
                current = next;
                setRect(next);
            }
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [anchor]);

    return rect;
}
