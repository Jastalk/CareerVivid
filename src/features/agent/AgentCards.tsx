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
import { openAgentReport } from './reportViewer';
import { navigate } from '../../utils/navigation';
import type { AgentCard } from './useCareerAgent';
import '../../components/Landing/live/liveLanding.css';

/**
 * The token set carries three accents, so the six loop stages share them in
 * pairs rather than reaching for six unrelated hues. The label still names the
 * stage; the colour only groups them.
 */
const STAGE_TONE: Record<string, string> = {
    screening: 'var(--cvl-purple)',
    coding: 'var(--cvl-purple)',
    systemDesign: 'var(--cvl-amber)',
    behavioral: 'var(--cvl-green)',
    values: 'var(--cvl-amber)',
    final: 'var(--cvl-purple)',
};

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
        <div className="cvl-panel mt-3 overflow-hidden p-4">
            <div className="mb-2 flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--cvl-purple)' }} />
                <span className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                    {editKind === 'syntax' ? 'Makes your code run' : 'Changes what your code does'}
                </span>
            </div>
            <p className="mb-3 text-[13.5px] font-semibold">{String(card.summary ?? '')}</p>

            {changed.length > 0 && (
                <div className="cvl-panel-inset cvl-mono mb-3 overflow-x-auto p-2.5 text-[11px] leading-relaxed">
                    {changed.slice(0, 12).map((c) => (
                        <div key={c.line}>
                            {c.from !== undefined && (
                                <div style={{ color: 'var(--cvl-danger)' }}>- {c.line}  {c.from}</div>
                            )}
                            {c.to !== undefined && (
                                <div style={{ color: 'var(--cvl-green)' }}>+ {c.line}  {c.to}</div>
                            )}
                        </div>
                    ))}
                    {changed.length > 12 && (
                        <div className="pt-1" style={{ color: 'var(--cvl-muted)' }}>…and {changed.length - 12} more lines</div>
                    )}
                </div>
            )}

            {state === 'pending' && !failure && (
                canApplyCodeEdits() ? (
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={apply}
                            className="cvl-cta inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition">
                            <Check className="h-3 w-3" />
                            Apply to my editor
                        </button>
                        <button type="button" onClick={() => setState('dismissed')}
                            className="cvl-btn inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold">
                            <X className="h-3 w-3" />
                            No thanks
                        </button>
                    </div>
                ) : (
                    <p className="text-[12px]" style={{ color: 'var(--cvl-muted)' }}>
                        Open the coding round to apply this.
                    </p>
                )
            )}

            {state === 'applied' && (
                <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--cvl-green)' }}>
                    <Check className="h-3 w-3" />
                    Applied — use Undo in the editor if you want it back
                </p>
            )}
            {state === 'dismissed' && (
                <p className="text-[12px]" style={{ color: 'var(--cvl-muted)' }}>Dismissed. Nothing changed.</p>
            )}
            {failure && <p className="text-[12px] font-semibold" style={{ color: 'var(--cvl-danger)' }}>{failure}</p>}
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
                    className="cvl-panel cvl-panel-lift group flex w-full items-center gap-3 p-3 text-left"
                >
                    <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                        style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                    >
                        <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">
                            {g.company}
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                            <span>{g.totalQuestions} questions</span>
                            {Object.keys(g.questionCounts).slice(0, 3).map((s) => (
                                <span key={s} style={{ color: STAGE_TONE[s] ?? 'var(--cvl-muted)' }}>· {s}</span>
                            ))}
                        </span>
                    </span>
                    <ArrowUpRight
                        className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        style={{ color: 'var(--cvl-faint)' }}
                    />
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
        <div className="cvl-panel mt-3 overflow-hidden">
            <div className="flex items-center gap-2 border-b px-3.5 py-2.5" style={{ borderColor: 'var(--cvl-line)' }}>
                <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--cvl-purple)' }} />
                <span className="text-[13.5px] font-semibold">
                    {String(card.company)}
                </span>
                <span className="cvl-mono ml-auto text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                    {questions.length} question{questions.length > 1 ? 's' : ''}
                </span>
            </div>

            <ol>
                {questions.map((q) => (
                    <li
                        key={q.questionId ?? `${q.stage}:${q.question}`}
                        className="border-t px-3.5 py-2.5 first:border-t-0"
                        style={{ borderColor: 'var(--cvl-line)' }}
                    >
                        <span
                            className="cvl-mono text-[10px] uppercase tracking-[0.18em]"
                            style={{ color: STAGE_TONE[q.stage] ?? 'var(--cvl-muted)' }}
                        >
                            {q.stageLabel}
                        </span>
                        <p className="mt-1 text-[13.5px] leading-relaxed">{q.question}</p>
                        {q.route && (
                            <button
                                type="button"
                                onClick={() => navigate(q.route!)}
                                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold transition hover:opacity-80"
                                style={{ color: 'var(--cvl-purple)' }}
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
                    className="flex w-full items-center justify-center gap-1.5 border-t px-3.5 py-2.5 text-[12px] font-semibold transition hover:opacity-80"
                    style={{ borderColor: 'var(--cvl-line)', color: 'var(--cvl-purple)' }}
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
    n >= 75 ? 'var(--cvl-green)'
        : n >= 60 ? 'var(--cvl-amber)'
            : 'var(--cvl-danger)';

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
        <div className="cvl-panel mt-3 overflow-hidden">
            <div className="flex items-center gap-2 border-b px-3.5 py-2.5" style={{ borderColor: 'var(--cvl-line)' }}>
                <ClipboardCheck className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--cvl-purple)' }} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                    {String(card.role || 'Practice interview')}
                    {card.company ? (
                        <span className="font-normal" style={{ color: 'var(--cvl-muted)' }}> · {String(card.company)}</span>
                    ) : null}
                </span>
                {typeof overall === 'number' && (
                    <span className="shrink-0 text-[14px] font-bold" style={{ color: scoreTone(overall) }}>
                        {overall}
                        {delta !== null && delta !== 0 && (
                            <span className="ml-1 text-[11px] font-medium" style={{ color: 'var(--cvl-muted)' }}>
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
                            <dt className="truncate text-[11px]" style={{ color: 'var(--cvl-muted)' }}>{SCORE_LABEL[k] ?? k}</dt>
                            <dd className="shrink-0 text-[12px] font-semibold" style={{ color: scoreTone(v) }}>{v}</dd>
                        </div>
                    ))}
            </dl>

            {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t px-3.5 py-2.5" style={{ borderColor: 'var(--cvl-line)' }}>
                    {skills.map((s) => (
                        <span
                            key={s}
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple-ink)' }}
                        >
                            {s}
                        </span>
                    ))}
                </div>
            )}

            {/*
              * The card names its own report — shapeReport puts `sessionId` and
              * `analysisId` on it — so this opens that one over the current
              * page. It used to navigate to /interview-studio no matter which
              * report the card described, which dropped the user on the
              * practice catalog and discarded the page they were on.
              *
              * The catalog stays as the fallback for a card without an id,
              * which is the one case where there is nothing specific to open.
              */}
            <button
                type="button"
                onClick={() => {
                    const sessionId = typeof card.sessionId === 'string' ? card.sessionId : '';
                    if (!sessionId) {
                        navigate('/interview-studio');
                        return;
                    }
                    openAgentReport({
                        sessionId,
                        analysisId: typeof card.analysisId === 'string' && card.analysisId ? card.analysisId : undefined,
                    });
                }}
                className="flex w-full items-center justify-center gap-1.5 border-t px-3.5 py-2.5 text-[12px] font-semibold transition hover:opacity-80"
                style={{ borderColor: 'var(--cvl-line)', color: 'var(--cvl-purple)' }}
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
