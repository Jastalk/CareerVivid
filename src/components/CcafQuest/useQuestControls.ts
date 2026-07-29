import { useEffect, useMemo, useRef } from 'react';

export interface MoveVector {
    /** -1 (left) … 1 (right) */
    x: number;
    /** -1 (back) … 1 (forward) */
    z: number;
}

export interface QuestControls {
    /** Read inside useFrame — a ref so movement never triggers React renders. */
    move: React.MutableRefObject<MoveVector>;
    /** Set by the on-screen joystick on touch devices. */
    setJoystick: (vector: MoveVector) => void;
    /** True while any input is active — used to play the walk animation. */
    isMoving: () => boolean;
    /** Fires when the player presses the interact key (E / Space). */
    onInteract: React.MutableRefObject<(() => void) | null>;
}

const KEY_MAP: Record<string, Partial<MoveVector>> = {
    KeyW: { z: 1 },
    ArrowUp: { z: 1 },
    KeyS: { z: -1 },
    ArrowDown: { z: -1 },
    KeyA: { x: -1 },
    ArrowLeft: { x: -1 },
    KeyD: { x: 1 },
    ArrowRight: { x: 1 },
};

/**
 * Keyboard + joystick input for the quest. Values live in refs so the render
 * loop can poll them every frame without re-rendering React.
 */
export const useQuestControls = (enabled: boolean): QuestControls => {
    const keys = useRef<Record<string, boolean>>({});
    const joystick = useRef<MoveVector>({ x: 0, z: 0 });
    const move = useRef<MoveVector>({ x: 0, z: 0 });
    const onInteract = useRef<(() => void) | null>(null);

    const recompute = () => {
        let x = joystick.current.x;
        let z = joystick.current.z;
        for (const [code, delta] of Object.entries(KEY_MAP)) {
            if (!keys.current[code]) continue;
            x += delta.x ?? 0;
            z += delta.z ?? 0;
        }
        // Clamp so diagonal keyboard input isn't faster than a single axis.
        const length = Math.hypot(x, z);
        if (length > 1) {
            x /= length;
            z /= length;
        }
        move.current = { x, z };
    };

    useEffect(() => {
        if (!enabled) {
            keys.current = {};
            move.current = { x: 0, z: 0 };
            return;
        }

        const isTypingTarget = (target: EventTarget | null) => {
            const el = target as HTMLElement | null;
            if (!el) return false;
            return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
        };

        const down = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) return;
            if (event.code === 'KeyE' || event.code === 'Space') {
                // Space would otherwise scroll the page behind the canvas.
                event.preventDefault();
                onInteract.current?.();
                return;
            }
            if (!KEY_MAP[event.code]) return;
            event.preventDefault();
            keys.current[event.code] = true;
            recompute();
        };

        const up = (event: KeyboardEvent) => {
            if (!KEY_MAP[event.code]) return;
            keys.current[event.code] = false;
            recompute();
        };

        // Releasing a key while the tab is hidden never fires keyup, which
        // would leave the character walking forever.
        const clear = () => {
            keys.current = {};
            recompute();
        };

        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', clear);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', clear);
        };
    }, [enabled]);

    return useMemo(() => ({
        move,
        setJoystick: (vector: MoveVector) => {
            joystick.current = vector;
            recompute();
        },
        isMoving: () => Math.hypot(move.current.x, move.current.z) > 0.05,
        onInteract,
    }), []);
};
