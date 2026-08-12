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

import React, { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { navigate } from '../../utils/navigation';
import { useCareerAgent, type AgentEffect } from './useCareerAgent';
import { useLiveCareerAgent } from './useLiveCareerAgent';
import { useAutoExec } from './useAutoExec';
import { useSessionSwitcher } from './useSessionSwitcher';
import { followUserToRoute } from './drawerMode';

type TextAgent = ReturnType<typeof useCareerAgent>;
type LiveAgent = ReturnType<typeof useLiveCareerAgent>;

interface AgentSession {
    text: TextAgent;
    live: LiveAgent;
    autoExec: ReturnType<typeof useAutoExec>;
    sessions: ReturnType<typeof useSessionSwitcher>;
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
            // The conversation travels with them. The agent explains what it is
            // doing and then moves the user; arriving on the new page with the
            // panel collapsed leaves a change on screen with the sentence that
            // justified it nowhere to be found.
            followUserToRoute();
            navigate(target);
        }
    };

    const autoExec = useAutoExec();
    const text = useCareerAgent({ route: path, autoExecTools: autoExec.tools, onEffect: handleEffect });

    // Voice turns land in the text agent's timeline: one session is one
    // conversation whether the user is speaking or typing at that moment.
    const textRef = useRef(text);
    textRef.current = text;
    const live = useLiveCareerAgent({
        route: path,
        onEffect: handleEffect,
        onVoiceTurn: (role, t) =>
            void textRef.current.appendVoiceTurn(role === 'agent' ? 'assistant' : 'user', t),
    });

    const sessions = useSessionSwitcher({
        snapshot: text.snapshot,
        restore: text.restore,
        reset: text.reset,
        load: text.openConversation,
        conversationId: text.conversationId,
    });

    const value = useMemo(
        () => ({ text, live, autoExec, sessions, route: path }),
        [text, live, autoExec, sessions, path],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAgentSession(): AgentSession {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useAgentSession must be used inside <AgentSessionProvider>.');
    return ctx;
}
