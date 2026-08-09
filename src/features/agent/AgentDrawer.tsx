/**
 * The docked Career Agent drawer.
 *
 * Renders on authenticated pages. It replaces `src/components/ChatBot.tsx`,
 * which was mounted on /dashboard only and had no tools.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Maximize2, Minus, GripVertical, Mic, MicOff, PhoneOff } from 'lucide-react';
// No <Router> in this app — see src/utils/navigation.ts. The current path is
// passed down from App.tsx, which already recomputes it on popstate.
import { navigate } from '../../utils/navigation';
import { CareerAgentPanel } from './CareerAgentPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useAgentSession } from './AgentSessionContext';

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
const MODE_KEY = 'cv_agent_drawer_mode';

/**
 * closed → the pill. open → the full drawer. mini → a compact card that keeps
 * the tail of the conversation visible without eating the screen — for working
 * on a whiteboard with the agent still in the corner of your eye.
 *
 * Persisted so it survives route changes: this component remounts per route
 * (it lives inside RouteSuspense), and a companion that reset to a pill on
 * every navigation would not feel like a companion.
 */
type DrawerMode = 'closed' | 'open' | 'mini';

export const AgentDrawer: React.FC<{ path: string }> = ({ path }) => {
    const [mode, setModeState] = useState<DrawerMode>(() => {
        const stored = localStorage.getItem(MODE_KEY);
        return stored === 'open' || stored === 'mini' ? stored : 'closed';
    });
    const setMode = (m: DrawerMode) => {
        localStorage.setItem(MODE_KEY, m);
        setModeState(m);
    };
    const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof v === 'function' ? v(mode === 'open') : v;
        setMode(next ? 'open' : 'closed');
    };
    const { text, live } = useAgentSession();
    const [width, setWidth] = useState<number>(() => {
        const stored = Number(localStorage.getItem(WIDTH_KEY));
        return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : 416;
    });
    const draggingRef = useRef(false);
    const { currentUser } = useAuth();

    // Cmd/Ctrl+K toggles, Esc closes — the panel is used mid-task, and reaching
    // for the mouse breaks the thing it is meant to support.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setModeState((m) => {
                    const next = m === 'open' ? 'closed' : 'open';
                    localStorage.setItem(MODE_KEY, next);
                    return next;
                });
            } else if (e.key === 'Escape' && !draggingRef.current) {
                setModeState((m) => {
                    if (m === 'closed') return m;
                    localStorage.setItem(MODE_KEY, 'closed');
                    return 'closed';
                });
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
            <button
                type="button"
                onClick={() => setMode('open')}
                aria-label="Open Career Agent"
                title="Career Agent (⌘K)"
                className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 dark:bg-white dark:text-gray-900"
            >
                <Sparkles className="h-4 w-4 text-amber-400 dark:text-amber-500" />
                Career Agent
            </button>
        );
    }

    if (mode === 'mini') {
        const last = text.messages[text.messages.length - 1];
        const onCall = live.status === 'live' || live.status === 'connecting';
        return (
            <aside className="fixed bottom-5 right-5 z-[60] w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
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
                    <button type="button" onClick={() => setMode('closed')} title="Close"
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
            style={{ width: `min(${width}px, 100vw)` }}
            className="fixed bottom-0 right-0 z-[60] flex h-[min(38rem,88vh)] flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:bottom-5 sm:right-5 sm:rounded-2xl dark:border-gray-800 dark:bg-gray-950"
        >
            <div
                onPointerDown={startResize}
                title="Drag to resize"
                role="separator"
                aria-orientation="vertical"
                className="group absolute left-0 top-0 hidden h-full w-2 cursor-col-resize items-center justify-center hover:bg-[var(--cv-action-soft-bg)] sm:flex"
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
                    onClick={() => {
                        setOpen(false);
                        navigate('/agent');
                    }}
                    title="Open full screen"
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10"
                >
                    <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
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
