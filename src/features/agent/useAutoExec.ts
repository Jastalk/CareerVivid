/**
 * Per-tool "don't ask me again" preferences.
 *
 * Only `low_write` tools are eligible, and the SERVER enforces that
 * (`isAutoExecEligible` in functions/src/agent/tools.ts). Anything sent from
 * here that is not eligible is ignored server-side, so this list is a
 * convenience, never a privilege — a tampered localStorage cannot approve a
 * resume overwrite or a batch of job writes.
 *
 * Stored per user so a shared machine does not leak one person's preferences
 * into another's session.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

/** Mirrors the `low_write` tools in the server registry. */
export const AUTO_EXEC_TOOLS: ReadonlyArray<{ name: string; label: string; description: string }> = [
    {
        name: 'moveJobToStage',
        label: 'Move jobs between stages',
        description: 'Applied → Interviewing, and so on. Easy to undo in the tracker.',
    },
    {
        name: 'setJobTargets',
        label: 'Update job search targets',
        description: 'Target roles, locations, seniority, salary band.',
    },
    {
        name: 'updateCareerProfile',
        label: 'Update career profile',
        description: 'Your master CV text and target archetypes.',
    },
];

const key = (uid: string) => `cv_agent_autoexec_${uid}`;

export function useAutoExec() {
    const { currentUser } = useAuth();
    const [tools, setTools] = useState<string[]>([]);

    useEffect(() => {
        if (!currentUser) { setTools([]); return; }
        try {
            const raw = localStorage.getItem(key(currentUser.uid));
            setTools(raw ? JSON.parse(raw) : []);
        } catch {
            setTools([]);
        }
    }, [currentUser]);

    const toggle = useCallback((name: string) => {
        if (!currentUser) return;
        setTools((prev) => {
            const next = prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name];
            try { localStorage.setItem(key(currentUser.uid), JSON.stringify(next)); } catch { /* private mode */ }
            return next;
        });
    }, [currentUser]);

    return { tools, toggle };
}
