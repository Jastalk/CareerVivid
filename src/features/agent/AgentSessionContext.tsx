/**
 * One agent session, shared by every surface that renders it.
 *
 * The drawer and the /agent workspace used to each call the hooks themselves,
 * so they were two independent conversations wearing the same UI. Expanding
 * from one to the other unmounted the first and mounted a blank second — the
 * user watched their context disappear, and a live call would have been torn
 * down mid-sentence.
 *
 * Holding the state here instead means "expand" is purely a layout change.
 * Mounted once, above the router switch, so navigating between routes does not
 * reset it either.
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { navigate } from '../../utils/navigation';
import { useCareerAgent, type AgentEffect } from './useCareerAgent';
import { useLiveCareerAgent } from './useLiveCareerAgent';
import { useAutoExec } from './useAutoExec';

type TextAgent = ReturnType<typeof useCareerAgent>;
type LiveAgent = ReturnType<typeof useLiveCareerAgent>;

interface AgentSession {
    text: TextAgent;
    live: LiveAgent;
    autoExec: ReturnType<typeof useAutoExec>;
    route: string;
}

const Ctx = createContext<AgentSession | null>(null);

export const AgentSessionProvider: React.FC<{ path: string; children: ReactNode }> = ({
    path,
    children,
}) => {
    const handleEffect = (effect: AgentEffect) => {
        const target = effect.navigate ?? effect.route;
        // Same-origin app paths only. The tool validates this server-side too;
        // re-checking means a compromised response still cannot redirect.
        if (target && target.startsWith('/') && !target.startsWith('//')) {
            navigate(target);
        }
    };

    const autoExec = useAutoExec();
    const live = useLiveCareerAgent({ route: path, onEffect: handleEffect });
    const text = useCareerAgent({ route: path, autoExecTools: autoExec.tools, onEffect: handleEffect });

    const value = useMemo(
        () => ({ text, live, autoExec, route: path }),
        [text, live, autoExec, path],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAgentSession(): AgentSession {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useAgentSession must be used inside <AgentSessionProvider>.');
    return ctx;
}
