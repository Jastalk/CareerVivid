import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelTopOpen, RotateCcw } from 'lucide-react';
import type { CourseWidgetProps } from './types';

/**
 * Context-window visualizer — the learner stuffs a conversation into a model's
 * context window and watches older messages get truncated when it overflows.
 * Completes once they've caused a truncation at least once.
 */

interface Block {
  uid: number;
  label: string;
  tokens: number;
  color: string;
  pinned?: boolean;
}

const BLOCK_TYPES: Omit<Block, 'uid'>[] = [
  { label: 'User question', tokens: 150, color: 'bg-[#6c63d8]' },
  { label: 'Model reply', tokens: 400, color: 'bg-[#8b7ff0]' },
  { label: 'Tool result', tokens: 800, color: 'bg-[#2f9e6e]' },
  { label: 'Pasted document', tokens: 2500, color: 'bg-[#d98324]' },
];

const SYSTEM_BLOCK: Omit<Block, 'uid'> = { label: 'System prompt', tokens: 300, color: 'bg-[#4c6ef5]', pinned: true };

const WINDOW_SIZES = [
  { label: 'Small (4k)', capacity: 4_000 },
  { label: 'Medium (32k)', capacity: 32_000 },
  { label: 'Large (200k)', capacity: 200_000 },
];

const ContextWindowWidget: React.FC<CourseWidgetProps> = ({ completed, onComplete }) => {
  const [capacityIndex, setCapacityIndex] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>([{ ...SYSTEM_BLOCK, uid: 0 }]);
  const [dropped, setDropped] = useState<Block[]>([]);
  const [nextUid, setNextUid] = useState(1);
  const [hasTruncated, setHasTruncated] = useState(false);

  const capacity = WINDOW_SIZES[capacityIndex].capacity;
  const used = useMemo(() => blocks.reduce((n, b) => n + b.tokens, 0), [blocks]);

  const addBlock = (type: Omit<Block, 'uid'>) => {
    const incoming: Block = { ...type, uid: nextUid };
    setNextUid((u) => u + 1);

    let next = [...blocks, incoming];
    const evicted: Block[] = [];
    // Evict oldest non-pinned blocks until the conversation fits.
    while (next.reduce((n, b) => n + b.tokens, 0) > capacity) {
      const victimIndex = next.findIndex((b) => !b.pinned && b.uid !== incoming.uid);
      if (victimIndex === -1) break;
      evicted.push(next[victimIndex]);
      next = next.filter((_, i) => i !== victimIndex);
    }
    setBlocks(next);
    if (evicted.length > 0) {
      setDropped((prev) => [...prev, ...evicted].slice(-6));
      if (!hasTruncated) {
        setHasTruncated(true);
        if (!completed) onComplete();
      }
    }
  };

  const reset = () => {
    setBlocks([{ ...SYSTEM_BLOCK, uid: 0 }]);
    setDropped([]);
    setNextUid(1);
  };

  const fillPercent = Math.min((used / capacity) * 100, 100);

  return (
    <div className="rounded-2xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--cv-action-primary)]">
          <PanelTopOpen size={13} /> Context-window visualizer
        </p>
        <div className="flex items-center gap-2">
          {WINDOW_SIZES.map((size, i) => (
            <button
              key={size.label}
              onClick={() => setCapacityIndex(i)}
              className={`h-7 rounded-lg px-2.5 text-[11px] font-bold transition-colors ${i === capacityIndex
                ? 'bg-[var(--cv-action-solid)] text-white'
                : 'border border-[var(--cv-border-warm)] text-[var(--cv-text-body)] hover:border-[var(--cv-action-border)]'}`}
            >
              {size.label}
            </button>
          ))}
          <button onClick={reset} className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--cv-border-warm)] px-2.5 text-[11px] font-bold text-[var(--cv-text-body)] hover:border-[var(--cv-action-border)]">
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* The window */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-bold text-[var(--cv-text-muted)]">
            {used.toLocaleString()} / {capacity.toLocaleString()} tokens
          </p>
          <p className={`text-[11px] font-bold ${fillPercent > 85 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--cv-text-muted)]'}`}>
            {Math.round(fillPercent)}% full
          </p>
        </div>
        <div className="mt-1.5 flex h-12 w-full gap-0.5 overflow-hidden rounded-xl border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.04))] p-1">
          <AnimatePresence>
            {blocks.map((block) => (
              <motion.div
                key={block.uid}
                layout
                initial={{ opacity: 0, scaleX: 0.3 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                style={{ width: `${Math.max((block.tokens / capacity) * 100, 1.5)}%` }}
                className={`group relative min-w-0 rounded-md ${block.color}`}
                title={`${block.label} · ~${block.tokens} tokens`}
              >
                <span className="absolute inset-0 flex items-center justify-center truncate px-1 text-[9px] font-extrabold text-white/90">
                  {(block.tokens / capacity) > 0.08 ? block.label : ''}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Add buttons */}
      <p className="mt-3 text-[11px] font-bold text-[var(--cv-text-muted)]">Add to the conversation:</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {BLOCK_TYPES.map((type) => (
          <button
            key={type.label}
            onClick={() => addBlock(type)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--cv-border-warm)] px-3 text-xs font-bold text-[var(--cv-text-body)] transition-all hover:-translate-y-0.5 hover:border-[var(--cv-action-border)]"
          >
            <span className={`h-2.5 w-2.5 rounded-sm ${type.color}`} />
            {type.label} <span className="font-medium text-[var(--cv-text-muted)]">~{type.tokens}</span>
          </button>
        ))}
      </div>

      {/* Dropped messages */}
      <AnimatePresence>
        {dropped.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 overflow-hidden rounded-xl border border-rose-300/60 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/40">
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">
              Truncated — the model can no longer see these:
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {dropped.map((block) => (
                <span key={block.uid} className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 line-through dark:bg-rose-900/50 dark:text-rose-300">
                  {block.label}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-3 text-[11px] font-medium text-[var(--cv-text-muted)]">
        {hasTruncated || completed
          ? '✓ Lesson complete! You just saw why chatbots "forget" the start of long conversations — and why pasting huge documents pushes everything else out. The system prompt survives because apps pin it.'
          : 'To complete: overflow the window once. Try the small window and paste a couple of documents — then imagine this happening silently in production.'}
      </p>
    </div>
  );
};

export default ContextWindowWidget;
