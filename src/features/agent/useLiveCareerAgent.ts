/**
 * Realtime Career Agent — talks and works at the same time.
 *
 * The Live socket runs browser↔Vertex because audio cannot round-trip through a
 * Cloud Function without wrecking latency. So the model's tool calls land HERE.
 *
 * They are not executed here. Every call is relayed to `careerAgentLiveTool`,
 * which validates it, authorizes it against the caller's uid, bills it, and —
 * for writes — turns it into a proposal instead of a write. This hook is a
 * transport for tool calls, never an executor of them.
 *
 * The conversation does not block on approval. A write returns
 * "awaiting_approval" immediately, the model is told a card appeared and keeps
 * talking, and the approval outcome is injected later as a separate turn.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    GoogleGenAI,
    Modality,
    type Blob as GenAIBlob,
    type LiveServerMessage,
} from '@google/genai';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    decodeBase64,
    decodeAudioData,
    toPcm16Base64,
    LIVE_OUTPUT_SAMPLE_RATE,
} from '../../utils/liveAudio';
import type { Proposal } from './useCareerAgent';
import { readWorkspace } from './workspaceSnapshot';

const REGION = 'us-west1';

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'closing' | 'error';
export type LiveActivity = 'thinking' | 'working' | null;

export interface LiveTurn {
    id: string;
    role: 'user' | 'agent';
    text: string;
}

/** The checklist the agent puts on screen before doing multi-step work. */
export interface LivePlanStep {
    title: string;
    tool?: string;
    status: 'pending' | 'running' | 'done' | 'blocked';
    note?: string;
}

export interface LivePlan {
    goal: string;
    steps: LivePlanStep[];
}

interface LiveTokenResponse {
    accessToken: string;
    project: string;
    location: string;
    sessionId: string;
    taskId: string;
    capMinutes: number;
    creditsPerMinute: number;
    heartbeatIntervalMs: number;
    tools: unknown[];
    systemInstruction: string;
}

const rid = () => Math.random().toString(36).slice(2, 10);

/**
 * Turn a callable/getUserMedia failure into something a person can act on.
 *
 * Firebase reports an undeployed callable as a bare `internal`, which reads to
 * the user as "the app is broken" when the actual answer is "this build's
 * functions are not live yet".
 */
function liveStartMessage(e: any): string {
    const code: string = e?.code ?? '';
    if (code === 'functions/resource-exhausted') return 'Not enough credits for a voice session.';
    if (code === 'functions/unauthenticated') return 'Sign in to talk to the agent.';
    if (e?.name === 'NotAllowedError') return 'Microphone access is blocked. Allow it in your browser settings.';
    if (e?.name === 'NotFoundError') return 'No microphone found.';
    if (code === 'functions/not-found' || code === 'functions/internal') {
        return 'The realtime agent is not available yet — its Cloud Functions need to be deployed.';
    }
    return e?.message || 'Could not start the session.';
}

