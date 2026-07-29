import { useEffect, useRef } from 'react';

/** Typing anywhere means the keystroke belongs to the field, not the game. */
const isTypingTarget = (target: EventTarget | null): boolean => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
};

/**
 * Binds a single key to opening a panel.
 *
 * Deliberately listens on `window` rather than through useQuestControls: these
 * panels must also open while a mission dialog is up, and the movement controls
 * are disabled at that point. Modifier combos are left alone so browser
 * shortcuts keep working.
 */
export const useQuestPanelKey = (code: string, open: boolean, onOpen: () => void) => {
    // Callers pass an inline arrow, so `onOpen` is a new function every render.
    // Held in a ref, it stays out of the dependency list without going stale —
    // listing it would rebind the listener on every render, and omitting it
    // outright would leave the handler calling last render's closure.
    const handler = useRef(onOpen);
    handler.current = onOpen;

    useEffect(() => {
        if (open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.code !== code) return;
            if (isTypingTarget(event.target)) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            event.preventDefault();
            handler.current();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [code, open]);
};
