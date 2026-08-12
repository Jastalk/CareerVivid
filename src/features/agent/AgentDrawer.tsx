/**
 * The docked Career Agent drawer.
 *
 * Renders on authenticated pages. It replaces `src/components/ChatBot.tsx`,
 * which was mounted on /dashboard only and had no tools.
 */

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Sparkles, X, Maximize2, Minus, GripVertical, GripHorizontal, Mic, MicOff, PhoneOff } from 'lucide-react';
// No <Router> in this app — see src/utils/navigation.ts. The current path is
// passed down from App.tsx, which already recomputes it on popstate.
import { navigate } from '../../utils/navigation';
import { CareerAgentPanel } from './CareerAgentPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useAgentSession } from './AgentSessionContext';
import { useDrawerCorner, CORNER_STYLE, RESIZE_EDGE } from './useDrawerCorner';
import { getDrawerMode, setDrawerMode, subscribeDrawerMode, type DrawerMode } from './drawerMode';

/**
 * Routes where a floating panel would obstruct the actual work.
 *
 * /quest is deliberately NOT here: the coding and system-design rounds open as
 * overlays on that route, and the whole point is to keep coaching while the
 * user works. The drawer sits at z-[60] so it stays above those z-50 modals.
 */
const SUPPRESSED = [/^\/agent/, /^\/interview-studio/, /^\/whiteboard/, /^\/editor\/[^/]+\/preview/];

const MIN_WIDTH = 320;
const MAX_WIDTH = 720;
const WIDTH_KEY = 'cv_agent_drawer_width';
const CLOSED_AT_KEY = 'cv_agent_closed_at';
const REOPEN_HINT_MS = 6_000;

/*
 * closed → the pill. open → the full drawer. mini → a compact card that keeps
 * the tail of the conversation visible without eating the screen — for working
 * on a whiteboard with the agent still in the corner of your eye.
 *
 * The mode itself lives in ./drawerMode, outside React: this component remounts
 * per route (it sits inside RouteSuspense), and the agent's own navigation has
 * to be able to reopen it from above.
 */


/**
 * The grip you drag the agent by.
 *
 * Hidden until hover so it never competes with the conversation, and separate
 * from the panel body on purpose: click-to-move would fling the panel across
 * the screen on a stray click while reading.
 *
 * The bubble appears once, the first time someone hovers, and never again —
 * a permanent "you can drag me" label is clutter after the first day.
 */
const DragHandle: React.FC<{ onPointerDown: (e: React.PointerEvent) => void; hintSeen: boolean }> = ({
    onPointerDown,
    hintSeen,
}) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onPointerDown={onPointerDown}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            role="button"
            aria-label="Drag to move the Career Agent"
            title="Drag to move"
            className="group absolute left-1/2 top-0 z-10 flex h-4 w-16 -translate-x-1/2 cursor-grab items-center justify-center active:cursor-grabbing"
        >
            <GripHorizontal className="h-3 w-3 text-transparent transition-colors group-hover:text-[var(--cv-text-muted)]" />
            {hovered && !hintSeen && (
                <span className="pointer-events-none absolute top-5 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg dark:bg-white dark:text-gray-900">
                    Drag here to move me to any corner
                </span>
            )}
        </div>
    );
};

