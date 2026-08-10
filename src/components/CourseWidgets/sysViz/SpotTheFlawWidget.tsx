import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchX, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { CourseWidgetProps } from '../types';
import { FLAW_SCENES } from '../../../lib/systemDesignQuestionBank';

/**
 * Spot-the-flaw — each scene shows a small architecture with exactly one
 * design mistake. Click the flawed component; learn why. Completes after
 * every scene is solved.
 */

const SpotTheFlawWidget: React.FC<CourseWidgetProps> = ({ completed, onComplete }) => {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [solved, setSolved] = useState<boolean[]>(FLAW_SCENES.map(() => false));
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const scene = FLAW_SCENES[sceneIdx];
  const isSolved = solved[sceneIdx];
  const allSolved = solved.every(Boolean);

  const pick = (id: string) => {
    if (isSolved) return;
    if (id === scene.flawedId) {
      setWrongPick(null);
      setSolved((prev) => {
        const next = prev.map((s, i) => (i === sceneIdx ? true : s));
        if (next.every(Boolean) && !completed) onComplete();
        return next;
      });
    } else {
      setWrongPick(id);
      window.setTimeout(() => setWrongPick(null), 900);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--cv-action-primary)]">
          <SearchX size={13} /> Spot the flaw · one mistake per architecture
        </p>
        <span className="text-[11px] font-bold tabular-nums text-[var(--cv-text-muted)]">Scene {sceneIdx + 1} / {FLAW_SCENES.length} · {solved.filter(Boolean).length} solved</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={scene.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <h3 className="cv-design-title mt-3 text-base">{scene.title}</h3>
          <p className="cv-design-body mt-1 text-sm">{scene.brief}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {scene.components.map((c) => {
              const revealed = isSolved && c.id === scene.flawedId;
              const isWrong = wrongPick === c.id;
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c.id)}
                  animate={isWrong ? { x: [0, -5, 5, -4, 0] } : {}}
                  className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${revealed
                    ? 'border-[#b03a54] bg-[#fdeef1]'
                    : isWrong
                      ? 'border-[#e8a33d] bg-[#fdf3d7]'
                      : isSolved
                        ? 'border-[#b9e3c8] bg-[#eef9f2] opacity-70'
                        : 'border-[var(--cv-border-warm)] hover:border-[var(--cv-action-border)]'}`}
                >
                  <p className={`text-sm font-extrabold ${revealed ? 'text-[#b03a54]' : 'text-[var(--cv-text-heading)]'}`}>
                    {revealed ? '⚠ ' : isSolved ? '✓ ' : ''}{c.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] font-medium text-[var(--cv-text-muted)]">{c.detail}</p>
                  {isWrong && <p className="mt-1 text-[11px] font-bold text-[#a35410]">This one is fine — look again.</p>}
                </motion.button>
              );
            })}
          </div>

          {isSolved && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl bg-[#fdeef1] px-4 py-3">
              <p className="text-xs font-semibold leading-5 text-[#8f2e43]">{scene.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {FLAW_SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSceneIdx(i)}
              aria-label={`Scene ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${i === sceneIdx ? 'bg-[var(--cv-action-solid)]' : solved[i] ? 'bg-[#15803d]' : 'bg-[var(--cv-border-warm)]'}`}
            />
          ))}
        </div>
        {isSolved && sceneIdx < FLAW_SCENES.length - 1 && (
          <button type="button" onClick={() => setSceneIdx(sceneIdx + 1)} className="cv-design-button-primary inline-flex h-9 items-center gap-1 rounded-lg px-4 text-xs">
            Next scene <ChevronRight size={13} />
          </button>
        )}
        {allSolved && (
          <span className="inline-flex items-center gap-1 text-xs font-black text-[#15803d]"><CheckCircle2 size={14} /> All flaws found!</span>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] font-medium text-[var(--cv-text-muted)]">
        {allSolved || completed ? '✓ Lesson complete! SPOF, statefulness, stale caches, poison messages — the four flaws behind most real outages.' : 'Find the flaw in every scene to complete this lesson.'}
      </p>
    </div>
  );
};

export default SpotTheFlawWidget;
