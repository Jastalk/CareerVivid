/**
 * Saved conversations — open, delete one, delete all.
 *
 * Delete is a real delete, and it is deliberately one click plus a confirm
 * rather than buried in settings. People ask the career agent about layoffs,
 * salaries, and visa status; "how do I get rid of that" should not be a hunt.
 */

import React, { useState } from 'react';
import { MessageSquare, Trash2, X, Plus } from 'lucide-react';
import type { ConversationSummary } from './useCareerAgent';
import '../../components/Landing/live/liveLanding.css';

const relative = (ms: number): string => {
    if (!ms) return '';
    const mins = Math.floor((Date.now() - ms) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

interface Props {
    conversations: ConversationSummary[];
    activeId: string | null;
    onOpen: (id: string, title: string) => void;
    onDelete: (id: string) => void;
    onDeleteAll: () => void;
    onNew: () => void;
    onClose: () => void;
}

export const AgentHistory: React.FC<Props> = ({
    conversations, activeId, onOpen, onDelete, onDeleteAll, onNew, onClose,
}) => {
    const [confirmAll, setConfirmAll] = useState(false);

    return (
        <div className="flex h-full flex-col" style={{ background: 'var(--cvl-paper-2)' }}>
            <div
                className="flex items-center justify-between border-b px-3 py-2.5"
                style={{ borderColor: 'var(--cvl-line)' }}
            >
                <span className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
                    History
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onNew}
                        title="New conversation"
                        className="cvl-btn-ghost rounded-lg p-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close history"
                        className="cvl-btn-ghost rounded-lg p-1.5"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {conversations.length === 0 ? (
                    <p className="px-2 py-6 text-center text-[12px]" style={{ color: 'var(--cvl-muted)' }}>
                        Nothing saved yet.
                    </p>
                ) : (
                    <ul className="space-y-1">
                        {conversations.map((c) => (
                            <li key={c.id} className="group relative">
                                <button
                                    type="button"
                                    onClick={() => onOpen(c.id, c.title)}
                                    className={`w-full px-2.5 py-2 pr-8 text-left ${
                                        c.id === activeId ? '' : 'cvl-btn-ghost'
                                    }`}
                                    /*
                                     * The radius is set inline on both branches on purpose.
                                     * `.cvl-btn-ghost` carries its own 8px and lands after
                                     * Tailwind's utilities, so a `rounded-xl` in the class
                                     * list would apply to the active row only — selecting a
                                     * conversation would change its corners as well as its
                                     * colour.
                                     */
                                    style={c.id === activeId
                                        ? { borderRadius: 12, background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple-ink)' }
                                        : { borderRadius: 12 }}
                                >
                                    <span className="flex items-start gap-2">
                                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--cvl-muted)' }} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[12.5px] font-medium">
                                                {c.title}
                                            </span>
                                            <span className="cvl-mono text-[10.5px]" style={{ color: 'var(--cvl-muted)' }}>
                                                {c.turnCount} messages · {relative(c.updatedAt)}
                                            </span>
                                        </span>
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(c.id)}
                                    title="Delete this conversation"
                                    aria-label={`Delete ${c.title}`}
                                    // Revealed on hover, but always reachable by keyboard.
                                    className="cvl-btn-ghost absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 opacity-0 focus:opacity-100 group-hover:opacity-100"
                                    /*
                                     * `.cvl-btn-ghost` sets the `transition` shorthand, which
                                     * resets transition-property and drops opacity from it —
                                     * so `transition-opacity` never survives. Restate the
                                     * whole transition here, where it outranks the class.
                                     */
                                    style={{
                                        color: 'var(--cvl-danger)',
                                        transition: 'opacity 160ms ease, background 160ms ease, color 160ms ease',
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {conversations.length > 0 && (
                <div className="border-t p-2" style={{ borderColor: 'var(--cvl-line)' }}>
                    {confirmAll ? (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => { onDeleteAll(); setConfirmAll(false); }}
                                className="flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition hover:opacity-80"
                                style={{ borderColor: 'var(--cvl-danger)', background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                            >
                                Delete all {conversations.length}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmAll(false)}
                                className="cvl-btn-ghost rounded-lg px-2 py-1.5 text-[11px]"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmAll(true)}
                            className="cvl-btn-ghost w-full rounded-lg px-2 py-1.5 text-[11px]"
                            style={{ color: 'var(--cvl-danger)' }}
                        >
                            Delete all conversations
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default AgentHistory;