export function useLiveCareerAgent(opts: {
    route: string;
    entity?: { type: 'resume' | 'job' | 'course'; id: string };
    onEffect?: (effect: { navigate?: string; route?: string }) => void;
    /** Finished voice turns go here so the session is one timeline, and saved. */
    onVoiceTurn?: (role: 'user' | 'agent', text: string) => void;
}) {
    const [status, setStatus] = useState<LiveStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [turns, setTurns] = useState<LiveTurn[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [elapsedSeconds, setElapsed] = useState(0);
    const [capMinutes, setCap] = useState<number | null>(null);
    const [agentSpeaking, setAgentSpeaking] = useState(false);
    const [activity, setActivity] = useState<LiveActivity>(null);
    const [billedCredits, setBilledCredits] = useState(0);
    const [muted, setMuted] = useState(false);
    const [plan, setPlan] = useState<LivePlan | null>(null);

    const sessionRef = useRef<Promise<any> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inCtxRef = useRef<AudioContext | null>(null);
    const outCtxRef = useRef<AudioContext | null>(null);
    const procRef = useRef<ScriptProcessorNode | null>(null);
    const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const playheadRef = useRef(0);
    const beatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const playingRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const closingRef = useRef(false);
    /**
     * Latest resumption handle from the server.
     *
     * Live sessions are terminated server-side long before our own cap — around
     * eight to ten minutes. Reconnecting with this handle restores the
     * conversation state, so the user experiences one continuous call.
     */
    const resumeHandleRef = useRef<string | null>(null);
    const reconnectingRef = useRef(false);
    const reconnectAttemptsRef = useRef(0);
    /** The mic pipeline is built once and survives reconnects. */
    const audioWiredRef = useRef(false);
    /** Read by reconnect, which must not be re-created on every tick. */
    const elapsedRef = useRef(0);
    const reconnectRef = useRef<() => void>(() => {});
    const mutedRef = useRef(false);
    const optsRef = useRef(opts);
    optsRef.current = opts;

    // Transcription arrives in fragments; merging into the trailing turn avoids
    // one bubble per syllable.
    const appendTurn = useCallback((role: LiveTurn['role'], text: string) => {
        if (!text) return;
        setActivity(role === 'user' ? 'thinking' : null);
        setTurns((t) => {
            const last = t[t.length - 1];
            if (last?.role === role) {
                return [...t.slice(0, -1), { ...last, text: last.text + text }];
            }
            return [...t, { id: rid(), role, text }];
        });
        optsRef.current.onVoiceTurn?.(role, text);
    }, []);

    const teardown = useCallback(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        if (beatRef.current) clearInterval(beatRef.current);
        beatRef.current = null;

        procRef.current?.disconnect();
        srcRef.current?.disconnect();
        procRef.current = null;
        srcRef.current = null;

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        playingRef.current.forEach((n) => { try { n.stop(); } catch { /* already ended */ } });
        playingRef.current.clear();

        void inCtxRef.current?.close().catch(() => {});
        void outCtxRef.current?.close().catch(() => {});
        inCtxRef.current = null;
        outCtxRef.current = null;

        sessionRef.current?.then((s) => s?.close?.()).catch(() => {});
        sessionRef.current = null;
        playheadRef.current = 0;
        setAgentSpeaking(false);
        setActivity(null);
    }, []);

    const stop = useCallback(async () => {
        if (closingRef.current || !sessionIdRef.current) return null;
        closingRef.current = true;
        reconnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        resumeHandleRef.current = null;
        audioWiredRef.current = false;
        setStatus('closing');
        teardown();

        const id = sessionIdRef.current;
        sessionIdRef.current = null;
        try {
            // Billed from the SERVER's start time — the client is not a
            // trustworthy source for something that determines a charge.
            const fn = httpsCallable<unknown, { durationSeconds: number; credits: number }>(
                getFunctions(undefined, REGION),
                'endAgentVoiceSession',
            );
            const { data } = await fn({ sessionId: id });
            return data;
        } catch {
            return null;
        } finally {
            closingRef.current = false;
            setStatus('idle');
        }
    }, [teardown]);

    /** Relay one model tool call to the server and return what the model should hear. */
    const runTool = useCallback(async (name: string, args: unknown) => {
        const fn = httpsCallable<unknown, any>(getFunctions(undefined, REGION), 'careerAgentLiveTool');
        const { data } = await fn({
            sessionId: sessionIdRef.current,
            name,
            args,
            route: optsRef.current.route,
            workspace: readWorkspace(),
        });

        if (data?.status === 'awaiting_approval' && data.proposal) {
            setProposals((p) => [
                ...p.filter((proposal) => proposal.outcome || proposal.tool !== data.proposal.tool),
                data.proposal,
            ]);
        }
        // Mirror the plan tools into local state — this is what the checklist renders.
        if (name === 'planTasks' && data?.result?.steps) {
            setPlan({
                goal: data.result.goal,
                steps: data.result.steps.map((st: any) => ({ ...st, status: 'pending' as const })),
            });
        }
        if (name === 'updateTaskStatus' && data?.result?.updated) {
            const { stepIndex, status: stepStatus } = data.result;
            setPlan((p) =>
                p ? {
                    ...p,
                    steps: p.steps.map((st, i) =>
                        i === stepIndex ? { ...st, status: stepStatus, note: (args as any)?.note ?? st.note } : st),
                } : p);
        }

        if (data?.ok && data.result && typeof data.result === 'object') {
            const r = data.result as { navigate?: string; route?: string };
            if (r.navigate || r.route) optsRef.current.onEffect?.(r);
        }
        return data;
    }, []);

    /** Mute the microphone. The agent keeps talking; it just stops hearing you. */
    const toggleMute = useCallback(() => {
        setMuted((m) => {
            const next = !m;
            mutedRef.current = next;
            streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
            return next;
        });
    }, []);

    /**
     * Cut the agent off mid-sentence.
     *
     * Dropping queued buffers locally is not enough — the model would keep
     * streaming the rest of its turn. `sendClientContent` with an empty turn
     * signals the interruption so it actually stops and listens.
     */
    const interrupt = useCallback(() => {
        playingRef.current.forEach((n) => { try { n.stop(); } catch { /* ended */ } });
        playingRef.current.clear();
        playheadRef.current = 0;
        setAgentSpeaking(false);
        setActivity(null);
        sessionRef.current?.then((s) =>
            s.sendClientContent({ turns: [{ role: 'user', parts: [{ text: '' }] }], turnComplete: true }),
        ).catch(() => {});
    }, []);

    /** Tell the model an approval landed, so it can react without being asked again. */
    const notifyApproval = useCallback((proposalId: string, approved: boolean, result?: unknown) => {
        sessionRef.current?.then((s) =>
            s.sendClientContent({
                turns: [{
                    role: 'user',
                    parts: [{
                        text: approved
                            ? `[system] The user approved proposal ${proposalId}. It is now saved. Result: ${JSON.stringify(result ?? {}).slice(0, 500)}. Confirm briefly and offer the next step.`
                            : `[system] The user declined proposal ${proposalId}. Do not retry it. Ask what they would prefer.`,
                    }],
                }],
                turnComplete: true,
            }),
        ).catch(() => {});
    }, []);

    const resolveProposal = useCallback(async (proposalId: string, approve: boolean) => {
        const mark = (outcome: Proposal['outcome'], err?: string) =>
            setProposals((p) => p.map((x) => (x.id === proposalId ? { ...x, outcome, error: err } : x)));
        setActivity('working');
        try {
            const fn = httpsCallable<unknown, { status: string; result?: any }>(
                getFunctions(undefined, REGION),
                'careerAgentResolve',
            );
            const { data } = await fn({ proposalId, approve });
            mark(approve ? 'approved' : 'rejected');
            if (approve && data.result) optsRef.current.onEffect?.(data.result);
            notifyApproval(proposalId, approve, data.result);
            setActivity('thinking');
        } catch (e: any) {
            mark('failed', e?.message ?? 'Could not apply the change.');
            setActivity(null);
        }
    }, [notifyApproval]);

    /**
     * Opens the call, and re-opens it after a server-side disconnect.
     *
     * `resume` is set only on a reconnect. In that mode nothing user-visible is
     * reset and the audio pipeline is left alone — the mic, both AudioContexts
     * and the ScriptProcessor stay exactly as they are, and only the socket is
     * replaced. `onaudioprocess` reads `sessionRef.current` at call time, so
     * swapping the session is enough to redirect audio into the new connection
     * without a gap or a second permission prompt.
     */
    const start = useCallback(async (resume?: { handle: string; sessionId: string }) => {
        if (!resume && (status === 'connecting' || status === 'live')) return;
        if (!resume) {
            setError(null);
            setTurns([]);
            setProposals([]);
            setPlan(null);
            setElapsed(0);
            setBilledCredits(0);
            setActivity(null);
            setMuted(false);
            mutedRef.current = false;
            setStatus('connecting');
            resumeHandleRef.current = null;
            reconnectAttemptsRef.current = 0;
            audioWiredRef.current = false;
        }
        closingRef.current = false;

        try {
            const tokenFn = httpsCallable<unknown, LiveTokenResponse>(
                getFunctions(undefined, REGION),
                'getAgentLiveToken',
            );
            const { data: tok } = await tokenFn({
                route: optsRef.current.route,
                entity: optsRef.current.entity,
                workspace: readWorkspace(),
                resumeSessionId: resume?.sessionId,
            });
            sessionIdRef.current = tok.sessionId;
            setCap(tok.capMinutes);

            if (!resume) {
                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                const AC: typeof AudioContext = window.AudioContext ?? (window as any).webkitAudioContext;
                inCtxRef.current = new AC();
                outCtxRef.current = new AC({ sampleRate: LIVE_OUTPUT_SAMPLE_RATE });
            }

            const base =
                tok.location === 'global'
                    ? 'https://aiplatform.googleapis.com'
                    : `https://${tok.location}-aiplatform.googleapis.com`;

            const ai = new GoogleGenAI({
                vertexai: true,
                apiKey: tok.accessToken,
                httpOptions: {
                    baseUrl: `${base}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent?access_token=${tok.accessToken}`,
                },
            });
            if ((ai as any).apiClient?.clientOptions) {
                (ai as any).apiClient.clientOptions.apiKey = undefined;
            }

            sessionRef.current = ai.live.connect({
                model: `projects/${tok.project}/locations/${tok.location}/publishers/google/models/gemini-live-2.5-flash-native-audio`,
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: tok.systemInstruction,
                    // Server-supplied so the tool surface cannot drift from what
                    // the server is willing to execute.
                    tools: tok.tools as any,
                    // Ask the server for resumption handles, and hand one back
                    // when reconnecting so the conversation carries over.
                    sessionResumption: resume?.handle ? { handle: resume.handle } : {},
                    // Sessions also end when the context window fills. A sliding
                    // window keeps a long call alive instead of hitting that wall.
                    contextWindowCompression: { slidingWindow: {} },
                } as any,
                callbacks: {
                    onopen: () => {
                        setStatus('live');
                        reconnectingRef.current = false;
                        reconnectAttemptsRef.current = 0;
                        // On a reconnect the mic, contexts, processor, timer and
                        // heartbeat are all still running. Rebuilding them would
                        // cut the audio and restart the clock.
                        if (audioWiredRef.current) return;
                        audioWiredRef.current = true;

                        const inCtx = inCtxRef.current!;
                        const src = inCtx.createMediaStreamSource(streamRef.current!);
                        const proc = inCtx.createScriptProcessor(4096, 1, 1);
                        srcRef.current = src;
                        procRef.current = proc;

                        proc.onaudioprocess = (ev) => {
                            // Muting stops the upload, not just the track. A
                            // disabled track still fires this callback with
                            // silence, and silence is still billed as input audio.
                            if (closingRef.current || mutedRef.current) return;
                            const pcm: GenAIBlob = {
                                data: toPcm16Base64(ev.inputBuffer.getChannelData(0), inCtx.sampleRate),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionRef.current?.then((s) => s.sendRealtimeInput({ media: pcm })).catch(() => {});
                        };
                        src.connect(proc);
                        proc.connect(inCtx.destination);

                        tickRef.current = setInterval(() => setElapsed((s) => { elapsedRef.current = s + 1; return s + 1; }), 1_000);

                        // Meters the call as it happens. Billing does not depend
                        // on this session ever closing cleanly — see
                        // functions/src/agent/voiceBilling.ts. The server owns
                        // the cap; this loop just obeys it.
                        beatRef.current = setInterval(async () => {
                            if (closingRef.current || !sessionIdRef.current) return;
                            try {
                                const beat = httpsCallable<unknown, { shouldStop: boolean; stopReason?: string; billedCredits: number }>(
                                    getFunctions(undefined, REGION),
                                    'agentVoiceHeartbeat',
                                );
                                const { data } = await beat({ sessionId: sessionIdRef.current });
                                setBilledCredits(data.billedCredits);
                                if (data.shouldStop) {
                                    setError(
                                        data.stopReason === 'no_credits'
                                            ? "You've run out of credits, so the call ended."
                                            : 'Session time limit reached.',
                                    );
                                    void stop();
                                }
                            } catch {
                                // A dropped heartbeat is not fatal: the server
                                // sweeper closes and bills the session anyway.
                            }
                        }, tok.heartbeatIntervalMs ?? 30_000);
                    },

                    onmessage: async (msg: LiveServerMessage) => {
                        // The server hands out a new handle whenever the session
                        // is in a resumable state. Keep the latest one.
                        const upd = (msg as any).sessionResumptionUpdate;
                        if (upd?.resumable && upd.newHandle) {
                            resumeHandleRef.current = upd.newHandle;
                        }

                        // Advance warning that this connection is about to be
                        // dropped. Reconnect now rather than after the audio cuts.
                        if ((msg as any).goAway) {
                            reconnectRef.current();
                            return;
                        }

                        // ── Tool calls: relay, never execute locally ──────────
                        if (msg.toolCall?.functionCalls?.length) {
                            setActivity('working');
                            const responses = await Promise.all(
                                msg.toolCall.functionCalls.map(async (fc) => {
                                    let response: unknown;
                                    try {
                                        response = await runTool(fc.name ?? '', fc.args ?? {});
                                    } catch (e: any) {
                                        response = { ok: false, error: e?.message ?? 'Tool call failed.' };
                                    }
                                    return { id: fc.id, name: fc.name, response: response as Record<string, unknown> };
                                }),
                            );
                            sessionRef.current
                                ?.then((s) => s.sendToolResponse({ functionResponses: responses }))
                                .catch(() => {});
                            setActivity('thinking');
                            return;
                        }

                        // The user interrupted: drop queued audio immediately or
                        // the agent keeps talking over them.
                        if (msg.serverContent?.interrupted) {
                            playingRef.current.forEach((n) => { try { n.stop(); } catch { /* ended */ } });
                            playingRef.current.clear();
                            playheadRef.current = 0;
                            setAgentSpeaking(false);
                            setActivity(null);
                            return;
                        }

                        const inText = msg.serverContent?.inputTranscription?.text;
                        const outText = msg.serverContent?.outputTranscription?.text;
                        if (inText) appendTurn('user', inText);
                        if (outText) appendTurn('agent', outText);

                        const audio = msg.serverContent?.modelTurn?.parts?.find(
                            (p) => p.inlineData?.data,
                        )?.inlineData?.data;
                        if (!audio || !outCtxRef.current) return;
                        setActivity(null);

                        const ctx = outCtxRef.current;
                        const buf = await decodeAudioData(decodeBase64(audio), ctx, LIVE_OUTPUT_SAMPLE_RATE, 1);
                        const node = ctx.createBufferSource();
                        node.buffer = buf;
                        node.connect(ctx.destination);
                        // Queue against a playhead so consecutive chunks butt up
                        // cleanly instead of overlapping into garble.
                        const at = Math.max(ctx.currentTime, playheadRef.current);
                        node.start(at);
                        playheadRef.current = at + buf.duration;
                        playingRef.current.add(node);
                        setAgentSpeaking(true);
                        node.onended = () => {
                            playingRef.current.delete(node);
                            if (playingRef.current.size === 0) setAgentSpeaking(false);
                        };
                    },

                    onerror: () => {
                        // Not surfaced as an error: a dropped socket is expected
                        // on a long call and the reconnect is meant to be
                        // invisible. Only a failed reconnect reaches the user.
                        if (!closingRef.current) reconnectRef.current();
                    },

                    onclose: () => {
                        if (!closingRef.current) reconnectRef.current();
                    },
                },
            });
        } catch (e: any) {
            // A failed reconnect is handled by its own retry ladder; only a
            // failed initial connect tears everything down.
            if (resume) throw e;
            setError(liveStartMessage(e));
            setStatus('error');
            teardown();
            // The server already opened a session row; close it so the user is
            // not billed for a connection that never carried audio.
            if (sessionIdRef.current) void stop();
        }
    }, [status, stop, teardown, runTool, appendTurn]);

    /**
     * Re-open the socket after a server-side disconnect, without ending the call.
     *
     * Gemini terminates Live connections on its own schedule — in practice
     * around eight to ten minutes, well short of the session cap we advertise.
     * Treating that as the end of the call is what made a long session feel
     * like it "just died".
     *
     * Guards, in order:
     *  - a reconnect already in flight, so a goAway followed by onclose only
     *    reconnects once
     *  - no resumption handle, which means the server never reached a resumable
     *    state and reconnecting would drop the conversation anyway
     *  - past the session cap, where the right answer is to stop for real
     *  - repeated failures, so a genuinely broken connection is not retried
     *    forever while the meter runs
     */
    const RECONNECT_LIMIT = 5;

    const reconnect = useCallback(() => {
        if (closingRef.current || reconnectingRef.current) return;
        const sessionId = sessionIdRef.current;
        const handle = resumeHandleRef.current;

        if (!sessionId || !handle) {
            void stop();
            return;
        }
        if (capMinutes && elapsedRef.current >= capMinutes * 60) {
            void stop();
            return;
        }
        if (reconnectAttemptsRef.current >= RECONNECT_LIMIT) {
            setError('The connection kept dropping, so the call ended. Your progress is saved.');
            void stop();
            return;
        }

        reconnectingRef.current = true;
        const attempt = ++reconnectAttemptsRef.current;
        // Close the dead socket before opening the next one, or the old
        // callbacks fire against a connection nobody is listening to.
        sessionRef.current?.then((sess) => sess?.close?.()).catch(() => {});
        sessionRef.current = null;

        const delay = Math.min(4_000, 300 * 2 ** (attempt - 1));
        setTimeout(() => {
            void start({ handle, sessionId }).catch(() => {
                reconnectingRef.current = false;
                // Let the ladder run: each failure backs off further, and the
                // attempt cap ends it.
                reconnect();
            });
        }, delay);
    }, [start, stop, capMinutes]);

    // `onclose` fires from inside a session created before `reconnect` exists,
    // so it reaches it through a ref rather than a stale closure.
    useEffect(() => { reconnectRef.current = reconnect; }, [reconnect]);

    /**
     * A live session must not outlive the component that owns it — and it must
     * be settled, not merely torn down.
     *
     * `teardown()` alone closes the audio and the socket but never bills, so
     * navigating away used to hand the user free Live minutes. `stop()` does
     * both. It is still best-effort: a hard tab close or a network drop can
     * lose the callable, which is why `sweepStaleVoiceSessions` exists
     * server-side as the actual guarantee.
     */
    const stopRef = useRef(stop);
    stopRef.current = stop;

    useEffect(() => {
        const settle = () => { void stopRef.current(); };
        window.addEventListener('pagehide', settle);
        return () => {
            window.removeEventListener('pagehide', settle);
            settle();
        };
    }, []);

    return {
        status,
        error,
        turns,
        plan,
        proposals,
        elapsedSeconds,
        capMinutes,
        billedCredits,
        agentSpeaking,
        activity,
        muted,
        toggleMute,
        interrupt,
        start,
        stop,
        resolveProposal,
    };
}
