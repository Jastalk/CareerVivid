/**
 * Rich cards for tool results.
 *
 * A company loop or a set of interview questions read badly as prose — the
 * model ends up retyping data it already has, slowly and sometimes wrongly.
 * Rendering the tool's own payload keeps it exact and gives the user something
 * to act on, so a question turns into "practise this" rather than a paragraph.
 */

import React from 'react';
import { ArrowRight, ArrowUpRight, Building2, ClipboardCheck, Layers, Sparkles } from 'lucide-react';
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

const SCORE_LABEL: Record<string, string> = {
    overall: 'Overall',
    communication: 'Communication',
    problemSolving: 'Problem solving',
    experience: 'Experience',
    roleAlignment: 'Role fit',
    leadership: 'Leadership',
};

/** Matches the report screen's bands, so one score never reads two ways. */
const scoreTone = (n: number): string =>
    n >= 75 ? 'text-emerald-600 dark:text-emerald-400'
        : n >= 60 ? 'text-amber-600 dark:text-amber-400'
            : 'text-rose-600 dark:text-rose-400';

/**
 * The report the agent just read, shown as the user's own numbers.
 *
 * Without this the model paraphrases six scores into a paragraph — slower, and
 * it drifts. The card is the record; the coaching in the message beside it is
 * the part a card cannot do.
 */
const InterviewReport: React.FC<{ card: AgentCard }> = ({ card }) => {
    const scores = (card.scores ?? {}) as Record<string, number>;
    const entries = Object.entries(scores).filter(([, v]) => typeof v === 'number');
    if (!entries.length) return null;

    const overall = scores.overall;
    const previous = (card.attempt as { previousOverall?: number } | undefined)?.previousOverall;
    const delta = typeof overall === 'number' && typeof previous === 'number' ? overall - previous : null;
    const skills = Array.isArray(card.skills) ? (card.skills as string[]) : [];

    return (
        <div className={`${shell} mt-3 overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-[var(--cv-border-subtle)] px-3.5 py-2.5">
                <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-[var(--cv-action-primary)]" />
                <span className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-[var(--cv-text-heading-product)] dark:text-white">
                    {String(card.role || 'Practice interview')}
                    {card.company ? (
                        <span className="font-normal text-[var(--cv-text-muted)]"> · {String(card.company)}</span>
                    ) : null}
                </span>
                {typeof overall === 'number' && (
                    <span className={`shrink-0 font-heading text-sm font-bold ${scoreTone(overall)}`}>
                        {overall}
                        {delta !== null && delta !== 0 && (
                            <span className="ml-1 text-[11px] font-medium text-[var(--cv-text-muted)]">
                                {delta > 0 ? '+' : ''}{delta}
                            </span>
                        )}
                    </span>
                )}
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                {entries
                    .filter(([k]) => k !== 'overall')
                    .map(([k, v]) => (
                        <div key={k} className="flex items-baseline justify-between gap-2">
                            <dt className="truncate text-[11px] text-[var(--cv-text-muted)]">{SCORE_LABEL[k] ?? k}</dt>
                            <dd className={`shrink-0 text-xs font-semibold ${scoreTone(v)}`}>{v}</dd>
                        </div>
                    ))}
            </dl>

            {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-[var(--cv-border-subtle)] px-3.5 py-2.5">
                    {skills.map((s) => (
                        <span
                            key={s}
                            className="rounded-full bg-[var(--cv-action-soft-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--cv-action-primary)]"
                        >
                            {s}
                        </span>
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={() => navigate('/interview-studio')}
                className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--cv-border-subtle)] px-3.5 py-2.5 text-xs font-semibold text-[var(--cv-action-primary)] transition-colors hover:bg-[var(--cv-action-soft-bg)]"
            >
                <Layers className="h-3.5 w-3.5" />
                Open the full report
            </button>
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
                if (card.kind === 'interview_report') return <InterviewReport key={i} card={card} />;
                return null;
            })}
        </>
    );
};

export default AgentCards;
