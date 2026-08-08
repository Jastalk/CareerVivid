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
    onOpen: (id: string) => void;
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
        <div className="flex h-full flex-col bg-[var(--cv-surface-muted)] dark:bg-slate-950/60">
            <div className="flex items-center justify-between border-b border-[var(--cv-border-subtle)] px-3 py-2.5">
                <span className="cv-design-eyebrow text-[10px]">History</span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onNew}
                        title="New conversation"
                        className="rounded-lg p-1.5 text-[var(--cv-text-muted)] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close history"
                        className="rounded-lg p-1.5 text-[var(--cv-text-muted)] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {conversations.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-[var(--cv-text-muted)]">
                        Nothing saved yet.
                    </p>
                ) : (
                    <ul className="space-y-1">
                        {conversations.map((c) => (
                            <li key={c.id} className="group relative">
                                <button
                                    type="button"
                                    onClick={() => onOpen(c.id)}
                                    className={`w-full rounded-xl px-2.5 py-2 pr-8 text-left transition-colors ${
                                        c.id === activeId
                                            ? 'bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-soft-text)]'
                                            : 'hover:bg-black/5 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <span className="flex items-start gap-2">
                                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cv-text-muted)]" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-xs font-medium text-[var(--cv-text-body-product)]">
                                                {c.title}
                                            </span>
                                            <span className="text-[10px] text-[var(--cv-text-muted)]">
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
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--cv-text-muted)] opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:text-red-400"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {conversations.length > 0 && (
                <div className="border-t border-[var(--cv-border-subtle)] p-2">
                    {confirmAll ? (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => { onDeleteAll(); setConfirmAll(false); }}
                                className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500"
                            >
                                Delete all {conversations.length}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmAll(false)}
                                className="rounded-lg px-2 py-1.5 text-[11px] text-[var(--cv-text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmAll(true)}
                            className="w-full rounded-lg px-2 py-1.5 text-[11px] text-[var(--cv-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
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
