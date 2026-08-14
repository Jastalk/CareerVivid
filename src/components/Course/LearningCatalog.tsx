import React, { useState } from 'react';
import { ArrowRight, BookOpen, Braces, CheckCircle2, Gamepad2, GraduationCap, Network, Play, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { InteractiveCourse } from '../../lib/interactiveCourses';
import '../Landing/live/liveLanding.css';

type LearningGoal = 'coding' | 'ai-portfolio' | 'system-design';

interface LearningCatalogProps {
    patternsCourse?: InteractiveCourse;
    systemDesignCourse?: InteractiveCourse;
    patternsLessonTotal: number;
    patternsLessonsDone: number;
    curriculumLessonTotal: number;
    curriculumLessonsDone: number;
    curriculumMinutes: number;
    systemDesignLessonTotal: number;
    systemDesignLessonsDone: number;
    completedLessonCount: number;
    totalLessonCount: number;
    activeLabId?: string;
    courseComplete: boolean;
    onOpenCourse: (courseId: string, destination?: string) => void;
    onOpenQuest: () => void;
}

const goals = [
    { id: 'coding' as const, label: 'Pass coding interviews', icon: Braces },
    { id: 'ai-portfolio' as const, label: 'Build an AI portfolio', icon: Sparkles },
    { id: 'system-design' as const, label: 'Prepare for system design interviews', icon: Network },
];

type Accent = 'purple' | 'green' | 'amber';

const accentTokens: Record<Accent, { ink: string; soft: string }> = {
    purple: { ink: 'var(--cvl-purple)', soft: 'var(--cvl-purple-soft)' },
    green: { ink: 'var(--cvl-green)', soft: 'var(--cvl-green-soft)' },
    amber: { ink: 'var(--cvl-amber)', soft: 'var(--cvl-amber-soft)' },
};

/**
 * Muted, not faint. The eyebrow tier is normally the quietest one, but every
 * eyebrow in this file sits straight on the desk rather than on a panel, and
 * --cvl-faint on --cvl-desk measures 4.47:1 in light mode — under the floor.
 * --cvl-muted is 5.25:1 there. Eyebrows that land on paper keep --cvl-faint.
 */
const Eyebrow: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
    <p id={id} className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
        {children}
    </p>
);

/**
 * A lesson counter with the bar under it. The track is a shade back from the
 * paper it sits on, so an empty bar still reads as a bar.
 */
