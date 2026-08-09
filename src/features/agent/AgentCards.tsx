/**
 * Rich cards for tool results.
 *
 * A company loop or a set of interview questions read badly as prose — the
 * model ends up retyping data it already has, slowly and sometimes wrongly.
 * Rendering the tool's own payload keeps it exact and gives the user something
 * to act on, so a question turns into "practise this" rather than a paragraph.
 */

import React from 'react';
import { ArrowRight, ArrowUpRight, Building2, Layers, Sparkles } from 'lucide-react';
import { navigate } from '../../utils/navigation';
import type { AgentCard } from './useCareerAgent';

const STAGE_TONE: Record<string, string> = {
    screening: 'text-sky-600 dark:text-sky-400',
    coding: 'text-violet-600 dark:text-violet-400',
    systemDesign: 'text-amber-600 dark:text-amber-400',
    behavioral: 'text-emerald-600 dark:text-emerald-400',
    values: 'text-rose-600 dark:text-rose-400',
    final: 'text-indigo-600 dark:text-indigo-400',
};

const shell =
    'rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] shadow-[var(--cv-shadow-card)] ' +
    'backdrop-blur-sm transition-shadow hover:shadow-[var(--cv-shadow-card-hover)] dark:bg-slate-900/60';

interface GuideHit {
    slug: string;
    company: string;
    route: string;
    questionCounts: Record<string, number>;
    totalQuestions: number;
}

const CompanyGuides: React.FC<{ card: AgentCard }> = ({ card }) => {
    const guides = (card.guides ?? []) as GuideHit[];
    if (!guides.length) return null;

    return (
        <div className="mt-3 space-y-2">
            {guides.map((g) => (
                <button
                    key={g.slug}
                    type="button"
                    onClick={() => navigate(g.route)}
                    className={`${shell} group flex w-full items-center gap-3 p-3 text-left`}
                >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)]">
                        <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-sm font-bold text-[var(--cv-text-heading-product)] dark:text-white">
                            {g.company}
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-[var(--cv-text-muted)]">
                            <span>{g.totalQuestions} questions</span>
                            {Object.keys(g.questionCounts).slice(0, 3).map((s) => (
                                <span key={s} className={STAGE_TONE[s] ?? ''}>· {s}</span>
                            ))}
                        </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--cv-text-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
            ))}
        </div>
    );
};

interface QuestionItem {
    questionId?: string;
    stage: string;
    stageLabel: string;
    question: string;
    route?: string;
}

const InterviewQuestions: React.FC<{ card: AgentCard }> = ({ card }) => {
    const questions = (card.questions ?? []) as QuestionItem[];
    if (!questions.length) return null;

    return (
        <div className={`${shell} mt-3 overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-[var(--cv-border-subtle)] px-3.5 py-2.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--cv-action-primary)]" />
                <span className="font-heading text-sm font-bold text-[var(--cv-text-heading-product)] dark:text-white">
                    {String(card.company)}
                </span>
                <span className="ml-auto text-[11px] text-[var(--cv-text-muted)]">
                    {questions.length} question{questions.length > 1 ? 's' : ''}
                </span>
            </div>

            <ol className="divide-y divide-[var(--cv-border-subtle)]">
                {questions.map((q) => (
                    <li key={q.questionId ?? `${q.stage}:${q.question}`} className="px-3.5 py-2.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${STAGE_TONE[q.stage] ?? 'text-[var(--cv-text-muted)]'}`}>
                            {q.stageLabel}
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--cv-text-body-product)]">{q.question}</p>
                        {q.route && (
                            <button
                                type="button"
                                onClick={() => navigate(q.route!)}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--cv-action-primary)] transition-colors hover:text-[var(--cv-action-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)]"
                            >
                                Practice this exact question
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </li>
                ))}
            </ol>

            {typeof card.route === 'string' && (
                <button
                    type="button"
                    onClick={() => navigate(card.route as string)}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--cv-border-subtle)] px-3.5 py-2.5 text-xs font-semibold text-[var(--cv-action-primary)] transition-colors hover:bg-[var(--cv-action-soft-bg)]"
                >
                    <Layers className="h-3.5 w-3.5" />
                    Run the full {String(card.company)} loop
                </button>
            )}
        </div>
    );
};

export const AgentCards: React.FC<{ cards?: AgentCard[] }> = ({ cards }) => {
    if (!cards?.length) return null;
    return (
        <>
            {cards.map((card, i) => {
                if (card.kind === 'company_guides') return <CompanyGuides key={i} card={card} />;
                if (card.kind === 'interview_questions') return <InterviewQuestions key={i} card={card} />;
                return null;
            })}
        </>
    );
};

export default AgentCards;
