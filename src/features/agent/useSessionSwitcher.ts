/**
 * Switching between open sessions without losing where you were.
 *
 * Opening a saved conversation used to overwrite whatever was on screen: the
 * in-progress thread was gone, and switching back re-fetched a stale copy from
 * the server that had none of the unsent local state.
 *
 * This keeps a snapshot per session in memory, so switching is a swap rather
 * than a reload — the same way a browser keeps a tab alive when you look at
 * another one. Sessions you have not opened this visit still load from the
 * server on first switch.
 */

import { useCallback, useRef, useState } from 'react';
import type { SessionSnapshot } from './useCareerAgent';

export interface OpenSession {
    id: string;
    title: string;
}

/** Sessions with no id yet — a brand-new thread before its first save. */
const DRAFT_ID = '__draft__';

interface Args {
    snapshot: () => SessionSnapshot;
    restore: (s: SessionSnapshot) => void;
    reset: () => void;
    /** Fetches a session the user has not opened this visit. */
    load: (id: string) => Promise<void>;
    /** The id the text agent currently reports, so a first save adopts it. */
    conversationId: string | null;
}

const EMPTY: SessionSnapshot = { messages: [], history: [], conversationId: null };

export function useSessionSwitcher({ snapshot, restore, reset, load, conversationId }: Args) {
    const [openSessions, setOpenSessions] = useState<OpenSession[]>([]);
    const [activeId, setActiveId] = useState<string>(DRAFT_ID);
    const snapshots = useRef<Map<string, SessionSnapshot>>(new Map());

    /**
     * A new thread adopts a real id the moment the server saves it. Without
     * this, its snapshot stays filed under the draft key and switching away
     * then back would lose the conversation.
     */
    const activeKey = activeId === DRAFT_ID && conversationId ? conversationId : activeId;

    const switchTo = useCallback(
        async (id: string, title?: string) => {
            if (id === activeKey) return;

            // Park the current session before touching anything.
            snapshots.current.set(activeKey, snapshot());

            const cached = snapshots.current.get(id);
            if (cached) {
                restore(cached);
            } else {
                // Not opened this visit — pull it from the server once.
                await load(id);
                snapshots.current.set(id, snapshot());
            }

            setActiveId(id);
            setOpenSessions((prev) =>
                prev.some((s) => s.id === id) ? prev : [...prev, { id, title: title ?? 'Conversation' }],
            );
        },
        [activeKey, snapshot, restore, load],
    );

    const startNew = useCallback(() => {
        snapshots.current.set(activeKey, snapshot());
        snapshots.current.delete(DRAFT_ID);
        reset();
        setActiveId(DRAFT_ID);
    }, [activeKey, snapshot, reset]);

    /** Close a tab without deleting the saved conversation. */
    const closeSession = useCallback(
        (id: string) => {
            snapshots.current.delete(id);
            setOpenSessions((prev) => prev.filter((s) => s.id !== id));
            if (id === activeKey) {
                reset();
                setActiveId(DRAFT_ID);
            }
        },
        [activeKey, reset],
    );

    /** Drop a session that no longer exists server-side. */
    const forget = useCallback(
        (id: string) => {
            snapshots.current.delete(id);
            setOpenSessions((prev) => prev.filter((s) => s.id !== id));
            if (id === activeKey) {
                snapshots.current.delete(DRAFT_ID);
                reset();
                setActiveId(DRAFT_ID);
            }
        },
        [activeKey, reset],
    );

    return { openSessions, activeId: activeKey, isDraft: activeKey === DRAFT_ID, switchTo, startNew, closeSession, forget, DRAFT_ID, EMPTY };
}
