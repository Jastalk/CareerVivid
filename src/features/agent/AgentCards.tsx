/**
 * Rich cards for tool results.
 *
 * A company loop or a set of interview questions read badly as prose — the
 * model ends up retyping data it already has, slowly and sometimes wrongly.
 * Rendering the tool's own payload keeps it exact and gives the user something
 * to act on, so a question turns into "practise this" rather than a paragraph.
 */

import React from 'react';
import React2 from 'react';
import { ArrowRight, ArrowUpRight, Building2, Check, ClipboardCheck, Layers, Sparkles, Wrench, X } from 'lucide-react';
import { applyCodeEdit, canApplyCodeEdits } from './codeEditBus';
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


/**
 * An edit the agent wants to make to the open editor, awaiting approval.
 *
 * Rendered as a real diff rather than prose because the user is approving an
 * overwrite of their own work, and "I fixed line 5" is not enough to consent
 * to. Only changed lines are shown — a 40-line function with one broken
 * bracket should not make them read 40 lines.
 *
 * `syntax` and `logic` are labelled differently on purpose: one cannot change
 * what their code does and the other is the whole point of the exercise, and
 * the user deserves to know which they are about to accept.
 */
const CodeEditProposal: React.FC<{ card: AgentCard }> = ({ card }) => {
    const nextCode = String(card.nextCode ?? '');
    const baseCode = String(card.baseCode ?? '');
    const editKind = card.editKind === 'logic' ? 'logic' : 'syntax';
    const [state, setState] = React2.useState<'pending' | 'applied' | 'dismissed'>('pending');
    const [failure, setFailure] = React2.useState('');

    if (!nextCode) return null;

    const before = baseCode.split('\n');
    const after = nextCode.split('\n');
    const changed: Array<{ line: number; from?: string; to?: string }> = [];
    for (let i = 0; i < Math.max(before.length, after.length); i++) {
        if (before[i] !== after[i]) changed.push({ line: i + 1, from: before[i], to: after[i] });
    }

    const apply = () => {
        const result = applyCodeEdit({
            nextCode,
            baseCode,
            language: String(card.language ?? 'javascript'),
            kind: editKind,
            summary: String(card.summary ?? ''),
        });
        if (result.applied) setState('applied');
        else setFailure(result.reason ?? 'That edit could not be applied.');
    };

    return (
        <div className={`${shell} overflow-hidden p-4`}>
            <div className="mb-2 flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="text-xs font-black uppercase tracking-wide text-[var(--cv-text-muted)]">
                    {editKind === 'syntax' ? 'Makes your code run' : 'Changes what your code does'}
                </span>
            </div>
            <p className="mb-3 text-sm font-semibold text-[var(--cv-text-heading)]">{String(card.summary ?? '')}</p>

            {changed.length > 0 && (
                <div className="mb-3 overflow-x-auto rounded-lg border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-muted)] p-2.5 font-mono text-[11px] leading-relaxed">
                    {changed.slice(0, 12).map((c) => (
                        <div key={c.line}>
                            {c.from !== undefined && (
                                <div className="text-red-600 dark:text-red-400">- {c.line}  {c.from}</div>
                            )}
                            {c.to !== undefined && (
                                <div className="text-emerald-700 dark:text-emerald-400">+ {c.line}  {c.to}</div>
                            )}
                        </div>
                    ))}
                    {changed.length > 12 && (
                        <div className="pt-1 text-[var(--cv-text-muted)]">…and {changed.length - 12} more lines</div>
                    )}
                </div>
            )}

            {state === 'pending' && !failure && (
                canApplyCodeEdits() ? (
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={apply}
                            className="cv-design-button-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black">
                            <Check className="h-3 w-3" />
                            Apply to my editor
                        </button>
                        <button type="button" onClick={() => setState('dismissed')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cv-border-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--cv-text-body)]">
                            <X className="h-3 w-3" />
                            No thanks
                        </button>
                    </div>
                ) : (
                    <p className="text-xs text-[var(--cv-text-muted)]">
                        Open the coding round to apply this.
                    </p>
                )
            )}

            {state === 'applied' && (
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    Applied — use Undo in the editor if you want it back
                </p>
            )}
            {state === 'dismissed' && (
                <p className="text-xs text-[var(--cv-text-muted)]">Dismissed. Nothing changed.</p>
            )}
            {failure && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{failure}</p>}
        </div>
    );
};

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
                if (card.kind === 'code_edit_proposal') return <CodeEditProposal key={i} card={card} />;
                return null;
            })}
        </>
    );
};

export default AgentCards;
