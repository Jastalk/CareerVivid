/**
 * The Career Agent conversation.
 *
 * ONE component, two layouts. `variant="drawer"` is the docked side panel;
 * `variant="full"` is the /agent workspace. Building these as two components
 * would guarantee they drift — the drawer would get a fix the workspace didn't.
 */

import React, { useEffect, useRef, useState } from 'react';
// This app has no <Router>: routing is pushState + a popstate listener in
// App.tsx. react-router's hooks throw outside a Router provider.
import { navigate } from '../../utils/navigation';
import { Send, Sparkles, RotateCcw, AlertCircle, Paperclip, Loader2, Mic, PhoneOff, AudioLines } from 'lucide-react';
import { useCareerAgent, type AgentEffect } from './useCareerAgent';
import { ProposedChanges } from './ProposedChanges';
import { FREE_AGENT_TURNS_PER_DAY } from '../../config/creditCosts';
import { parseResumeFromFile } from '../../services/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveCareerAgent } from './useLiveCareerAgent';
import { TaskPlan } from './TaskPlan';

const ACCEPTED_UPLOAD = '.pdf,.doc,.docx,.txt';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Shown when the conversation is empty. Concrete beats "how can I help?". */
const STARTERS = [
    'Help me create my first resume',
    'Set up my job tracker',
    'What should I work on next?',
    'Tailor my resume for a role',
];

interface Props {
    variant?: 'drawer' | 'full';
    route: string;
    entity?: { type: 'resume' | 'job' | 'course'; id: string };
    autoExecTools?: string[];
    onClose?: () => void;
}

