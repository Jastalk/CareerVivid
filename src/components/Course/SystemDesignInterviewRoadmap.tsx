import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Database, Network, Play, Rocket, ServerCog, Zap } from 'lucide-react';
import type { CourseProgress } from '../../types';
import type { InteractiveChapter, InteractiveCourse } from '../../lib/interactiveCourses';
import { useUserProgress } from '../../hooks/useUserProgress';
import { useAuth } from '../../contexts/AuthContext';

type RoadmapId = 'foundations' | 'product-scale' | 'senior-systems';

const ROADMAPS: Array<{ id: RoadmapId; level: string; title: string; years: string; description: string }> = [
  { id: 'foundations', level: 'Level 1 of 3', title: 'Core Design', years: '0-1 years', description: 'Frame the prompt, estimate scale, define contracts, and choose the first reliable building blocks.' },
  { id: 'product-scale', level: 'Level 2 of 3', title: 'Production Scale', years: '2-4 years', description: 'Protect production paths with caches, partitions, event processing, and a practical reliability model.' },
  { id: 'senior-systems', level: 'Level 3 of 3', title: 'Distributed Systems', years: '5+ years', description: 'Lead real-time, data-intensive, distributed, and changing-requirement designs with clear trade-offs.' },
];

const MODULE_LOOP = ['Read', 'Simulate', 'Decide', 'Check', 'Draw', 'Explain'];

const icons = { foundations: BookOpen, 'product-scale': Database, 'senior-systems': ServerCog };

type Props = { course: InteractiveCourse; progress?: CourseProgress; onBack: () => void; onResume: () => void; onOpenExercise: (exerciseId: string) => void };

