import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, MessageSquareText, ShieldCheck, Waypoints } from 'lucide-react';
import type { CourseWidgetProps } from './types';
import { navigate } from '../../utils/navigation';

export const SystemDesignDecisionWidget: React.FC<CourseWidgetProps> = ({ completed, exercise, onComplete }) => {
  const decision = exercise?.systemDesignDecision;
  const [selected, setSelected] = useState<number | null>(null);
  if (!decision) return null;
  const choose = (index: number) => {
    setSelected(index);
    if (index === decision.correctIndex && !completed) onComplete();
  };
  return (
    <section className="rounded-xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-4 sm:p-5" aria-label="Guided design decision">
      <p className="cv-design-eyebrow inline-flex items-center gap-1.5"><Waypoints size={13} /> Scenario simulation</p>
      <h2 className="cv-design-title mt-1 text-base">{decision.situation}</h2>
      <p className="mt-3 text-sm font-semibold text-[var(--cv-text-heading)]">Decision: {decision.decision}</p>
      <div className="mt-3 space-y-2">
        {decision.options.map((option, index) => {
          const answer = selected !== null;
          const correct = index === decision.correctIndex;
          const chosen = selected === index;
          const style = answer && correct
            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
            : answer && chosen
              ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100'
              : 'border-[var(--cv-border-warm)] hover:border-[var(--cv-action-border)] hover:bg-[var(--cv-action-soft-bg)]';
          return <button key={option} type="button" onClick={() => choose(index)} className={`flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm font-semibold ${style}`}><span className="mt-0.5">{answer && correct ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span><span>{option}</span></button>;
        })}
      </div>
      {selected !== null && <p className="mt-3 rounded-lg bg-[var(--cv-surface-warm-muted,transparent)] px-3 py-2.5 text-xs leading-5 text-[var(--cv-text-body)]"><strong className="text-[var(--cv-text-heading)]">Why:</strong> {decision.explanation}</p>}
    </section>
  );
};

export const SystemDesignAnswerDrillWidget: React.FC<CourseWidgetProps> = ({ chapter, completed, course, exercise, onComplete }) => {
  const drill = exercise?.systemDesignAnswerDrill;
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  if (!drill) return null;
  const canComplete = answer.trim().length >= drill.minimumCharacters && checked.length === drill.requiredTradeoffs.length;
  const practice = chapter?.systemDesign;
  const toggle = (item: string) => setChecked((previous) => previous.includes(item) ? previous.filter((entry) => entry !== item) : [...previous, item]);
  const openPractice = () => {
    if (!course || !exercise) return;
    navigate(`/learn/${course.id}/${exercise.id}/mock`);
  };
  return (
    <section className="rounded-xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-4 sm:p-5" aria-label="Interview trade-off answer drill">
      <p className="cv-design-eyebrow inline-flex items-center gap-1.5"><MessageSquareText size={13} /> Interview answer drill</p>
      <h2 className="cv-design-title mt-1 text-base">{drill.prompt}</h2>
      <textarea aria-label="Your interview answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Explain your decision, the trade-off, and what you would measure next." className="mt-3 min-h-32 w-full resize-y rounded-lg border border-[var(--cv-border-warm)] bg-transparent p-3 text-sm text-[var(--cv-text-heading)] outline-none focus:border-[var(--cv-action-primary)]" />
      <p className="mt-1 text-right text-[11px] font-semibold text-[var(--cv-text-muted)]">{answer.trim().length} / {drill.minimumCharacters} characters</p>
      <fieldset className="mt-3 space-y-2"><legend className="text-xs font-extrabold text-[var(--cv-text-heading)]">Self-review before completing</legend>{drill.requiredTradeoffs.map((item) => <label key={item} className="flex cursor-pointer items-start gap-2 text-xs font-medium text-[var(--cv-text-body)]"><input type="checkbox" checked={checked.includes(item)} onChange={() => toggle(item)} className="mt-0.5 accent-[var(--cv-action-primary)]" />{item}</label>)}</fieldset>
      <button type="button" disabled={!canComplete || completed} onClick={onComplete} className="cv-design-button-primary mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-45"><CheckCircle2 size={14} /> Complete answer drill</button>
      {practice && course && exercise && (
        <div className="mt-5 border-t border-[var(--cv-border-warm)] pt-4">
          <p className="text-xs font-extrabold text-[var(--cv-text-heading)]">Timed mock practice</p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--cv-text-muted)]">Your course whiteboard is complete. This opens a separate course practice session with diagram review and the Career Agent. Its submission stays in the course.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!completed} onClick={openPractice} className="cv-design-button-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-45"><ShieldCheck size={14} /> Start timed {practice.primaryChallengeId} mock <ArrowRight size={14} /></button>
          </div>
        </div>
      )}
    </section>
  );
};