export const CareerAgentPanel: React.FC<Props> = ({
    variant = 'drawer',
    route,
    entity,
    autoExecTools,
}) => {
    const { currentUser } = useAuth();
    const [input, setInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // The realtime agent: talks, plans, and calls tools mid-conversation.
    const live = useLiveCareerAgent({ route, entity, onEffect: (e) => handleEffect(e as AgentEffect) });

    const handleEffect = (effect: AgentEffect) => {
        // A tool asked to open voice. The user already approved it on the card —
        // startVoiceSession is a high_write tool — so this is the execution step.
        if (effect.startVoice) {
            void live.start();
            return;
        }

        const target = effect.navigate ?? effect.route;
        // Same-origin app paths only. The tool already validates this server-side;
        // re-checking here means a compromised response still cannot redirect.
        if (target && target.startsWith('/') && !target.startsWith('//')) {
            navigate(target);
        }
    };

    const { messages, send, resolve, reset, isThinking, error, credits } = useCareerAgent({
        route,
        entity,
        autoExecTools,
        onEffect: handleEffect,
    });

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const submit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const text = input;
        setInput('');
        void send(text);
    };

    /**
     * Parse the upload on the client, then hand the agent the structured result.
     *
     * Parsing stays here because `parseResumeFromFile` already handles PDF and
     * DOCX and is the same path the resume builder uses. The agent only needs
     * the fields, not the file.
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
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error('Could not read that file.'));
                reader.readAsDataURL(file);
            });

            const parsed = await parseResumeFromFile(currentUser.uid, dataUrl, file.type, 'English');
            await send(
                `I uploaded my resume (${file.name}). Turn it into a CareerVivid resume.`,
                { type: 'parsed_resume', data: parsed },
            );
        } catch (err: any) {
            setUploadError(err?.message ?? 'Could not read that resume.');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const isFull = variant === 'full';

    return (
        <div className={`flex h-full flex-col ${isFull ? 'mx-auto w-full max-w-3xl' : ''}`}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Career Agent</h2>
                </div>
                <div className="flex items-center gap-3">
                    {credits && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {credits.free
                                ? `${credits.freeTurnsRemaining}/${FREE_AGENT_TURNS_PER_DAY} free today`
                                : `${credits.creditsRemaining} credits`}
                        </span>
                    )}
                    {messages.length > 0 && (
                        <button
                            type="button"
                            onClick={reset}
                            title="Start over"
                            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto px-4 py-4 ${isFull ? 'space-y-5' : 'space-y-4'}`}>
                {messages.length === 0 && (
                    <div className="pt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            I can set up your resume, build your job tracker, and plan what to learn next.
                            Where do you want to start?
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void live.start()}
                                className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                            >
                                <AudioLines className="h-3 w-3" />
                                Talk to the agent
                            </button>
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-full border border-gray-900 px-3 py-1.5 text-xs font-medium text-gray-900 transition-colors hover:bg-gray-900 hover:text-white dark:border-gray-100 dark:text-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-900"
                            >
                                <Paperclip className="h-3 w-3" />
                                Upload my resume
                            </button>
                            {STARTERS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => void send(s)}
                                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m) => (
                    <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
                        <div className={m.role === 'user' ? 'max-w-[85%]' : 'w-full'}>
                            {m.role === 'user' ? (
                                <p className="rounded-2xl rounded-br-sm bg-gray-900 px-3.5 py-2 text-sm text-white dark:bg-white dark:text-gray-900">
                                    {m.text}
                                </p>
                            ) : m.pending ? (
                                <div className="flex gap-1 py-1">
                                    {[0, 150, 300].map((d) => (
                                        <span
                                            key={d}
                                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                                            style={{ animationDelay: `${d}ms` }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                                        {m.text}
                                    </div>
                                    {m.proposals?.map((p) => (
                                        <ProposedChanges
                                            key={p.id}
                                            proposal={p}
                                            onResolve={(id, approve) => void resolve(id, approve)}
                                            disabled={isThinking}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {live.error && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {live.error}
                    </p>
                )}
                {uploadError && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {uploadError}
                    </p>
                )}
                {live.plan && (
                    <div className="pt-1">
                        <TaskPlan plan={live.plan} />
                    </div>
                )}

                {live.turns.map((t) => (
                    <div key={t.id} className={t.role === 'user' ? 'flex justify-end' : ''}>
                        <p
                            className={
                                t.role === 'user'
                                    ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-gray-900 px-3.5 py-2 text-sm text-white dark:bg-white dark:text-gray-900'
                                    : 'text-sm leading-relaxed text-gray-800 dark:text-gray-200'
                            }
                        >
                            {t.text}
                        </p>
                    </div>
                ))}

                {live.proposals.map((p) => (
                    <ProposedChanges
                        key={p.id}
                        proposal={p}
                        onResolve={(id, approve) => void live.resolveProposal(id, approve)}
                    />
                ))}

                {error && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {error}
                    </p>
                )}
                <div ref={endRef} />
            </div>

            {(live.status === 'connecting' || live.status === 'live') && (
                <div className="flex items-center gap-3 border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-800 dark:bg-amber-950/40">
                    <Mic className={`h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 ${live.status === 'live' ? 'animate-pulse' : ''}`} />
                    <span className="flex-1 text-gray-800 dark:text-gray-200">
                        {live.status === 'connecting'
                            ? 'Connecting…'
                            : `Live · ${Math.floor(live.elapsedSeconds / 60)}:${String(live.elapsedSeconds % 60).padStart(2, '0')}`}
                        {live.status === 'live' && (
                            <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
                                · {live.billedCredits} credits used{live.capMinutes ? ` · ends at ${live.capMinutes}:00` : ''}
                            </span>
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={() => void live.stop()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-gray-900"
                    >
                        <PhoneOff className="h-3.5 w-3.5" />
                        End
                    </button>
                </div>
            )}

            <form onSubmit={submit} className="border-t border-gray-200 p-3 dark:border-gray-800">
                <div className="flex items-end gap-2">
                    <input
                        ref={fileRef}
                        type="file"
                        accept={ACCEPTED_UPLOAD}
                        className="hidden"
                        onChange={(e) => void handleUpload(e.target.files?.[0])}
                    />
                    <button
                        type="button"
                        title="Upload a resume"
                        aria-label="Upload a resume"
                        disabled={uploading || isThinking}
                        onClick={() => fileRef.current?.click()}
                        className="rounded-xl border border-gray-200 p-2.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    </button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) submit(e as unknown as React.FormEvent);
                        }}
                        rows={1}
                        placeholder={uploading ? 'Reading your resume…' : 'Ask, or upload your resume…'}
                        className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                    <button
                        type="button"
                        title={live.status === 'live' ? 'End the call' : 'Talk to the agent'}
                        aria-label={live.status === 'live' ? 'End the call' : 'Talk to the agent'}
                        disabled={live.status === 'connecting' || live.status === 'closing'}
                        onClick={() => (live.status === 'live' ? void live.stop() : void live.start())}
                        className={`rounded-xl p-2.5 transition-colors disabled:opacity-40 ${
                            live.status === 'live'
                                ? 'bg-red-600 text-white hover:bg-red-500'
                                : 'border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                    >
                        {live.status === 'connecting' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : live.status === 'live' ? (
                            <PhoneOff className="h-4 w-4" />
                        ) : (
                            <AudioLines className="h-4 w-4" />
                        )}
                    </button>
                    <button
                        type="submit"
                        disabled={!input.trim() || isThinking}
                        className="rounded-xl bg-gray-900 p-2.5 text-white transition-colors hover:bg-gray-700 disabled:opacity-40 dark:bg-white dark:text-gray-900"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CareerAgentPanel;
