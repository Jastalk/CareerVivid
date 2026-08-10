import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowLeft, ArrowRight, Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import type { CourseWidgetProps } from './types';
import { getSystemDesignScenario, type SystemDesignScenarioId } from '../../lib/systemDesignSimulations';

const STATE_STYLE = {
  idle: 'border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] text-[var(--cv-text-body)]',
  active: 'border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)]',
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  blocked: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
} as const;

const METRIC_STYLE = {
  neutral: 'border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)]',
  good: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
  warn: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
} as const;

type Props = CourseWidgetProps & { scenarioId: SystemDesignScenarioId };

const SystemDesignSimulationWidget: React.FC<Props> = ({ completed, onComplete, scenarioId }) => {
  const scenario = getSystemDesignScenario(scenarioId);
  const [input, setInput] = useState(scenario?.input.initial ?? 0);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const completionSent = useRef(false);
  const steps = useMemo(() => scenario?.steps(input) ?? [], [scenario, input]);
  const step = steps[stepIndex] ?? steps[0];
  const atEnd = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return undefined;
    const timer = window.setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    }, Math.max(450, 1400 / speed));
    return () => window.clearInterval(timer);
  }, [playing, atEnd, speed, steps.length]);

  useEffect(() => {
    if (atEnd) setPlaying(false);
    if (atEnd && !completionSent.current && !completed) {
      completionSent.current = true;
      onComplete();
    }
  }, [atEnd, completed, onComplete]);

  if (!scenario || !step) return null;

  const reset = () => {
    setPlaying(false);
    setStepIndex(0);
  };
  const advance = (delta: number) => {
    setStepIndex((current) => Math.max(0, Math.min(steps.length - 1, current + delta)));
  };
  return (
    <section className="rounded-xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-4 sm:p-5" aria-label={scenario.title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cv-design-eyebrow inline-flex items-center gap-1.5"><Activity size={13} /> Deterministic system simulation</p>
          <h2 className="cv-design-title mt-1 text-base">{scenario.title}</h2>
        </div>
        <p className="rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] px-2.5 py-1 text-xs font-bold tabular-nums text-[var(--cv-text-muted)]">
          State {stepIndex + 1} / {steps.length}
        </p>
      </div>

      <label className="mt-4 block rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] p-3">
        <span className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--cv-text-body)]"><span>{scenario.input.label}</span><span className="text-[var(--cv-action-primary)]">{input.toLocaleString()} {scenario.input.unit}</span></span>
        <input aria-label={scenario.input.label} className="mt-2 w-full accent-[var(--cv-action-primary)]" type="range" min={scenario.input.min} max={scenario.input.max} step={scenario.input.step} value={input} onChange={(event) => { setInput(Number(event.target.value)); reset(); }} />
      </label>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] p-3" aria-live="polite">
        <div className="flex min-w-max items-stretch justify-center gap-2">
          {step.nodes.map((item, index) => (
            <React.Fragment key={item.id}>
              <motion.div
                key={`${stepIndex}-${item.id}`}
                initial={{ opacity: 0.35, y: 8 }}
                animate={{ opacity: 1, y: 0, scale: item.state === 'active' ? 1.02 : 1 }}
                transition={{ duration: 0.22 }}
                className={`w-40 shrink-0 rounded-lg border p-3 ${STATE_STYLE[item.state]}`}
              >
                <p className="text-xs font-extrabold">{item.label}</p>
                <p className="mt-1 text-[11px] font-medium leading-4">{item.detail}</p>
              </motion.div>
              {index < step.nodes.length - 1 && <ArrowRight aria-hidden size={18} className="mt-8 shrink-0 text-[var(--cv-action-primary)]" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {step.metrics.map((item) => (
          <div key={item.label} className={`rounded-lg border px-3 py-2 ${METRIC_STYLE[item.tone ?? 'neutral']}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--cv-text-muted)]">{item.label}</p>
            <p className="mt-0.5 text-sm font-extrabold text-[var(--cv-text-heading)]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg bg-[var(--cv-surface-warm-muted,transparent)] px-3 py-2.5">
        <p className="text-sm font-bold text-[var(--cv-text-heading)]">{step.title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--cv-text-body)]">{step.narrative}</p>
        <p className="sr-only" aria-live="polite">{step.ariaDescription}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Previous simulation state" onClick={() => advance(-1)} disabled={stepIndex === 0} className="cv-design-button-secondary inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs disabled:opacity-40"><ArrowLeft size={14} /> Previous</button>
        <button type="button" aria-label="Next simulation state" onClick={() => advance(1)} disabled={atEnd} className="cv-design-button-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs disabled:opacity-40">Next <ArrowRight size={14} /></button>
        <button type="button" aria-label={playing ? 'Pause simulation' : 'Play simulation'} onClick={() => setPlaying((value) => !value)} disabled={atEnd} className="cv-design-button-secondary inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs disabled:opacity-40">{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause' : 'Play'}</button>
        <button type="button" aria-label="Reset simulation" onClick={reset} className="cv-design-button-secondary inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs"><RotateCcw size={14} /> Reset</button>
        <label className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--cv-border-warm)] px-2 text-xs font-bold text-[var(--cv-text-body)]"><Gauge size={14} /><span className="sr-only">Simulation speed</span><select aria-label="Simulation speed" className="bg-transparent outline-none" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option></select></label>
      </div>

    </section>
  );
};

export const createSystemDesignSimulationWidget = (scenarioId: SystemDesignScenarioId): React.FC<CourseWidgetProps> =>
  function ConfiguredSystemDesignSimulationWidget(props) {
    return <SystemDesignSimulationWidget {...props} scenarioId={scenarioId} />;
  };

export default SystemDesignSimulationWidget;
