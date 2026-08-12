/**
 * Where to go once a company's problem pool is empty.
 *
 * Finishing the last coding problem at a company used to be a dead end: the
 * report closed and the user was back on a quest page with nothing left to
 * clear. The moment someone has just proved they can finish a whole company is
 * the moment to point them at the next one, not to leave them looking for it.
 *
 * The shortcuts are companies whose guides are verified to exist (the same
 * slugs the /interview-studio hub links, checked against QUEST_ROUTE_SLUGS by
 * a test there). Anything broader goes through the hub rather than being
 * guessed at here.
 */

import React from 'react';
import { ArrowRight, PartyPopper, X } from 'lucide-react';
import { navigate } from '../../utils/navigation';

/** Verified quest slugs. Keep in step with the hub links in searchIndexPolicy. */
const SUGGESTED: Array<{ slug: string; name: string }> = [
    { slug: 'google', name: 'Google' },
    { slug: 'meta-facebook', name: 'Meta' },
    { slug: 'openai', name: 'OpenAI' },
    { slug: 'anthropic', name: 'Anthropic' },
    { slug: 'amazon', name: 'Amazon' },
    { slug: 'stripe', name: 'Stripe' },
];

interface Props {
    company: string;
    /** Current company's slug, so we never suggest the one just finished. */
    currentSlug?: string;
    solvedCount: number;
    onClose: () => void;
}

const AllProblemsClearedModal: React.FC<Props> = ({ company, currentSlug, solvedCount, onClose }) => {
    const suggestions = SUGGESTED.filter((s) => s.slug !== currentSlug).slice(0, 5);

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-cleared-title"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <PartyPopper className="h-5 w-5 shrink-0 text-emerald-500" />
                        <h2 id="all-cleared-title" className="text-lg font-black text-[var(--cv-text-heading)]">
                            That&rsquo;s every coding problem at {company}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="shrink-0 rounded-lg p-1 text-[var(--cv-text-muted)] hover:bg-black/5 dark:hover:bg-white/10">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="mb-5 text-sm leading-relaxed text-[var(--cv-text-body)]">
                    {solvedCount} solved. Interviewing at one company teaches you that company;
                    the patterns only stick once you see them asked a different way somewhere else.
                </p>

                <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--cv-text-muted)]">
                    Try next
                </p>
                <div className="mb-4 grid grid-cols-2 gap-2">
                    {suggestions.map((s) => (
                        <button
                            key={s.slug}
                            type="button"
                            onClick={() => navigate(`/quest/${s.slug}`)}
                            className="rounded-xl border border-[var(--cv-border-subtle)] px-3 py-2.5 text-left text-sm font-bold text-[var(--cv-text-heading)] transition-colors hover:border-[var(--cv-action-primary)] hover:bg-[var(--cv-action-soft-bg)]"
                        >
                            {s.name}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/interview-studio')}
                    className="cv-design-button-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
                >
                    Browse all 301 companies
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default AllProblemsClearedModal;
