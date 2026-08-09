/**
 * The Career Agent conversation.
 *
 * ONE component, two layouts. `variant="drawer"` is the docked panel;
 * `variant="full"` is the /agent workspace. Two components would guarantee
 * drift — the drawer would get a fix the workspace didn't.
 *
 * State comes from AgentSessionContext, not from local hooks, so expanding the
 * drawer is a layout change rather than a fresh conversation.
 *
 * Styling uses the app's --cv-* tokens and font-heading, so it reads as part of
 * the product rather than a bolted-on widget, and inherits light/dark for free.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Send, Sparkles, AlertCircle, Paperclip, Loader2, Mic, MicOff, PhoneOff,
    AudioLines, Hand, History, Settings2, Square, Check,
} from 'lucide-react';
import { useAgentSession } from './AgentSessionContext';
import { ProposedChanges } from './ProposedChanges';
import { AgentCards } from './AgentCards';
import { AgentHistory } from './AgentHistory';
import { TaskPlan } from './TaskPlan';
import { AUTO_EXEC_TOOLS } from './useAutoExec';
import { FREE_AGENT_TURNS_PER_DAY } from '../../config/creditCosts';
import { parseResumeFromFile } from '../../services/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import { AgentActivityIndicator, type AgentActivity } from './AgentActivityIndicator';
import { AgentMessageText } from './AgentMessageText';
import { getAgentTechnicalContext } from './technicalTermEmphasis';
import { readWorkspace } from './workspaceSnapshot';

const ACCEPTED_UPLOAD = '.pdf,.doc,.docx,.txt';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Concrete beats "how can I help?" — each maps to a real tool path. */
const STARTERS = [
    'Practise a Google interview',
    'What should I work on next?',
    'Set up my job tracker',
    'Tailor my resume for a role',
];

interface Props {
    variant?: 'drawer' | 'full';
    /** Accepted for call-site compatibility; the session owns the real route. */
    route?: string;
    entity?: { type: 'resume' | 'job' | 'course'; id: string };
}

