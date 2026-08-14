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
 * Styling is the shared --cvl-* token set, the same one the dashboard and the
 * public pages run on, so the agent reads as part of the product and inherits
 * light/dark from the tokens rather than from a second set of `dark:` rules.
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
import '../../components/Landing/live/liveLanding.css';

const ACCEPTED_UPLOAD = '.pdf,.doc,.docx,.txt';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Past this the composer scrolls instead of eating the conversation. */
const MAX_INPUT_HEIGHT = 160;

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
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { messages, send, resolve, reset, stopGenerating, isThinking, isRestoring, error, credits } = agent;
    const isFull = variant === 'full';
    const callActive = live.status === 'connecting' || live.status === 'live';
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

    /**
     * Grow the box to fit what has been typed.
     *
     * A fixed one-row height clipped mid-word as soon as the text wrapped —
     * which the placeholder itself does in the docked panel, so the very first
     * thing anyone saw was a sentence cut in half.
     */
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        // `.cvl-field` draws a real border. `scrollHeight` excludes it while a
        // border-box `height` includes it, so without the difference the field
        // lands two pixels short and grows a scrollbar on the first wrap.
        const border = el.offsetHeight - el.clientHeight;
        el.style.height = `${Math.min(el.scrollHeight + border, MAX_INPUT_HEIGHT)}px`;
    }, [input]);

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

    /*
     * `.cvl-btn-ghost` declares its own 8px radius, and liveLanding.css lands
     * after Tailwind's utilities at the same specificity — so a `rounded-*`
     * utility next to it is dead. Anything that is not 8px has to say so from
     * an inline style, which outranks both.
     */
    const PILL = { borderRadius: '9999px' } as const;
    const iconBtn = 'cvl-btn-ghost grid h-9 w-9 shrink-0 place-items-center disabled:opacity-40';

    /**
     * The workspace is a page of its own, so its title is that page's <h1>.
     * The drawer floats over a page that already has one, where a second <h1>
     * would tell a screen reader the document has two subjects.
     */
    const Title = isFull ? 'h1' : 'h2';

    /** A toolbar toggle that has to read as pressed when it is. */
    const toolbarToggle = (on: boolean) => ({
        className: 'cvl-btn-ghost rounded-lg p-1.5',
        style: on
            ? { background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple-ink)' }
            : undefined,
    });

    return (
        <div className="cvl flex h-full min-h-0" style={{ background: 'transparent' }}>
            {showHistory && (
                <aside
                    className={`${isFull ? 'w-64' : 'w-52'} shrink-0 border-r`}
                    style={{ borderColor: 'var(--cvl-line)' }}
                >
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

            <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${isFull ? 'mx-auto w-full max-w-3xl' : ''}`}>
                <header
                    className="flex items-center gap-2.5 border-b px-4 py-3"
                    style={{ borderColor: 'var(--cvl-line)' }}
                >
                    <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                        style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                    >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {/*
                      * The subtitle exists because a practice round shows two
                      * chats at once. Without it, "Career Agent" and "code
                      * coach" look like the same thing twice, and people cannot
                      * tell which one remembers them.
                      */}
                    <span className="min-w-0">
                        <Title className="text-[14px] font-semibold leading-none tracking-tight">
                            Career Agent
                        </Title>
                        <span className="mt-1 block text-[10.5px] leading-none" style={{ color: 'var(--cvl-muted)' }}>
                            Live coach · remembers you across rounds
                        </span>
                    </span>

                    <div className="ml-auto flex items-center gap-1">
                        {credits && (
                            <span className="cvl-mono mr-1 hidden text-[11px] sm:inline" style={{ color: 'var(--cvl-muted)' }}>
                                {credits.free
                                    ? `${credits.freeTurnsRemaining}/${FREE_AGENT_TURNS_PER_DAY} free today`
                                    : `${credits.creditsRemaining} credits`}
                            </span>
                        )}
                        <button type="button" onClick={() => setShowHistory((v) => !v)} title="History"
                            aria-pressed={showHistory} {...toolbarToggle(showHistory)}>
                            <History className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setShowSettings((v) => !v)} title="Agent settings"
                            aria-pressed={showSettings} {...toolbarToggle(showSettings)}>
                            <Settings2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </header>

                {showSettings && (
                    <div
                        className="border-b px-4 py-3"
                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                    >
                        <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
                            Run without asking
                        </p>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                            Creating resumes, adding jobs in bulk, and anything that spends credits always
                            asks first — that cannot be turned off.
                        </p>
                        <ul className="mt-2.5 space-y-1.5">
                            {AUTO_EXEC_TOOLS.map((t) => {
                                const on = autoExec.tools.includes(t.name);
                                return (
                                    <li key={t.name}>
                                        <button type="button" onClick={() => autoExec.toggle(t.name)}
                                            aria-pressed={on}
                                            className="cvl-btn-ghost flex w-full items-start gap-2.5 p-2 text-left"
                                            style={{ borderRadius: 12 }}>
                                            <span
                                                className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-md border transition-colors"
                                                style={on
                                                    ? { borderColor: 'var(--cvl-cta-bg)', background: 'var(--cvl-cta-bg)', color: 'var(--cvl-cta-ink)' }
                                                    : { borderColor: 'var(--cvl-line)' }}
                                            >
                                                {on && <Check className="h-3 w-3" />}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[12.5px] font-semibold" style={{ color: 'var(--cvl-ink)' }}>{t.label}</span>
                                                <span className="block text-[11px]" style={{ color: 'var(--cvl-muted)' }}>{t.description}</span>
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
                            <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
                                start here
                            </p>
                            <p className="mt-2 text-[19px] font-semibold leading-snug tracking-tight">
                                What are we working on?
                            </p>
                            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                I can practise real interview questions from 301 companies, build your resume,
                                and keep your applications moving.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" onClick={() => void live.start()}
                                    className="cvl-cta inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition">
                                    <AudioLines className="h-3.5 w-3.5" /> Talk to the agent
                                </button>
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="cvl-btn inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold">
                                    <Paperclip className="h-3 w-3" /> Upload my resume
                                </button>
                                {STARTERS.map((s) => (
                                    <button key={s} type="button" onClick={() => void send(s)}
                                        className="cvl-btn min-h-9 rounded-full px-3.5 py-2 text-[12.5px]">
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
                                        <p
                                            className="break-words rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13.5px] leading-6"
                                            style={{ background: 'var(--cvl-cta-bg)', color: 'var(--cvl-cta-ink)' }}
                                        >
                                            {m.via === 'voice' && <Mic className="mr-1 inline h-3 w-3 opacity-70" />}
                                            {m.text}
                                        </p>
                                    ) : (
                                        <div className="flex min-w-0 items-start gap-2.5">
                                            <span
                                                aria-hidden="true"
                                                className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                                                style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                            >
                                                <Sparkles className="h-3.5 w-3.5" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                {/* The tail has to come from the inline style: `.cvl-panel`
                                                    sets a flat 12px radius that would otherwise eat it. */}
                                                <div
                                                    className="cvl-panel whitespace-pre-wrap break-words px-3.5 py-2.5 text-[13.5px] leading-6"
                                                    style={{ borderRadius: '6px 16px 16px 16px' }}
                                                >
                                                    <AgentMessageText
                                                        text={m.text}
                                                        technicalContext={technicalContext}
                                                        workspace={workspace}
                                                    />
                                                    {m.streaming && (
                                                        <span
                                                            className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse align-middle"
                                                            style={{ background: 'var(--cvl-purple)' }}
                                                        />
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
                            <p
                                key={i}
                                className="flex items-start gap-1.5 rounded-xl px-3 py-2 text-[12px]"
                                style={{ background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                            >
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                {msg}
                            </p>
                        ))}
                        <div ref={endRef} />
                    </div>
                </div>

                {callActive && (
                    <div
                        className="flex items-center gap-2.5 border-t px-3 py-2"
                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)' }}
                    >
                        {/* A live pulse reads as "on air" at a glance; the icon alone did not. */}
                        <span aria-hidden="true" className="relative ml-1 flex h-2 w-2 shrink-0">
                            {live.status === 'live' && !live.muted && (
                                <span
                                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                                    style={{ background: 'var(--cvl-green)' }}
                                />
                            )}
                            <span
                                className="relative inline-flex h-2 w-2 rounded-full"
                                style={{
                                    background: live.status === 'connecting' ? 'var(--cvl-amber)'
                                        : live.muted ? 'var(--cvl-danger)' : 'var(--cvl-green)',
                                }}
                            />
                        </span>

                        <span className="min-w-0 flex-1">
                            <span className="cvl-mono block text-[13px] font-semibold leading-tight tabular-nums">
                                {live.status === 'connecting'
                                    ? 'Connecting…'
                                    : `${Math.floor(live.elapsedSeconds / 60)}:${String(live.elapsedSeconds % 60).padStart(2, '0')}`}
                                {live.muted && (
                                    <span className="ml-1.5 text-[11px] font-semibold" style={{ color: 'var(--cvl-danger)' }}>muted</span>
                                )}
                            </span>
                            {live.status === 'live' && (
                                <span className="block truncate text-[10.5px] leading-tight" style={{ color: 'var(--cvl-muted)' }}>
                                    {live.billedCredits} credits{live.capMinutes ? ` · ends at ${live.capMinutes}:00` : ''}
                                </span>
                            )}
                        </span>

                        {live.status === 'live' && (
                            <>
                                <button type="button" onClick={live.toggleMute} aria-pressed={live.muted}
                                    title={live.muted ? 'Unmute' : 'Mute your microphone'}
                                    className="cvl-btn-ghost rounded-lg p-2"
                                    style={live.muted
                                        ? { background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }
                                        : undefined}>
                                    {live.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </button>
                                <button type="button" onClick={live.interrupt} disabled={!live.agentSpeaking}
                                    title="Stop the agent talking"
                                    className="cvl-btn-ghost rounded-lg p-2 disabled:opacity-30">
                                    <Hand className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        <button type="button" onClick={() => void live.stop()}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] font-semibold transition hover:opacity-80"
                            style={{ borderColor: 'var(--cvl-danger)', background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}>
                            <PhoneOff className="h-3.5 w-3.5" /> End
                        </button>
                    </div>
                )}

                {/*
                  * One card, not a row of loose parts. The buttons used to sit
                  * outside the field as free-floating icons, so at rest the
                  * bottom of the panel read as four unrelated objects with the
                  * text box stranded in the middle.
                  */}
                <form onSubmit={submit} className="shrink-0 border-t px-3 pb-3 pt-2.5" style={{ borderColor: 'var(--cvl-line)' }}>
                    <input ref={fileRef} type="file" accept={ACCEPTED_UPLOAD} className="hidden"
                        onChange={(e) => void handleUpload(e.target.files?.[0])} />

                    <div className="cvl-panel p-2">
                        {/*
                          * `border-0` is gone with the raw-grey styling: `.cvl-field`
                          * declares the border the composer is supposed to have, and
                          * the auto-grow measurement now matches what is painted.
                          */}
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                            }}
                            rows={1}
                            placeholder={uploading ? 'Reading your resume…' : callActive ? 'Type, or just keep talking…' : 'Ask anything, or start talking…'}
                            className="cvl-field block w-full resize-none overflow-y-auto px-3 py-2.5 text-[13.5px] leading-6"
                            style={{ maxHeight: MAX_INPUT_HEIGHT }}
                        />

                        <div className="mt-1.5 flex items-center gap-1">
                            <button type="button" title="Upload a resume" aria-label="Upload a resume"
                                disabled={uploading || isThinking} onClick={() => fileRef.current?.click()}
                                className={iconBtn} style={PILL}>
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                            </button>

                            {/*
                              * While a call is up the bar above owns every call
                              * control. Two End buttons a few pixels apart was
                              * the old layout's worst moment.
                              */}
                            {!callActive && (
                                <button type="button" onClick={() => void live.start()}
                                    title="Talk to the agent" aria-label="Talk to the agent"
                                    className="cvl-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold"
                                    style={PILL}>
                                    <AudioLines className="h-4 w-4" />
                                    <span>Talk</span>
                                </button>
                            )}

                            {/*
                              * Always rendered, so its `ml-auto` is the single
                              * thing pushing the send button right. A `sm:`
                              * breakpoint cannot work here: the drawer is a
                              * 384px panel inside a desktop viewport, so it
                              * would show the hint and overflow the row.
                              */}
                            <span aria-hidden="true" className="cvl-mono ml-auto truncate pr-1.5 text-[10px]" style={{ color: 'var(--cvl-faint)' }}>
                                {!isFull ? '' : isThinking ? 'Generating…' : input.trim() ? 'Enter to send' : 'Shift + Enter for a new line'}
                            </span>

                            {isThinking ? (
                                <button type="button" onClick={stopGenerating} title="Stop generating"
                                    aria-label="Stop generating"
                                    className="cvl-btn grid h-9 w-9 shrink-0 place-items-center rounded-full">
                                    <Square className="h-3.5 w-3.5" />
                                </button>
                            ) : (
                                <button type="submit" disabled={!input.trim()} aria-label="Send"
                                    className="cvl-cta grid h-9 w-9 shrink-0 place-items-center rounded-full transition disabled:opacity-40 disabled:shadow-none">
                                    <Send className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CareerAgentPanel;
