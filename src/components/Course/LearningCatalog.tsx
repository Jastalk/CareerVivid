import React, { useState } from 'react';
import { ArrowRight, BookOpen, Braces, CheckCircle2, Gamepad2, GraduationCap, Network, Play, Sparkles } from 'lucide-react';
import type { InteractiveCourse } from '../../lib/interactiveCourses';

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

const selectedCardClass = 'border-[var(--cv-action-soft-border)] bg-[var(--cv-action-soft-bg)]/70';
const defaultCardClass = 'border-[var(--cv-border-product)] bg-[var(--cv-surface)]';

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

    return (
        <div className="max-w-none space-y-6">
            <section className="border-b border-[var(--cv-border-product)] pb-6 sm:pb-8">
                <p className="cv-design-eyebrow">Learning</p>
                <h1 className="cv-design-title mt-3 text-3xl sm:text-4xl">What do you want to achieve today?</h1>
                <p className="cv-design-body mt-3 max-w-2xl text-sm sm:text-base">Choose a path based on the career goal you want to make progress on now. You can switch at any time.</p>
                <p className="mt-4 text-xs font-bold text-[var(--cv-text-muted)]">{completedLessonCount} / {totalLessonCount} lessons finished across all courses</p>
            </section>

            <section aria-labelledby="learning-goals-heading">
                <h2 id="learning-goals-heading" className="sr-only">Choose your learning goal</h2>
                <div className="grid gap-3 lg:grid-cols-3">
                    {goals.map(({ id, label, icon: Icon }) => {
                        const isSelected = selectedGoal === id;
                        return (
                            <button key={id} type="button" onClick={() => setSelectedGoal(id)} aria-pressed={isSelected}
                                className={`flex min-h-[112px] items-center gap-3 rounded-xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--cv-focus-ring)] ${isSelected ? 'border-[var(--cv-action-primary)] bg-[var(--cv-action-soft-bg)] shadow-[var(--cv-shadow-card)]' : 'border-[var(--cv-border-product)] bg-[var(--cv-surface)] hover:border-[var(--cv-border-accent)] hover:bg-[var(--cv-neutral-25)]'}`}>
                                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-[var(--cv-purple-50)] text-[var(--cv-action-primary)]' : 'bg-[var(--cv-amber-50)] text-[var(--cv-text-body)]'}`}><Icon size={20} /></span>
                                <span className="min-w-0 flex-1 text-sm font-bold text-[var(--cv-text-heading)]">{label}</span>
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[var(--cv-action-primary)] bg-[var(--cv-action-primary)] text-white' : 'border-[var(--cv-border-warm)] text-transparent'}`}><CheckCircle2 size={13} /></span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section aria-labelledby="core-paths-heading">
                <div className="mb-3 flex items-end justify-between gap-4">
                    <div>
                        <p className="cv-design-eyebrow">Core career paths</p>
                        <h2 id="core-paths-heading" className="cv-design-title mt-2 text-xl">Start with the path that fits your goal.</h2>
                    </div>
                    {activeLabId && !courseComplete && selectedGoal === 'ai-portfolio' && (
                        <button type="button" onClick={() => onOpenCourse(activeLabId)} className="cv-design-button-primary h-9 rounded-lg px-3 text-xs"><Play size={14} /> Continue</button>
                    )}
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                    {patternsCourse && (
                        <article className={`flex min-h-[332px] flex-col rounded-xl border p-5 transition-colors ${selectedGoal === 'coding' ? selectedCardClass : defaultCardClass}`}>
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cv-purple-50)] text-[var(--cv-action-primary)]"><Braces size={20} /></span>
                            {selectedGoal === 'coding' && <p className="cv-design-eyebrow mt-5 text-[10px]">Recommended</p>}
                            <h3 className="cv-design-title mt-4 text-xl">Coding Interview Patterns</h3>
                            <p className="cv-design-body mt-2 flex-1 text-sm">Master the most common coding interview patterns through structured lessons and deliberate practice.</p>
                            <p className="mt-3 text-xs font-bold text-[var(--cv-text-muted)]"><BookOpen className="mr-1 inline" size={13} /> {patternsLessonTotal} lessons · {patternsCourse.chapters.length} patterns</p>
                            <button type="button" onClick={() => onOpenCourse(patternsCourse.id)} className={`mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${selectedGoal === 'coding' ? 'cv-design-button-primary' : 'border border-[var(--cv-border-warm)] text-[var(--cv-text-heading)] hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)]'}`}>
                                {patternsLessonsDone > 0 ? 'Continue coding interview patterns' : 'Start coding interview patterns'} <ArrowRight size={15} />
                            </button>
                        </article>
                    )}

                    <article className={`flex min-h-[332px] flex-col rounded-xl border p-5 transition-colors ${selectedGoal === 'ai-portfolio' ? selectedCardClass : defaultCardClass}`}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cv-amber-50)] text-[var(--cv-text-body)]"><GraduationCap size={20} /></span>
                        {selectedGoal === 'ai-portfolio' && <p className="cv-design-eyebrow mt-5 text-[10px]">Recommended</p>}
                        <h3 className="cv-design-title mt-4 text-xl">AI Agent Builder Curriculum</h3>
                        <p className="cv-design-body mt-2 flex-1 text-sm">Design, build, and deploy practical AI agents with projects that demonstrate real-world skills.</p>
                        <p className="mt-3 text-xs font-bold text-[var(--cv-text-muted)]"><BookOpen className="mr-1 inline" size={13} /> {curriculumLessonTotal} lessons · ~{Math.max(1, Math.round(curriculumMinutes / 60))} h</p>
                        <button type="button" onClick={() => onOpenCourse('ai-agent-curriculum', '/learning/ai-agent-curriculum')} className={`mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${selectedGoal === 'ai-portfolio' ? 'cv-design-button-primary' : 'border border-[var(--cv-border-warm)] text-[var(--cv-text-heading)] hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)]'}`}>
                            {curriculumLessonsDone > 0 ? 'Continue curriculum' : 'Explore curriculum'} <ArrowRight size={15} />
                        </button>
                    </article>

                    {systemDesignCourse && (
                        <article className={`flex min-h-[332px] flex-col rounded-xl border p-5 transition-colors ${selectedGoal === 'system-design' ? selectedCardClass : defaultCardClass}`}>
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cv-amber-50)] text-[var(--cv-text-body)]"><Network size={20} /></span>
                            {selectedGoal === 'system-design' && <p className="cv-design-eyebrow mt-5 text-[10px]">Recommended</p>}
                            <h3 className="cv-design-title mt-4 text-xl">System Design Interview</h3>
                            <p className="cv-design-body mt-2 flex-1 text-sm">Build the structured thinking and design skills to tackle complex system design interviews with confidence.</p>
                            <p className="mt-3 text-xs font-bold text-[var(--cv-text-muted)]"><BookOpen className="mr-1 inline" size={13} /> {systemDesignLessonTotal} lessons · 12 modules</p>
                            <button type="button" onClick={() => onOpenCourse(systemDesignCourse.id, `/learning/${systemDesignCourse.id}`)} className={`mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${selectedGoal === 'system-design' ? 'cv-design-button-primary' : 'border border-[var(--cv-border-warm)] text-[var(--cv-text-heading)] hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)]'}`}>
                                {systemDesignLessonsDone > 0 ? 'Continue system design' : 'Explore curriculum'} <ArrowRight size={15} />
                            </button>
                        </article>
                    )}
                </div>
            </section>

            <section className="flex flex-col gap-4 rounded-xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cv-amber-50)] text-[var(--cv-text-body)]"><Gamepad2 size={20} /></span>
                    <div>
                        <h2 className="cv-design-title text-base">Brick City Quest</h2>
                        <p className="cv-design-body mt-1 max-w-2xl text-sm">A practical quest to sharpen your fundamentals, build projects, and document your progress consistently.</p>
                    </div>
                </div>
                <button type="button" onClick={onOpenQuest} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--cv-border-warm)] px-4 text-sm font-bold text-[var(--cv-text-heading)] transition hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)]">Explore quest <ArrowRight size={15} /></button>
            </section>
        </div>
    );
};

export default LearningCatalog;