export const CareerAgentPanel: React.FC<Props> = ({ variant = 'drawer' }) => {
    const { currentUser } = useAuth();
    const { text: agent, live, autoExec, sessions, route } = useAgentSession();
    const [input, setInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [waitingActivity, setWaitingActivity] = useState<AgentActivity | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const { messages, send, resolve, reset, stopGenerating, isThinking, isRestoring, error, credits } = agent;
    const isFull = variant === 'full';
    const workspace = readWorkspace();
    const technicalContext = getAgentTechnicalContext(
        route,
        typeof window === 'undefined' ? '' : window.location.search,
        workspace,
    );
    const streamingReply = [...messages].reverse().find((message) => message.role === 'assistant' && message.streaming);
    const textActivity: AgentActivity | null = isRestoring
        ? 'working'
        : !isThinking
        ? null
        : streamingReply?.text.trim() ? 'working' : waitingActivity ?? 'thinking';
    const visibleActivity: AgentActivity | null = live.activity ?? textActivity;

    useEffect(() => {
        if (!isThinking) {
            setWaitingActivity(null);
            return;
        }

        setWaitingActivity('thinking');
        const workingTimer = window.setTimeout(() => setWaitingActivity('working'), 1400);
        return () => window.clearTimeout(workingTimer);
    }, [isThinking]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, visibleActivity]);

    const submit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const value = input;
        setInput('');
        void send(value);
    };

    /**
     * Parse the upload client-side, then hand the agent the structured result.
     * `parseResumeFromFile` already handles PDF and DOCX and is the same path
     * the resume builder uses — the agent only needs the fields, not the file.
     */
    const handleUpload = async (file: File | undefined) => {
        if (!file || !currentUser) return;
        if (file.size > MAX_UPLOAD_BYTES) {
            setUploadError('That file is larger than 8 MB. Try exporting a smaller PDF.');
            return;
        }
        setUploadError(null);
        setUploading(true);
        try {
            const dataUrl = await new Promise<string>((res, rej) => {
                const reader = new FileReader();
                reader.onload = () => res(String(reader.result));
                reader.onerror = () => rej(new Error('Could not read that file.'));
                reader.readAsDataURL(file);
            });
            const parsed = await parseResumeFromFile(currentUser.uid, dataUrl, file.type, 'English');
            await send(`I uploaded my resume (${file.name}). Turn it into a CareerVivid resume.`,
                { type: 'parsed_resume', data: parsed });
        } catch (err: any) {
            setUploadError(err?.message ?? 'Could not read that resume.');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const iconBtn =
        'rounded-xl p-2.5 text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-action-soft-bg)] ' +
        'hover:text-[var(--cv-action-primary)] disabled:opacity-40';

    return (
        <div className="flex h-full min-h-0 bg-[var(--cv-bg-product)]">
            {showHistory && (
                <aside className={`${isFull ? 'w-64' : 'w-52'} shrink-0 border-r border-[var(--cv-border-subtle)]`}>
                    <AgentHistory
                        conversations={agent.conversations}
                        onOpen={(id, title) => {
                            void sessions.switchTo(id, title);
                            if (!isFull) setShowHistory(false);
                        }}
                        onDelete={(id) => { sessions.forget(id); void agent.deleteConversation(id); }}
                        onDeleteAll={() => { sessions.startNew(); void agent.deleteAllConversations(); }}
                        onNew={() => { sessions.startNew(); if (!isFull) setShowHistory(false); }}
                        activeId={sessions.activeId}
                        onClose={() => setShowHistory(false)}
                    />
                </aside>
            )}

            <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${isFull ? 'mx-auto max-w-3xl' : ''}`}>
                <header className="flex items-center gap-2 border-b border-[var(--cv-border-subtle)] px-4 py-3">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-[var(--cv-action-primary)] to-amber-500 text-white shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    {/*
                      * The subtitle exists because a practice round shows two
                      * chats at once. Without it, "Career Agent" and "code
                      * coach" look like the same thing twice, and people cannot
                      * tell which one remembers them.
                      */}
                    <span className="min-w-0">
                        <h2 className="font-heading text-sm font-extrabold leading-none tracking-tight text-[var(--cv-text-heading-product)] dark:text-white">
                            Career Agent
                        </h2>
                        <span className="mt-0.5 block text-[10px] leading-none text-[var(--cv-text-muted)]">
                            Live coach · remembers you across rounds
                        </span>
                    </span>

                    <div className="ml-auto flex items-center gap-1">
                        {credits && (
                            <span className="mr-1 hidden text-[11px] text-[var(--cv-text-muted)] sm:inline">
                                {credits.free
                                    ? `${credits.freeTurnsRemaining}/${FREE_AGENT_TURNS_PER_DAY} free today`
                                    : `${credits.creditsRemaining} credits`}
                            </span>
                        )}
                        <button type="button" onClick={() => setShowHistory((v) => !v)} title="History"
                            aria-pressed={showHistory}
                            className={`rounded-lg p-1.5 transition-colors ${showHistory ? 'bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)]' : 'text-[var(--cv-text-muted)] hover:bg-black/5 dark:hover:bg-white/10'}`}>
                            <History className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setShowSettings((v) => !v)} title="Agent settings"
                            aria-pressed={showSettings}
                            className={`rounded-lg p-1.5 transition-colors ${showSettings ? 'bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)]' : 'text-[var(--cv-text-muted)] hover:bg-black/5 dark:hover:bg-white/10'}`}>
                            <Settings2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </header>

                {showSettings && (
                    <div className="border-b border-[var(--cv-border-subtle)] bg-[var(--cv-surface-muted)] px-4 py-3">
                        <p className="cv-design-eyebrow text-[10px]">Run without asking</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--cv-text-muted)]">
                            Creating resumes, adding jobs in bulk, and anything that spends credits always
                            asks first — that cannot be turned off.
                        </p>
                        <ul className="mt-2.5 space-y-1.5">
                            {AUTO_EXEC_TOOLS.map((t) => {
                                const on = autoExec.tools.includes(t.name);
                                return (
                                    <li key={t.name}>
                                        <button type="button" onClick={() => autoExec.toggle(t.name)}
                                            className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                                            <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-md border transition-colors ${
                                                on ? 'border-[var(--cv-action-primary)] bg-[var(--cv-action-primary)] text-white'
                                                   : 'border-[var(--cv-border-subtle)]'}`}>
                                                {on && <Check className="h-3 w-3" />}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-xs font-medium text-[var(--cv-text-body-product)]">{t.label}</span>
                                                <span className="block text-[10px] text-[var(--cv-text-muted)]">{t.description}</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    {messages.length === 0 && !isRestoring && (
                        <div className="pt-3">
                            <p className="font-heading text-lg font-extrabold leading-tight tracking-tight text-[var(--cv-text-heading-product)] dark:text-white">
                                What are we working on?
                            </p>
                            <p className="mt-1.5 text-sm leading-6 text-[var(--cv-text-body-product)]">
                                I can practise real interview questions from 301 companies, build your resume,
                                and keep your applications moving.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" onClick={() => void live.start()}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--cv-action-primary)] to-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.03]">
                                    <AudioLines className="h-3.5 w-3.5" /> Talk to the agent
                                </button>
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--cv-text-body-product)] transition-colors hover:border-[var(--cv-action-primary)]">
                                    <Paperclip className="h-3 w-3" /> Upload my resume
                                </button>
                                {STARTERS.map((s) => (
                                    <button key={s} type="button" onClick={() => void send(s)}
                                        className="rounded-full border border-[var(--cv-border-subtle)] px-3.5 py-2 text-xs text-[var(--cv-text-body-product)] transition-colors hover:border-[var(--cv-action-primary)] hover:bg-[var(--cv-action-soft-bg)]">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {messages.map((m) => (
                            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
                                <div className={m.role === 'user' ? 'min-w-0 max-w-[85%]' : 'min-w-0 w-full'}>
                                    {m.role === 'user' ? (
                                        <p className="break-words rounded-2xl rounded-br-md bg-[var(--cv-action-primary)] px-3.5 py-2.5 text-sm leading-6 text-white shadow-sm">
                                            {m.via === 'voice' && <Mic className="mr-1 inline h-3 w-3 opacity-70" />}
                                            {m.text}
                                        </p>
                                    ) : (
                                        <div className="flex min-w-0 items-start gap-2.5">
                                            <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#dfe2ff] bg-[#f3f2ff] text-[#625bd5] dark:border-[#3f3b70] dark:bg-[#252347] dark:text-[#bbb8ff]">
                                                <Sparkles className="h-3.5 w-3.5" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] px-3.5 py-2.5 text-sm leading-6 text-[var(--cv-text-body-product)] shadow-sm">
                                                    <AgentMessageText
                                                        text={m.text}
                                                        technicalContext={technicalContext}
                                                        workspace={workspace}
                                                    />
                                                    {m.streaming && (
                                                        <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-[var(--cv-action-primary)] align-middle" />
                                                    )}
                                                </div>
                                                <AgentCards cards={m.cards} />
                                                {m.proposals?.map((p) => (
                                                    <ProposedChanges key={p.id} proposal={p}
                                                        onResolve={(id, ok) => void resolve(id, ok)} disabled={isThinking} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {visibleActivity && <AgentActivityIndicator activity={visibleActivity} />}

                        {live.plan && <TaskPlan plan={live.plan} />}

                        {live.proposals.map((p) => (
                            <ProposedChanges key={p.id} proposal={p}
                                onResolve={(id, ok) => void live.resolveProposal(id, ok)} />
                        ))}

                        {[uploadError, live.error, error].filter(Boolean).map((msg, i) => (
                            <p key={i} className="flex items-start gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                {msg}
                            </p>
                        ))}
                        <div ref={endRef} />
                    </div>
                </div>

                {(live.status === 'connecting' || live.status === 'live') && (
                    <div className="flex items-center gap-2 border-t border-[var(--cv-border-subtle)] bg-gradient-to-r from-[var(--cv-action-soft-bg)] to-amber-500/10 px-4 py-2.5 text-sm">
                        <Mic className={`h-4 w-4 shrink-0 text-[var(--cv-action-primary)] ${live.status === 'live' && !live.muted ? 'animate-pulse' : ''}`} />
                        <span className="min-w-0 flex-1 truncate text-[var(--cv-text-body-product)]">
                            {live.status === 'connecting'
                                ? 'Connecting…'
                                : `${Math.floor(live.elapsedSeconds / 60)}:${String(live.elapsedSeconds % 60).padStart(2, '0')}`}
                            {live.muted && <span className="ml-1.5 font-semibold text-red-600 dark:text-red-400">· muted</span>}
                            {live.status === 'live' && (
                                <span className="ml-1.5 text-[11px] text-[var(--cv-text-muted)]">
                                    · {live.billedCredits} credits{live.capMinutes ? ` · ends ${live.capMinutes}:00` : ''}
                                </span>
                            )}
                        </span>
                        {live.status === 'live' && (
                            <>
                                <button type="button" onClick={live.toggleMute} aria-pressed={live.muted}
                                    title={live.muted ? 'Unmute' : 'Mute your microphone'}
                                    className={`rounded-lg p-1.5 transition-colors ${live.muted ? 'bg-red-600 text-white' : 'text-[var(--cv-text-body-product)] hover:bg-black/5 dark:hover:bg-white/10'}`}>
                                    {live.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                                </button>
                                <button type="button" onClick={live.interrupt} disabled={!live.agentSpeaking}
                                    title="Stop the agent talking"
                                    className="rounded-lg p-1.5 text-[var(--cv-text-body-product)] transition-colors hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10">
                                    <Hand className="h-3.5 w-3.5" />
                                </button>
                            </>
                        )}
                        <button type="button" onClick={() => void live.stop()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500">
                            <PhoneOff className="h-3.5 w-3.5" /> End
                        </button>
                    </div>
                )}

                <form onSubmit={submit} className="border-t border-[var(--cv-border-subtle)] p-3">
                    <div className="flex items-end gap-1.5">
                        <input ref={fileRef} type="file" accept={ACCEPTED_UPLOAD} className="hidden"
                            onChange={(e) => void handleUpload(e.target.files?.[0])} />
                        <button type="button" title="Upload a resume" aria-label="Upload a resume"
                            disabled={uploading || isThinking} onClick={() => fileRef.current?.click()} className={iconBtn}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                        </button>

                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                            }}
                            rows={1}
                            placeholder={uploading ? 'Reading your resume…' : 'Ask, upload a resume, or start talking…'}
                            className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] px-3.5 py-2.5 text-sm text-[var(--cv-text-body-product)] outline-none transition-colors placeholder:text-[var(--cv-text-muted)] focus:border-[var(--cv-action-primary)]"
                        />

                        <button type="button"
                            title={live.status === 'live' ? 'End the call' : 'Talk to the agent'}
                            aria-label={live.status === 'live' ? 'End the call' : 'Talk to the agent'}
                            disabled={live.status === 'connecting' || live.status === 'closing'}
                            onClick={() => (live.status === 'live' ? void live.stop() : void live.start())}
                            className={live.status === 'live'
                                ? 'rounded-xl bg-red-600 p-2.5 text-white transition-colors hover:bg-red-500'
                                : iconBtn}>
                            {live.status === 'connecting' ? <Loader2 className="h-4 w-4 animate-spin" />
                                : live.status === 'live' ? <PhoneOff className="h-4 w-4" />
                                : <AudioLines className="h-4 w-4" />}
                        </button>

                        {isThinking ? (
                            <button type="button" onClick={stopGenerating} title="Stop generating"
                                className="rounded-xl bg-[var(--cv-surface-muted)] p-2.5 text-[var(--cv-text-body-product)] transition-colors hover:bg-black/10">
                                <Square className="h-4 w-4" />
                            </button>
                        ) : (
                            <button type="submit" disabled={!input.trim()}
                                className="rounded-xl bg-gradient-to-br from-[var(--cv-action-primary)] to-amber-500 p-2.5 text-white shadow-sm transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40">
                                <Send className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CareerAgentPanel;
