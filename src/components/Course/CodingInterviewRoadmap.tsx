import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Braces,
  CheckCircle2,
  Code2,
  GraduationCap,
  Play,
  Sparkles,
} from 'lucide-react';
import type { CourseProgress } from '../../types';
import type { InteractiveCourse } from '../../lib/interactiveCourses';
import {
  getCodingInterviewRoadmap,
  type ExperienceRoadmapId,
} from '../../lib/codingInterviewRoadmap';

type Props = {
  course: InteractiveCourse;
  progress?: CourseProgress;
  onBack: () => void;
  onResume: () => void;
  onOpenExercise: (exerciseId: string) => void;
};

const roadmapIcon = (id: ExperienceRoadmapId) => id === 'beginner' ? GraduationCap : id === 'intermediate' ? Code2 : Braces;

const CodingInterviewRoadmap: React.FC<Props> = ({ course, progress, onBack, onResume, onOpenExercise }) => {
  const [activeRoadmapId, setActiveRoadmapId] = useState<ExperienceRoadmapId>('beginner');
  const roadmap = useMemo(() => getCodingInterviewRoadmap(course, progress), [course, progress]);
  const activeRoadmap = roadmap.find((item) => item.id === activeRoadmapId) ?? roadmap[0];
  const completedIds = new Set(progress?.completedModuleIds ?? []);
  const totalLessons = course.chapters.reduce((total, chapter) => total + chapter.exercises.length, 0);
  const completedLessons = course.chapters.reduce((total, chapter) => total + chapter.exercises.filter((exercise) => completedIds.has(exercise.id)).length, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text-heading)]"
      >
        <ArrowLeft size={14} /> Back to courses
      </button>

      <section className="cv-design-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="cv-design-eyebrow mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-2.5 py-1 text-xs">
              <Braces size={14} /> Coding interview patterns
            </div>
            <h1 className="cv-design-title text-2xl sm:text-3xl">Study roadmap by experience level</h1>
            <p className="cv-design-body mt-1.5 max-w-2xl text-sm">
              Choose the level that matches the interviews you are preparing for. Every pattern includes recognition signals, a step-through animation, and a practice lab.
            </p>
          </div>
          <div className="min-w-[132px] rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] px-3 py-2 text-right">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--cv-text-muted)]">Course progress</p>
            <p className="mt-1 text-sm font-black text-[var(--cv-text-heading)]">{completedLessons} / {totalLessons}</p>
          </div>
        </div>
        <button type="button" onClick={onResume} className="cv-design-button-primary mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs">
          <Play size={13} /> {completedLessons ? 'Resume course' : 'Start course'} <ArrowRight size={13} />
        </button>
      </section>

      <section aria-label="Experience-level roadmaps" className="grid gap-4 lg:grid-cols-3">
        {roadmap.map((item) => {
          const Icon = roadmapIcon(item.id);
          const selected = item.id === activeRoadmapId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveRoadmapId(item.id)}
              aria-pressed={selected}
              className={`cv-design-card min-h-[220px] p-5 text-left transition-colors ${selected
                ? 'border-[var(--cv-action-primary)] bg-[var(--cv-action-soft-bg)]'
                : 'hover:border-[var(--cv-action-border)] hover:bg-[var(--cv-surface-warm-muted,transparent)]'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="cv-design-icon-well flex h-9 w-9 items-center justify-center rounded-lg"><Icon size={17} /></span>
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--cv-text-muted)]">{item.level}</span>
              </div>
              <h2 className="cv-design-title mt-4 text-xl">{item.title} <span className="whitespace-nowrap text-[13px] text-[var(--cv-text-muted)]">({item.years})</span></h2>
              <p className="cv-design-body mt-2 text-sm leading-6">{item.description}</p>
              <div className="mt-4 flex items-center gap-3 border-t border-[var(--cv-border-warm)] pt-3 text-xs font-bold text-[var(--cv-text-muted)]">
                <span className="inline-flex items-center gap-1"><BookOpen size={13} /> {item.chapters.length} patterns</span>
                <span className="ml-auto">{item.completedChapters}/{item.chapters.length} complete</span>
              </div>
            </button>
          );
        })}
      </section>

      {activeRoadmap && (
        <section className="cv-design-card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--cv-border-warm)] px-4 py-4 sm:px-5">
            <div>
              <p className="cv-design-eyebrow">{activeRoadmap.level}</p>
              <h2 className="cv-design-title mt-1 text-xl">{activeRoadmap.title} roadmap</h2>
            </div>
            <p className="text-xs font-bold text-[var(--cv-text-muted)]">{activeRoadmap.completedLessons} / {activeRoadmap.totalLessons} lessons completed</p>
          </div>
          <ol>
            {activeRoadmap.chapters.map((chapter, index) => {
              const doneLessons = chapter.exercises.filter((exercise) => completedIds.has(exercise.id)).length;
              const complete = doneLessons === chapter.exercises.length;
              const firstExercise = chapter.exercises[0];
              const nextExercise = chapter.exercises.find((exercise) => !completedIds.has(exercise.id)) ?? firstExercise;
              return (
                <li key={chapter.id} className={index < activeRoadmap.chapters.length - 1 ? 'border-b border-[var(--cv-border-warm)]' : ''}>
                  <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black ${complete
                      ? 'border-[var(--cv-success-600)]/40 bg-[var(--cv-success-50)] text-[var(--cv-success-600)]'
                      : 'border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] text-[var(--cv-text-muted)]'}`}>
                      {complete ? <CheckCircle2 size={16} /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="cv-design-title text-base">{chapter.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-[var(--cv-text-muted)]">{doneLessons} / {chapter.exercises.length} lessons · {firstExercise.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenExercise(nextExercise.id)}
                      className={complete
                        ? 'cv-design-button-secondary inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs'
                        : 'cv-design-button-primary inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs'}
                    >
                      {complete ? <BookOpen size={13} /> : <Play size={13} />}
                      {complete ? 'Review' : doneLessons ? 'Continue' : 'Start'} <ArrowRight size={13} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-2 border-t border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] px-4 py-3 text-xs font-semibold text-[var(--cv-text-muted)] sm:px-5">
            <Sparkles size={14} className="text-[var(--cv-action-primary)]" />
            Complete the active roadmap in order, then move to the next experience level.
          </div>
        </section>
      )}
    </div>
  );
};

export default CodingInterviewRoadmap;
