/**
 * Career Agent client.
 *
 * Holds conversation state and talks to the server-side loop. It deliberately
 * does NOT run the loop, hold tools, or touch a model key — all of that is in
 * functions/src/agent/careerAgent.ts.
 *
 * Approval works by ID: the server persisted the proposed arguments, and this
 * hook only ever sends back the proposal's id plus approve/reject. It cannot
 * change what gets written, which is what makes the approval card meaningful.
 */

import { useCallback, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';

export interface ProposalDiff {
    kind: 'create' | 'update' | 'batch';
    entity: 'resume' | 'job' | 'profile' | 'session';
    changes: Array<{ label: string; before?: string; after: string }>;
    items?: string[];
}

export interface Proposal {
    id: string;
    tool: string;
    summary: string;
    diff: ProposalDiff;
    /** Set once resolved, so the card can render its outcome instead of vanishing. */
    outcome?: 'approved' | 'rejected' | 'failed';
    error?: string;
}

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    proposals?: Proposal[];
    pending?: boolean;
}

/** Client-side effects a tool can request, e.g. navigation or opening voice. */
export interface AgentEffect {
    navigate?: string;
    reason?: string;
    route?: string;
    startVoice?: boolean;
    purpose?: string;
    estimatedMinutes?: number;
}

interface TurnResponse {
    text: string;
    proposals: Proposal[];
    effects: AgentEffect[];
    taskId: string;
    credits: { free: boolean; freeTurnsRemaining: number; creditsRemaining: number };
}

const REGION = 'us-west1';
const uid = () => Math.random().toString(36).slice(2, 10);

export function useCareerAgent(opts: {
    route: string;
    entity?: { type: 'resume' | 'job' | 'course'; id: string };
    /** Tools the user has opted into auto-executing. Server ignores ineligible ones. */
    autoExecTools?: string[];
    onEffect?: (effect: AgentEffect) => void;
}) {
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credits, setCredits] = useState<TurnResponse['credits'] | null>(null);

    // Sent back each turn so the model keeps continuity without the server
    // storing conversation state.
    const historyRef = useRef<Array<{ role: string; parts: Array<{ text: string }> }>>([]);

    const send = useCallback(
        async (text: string, attachment?: { type: 'parsed_resume'; data: unknown }) => {
            const trimmed = text.trim();
            if ((!trimmed && !attachment) || isThinking) return;
            if (!currentUser) {
                setError('Sign in to use the Career Agent.');
                return;
            }

            setError(null);
            const userMsg: AgentMessage = { id: uid(), role: 'user', text: trimmed };
            const placeholder: AgentMessage = { id: uid(), role: 'assistant', text: '', pending: true };
            setMessages((m) => [...m, userMsg, placeholder]);
            setIsThinking(true);

            try {
                const fn = httpsCallable<unknown, TurnResponse>(getFunctions(undefined, REGION), 'careerAgentTurn');
                const { data } = await fn({
                    message: trimmed,
                    route: opts.route,
                    entity: opts.entity,
                    history: historyRef.current,
                    autoExecTools: opts.autoExecTools ?? [],
                    attachment,
                });

                historyRef.current = [
                    ...historyRef.current,
                    { role: 'user', parts: [{ text: attachment ? `${trimmed} [uploaded a resume]` : trimmed }] },
                    { role: 'model', parts: [{ text: data.text }] },
                ].slice(-20);

                setCredits(data.credits);
                setMessages((m) =>
                    m.map((msg) =>
                        msg.id === placeholder.id
                            ? { ...msg, text: data.text, proposals: data.proposals, pending: false }
                            : msg,
                    ),
                );

                for (const effect of data.effects ?? []) opts.onEffect?.(effect);
            } catch (e: any) {
                const msg =
                    e?.message === 'credit_limit_reached'
                        ? "You're out of AI credits for this month."
                        : e?.message ?? 'Something went wrong.';
                setError(msg);
                setMessages((m) => m.filter((x) => x.id !== placeholder.id));
            } finally {
                setIsThinking(false);
            }
        },
        [currentUser, isThinking, opts],
    );

    const resolve = useCallback(
        async (proposalId: string, approve: boolean) => {
            const mark = (outcome: Proposal['outcome'], err?: string) =>
                setMessages((m) =>
                    m.map((msg) => ({
                        ...msg,
                        proposals: msg.proposals?.map((p) =>
                            p.id === proposalId ? { ...p, outcome, error: err } : p,
                        ),
                    })),
                );

            try {
                const fn = httpsCallable<unknown, { status: string; result?: AgentEffect }>(
                    getFunctions(undefined, REGION),
                    'careerAgentResolve',
                );
                const { data } = await fn({ proposalId, approve });
                mark(approve ? 'approved' : 'rejected');

                if (approve && data.result) opts.onEffect?.(data.result);

                // Tell the model what happened so it can offer the next step
                // rather than re-proposing what was just applied.
                if (approve) {
                    historyRef.current.push({
                        role: 'user',
                        parts: [{ text: `[system] The user approved proposal ${proposalId}. It was applied successfully.` }],
                    });
                }
            } catch (e: any) {
                mark('failed', e?.message ?? 'Could not apply the change.');
            }
        },
        [opts],
    );

    const reset = useCallback(() => {
        historyRef.current = [];
        setMessages([]);
        setError(null);
    }, []);

    return { messages, send, resolve, reset, isThinking, error, credits };
}