const SystemDesignInterviewRoadmap: React.FC<Props> = ({ course, progress, onBack, onResume, onOpenExercise }) => {
  const [activeId, setActiveId] = useState<RoadmapId>('foundations');
  const { currentUser } = useAuth();
  const { levelInfo, isLoading: isLoadingLevel } = useUserProgress();

  const completed = new Set(progress?.completedModuleIds ?? []);
  const groups = useMemo(() => ROADMAPS.map((roadmap) => {
    const chapters = course.chapters.filter((chapter) => chapter.systemDesign?.roadmap === roadmap.id);
    const totalLessons = chapters.reduce((sum, chapter) => sum + chapter.exercises.length, 0);
    const completedLessons = chapters.reduce((sum, chapter) => sum + chapter.exercises.filter((exercise) => completed.has(exercise.id)).length, 0);
    return { ...roadmap, chapters, totalLessons, completedLessons };
  }), [course, progress]);

  const active = groups.find((group) => group.id === activeId) ?? groups[0];
  const total = course.chapters.reduce((sum, chapter) => sum + chapter.exercises.length, 0);
  const done = course.chapters.reduce((sum, chapter) => sum + chapter.exercises.filter((exercise) => completed.has(exercise.id)).length, 0);
  const progressPct = total ? Math.round((done / total) * 100) : 0;
  const courseComplete = done === total && total > 0;

  // All chapters across every roadmap level — one badge each
  const allChapters = useMemo(
    () => course.chapters.filter((ch) => ch.systemDesign?.roadmap),
    [course],
  );
  const completedChapters = allChapters.filter(
    (ch) => ch.exercises.length > 0 && ch.exercises.every((ex) => completed.has(ex.id)),
  ).length;

  return (
    <div className="@container/sd-roadmap mx-auto max-w-screen-xl space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--cv-text-muted)] hover:text-[var(--cv-text-heading)]">
        <ArrowLeft size={14} /> Back to courses
      </button>

      <div className="grid grid-cols-1 items-start gap-5 @[1080px]/sd-roadmap:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── Main content ── */}
        <div className="space-y-5">
          <section className="cv-design-card p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="cv-design-eyebrow inline-flex items-center gap-1.5"><Network size={13} /> System design interview</p>
                <h1 className="cv-design-title mt-1 text-2xl sm:text-3xl">Learn to design scalable systems — from first sketch to a diagram you can defend.</h1>
                <p className="cv-design-body mt-1.5 max-w-3xl text-sm">Read the principle, watch a real request flow under load, choose between caches, queues, and partitions, then draw the architecture and explain every trade-off. Twelve modules, each system harder than the last.</p>
              </div>
              <div className="rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] px-3 py-2 text-right">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--cv-text-muted)]">Course progress</p>
                <p className="mt-1 text-sm font-black text-[var(--cv-text-heading)]">{done} / {total}</p>
              </div>
            </div>
            <button type="button" onClick={onResume} className="cv-design-button-primary mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs">
              <Play size={13} /> {done ? 'Resume course' : 'Start course'} <ArrowRight size={13} />
            </button>
          </section>

          <section aria-label="Experience-level system design roadmaps" className="grid gap-4 lg:grid-cols-3">
            {groups.map((group) => {
              const Icon = icons[group.id];
              const selected = group.id === activeId;
              return (
                <button key={group.id} type="button" onClick={() => setActiveId(group.id)} aria-pressed={selected}
                  className={`cv-design-card min-h-52 p-5 text-left transition-colors ${selected ? 'border-[var(--cv-action-primary)] bg-[var(--cv-action-soft-bg)]' : 'hover:border-[var(--cv-action-border)]'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="cv-design-icon-well flex h-9 w-9 items-center justify-center rounded-lg"><Icon size={17} /></span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--cv-text-muted)]">{group.level}</span>
                  </div>
                  <h2 className="cv-design-title mt-4 text-xl">{group.title} <span className="whitespace-nowrap text-[13px] text-[var(--cv-text-muted)]">({group.years})</span></h2>
                  <p className="cv-design-body mt-2 text-sm leading-6">{group.description}</p>
                  <p className="mt-4 border-t border-[var(--cv-border-warm)] pt-3 text-xs font-bold text-[var(--cv-text-muted)]">{group.chapters.length} modules · {group.completedLessons}/{group.totalLessons} lessons complete</p>
                </button>
              );
            })}
          </section>

          {active && (
            <section className="cv-design-card overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--cv-border-warm)] px-4 py-4 sm:px-5">
                <div>
                  <p className="cv-design-eyebrow">{active.level}</p>
                  <h2 className="cv-design-title mt-1 text-xl">{active.title} roadmap</h2>
                </div>
                <p className="text-xs font-bold text-[var(--cv-text-muted)]">Six lessons per module: read, simulate, decide, quiz, whiteboard, answer drill.</p>
              </div>
              <ol>
                {active.chapters.map((chapter: InteractiveChapter, index) => {
                  const metadata = chapter.systemDesign!;
                  const moduleDone = chapter.exercises.filter((exercise) => completed.has(exercise.id)).length;
                  const isComplete = moduleDone === chapter.exercises.length;
                  const nextExercise = chapter.exercises.find((exercise) => !completed.has(exercise.id)) ?? chapter.exercises[0];
                  return (
                    <li key={chapter.id} className={index < active.chapters.length - 1 ? 'border-b border-[var(--cv-border-warm)]' : ''}>
                      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black ${isComplete ? 'border-[var(--cv-success-600)]/40 bg-[var(--cv-success-50)] text-[var(--cv-success-600)]' : 'border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] text-[var(--cv-text-muted)]'}`}>
                          {isComplete ? <CheckCircle2 size={16} /> : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="cv-design-title text-base">{chapter.title.replace(/^\d+\.\s*/, '')}</h3>
                            <span className="rounded-full border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--cv-action-primary)]">Timed mock: {metadata.primaryChallengeId}</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-[var(--cv-text-muted)]">{moduleDone} / 6 lessons completed. The timed mock opens after the answer drill and saves only to this course.</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {MODULE_LOOP.map((item, lessonIndex) => (
                              <span key={item} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${moduleDone > lessonIndex ? 'border-[var(--cv-success-600)]/30 bg-[var(--cv-success-50)] text-[var(--cv-success-600)]' : 'border-[var(--cv-border-warm)] text-[var(--cv-text-muted)]'}`}>
                                {lessonIndex + 1}. {item}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button type="button" onClick={() => onOpenExercise(nextExercise.id)}
                          className={isComplete ? 'cv-design-button-secondary inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs' : 'cv-design-button-primary inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs'}>
                          {isComplete ? <BookOpen size={13} /> : <Play size={13} />}
                          {isComplete ? 'Review' : moduleDone ? 'Continue' : 'Start'} <ArrowRight size={13} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4 @[1080px]/sd-roadmap:sticky @[1080px]/sd-roadmap:top-6">
          {currentUser ? (
            <>
              {/* Level */}
              <section className="cv-design-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="cv-design-title text-base">Level {isLoadingLevel ? '—' : levelInfo.level}</p>
                    <p className="cv-design-body mt-0.5 text-xs">
                      {isLoadingLevel ? 'Loading…' : `${levelInfo.currentLevelXp} / ${levelInfo.nextLevelXp} XP to level ${levelInfo.level + 1}`}
                    </p>
                  </div>
                  <span className="cv-design-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <Zap size={16} />
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cv-border-warm)]">
                  <div
                    className="h-full rounded-full bg-[var(--cv-action-solid)] transition-[width] duration-500"
                    style={{ width: `${Math.max((isLoadingLevel ? 0 : levelInfo.progress) * 100, 2)}%` }}
                  />
                </div>
              </section>

              {/* Course progress */}
              <section className="cv-design-card p-4">
                <h2 className="cv-design-title text-base">Course progress</h2>
                <p className="cv-design-body mt-0.5 text-xs">{done} / {total} lessons completed</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cv-border-warm)]">
                  <div
                    className="h-full rounded-full bg-[var(--cv-action-solid)] transition-[width] duration-500"
                    style={{ width: `${Math.max(progressPct, done > 0 ? 4 : 0)}%` }}
                  />
                </div>
                {courseComplete && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[var(--cv-success-600)]">
                    <Rocket size={14} /> Course complete — nice work!
                  </p>
                )}
              </section>

              {/* Course badges: one per completed chapter */}
              <section className="cv-design-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="cv-design-title text-base">Course badges</h2>
                  <span className="cv-design-body text-xs">{completedChapters} / {allChapters.length}</span>
                </div>
                <p className="cv-design-body mt-0.5 text-xs">Complete a module to earn its badge — collect 'em all.</p>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {allChapters.map((chapter, i) => {
                    const earned = chapter.exercises.length > 0 && chapter.exercises.every((ex) => completed.has(ex.id));
                    return (
                      <div
                        key={chapter.id}
                        title={chapter.title.replace(/^\d+\.\s*/, '')}
                        className={`flex aspect-square items-center justify-center rounded-lg border text-xs font-extrabold transition-colors ${
                          earned
                            ? 'border-[var(--cv-success-600)]/40 bg-[var(--cv-success-50)] text-[var(--cv-success-600)]'
                            : 'border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] text-[var(--cv-text-muted)]'
                        }`}
                      >
                        {earned ? <CheckCircle2 size={16} /> : i + 1}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <section className="cv-design-card p-4">
              <h2 className="cv-design-title text-base">Your progress</h2>
              <p className="cv-design-body mt-1.5 text-xs">Sign in to save your module completions, earn XP, and track your progress through each level.</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default SystemDesignInterviewRoadmap;
