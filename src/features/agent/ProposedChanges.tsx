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
import '../../components/Landing/live/liveLanding.css';

const ENTITY_ICON = {
    resume: FileText,
    job: Briefcase,
    profile: User,
    session: Mic,
} as const;

/**
 * Awaiting a decision reads as amber; a failed write is the one destructive
 * state and gets the danger token rather than a second shade of warning.
 */
const OUTCOME_TONE = {
    approved: { borderColor: 'var(--cvl-green)', background: 'var(--cvl-green-soft)' },
    rejected: { borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' },
    failed: { borderColor: 'var(--cvl-danger)', background: 'var(--cvl-danger-soft)' },
    pending: { borderColor: 'var(--cvl-amber)', background: 'var(--cvl-amber-soft)' },
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

    const tone = OUTCOME_TONE[(proposal.outcome ?? 'pending') as keyof typeof OUTCOME_TONE] ?? OUTCOME_TONE.pending;

    return (
        <div
            className={`mt-3 rounded-xl border text-[13.5px] transition-colors ${proposal.outcome === 'rejected' ? 'opacity-70' : ''}`}
            style={tone}
        >
            <div className="flex items-start gap-2.5 border-b px-3.5 py-2.5" style={{ borderColor: 'var(--cvl-line)' }}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--cvl-muted)' }} />
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">{proposal.summary}</p>
                    <p className="cvl-mono mt-0.5 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
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
                            <dt className="cvl-mono truncate text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--cvl-muted)' }}>
                                {c.label}
                            </dt>
                            <dd className="min-w-0">
                                {c.before !== undefined && (
                                    <span className="mr-1.5 line-through" style={{ color: 'var(--cvl-muted)' }}>{c.before}</span>
                                )}
                                <span className="break-words">{c.after}</span>
                            </dd>
                        </div>
                    ))}
                </dl>

                {proposal.diff.items && (
                    <ul className="cvl-panel-inset mt-2.5 max-h-44 space-y-1 overflow-y-auto p-2 text-[12px]">
                        {proposal.diff.items.map((item, i) => (
                            <li key={i} className="truncate" style={{ color: 'var(--cvl-muted)' }}>
                                · {item}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {proposal.outcome === 'failed' && proposal.error && (
                <p className="flex items-start gap-1.5 px-3.5 pb-2.5 text-[12px]" style={{ color: 'var(--cvl-danger)' }}>
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {proposal.error}
                </p>
            )}

            {!resolved ? (
                <div className="flex gap-2 border-t px-3.5 py-2.5" style={{ borderColor: 'var(--cvl-line)' }}>
                    <button
                        type="button"
                        disabled={disabled || submitting}
                        onClick={() => fire(true)}
                        className="cvl-cta inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50"
                    >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                    </button>
                    <button
                        type="button"
                        disabled={disabled || submitting}
                        onClick={() => fire(false)}
                        className="cvl-btn-ghost inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        Discard
                    </button>
                </div>
            ) : (
                <p
                    className="border-t px-3.5 py-2 text-[12px] font-semibold"
                    style={{ borderColor: 'var(--cvl-line)', color: 'var(--cvl-muted)' }}
                >
                    {proposal.outcome === 'approved' ? '✓ Applied' : proposal.outcome === 'rejected' ? 'Discarded' : 'Failed'}
                </p>
            )}
        </div>
    );
};

export default ProposedChanges;
