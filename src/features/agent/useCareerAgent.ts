/**
 * Career Agent client — streaming text turns, saved history.
 *
 * Talks to `careerAgentStream` over SSE rather than the buffered callable, so
 * text appears as the model produces it. A multi-step turn can run tool calls
 * for many seconds; buffering meant the user stared at a blank panel and
 * concluded it was broken.
 *
 * It does NOT run the loop, hold tools, or touch a model key — all of that is
 * server-side in functions/src/agent/turnRunner.ts.
 *
 * Approval works by ID: the server persisted the proposed arguments, and this
 * hook only sends back the proposal's id plus approve/reject. It cannot change
 * what gets written, which is what makes the approval card meaningful.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';
import { readWorkspace } from './workspaceSnapshot';

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
    /** Set once resolved, so the card renders its outcome instead of vanishing. */
    outcome?: 'approved' | 'rejected' | 'failed';
    error?: string;
}

/** A read-tool result the panel renders as a card rather than leaving as prose. */
export interface AgentCard {
    kind: string;
    [key: string]: unknown;
}

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    proposals?: Proposal[];
    cards?: AgentCard[];
    streaming?: boolean;
    /** Which surface produced it. One session is one timeline across both. */
    via?: 'text' | 'voice';
}

/** Everything needed to put a session back exactly as the user left it. */
export interface SessionSnapshot {
    messages: AgentMessage[];
    history: Array<{ role: string; parts: Array<{ text: string }> }>;
    conversationId: string | null;
}

export interface AgentEffect {
    navigate?: string;
    reason?: string;
    route?: string;
    startVoice?: boolean;
    purpose?: string;
    estimatedMinutes?: number;
    kind?: string;
}

export interface ConversationSummary {
    id: string;
    title: string;
    turnCount: number;
    updatedAt: number;
}

const REGION = 'us-west1';
const STREAM_URL =
    import.meta.env.VITE_AGENT_STREAM_URL ||
    'https://us-west1-jastalk-firebase.cloudfunctions.net/careerAgentStream';

const rid = () => Math.random().toString(36).slice(2, 10);

/**
 * Whether this message is asking the agent to look at what the user is doing.
 *
 * Attaching the workspace on every turn would bill for a canvas nobody
 * mentioned. Matching intent keeps it to the turns where it earns its tokens,
 * and the agent can always ask the user to say "take a look" if it needs more.
 */