export const AgentDrawer: React.FC<{ path: string }> = ({ path }) => {
    const mode = useSyncExternalStore(subscribeDrawerMode, getDrawerMode, getDrawerMode);
    const setMode = (m: DrawerMode) => setDrawerMode(m);
    const { text, live } = useAgentSession();
    const [width, setWidth] = useState<number>(() => {
        const stored = Number(localStorage.getItem(WIDTH_KEY));
        return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : 416;
    });
    const draggingRef = useRef(false);
    const rootRef = useRef<HTMLElement | null>(null);
    const { currentUser } = useAuth();
    const { corner, dragging, dragPos, startDrag, hintSeen, dismissHint } = useDrawerCorner();
    /**
     * Shown briefly on close: dismissing a companion should not feel like
     * losing it.
     *
     * Backed by a timestamp rather than component state because this component
     * remounts when the drawer closes — plain state is wiped before the hint
     * can render. `mode` and `width` only survive for the same reason.
     */
    const [closedAt, setClosedAt] = useState<number>(() => Number(localStorage.getItem(CLOSED_AT_KEY)) || 0);
    const showReopenHint = closedAt > 0 && Date.now() - closedAt < REOPEN_HINT_MS;

    const closeWithHint = () => {
        const now = Date.now();
        localStorage.setItem(CLOSED_AT_KEY, String(now));
        setClosedAt(now);
        setMode('closed');
    };

    // Re-render once the window lapses, so the toast disappears on its own.
    useEffect(() => {
        if (!showReopenHint) return;
        const remaining = REOPEN_HINT_MS - (Date.now() - closedAt);
        const id = window.setTimeout(() => setClosedAt(0), Math.max(0, remaining));
        return () => window.clearTimeout(id);
    }, [showReopenHint, closedAt]);

    // While dragging the panel follows the cursor; on release it snaps.
    const dragStyle = dragPos
        ? { position: 'fixed' as const, left: dragPos.x - 40, top: dragPos.y - 20, right: 'auto', bottom: 'auto' }
        : undefined;

    // Cmd/Ctrl+K toggles, Esc closes — the panel is used mid-task, and reaching
    // for the mouse breaks the thing it is meant to support.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setDrawerMode(getDrawerMode() === 'open' ? 'closed' : 'open');
            } else if (e.key === 'Escape' && !draggingRef.current) {
                // Only when the panel itself has focus. Escape is load-bearing
                // elsewhere — on the whiteboard it finishes a multi-point arrow,
                // and stealing it closed the agent instead of ending the line.
                const target = e.target as Node | null;
                if (!target || !rootRef.current?.contains(target)) return;
                setDrawerMode('closed');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Drag from the left edge. Listeners live on window, not the handle, so the
    // drag survives the pointer moving faster than React re-renders.
    const startResize = (e: React.PointerEvent) => {
        e.preventDefault();
        draggingRef.current = true;
        const startX = e.clientX;
        const startWidth = width;

        const onMove = (ev: PointerEvent) => {
            const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (startX - ev.clientX)));
            setWidth(next);
        };
        const onUp = () => {
            draggingRef.current = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            setWidth((w) => { localStorage.setItem(WIDTH_KEY, String(w)); return w; });
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    if (!currentUser) return null;
    if (SUPPRESSED.some((re) => re.test(path))) return null;

    if (mode === 'closed') {
        return (
            <>
                {/* Says where it went. Dismissing a companion should not feel
                    like losing it — and the sidebar entry is the durable answer
                    once this toast is gone. */}
                {showReopenHint && (
                    <div
                        style={{ ...CORNER_STYLE[corner], marginBottom: 64 }}
                        className="fixed z-[61] max-w-[15rem] rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-xl dark:bg-white dark:text-gray-900"
                    >
                        Career Agent is hidden. Reopen it from the sidebar, or press ⌘K.
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => { localStorage.removeItem(CLOSED_AT_KEY); setClosedAt(0); setMode('open'); }}
                    aria-label="Open Career Agent"
                    title="Career Agent (⌘K)"
                    style={CORNER_STYLE[corner]}
                    className="fixed z-[60] flex items-center gap-2 rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 dark:bg-white dark:text-gray-900"
                >
                    <Sparkles className="h-4 w-4 text-amber-400 dark:text-amber-500" />
                    Career Agent
                </button>
            </>
        );
    }

    if (mode === 'mini') {
        const last = text.messages[text.messages.length - 1];
        const onCall = live.status === 'live' || live.status === 'connecting';
        return (
            <aside
                ref={rootRef}
                style={dragStyle ?? CORNER_STYLE[corner]}
                className={`fixed z-[60] w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 ${dragging ? 'cursor-grabbing opacity-90' : ''}`}
            >
                <DragHandle onPointerDown={startDrag} hintSeen={hintSeen} />
                <div className="flex items-center gap-1.5 border-b border-gray-100 px-2.5 py-1.5 dark:border-gray-800/60">
                    <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                        Career Agent
                        {onCall && (
                            <span className="ml-1.5 font-normal text-[var(--cv-text-muted)]">
                                {Math.floor(live.elapsedSeconds / 60)}:{String(live.elapsedSeconds % 60).padStart(2, '0')}
                                {live.muted && <span className="ml-1 text-red-500">muted</span>}
                            </span>
                        )}
                    </span>
                    {live.status === 'live' && (
                        <>
                            <button type="button" onClick={live.toggleMute} aria-pressed={live.muted}
                                title={live.muted ? 'Unmute' : 'Mute'}
                                className={`rounded-md p-1 ${live.muted ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'}`}>
                                {live.muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                            </button>
                            <button type="button" onClick={() => void live.stop()} title="End the call"
                                className="rounded-md bg-red-600 p-1 text-white hover:bg-red-500">
                                <PhoneOff className="h-3 w-3" />
                            </button>
                        </>
                    )}
                    <button type="button" onClick={() => setMode('open')} title="Expand"
                        className="rounded-md p-1 text-gray-400 hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10">
                        <Maximize2 className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={closeWithHint} title="Close"
                        className="rounded-md p-1 text-gray-400 hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10">
                        <X className="h-3 w-3" />
                    </button>
                </div>
                {/* The conversation tail. Click anywhere on it to expand. */}
                <button
                    type="button"
                    onClick={() => setMode('open')}
                    title="Expand the conversation"
                    className="block w-full px-3 py-2 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                    {last ? (
                        <p className="line-clamp-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                            {last.role === 'user' && <span className="font-semibold text-gray-400">You: </span>}
                            {last.text || (text.isThinking ? '…' : '')}
                        </p>
                    ) : (
                        <p className="text-xs text-gray-400">No messages yet — tap to start.</p>
                    )}
                </button>
            </aside>
        );
    }

    return (
        <aside
            ref={rootRef}
            style={{ width: `min(${width}px, 100vw)`, ...(dragStyle ?? CORNER_STYLE[corner]) }}
            className={`fixed z-[60] flex h-[min(38rem,88vh)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950 ${dragging ? 'cursor-grabbing opacity-90' : ''}`}
        >
            <DragHandle onPointerDown={startDrag} hintSeen={hintSeen} />
            <div
                onPointerDown={startResize}
                title="Drag to resize"
                role="separator"
                aria-orientation="vertical"
                className={`group absolute top-0 hidden h-full w-2 cursor-col-resize items-center justify-center hover:bg-[var(--cv-action-soft-bg)] sm:flex ${RESIZE_EDGE[corner] === 'left' ? 'left-0' : 'right-0'}`}
            >
                <GripVertical className="h-4 w-4 text-transparent transition-colors group-hover:text-[var(--cv-text-muted)]" />
            </div>
            <div className="flex items-center justify-end gap-1 border-b border-gray-200 px-2 py-1.5 dark:border-gray-800">
                <button
                    type="button"
                    onClick={() => setMode('mini')}
                    title="Minimize — keep the conversation in view"
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10"
                >
                    <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    // Deliberately does NOT close the drawer. /agent suppresses it
                    // already, and marking it closed meant that leaving the
                    // workspace — including when a tool navigated the user to a
                    // resume — dropped them somewhere new with the agent reduced
                    // to a pill and the conversation out of sight.
                    onClick={() => navigate('/agent')}
                    title="Open full screen"
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10"
                >
                    <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={closeWithHint}
                    title="Close"
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="min-h-0 flex-1">
                <CareerAgentPanel variant="drawer" route={path} />
            </div>
        </aside>
    );
};

export default AgentDrawer;