const LessonProgress: React.FC<{ done: number; total: number; label: string }> = ({ done, total, label }) => {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
        <div className="mt-3">
            <p className="cvl-mono text-[11px]" style={{ color: 'var(--cvl-muted)' }}>{label}</p>
            <div
                className="mt-2 h-2 overflow-hidden rounded-full"
                style={{ background: 'var(--cvl-paper-2)', border: '1px solid var(--cvl-line)' }}
                role="progressbar"
                aria-valuenow={done}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={label}
            >
                <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.max(pct, done > 0 ? 4 : 0)}%`, background: 'var(--cvl-purple)' }}
                />
            </div>
        </div>
    );
};

interface CatalogCard {
    key: string;
    goal: LearningGoal;
    icon: LucideIcon;
    accent: Accent;
    title: string;
    blurb: string;
    meta: string;
    done: number;
    total: number;
    onOpen: () => void;
}

const LearningCatalog: React.FC<LearningCatalogProps> = ({
    patternsCourse,
    systemDesignCourse,
    patternsLessonTotal,
    patternsLessonsDone,
    curriculumLessonTotal,
    curriculumLessonsDone,
    curriculumMinutes,
    systemDesignLessonTotal,
    systemDesignLessonsDone,
    completedLessonCount,
    totalLessonCount,
    activeLabId,
    courseComplete,
    onOpenCourse,
    onOpenQuest,
}) => {
    // Goal selection gives immediate guidance, but intentionally does not persist
    // or change a learner's saved course progress.
    const [selectedGoal, setSelectedGoal] = useState<LearningGoal>('coding');

    const cards: CatalogCard[] = [
        ...(patternsCourse ? [{
            key: patternsCourse.id,
            goal: 'coding' as const,
            icon: Braces,
            accent: 'purple' as const,
            title: 'Coding Interview Patterns',
            blurb: 'Master the most common coding interview patterns through structured lessons and deliberate practice.',
            meta: `${patternsLessonTotal} lessons · ${patternsCourse.chapters.length} patterns`,
            done: patternsLessonsDone,
            total: patternsLessonTotal,
            onOpen: () => onOpenCourse(patternsCourse.id),
        }] : []),
        {
            key: 'ai-agent-curriculum',
            goal: 'ai-portfolio' as const,
            icon: GraduationCap,
            accent: 'green' as const,
            title: 'AI Agent Builder',
            blurb: 'Design, build, and deploy practical AI agents with projects that demonstrate real-world skills.',
            meta: `${curriculumLessonTotal} lessons · ~${Math.max(1, Math.round(curriculumMinutes / 60))} h`,
            done: curriculumLessonsDone,
            total: curriculumLessonTotal,
            onOpen: () => onOpenCourse('ai-agent-curriculum', '/learning/ai-agent-curriculum'),
        },
        ...(systemDesignCourse ? [{
            key: systemDesignCourse.id,
            goal: 'system-design' as const,
            icon: Network,
            accent: 'amber' as const,
            title: 'System Design Interview',
            blurb: 'Build the structured thinking and design skills to tackle complex system design interviews with confidence.',
            meta: `${systemDesignLessonTotal} lessons · 12 modules`,
            done: systemDesignLessonsDone,
            total: systemDesignLessonTotal,
            onOpen: () => onOpenCourse(systemDesignCourse.id, `/learning/${systemDesignCourse.id}`),
        }] : []),
    ];

    return (
        <div className="max-w-none space-y-8">
            <section className="border-b pb-6 sm:pb-8" style={{ borderColor: 'var(--cvl-line)' }}>
                {/*
                  * The h1 matches the sidebar link, so landing here confirms you
                  * clicked the right thing. The goal question was being asked three
                  * times over — as the h1, as a screen-reader heading, and again
                  * above the cards — so it now lives only on the chooser itself.
                  */}
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Learning</h1>
                <p className="mt-3 max-w-2xl text-[14px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                    Pick a goal and we&apos;ll suggest a course. You can switch any time.
                </p>
                <p className="cvl-mono mt-4 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                    {completedLessonCount} / {totalLessonCount} lessons finished across all courses
                </p>
            </section>

            <section aria-labelledby="learning-goals-heading">
                <h2 id="learning-goals-heading" className="mb-3 text-[17px] font-semibold tracking-tight">
                    What do you want to work on?
                </h2>
                <div className="grid gap-3 lg:grid-cols-3">
                    {goals.map(({ id, label, icon: Icon }) => {
                        const isSelected = selectedGoal === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setSelectedGoal(id)}
                                aria-pressed={isSelected}
                                className="cvl-panel cvl-panel-lift flex min-h-[100px] items-center gap-3 p-4 text-left"
                                style={isSelected
                                    ? { borderColor: 'var(--cvl-purple)', background: 'var(--cvl-purple-soft)' }
                                    : undefined}
                            >
                                <span
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                                    style={isSelected
                                        ? { background: 'var(--cvl-paper)', color: 'var(--cvl-purple)' }
                                        : { background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
                                >
                                    <Icon size={20} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1 text-[13.5px] font-semibold">{label}</span>
                                <span
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                                    style={isSelected
                                        ? { borderColor: 'var(--cvl-purple)', color: 'var(--cvl-purple)' }
                                        : { borderColor: 'var(--cvl-line)', color: 'transparent' }}
                                >
                                    <CheckCircle2 size={13} aria-hidden="true" />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section aria-labelledby="core-paths-heading">
                <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                        {/* Third restatement of "pick the one that fits your goal" — the
                            cards below already say which one is recommended. */}
                        <Eyebrow>Courses</Eyebrow>
                        <h2 id="core-paths-heading" className="mt-2 text-[19px] font-semibold tracking-tight">Where to start</h2>
                    </div>
                    {activeLabId && !courseComplete && selectedGoal === 'ai-portfolio' && (
                        <button
                            type="button"
                            onClick={() => onOpenCourse(activeLabId)}
                            className="cvl-cta inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition"
                        >
                            <Play size={14} aria-hidden="true" /> Continue
                        </button>
                    )}
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                    {cards.map((card) => {
                        const isRecommended = selectedGoal === card.goal;
                        const { ink, soft } = accentTokens[card.accent];
                        const Icon = card.icon;
                        return (
                            <article
                                key={card.key}
                                className="cvl-panel cvl-panel-lift flex min-h-[332px] flex-col p-5"
                                style={isRecommended ? { borderColor: 'var(--cvl-purple)' } : undefined}
                            >
                                <span
                                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                                    style={{ background: soft, color: ink }}
                                >
                                    <Icon size={20} aria-hidden="true" />
                                </span>
                                {isRecommended && (
                                    <p className="cvl-mono mt-5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-purple)' }}>
                                        Recommended
                                    </p>
                                )}
                                <h3 className="mt-4 text-[19px] font-semibold leading-snug tracking-tight">{card.title}</h3>
                                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                    {card.blurb}
                                </p>
                                <p className="cvl-mono mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                                    <BookOpen size={13} aria-hidden="true" /> {card.meta}
                                </p>
                                {/* Always rendered, even at zero — an empty track is the
                                    honest reading, and it keeps the three cards aligned. */}
                                <LessonProgress
                                    done={card.done}
                                    total={card.total}
                                    label={`${card.done} / ${card.total} lessons done`}
                                />
                                <button
                                    type="button"
                                    onClick={card.onOpen}
                                    className={`mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition ${isRecommended ? 'cvl-cta' : 'cvl-btn'}`}
                                >
                                    {card.done > 0 ? 'Continue course' : 'Start course'}
                                    <ArrowRight size={15} aria-hidden="true" />
                                </button>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="cvl-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                    >
                        <Gamepad2 size={20} aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold tracking-tight">Brick City Quest</h2>
                        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                            A practical quest to sharpen your fundamentals, build projects, and document your progress consistently.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOpenQuest}
                    className="cvl-btn inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold"
                >
                    Start quest <ArrowRight size={15} aria-hidden="true" />
                </button>
            </section>
        </div>
    );
};

export default LearningCatalog;
