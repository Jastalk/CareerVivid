/**
 * Drag the agent to a corner, and keep it there.
 *
 * Snapping rather than free positioning: the panel is tall, and a free-floating
 * one ends up half off-screen the moment the window is resized or a laptop is
 * plugged into a monitor. Four corners are always reachable and always fully
 * visible, and the choice survives that resize without any clamping logic.
 *
 * Dragging is deliberately not click-to-move. A stray click while reading
 * should not fling the panel across the screen, so the drag starts from a
 * handle that only appears on hover.
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const CORNER_KEY = 'cv_agent_drawer_corner';
const HINT_KEY = 'cv_agent_drag_hint_seen';
/** Set only by a drag. A corner we chose for them is not a corner they chose. */
const PINNED_KEY = 'cv_agent_corner_pinned';

/**
 * Inline offsets per corner, NOT Tailwind classes.
 *
 * Tailwind only ships classes it can see in the source at build time, so a
 * dynamically built `top-5`/`left-5` is purged and the element silently stays
 * where it was. Inline styles cannot be purged.
 */
export const CORNER_STYLE: Record<Corner, React.CSSProperties> = {
    'bottom-right': { bottom: 20, right: 20, top: 'auto', left: 'auto' },
    'bottom-left': { bottom: 20, left: 20, top: 'auto', right: 'auto' },
    'top-right': { top: 20, right: 20, bottom: 'auto', left: 'auto' },
    'top-left': { top: 20, left: 20, bottom: 'auto', right: 'auto' },
};

/** Which edge the resize handle belongs on, so it never faces off-screen. */
export const RESIZE_EDGE: Record<Corner, 'left' | 'right'> = {
    'bottom-right': 'left',
    'top-right': 'left',
    'bottom-left': 'right',
    'top-left': 'right',
};

const readCorner = (): Corner => {
    try {
        const stored = localStorage.getItem(CORNER_KEY);
        return stored === 'bottom-left' || stored === 'top-right' || stored === 'top-left'
            ? stored
            : 'bottom-right';
    } catch {
        return 'bottom-right';
    }
};

/*
 * Held outside React for the same reason the mode is: the agent moves the panel
 * from ABOVE this component, and this component remounts on every route change.
 */
let currentCorner: Corner = readCorner();
const cornerListeners = new Set<() => void>();

export const getCorner = (): Corner => currentCorner;

export function subscribeCorner(onChange: () => void): () => void {
    cornerListeners.add(onChange);
    return () => cornerListeners.delete(onChange);
}

/** `pinned` records that the USER put it here, which nothing else may override. */
export function moveCorner(corner: Corner, pinned: boolean): void {
    try {
        localStorage.setItem(CORNER_KEY, corner);
        if (pinned) localStorage.setItem(PINNED_KEY, '1');
    } catch {
        /* Non-persistent for this session. */
    }
    if (corner === currentCorner) return;
    currentCorner = corner;
    cornerListeners.forEach((fn) => fn());
}

/**
 * Get out of the way when the agent drops the user somewhere new.
 *
 * It lands bottom-left. The agent navigates you to look at something — a resume
 * it just changed, a job it just filed — and the thing worth looking at is the
 * document in the middle and the panel on the right. Sitting bottom-right, the
 * agent covered the very change it had just announced.
 *
 * A corner the user dragged to is never overridden. They have already answered
 * the question this function is guessing at.
 */
export function parkOutOfTheWay(): void {
    try {
        if (localStorage.getItem(PINNED_KEY) === '1') return;
    } catch {
        return;
    }
    moveCorner('bottom-left', false);
}

export function useDrawerCorner() {
    const corner = useSyncExternalStore(subscribeCorner, getCorner, getCorner);
    const [dragging, setDragging] = useState(false);
    /** Live pointer position while dragging, so the panel follows the cursor. */
    const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
    const [hintSeen, setHintSeen] = useState(() => {
        try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; }
    });
    const draggingRef = useRef(false);

    // Every call site of this is a drag landing, so it pins.
    const setCorner = useCallback((c: Corner) => moveCorner(c, true), []);

    const dismissHint = useCallback(() => {
        try { localStorage.setItem(HINT_KEY, '1'); } catch { /* session only */ }
        setHintSeen(true);
    }, []);

    /**
     * Start a drag from the handle.
     *
     * Listeners go on window, not the handle: once the pointer leaves the small
     * grip — which it does immediately on any real drag — a handle-bound
     * listener stops firing and the panel sticks to the cursor's last position.
     */
    const startDrag = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
        setDragging(true);
        dismissHint();

        const onMove = (ev: PointerEvent) => setDragPos({ x: ev.clientX, y: ev.clientY });

        const onUp = (ev: PointerEvent) => {
            draggingRef.current = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);

            // Snap to whichever corner the pointer ended up nearest.
            const vertical = ev.clientY < window.innerHeight / 2 ? 'top' : 'bottom';
            const horizontal = ev.clientX < window.innerWidth / 2 ? 'left' : 'right';
            setCorner(`${vertical}-${horizontal}` as Corner);

            setDragging(false);
            setDragPos(null);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [setCorner, dismissHint]);

    // A drag interrupted by unmount would otherwise leave listeners attached.
    useEffect(() => () => { draggingRef.current = false; }, []);

    return { corner, setCorner, dragging, dragPos, startDrag, hintSeen, dismissHint, draggingRef };
}
