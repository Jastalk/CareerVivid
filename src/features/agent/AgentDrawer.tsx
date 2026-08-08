/**
 * The docked Career Agent drawer.
 *
 * Renders on authenticated pages. It replaces `src/components/ChatBot.tsx`,
 * which was mounted on /dashboard only and had no tools.
 */

import React, { useState } from 'react';
import { Sparkles, X, Maximize2 } from 'lucide-react';
// No <Router> in this app — see src/utils/navigation.ts. The current path is
// passed down from App.tsx, which already recomputes it on popstate.
import { navigate } from '../../utils/navigation';
import { CareerAgentPanel } from './CareerAgentPanel';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Routes where a floating panel would obstruct the actual work.
 *
 * /quest is deliberately NOT here: the coding and system-design rounds open as
 * overlays on that route, and the whole point is to keep coaching while the
 * user works. The drawer sits at z-[60] so it stays above those z-50 modals.
 */
const SUPPRESSED = [/^\/agent/, /^\/interview-studio/, /^\/whiteboard/, /^\/editor\/[^/]+\/preview/];

export const AgentDrawer: React.FC<{ path: string }> = ({ path }) => {
    const [open, setOpen] = useState(false);
    const { currentUser } = useAuth();

    if (!currentUser) return null;
    if (SUPPRESSED.some((re) => re.test(path))) return null;

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open Career Agent"
                className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 dark:bg-white dark:text-gray-900"
            >
                <Sparkles className="h-4 w-4 text-amber-400 dark:text-amber-500" />
                Career Agent
            </button>
        );
    }

    return (
        <aside className="fixed bottom-0 right-0 z-[60] flex h-[min(38rem,88vh)] w-[min(26rem,100vw)] flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:bottom-5 sm:right-5 sm:rounded-2xl dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-end gap-1 border-b border-gray-200 px-2 py-1.5 dark:border-gray-800">
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
