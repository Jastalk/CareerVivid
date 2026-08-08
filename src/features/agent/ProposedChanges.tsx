/**
 * The approval card.
 *
 * This is the whole reason writes are safe: the user sees the concrete change
 * before it happens, not a prose question they have to parse. "Shall I add
 * these?" in chat is ambiguous about *what* and gives nothing to audit
 * afterwards.
 */

import React from 'react';
import { Check, X, AlertCircle, FileText, Briefcase, User, Mic } from 'lucide-react';
import type { Proposal } from './useCareerAgent';

const ENTITY_ICON = {
    resume: FileText,
    job: Briefcase,
    profile: User,
    session: Mic,
} as const;

interface Props {
    proposal: Proposal;
    onResolve: (id: string, approve: boolean) => void;
    disabled?: boolean;
}

export const ProposedChanges: React.FC<Props> = ({ proposal, onResolve, disabled }) => {
    const Icon = ENTITY_ICON[proposal.diff.entity] ?? FileText;
    const resolved = Boolean(proposal.outcome);
    // Latches on first click. The server rejects a duplicate approval anyway, but
    // the user should not be able to fire one and see a confusing error.
    const [submitting, setSubmitting] = React.useState(false);
    const fire = (approve: boolean) => {
        if (submitting) return;
        setSubmitting(true);
        onResolve(proposal.id, approve);
    };

    return (
        <div
            className={`mt-3 rounded-xl border text-sm transition-colors ${
                proposal.outcome === 'approved'
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
                    : proposal.outcome === 'rejected'
                      ? 'border-gray-200 bg-gray-50 opacity-70 dark:border-gray-800 dark:bg-gray-900/40'
                      : proposal.outcome === 'failed'
                        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                        : 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/30'
            }`}
        >
            <div className="flex items-start gap-2.5 border-b border-black/5 px-3.5 py-2.5 dark:border-white/10">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{proposal.summary}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {proposal.diff.kind === 'batch' ? 'Batch change' : proposal.diff.kind === 'create' ? 'Creates new' : 'Updates existing'}
                        {' · '}
                        {proposal.tool}
                    </p>
                </div>
            </div>

            <div className="px-3.5 py-2.5">
                <dl className="space-y-1.5">
                    {proposal.diff.changes.map((c, i) => (
                        <div key={i} className="grid grid-cols-[7rem_1fr] gap-2">
                            <dt className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {c.label}
                            </dt>
                            <dd className="min-w-0 text-gray-800 dark:text-gray-200">
                                {c.before !== undefined && (
                                    <span className="mr-1.5 text-gray-400 line-through dark:text-gray-500">{c.before}</span>
                                )}
                                <span className="break-words">{c.after}</span>
                            </dd>
                        </div>
                    ))}
                </dl>

                {proposal.diff.items && (
                    <ul className="mt-2.5 max-h-44 space-y-1 overflow-y-auto rounded-lg bg-white/70 p-2 text-xs dark:bg-black/20">
                        {proposal.diff.items.map((item, i) => (
                            <li key={i} className="truncate text-gray-700 dark:text-gray-300">
                                · {item}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {proposal.outcome === 'failed' && proposal.error && (
                <p className="flex items-start gap-1.5 px-3.5 pb-2.5 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {proposal.error}
                </p>
            )}

            {!resolved ? (
                <div className="flex gap-2 border-t border-black/5 px-3.5 py-2.5 dark:border-white/10">
                    <button
                        type="button"
                        disabled={disabled || submitting}
                        onClick={() => fire(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                    >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                    </button>
                    <button
                        type="button"
                        disabled={disabled || submitting}
                        onClick={() => fire(false)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-black/5 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/10"
                    >
                        <X className="h-3.5 w-3.5" />
                        Discard
                    </button>
                </div>
            ) : (
                <p className="border-t border-black/5 px-3.5 py-2 text-xs font-medium text-gray-600 dark:border-white/10 dark:text-gray-400">
                    {proposal.outcome === 'approved' ? '✓ Applied' : proposal.outcome === 'rejected' ? 'Discarded' : 'Failed'}
                </p>
            )}
        </div>
    );
};

export default ProposedChanges;