const WORKSPACE_CUES = /\b(my (code|diagram|design|solution|architecture)|this code|look at|review|check|stuck|why (isn'?t|doesn'?t|does not)|what'?s wrong|feedback|critique|am i missing|failing|bug|next step)\b/i;
const wantsWorkspace = (text: string): boolean => WORKSPACE_CUES.test(text);

/** Kinds the panel knows how to render. Anything else stays a plain effect. */
const CARD_KINDS = new Set(['company_guides', 'interview_questions']);

export function useCareerAgent(opts: {
    route: string;
    entity?: { type: 'resume' | 'job' | 'course'; id: string };
    autoExecTools?: string[];
    onEffect?: (effect: AgentEffect) => void;
}) {
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credits, setCredits] = useState<{ free: boolean; freeTurnsRemaining: number; creditsRemaining: number } | null>(null);
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);

    // Sent back each turn so the model keeps continuity without the server
    // holding session state.
    const historyRef = useRef<Array<{ role: string; parts: Array<{ text: string }> }>>([]);
    const abortRef = useRef<AbortController | null>(null);
    const optsRef = useRef(opts);
    optsRef.current = opts;

    const fns = () => getFunctions(undefined, REGION);

    const refreshConversations = useCallback(async () => {
        if (!currentUser) return;
        try {
            const fn = httpsCallable<unknown, { conversations: ConversationSummary[] }>(fns(), 'listAgentConversations');
            const { data } = await fn({ limit: 30 });
            setConversations(data.conversations ?? []);
        } catch {
            // A missing history list must not break the panel.
        }
    }, [currentUser]);

    useEffect(() => { void refreshConversations(); }, [refreshConversations]);

    const send = useCallback(
        async (text: string, attachment?: { type: 'parsed_resume'; data: unknown }) => {
            const trimmed = text.trim();
            if ((!trimmed && !attachment) || isThinking) return;
            if (!currentUser) {
                setError('Sign in to use the Career Agent.');
                return;
            }

            setError(null);
            const userMsg: AgentMessage = { id: rid(), role: 'user', text: trimmed, via: 'text' };
            const replyId = rid();
            setMessages((m) => [...m, userMsg, { id: replyId, role: 'assistant', text: '', streaming: true, via: 'text' }]);
            setIsThinking(true);

            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const idToken = await currentUser.getIdToken();
                const res = await fetch(STREAM_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    signal: controller.signal,
                    body: JSON.stringify({
                        message: trimmed,
                        workspace: wantsWorkspace(trimmed) ? readWorkspace() : undefined,
                        route: optsRef.current.route,
                        entity: optsRef.current.entity,
                        history: historyRef.current,
                        autoExecTools: optsRef.current.autoExecTools ?? [],
                        attachment,
                        conversationId,
                    }),
                });

                if (!res.ok || !res.body) {
                    throw new Error(res.status === 401 ? 'Sign in to use the Career Agent.' : `Agent unavailable (${res.status}).`);
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let finalText = '';

                // SSE frames are separated by a blank line and can split across
                // network chunks, so buffer until a complete frame is present.
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    let sep: number;
                    while ((sep = buffer.indexOf('\n\n')) !== -1) {
                        const frame = buffer.slice(0, sep);
                        buffer = buffer.slice(sep + 2);
                        if (frame.startsWith(':')) continue; // heartbeat

                        const eventLine = frame.split('\n').find((l) => l.startsWith('event: '));
                        const dataLine = frame.split('\n').find((l) => l.startsWith('data: '));
                        if (!eventLine || !dataLine) continue;

                        const event = eventLine.slice(7).trim();
                        let payload: any;
                        try { payload = JSON.parse(dataLine.slice(6)); } catch { continue; }

                        if (event === 'chunk') {
                            finalText += payload.text;
                            setMessages((m) => m.map((x) => (x.id === replyId ? { ...x, text: x.text + payload.text } : x)));
                        } else if (event === 'proposal') {
                            setMessages((m) => m.map((x) =>
                                x.id === replyId ? { ...x, proposals: [...(x.proposals ?? []), payload] } : x));
                        } else if (event === 'effect') {
                            if (payload?.kind && CARD_KINDS.has(payload.kind)) {
                                setMessages((m) => m.map((x) =>
                                    x.id === replyId ? { ...x, cards: [...(x.cards ?? []), payload] } : x));
                            }
                            optsRef.current.onEffect?.(payload);
                        } else if (event === 'saved') {
                            setConversationId(payload.conversationId);
                        } else if (event === 'done') {
                            setCredits(payload.credits ?? null);
                            if (payload.conversationId) setConversationId(payload.conversationId);
                            void refreshConversations();
                        } else if (event === 'error') {
                            throw new Error(
                                payload.code === 'credit_limit_reached'
                                    ? "You're out of AI credits for this month."
                                    : payload.message ?? 'Something went wrong.',
                            );
                        }
                    }
                }

                historyRef.current = [
                    ...historyRef.current,
                    { role: 'user', parts: [{ text: attachment ? `${trimmed} [uploaded a resume]` : trimmed }] },
                    { role: 'model', parts: [{ text: finalText }] },
                ].slice(-20);

                setMessages((m) => m.map((x) => (x.id === replyId ? { ...x, streaming: false } : x)));
            } catch (e: any) {
                if (e?.name === 'AbortError') {
                    // Stopped on purpose: keep whatever already streamed.
                    setMessages((m) => m.map((x) => (x.id === replyId ? { ...x, streaming: false } : x)));
                } else {
                    setError(e?.message ?? 'Something went wrong.');
                    setMessages((m) => m.filter((x) => x.id !== replyId));
                }
            } finally {
                abortRef.current = null;
                setIsThinking(false);
            }
        },
        [currentUser, isThinking, conversationId, refreshConversations],
    );

    /**
     * Append a finished voice turn to the same timeline and persist it.
     *
     * Voice had no persistence at all: appendTurns was only reachable from the
     * streamed text path, so a whole spoken session vanished on close. It also
     * belongs in `messages` rather than a parallel list, because the user
     * speaks, mutes, types, and speaks again — that is one conversation.
     */
    const appendVoiceTurn = useCallback(async (role: 'user' | 'assistant', text: string) => {
        const trimmed = text.trim();
        if (!trimmed || !currentUser) return;

        setMessages((m) => {
            const last = m[m.length - 1];
            // Live transcription arrives in fragments; merge consecutive ones
            // from the same speaker instead of one bubble per phrase.
            if (last?.via === 'voice' && last.role === role) {
                return [...m.slice(0, -1), { ...last, text: `${last.text} ${trimmed}`.trim() }];
            }
            return [...m, { id: rid(), role, text: trimmed, via: 'voice' }];
        });

        historyRef.current = [
            ...historyRef.current,
            { role: role === 'user' ? 'user' : 'model', parts: [{ text: trimmed }] },
        ].slice(-20);

        try {
            const fn = httpsCallable<unknown, { conversationId: string }>(fns(), 'saveAgentTurns');
            const { data } = await fn({
                conversationId,
                turns: [{ role: role === 'user' ? 'user' : 'assistant', text: trimmed, via: 'voice', at: Date.now() }],
            });
            if (data?.conversationId) setConversationId(data.conversationId);
            void refreshConversations();
        } catch {
            // History is a convenience; losing it must not break a live call.
        }
    }, [currentUser, conversationId, refreshConversations]);

    /** Capture / restore so switching sessions does not discard the current one. */
    const snapshot = useCallback((): SessionSnapshot => ({
        messages,
        history: historyRef.current,
        conversationId,
    }), [messages, conversationId]);

    const restore = useCallback((s: SessionSnapshot) => {
        setMessages(s.messages);
        historyRef.current = s.history;
        setConversationId(s.conversationId);
        setError(null);
    }, []);

    /** Stop generating but keep what has already arrived. */
    const stopGenerating = useCallback(() => abortRef.current?.abort(), []);

    const resolve = useCallback(async (proposalId: string, approve: boolean) => {
        const mark = (outcome: Proposal['outcome'], err?: string) =>
            setMessages((m) => m.map((msg) => ({
                ...msg,
                proposals: msg.proposals?.map((p) => (p.id === proposalId ? { ...p, outcome, error: err } : p)),
            })));

        try {
            const fn = httpsCallable<unknown, { status: string; result?: AgentEffect }>(fns(), 'careerAgentResolve');
            const { data } = await fn({ proposalId, approve });
            mark(approve ? 'approved' : 'rejected');
            if (approve && data.result) optsRef.current.onEffect?.(data.result);

            // Tell the model what happened so it offers the next step rather
            // than re-proposing what was just applied.
            if (approve) {
                historyRef.current.push({
                    role: 'user',
                    parts: [{ text: `[system] The user approved proposal ${proposalId}. It was applied successfully.` }],
                });
            }
        } catch (e: any) {
            mark('failed', e?.message ?? 'Could not apply the change.');
        }
    }, []);

    /** Start fresh. The stored thread stays in history until explicitly deleted. */
    const reset = useCallback(() => {
        historyRef.current = [];
        setMessages([]);
        setError(null);
        setConversationId(null);
    }, []);

    const openConversation = useCallback(async (id: string) => {
        try {
            const fn = httpsCallable<unknown, { id: string; title: string; turns: Array<{ role: 'user' | 'assistant'; text: string; effects?: AgentCard[] }> }>(
                fns(), 'getAgentConversation');
            const { data } = await fn({ conversationId: id });

            setMessages(data.turns.map((t) => ({
                id: rid(),
                role: t.role,
                text: t.text,
                cards: (t.effects ?? []).filter((e: any) => e?.kind && CARD_KINDS.has(e.kind)) as AgentCard[],
                via: (t as any).via === 'voice' ? 'voice' : 'text',
            })));
            historyRef.current = data.turns
                .map((t) => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.text }] }))
                .slice(-20);
            setConversationId(id);
            setError(null);
        } catch (e: any) {
            setError(e?.message ?? 'Could not open that conversation.');
        }
    }, []);

    const deleteConversation = useCallback(async (id: string) => {
        // Optimistic: a delete that appears to hang reads as "it kept my data".
        setConversations((c) => c.filter((x) => x.id !== id));
        if (id === conversationId) reset();
        try {
            await httpsCallable(fns(), 'deleteAgentConversation')({ conversationId: id });
        } catch {
            void refreshConversations();
        }
    }, [conversationId, reset, refreshConversations]);

    const deleteAllConversations = useCallback(async () => {
        setConversations([]);
        reset();
        try {
            await httpsCallable(fns(), 'deleteAgentConversation')({ all: true });
        } catch {
            void refreshConversations();
        }
    }, [reset, refreshConversations]);

    return {
        messages, send, resolve, reset, stopGenerating,
        appendVoiceTurn, snapshot, restore,
        isThinking, error, credits,
        conversations, conversationId, openConversation, deleteConversation, deleteAllConversations, refreshConversations,
    };
}
