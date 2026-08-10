import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Sparkles } from 'lucide-react';
import type { CourseWidgetProps } from './types';

/**
 * "An LLM is a next-token predictor" — the learner watches a sentence being
 * generated token by token, sees the candidate distribution at each step, and
 * can steer generation by picking a candidate themselves.
 *
 * Completes after one full sentence has been generated AND the learner has
 * manually picked at least one token (so they actually interacted).
 */

interface Step {
  /** Candidate continuations with display probability (sums ≈ 1). */
  candidates: { token: string; p: number }[];
}

interface Script {
  prompt: string;
  steps: Step[];
}

const SCRIPTS: Script[] = [
  {
    prompt: 'The best way to learn AI is',
    steps: [
      { candidates: [{ token: ' to', p: 0.62 }, { token: ' by', p: 0.24 }, { token: ' through', p: 0.14 }] },
      { candidates: [{ token: ' build', p: 0.48 }, { token: ' practice', p: 0.32 }, { token: ' read', p: 0.2 }] },
      { candidates: [{ token: ' real', p: 0.44 }, { token: ' small', p: 0.38 }, { token: ' fun', p: 0.18 }] },
      { candidates: [{ token: ' projects', p: 0.71 }, { token: ' agents', p: 0.17 }, { token: ' demos', p: 0.12 }] },
      { candidates: [{ token: '.', p: 0.66 }, { token: ' every', p: 0.21 }, { token: ' today', p: 0.13 }] },
    ],
  },
  {
    prompt: 'A large language model predicts',
    steps: [
      { candidates: [{ token: ' the', p: 0.7 }, { token: ' one', p: 0.18 }, { token: ' your', p: 0.12 }] },
      { candidates: [{ token: ' next', p: 0.82 }, { token: ' most', p: 0.11 }, { token: ' missing', p: 0.07 }] },
      { candidates: [{ token: ' token', p: 0.58 }, { token: ' word', p: 0.34 }, { token: ' letter', p: 0.08 }] },
      { candidates: [{ token: ', one', p: 0.52 }, { token: ' based', p: 0.31 }, { token: ' again', p: 0.17 }] },
      { candidates: [{ token: ' step at a time.', p: 0.74 }, { token: ' guess at a time.', p: 0.26 }] },
    ],
  },
];

const AUTO_TICK_MS = 900;

const TokenPredictorWidget: React.FC<CourseWidgetProps> = ({ completed, onComplete }) => {
  const [scriptIndex, setScriptIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [tokens, setTokens] = useState<string[]>([]);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [pickedManually, setPickedManually] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const script = SCRIPTS[scriptIndex];
  const step = script.steps[stepIndex] as Step | undefined;
  const finished = stepIndex >= script.steps.length;

  const pick = useCallback((token: string, manual: boolean) => {
    setTokens((prev) => [...prev, token]);
    setStepIndex((prev) => prev + 1);
    if (manual) setPickedManually(true);
  }, []);

  // Auto-play: greedy pick of the highest-probability candidate.
  useEffect(() => {
    if (!autoPlaying || !step) return;
    timerRef.current = setTimeout(() => pick(step.candidates[0].token, false), AUTO_TICK_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoPlaying, step, pick]);

  useEffect(() => {
    if (finished) setAutoPlaying(false);
  }, [finished]);

  useEffect(() => {
    if (finished && pickedManually && !completed) onComplete();
  }, [finished, pickedManually, completed, onComplete]);

  const reset = (nextScript?: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAutoPlaying(false);
    setTokens([]);
    setStepIndex(0);
    if (nextScript !== undefined) setScriptIndex(nextScript);
  };

  return (
    <div className="rounded-2xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--cv-action-primary)]">
          <Sparkles size={13} /> Next-token predictor
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoPlaying((v) => !v)}
            disabled={finished}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--cv-border-warm)] px-3 text-xs font-bold text-[var(--cv-text-body)] hover:border-[var(--cv-action-border)] disabled:opacity-40"
          >
            <Play size={13} /> {autoPlaying ? 'Pause' : 'Auto-generate'}
          </button>
          <button
            onClick={() => reset()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--cv-border-warm)] px-3 text-xs font-bold text-[var(--cv-text-body)] hover:border-[var(--cv-action-border)]"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Generated text */}
      <div className="mt-4 min-h-[72px] rounded-xl bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.04))] p-4 font-mono text-[15px] leading-relaxed text-[var(--cv-text-heading)]">
        <span className="opacity-60">{script.prompt}</span>
        <AnimatePresence>
          {tokens.map((token, i) => (
            <motion.span
              key={`${i}-${token}`}
              initial={{ opacity: 0, y: 6, backgroundColor: 'rgba(99,91,213,0.35)' }}
              animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(99,91,213,0)' }}
              transition={{ duration: 0.45 }}
              className="rounded"
            >
              {token}
            </motion.span>
          ))}
        </AnimatePresence>
        {!finished && (
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.1 }}
            className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-[var(--cv-action-solid)]"
          />
        )}
      </div>

      {/* Candidate distribution */}
      {step && (
        <div className="mt-4">
          <p className="text-[11px] font-bold text-[var(--cv-text-muted)]">
            The model scores every possible next token. Click one to choose it yourself:
          </p>
          <div className="mt-2 grid gap-1.5">
            {step.candidates.map((candidate) => (
              <button
                key={candidate.token}
                onClick={() => pick(candidate.token, true)}
                className="group relative flex h-9 items-center overflow-hidden rounded-lg border border-[var(--cv-border-warm)] text-left transition-colors hover:border-[var(--cv-action-border)]"
              >
                <motion.div
                  layout
                  initial={{ width: 0 }}
                  animate={{ width: `${candidate.p * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className="absolute inset-y-0 left-0 bg-[var(--cv-action-soft-bg,rgba(99,91,213,0.12))]"
                />
                <span className="relative z-10 flex w-full items-center justify-between px-3">
                  <code className="text-[13px] font-bold text-[var(--cv-text-heading)]">"{candidate.token.trimStart()}"</code>
                  <span className="text-[11px] font-bold tabular-nums text-[var(--cv-text-muted)]">{Math.round(candidate.p * 100)}%</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {finished && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-emerald-300/50 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {pickedManually
            ? 'Sentence complete! That is all an LLM does — score candidates, pick one, repeat. Sampling settings (like temperature) decide how adventurous the picks are.'
            : 'Sentence complete — now reset and pick at least one token yourself to finish this lesson.'}
          {scriptIndex < SCRIPTS.length - 1 && (
            <button onClick={() => reset(scriptIndex + 1)} className="ml-2 font-bold underline">
              Try another prompt →
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TokenPredictorWidget;
