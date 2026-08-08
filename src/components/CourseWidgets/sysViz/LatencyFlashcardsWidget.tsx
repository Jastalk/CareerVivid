import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { CourseWidgetProps } from '../types';
import { LATENCY_CARDS } from '../../../lib/systemDesignQuestionBank';
import { shuffleWithSeed } from '../../../lib/deterministicShuffle';

/**
 * "Latency numbers every programmer should know" as flashcards — pick the
 * right magnitude for each operation, learn the design insight behind it.
 * Numbers from the System Design Primer (CC BY 4.0) / Jeff Dean.
 *
 * Options are authored answer-first, so they are shuffled on the operation
 * name: stable across retries, but never the same slot twice.
 */

const LatencyFlashcardsWidget: React.FC<CourseWidgetProps> = ({ completed, onComplete }) => {
  const [cardIdx, setCardIdx] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const card = LATENCY_CARDS[cardIdx];
  const options = useMemo(() => shuffleWithSeed([card.answer, ...card.distractors], card.operation), [card]);
  const isLast = cardIdx === LATENCY_CARDS.length - 1;
  const finished = answeredCount === LATENCY_CARDS.length;

  const pick = (opt: string) => {
    if (choice !== null) return;
    setChoice(opt);
    setAnsweredCount((n) => {
      const next = n + 1;
      if (next === LATENCY_CARDS.length && !completed) onComplete();
      return next;
    });
    if (opt === card.answer) setCorrectCount((c) => c + 1);
  };

  const next = () => {
    if (!isLast) {
      setCardIdx(cardIdx + 1);
      setChoice(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--cv-action-primary)]">
          <Gauge size={13} /> Latency numbers every engineer should know
        </p>
        <span className="text-[11px] font-bold tabular-nums text-[var(--cv-text-muted)]">
          Card {cardIdx + 1} / {LATENCY_CARDS.length} · {correctCount} correct
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={cardIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <div className="mx-auto mt-4 max-w-md rounded-2xl border-2 border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.02))] px-5 py-6 text-center">
            <p className="text-base font-black text-[var(--cv-text-heading)]">{card.operation}</p>
            <p className="mt-1 text-[11px] font-bold text-[var(--cv-text-muted)]">≈ how long?</p>
          </div>

          <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-2">
            {options.map((opt) => {
              const state = choice === null ? 'idle' : opt === card.answer ? 'correct' : opt === choice ? 'wrong' : 'dim';
              const cls = state === 'correct'
                ? 'border-[#15803d] bg-[#eef9f2] text-[#15803d]'
                : state === 'wrong'
                  ? 'border-[#b03a54] bg-[#fdeef1] text-[#b03a54]'
                  : state === 'dim'
                    ? 'border-[var(--cv-border-warm)] text-[var(--cv-text-muted)] opacity-40'
                    : 'border-[var(--cv-border-warm)] text-[var(--cv-text-heading)] hover:border-[var(--cv-action-border)]';
              return (
                <button key={opt} type="button" onClick={() => pick(opt)} className={`rounded-xl border-2 px-3 py-2.5 font-mono text-sm font-black transition-colors ${cls}`}>
                  {opt}
                </button>
              );
            })}
          </div>

          {choice !== null && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-3 max-w-md rounded-xl bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.04))] px-4 py-2.5 text-xs font-semibold leading-5 text-[var(--cv-text-body)]">
            💡 {card.insight}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-center gap-2">
        {choice !== null && !isLast && (
          <button type="button" onClick={next} className="cv-design-button-primary inline-flex h-9 items-center gap-1 rounded-lg px-4 text-xs">
            Next card <ChevronRight size={13} />
          </button>
        )}
        {finished && (
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#15803d]">
            <CheckCircle2 size={14} /> {correctCount}/{LATENCY_CARDS.length} — {correctCount >= 6 ? 'strong latency intuition!' : 'review the table and run it again.'}
          </span>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] font-medium text-[var(--cv-text-muted)]">
        {finished || completed ? '✓ Lesson complete! Source: The System Design Primer (CC BY 4.0).' : 'Answer all cards to complete this lesson. Magnitudes matter, not exact digits.'}
      </p>
    </div>
  );
};

export default LatencyFlashcardsWidget;
