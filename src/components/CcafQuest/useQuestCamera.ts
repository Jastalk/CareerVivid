import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/** Past this the framing reads as a map rather than a chase camera. */
const OVERVIEW_THRESHOLD = 0.55;
const WHEEL_SENSITIVITY = 0.0012;
const DRAG_SENSITIVITY = 0.006;

/**
 * The player's control over the camera: scroll to pull back into the city
 * overview, drag to orbit around the character.
 *
 * Both are plain numbers handed to <Player>, which does the actual easing —
 * this hook only owns the input. Frozen while a mission dialog is open so a
 * scroll inside the dialog does not fly the camera away behind it.
 */
export const useQuestCamera = (frozen: boolean) => {
    // 0 = over the shoulder, 1 = whole-city overview.
    const [zoom, setZoom] = useState(0);
    const [orbit, setOrbit] = useState(0);
    const dragOrigin = useRef<{ x: number; orbit: number } | null>(null);

    const onWheel = useCallback((event: React.WheelEvent) => {
        if (frozen) return;
        setZoom(z => THREE.MathUtils.clamp(z + event.deltaY * WHEEL_SENSITIVITY, 0, 1));
    }, [frozen]);

    const onPointerDown = useCallback((event: React.PointerEvent) => {
        if (frozen) return;
        dragOrigin.current = { x: event.clientX, orbit };
    }, [frozen, orbit]);

    const onPointerMove = useCallback((event: React.PointerEvent) => {
        const origin = dragOrigin.current;
        if (!origin) return;
        setOrbit(origin.orbit + (event.clientX - origin.x) * DRAG_SENSITIVITY);
    }, []);

    const endDrag = useCallback(() => { dragOrigin.current = null; }, []);

    const toggleOverview = useCallback(
        () => setZoom(z => (z > OVERVIEW_THRESHOLD ? 0 : 1)),
        [],
    );

    const nudgeOrbit = useCallback(() => setOrbit(o => o + Math.PI / 4), []);

    return useMemo(() => ({
        zoom,
        orbit,
        isOverview: zoom > OVERVIEW_THRESHOLD,
        toggleOverview,
        nudgeOrbit,
        /** Spread onto the wrapper that should receive the gestures. */
        handlers: {
            onWheel,
            onPointerDown,
            onPointerMove,
            onPointerUp: endDrag,
            onPointerLeave: endDrag,
        },
    }), [zoom, orbit, toggleOverview, nudgeOrbit, onWheel, onPointerDown, onPointerMove, endDrag]);
};
