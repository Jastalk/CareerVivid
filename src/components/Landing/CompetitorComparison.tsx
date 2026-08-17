import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  X,
  Check,
  Sparkles,
  ShieldCheck,
  Briefcase,
  BrainCircuit,
  Layers,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

interface Competitor {
  name: string;
  icon: React.ReactNode;
  gap: string;
  edge: string;
  accentFrom: string;
  accentTo: string;
  cursorColor: string;
  accentText: string;
  borderFocused: string;
  ringFocused: string;
  glowShadow: string;
}

const competitors: Competitor[] = [
  {
    name: 'Resume.io / Zety',
    icon: <Briefcase size={14} />,
    gap: 'No Career Agent, no job tracker',
    edge: 'All-in-one: resume + interview + tracker + portfolio',
    accentFrom: 'from-rose-500',
    accentTo: 'to-orange-500',
    cursorColor: 'bg-rose-400',
    accentText: 'text-rose-400',
    borderFocused: 'border-rose-500/50',
    ringFocused: 'ring-rose-500/20',
    glowShadow: 'group-hover:shadow-rose-500/30',
  },
  {
    name: 'LinkedIn',
    icon: <Layers size={14} />,
    gap: 'No Career Agent, no whiteboard',
    edge: 'AI voice interview simulation, architecture diagramming',
    accentFrom: 'from-sky-500',
    accentTo: 'to-blue-600',
    cursorColor: 'bg-sky-400',
    accentText: 'text-sky-400',
    borderFocused: 'border-sky-500/50',
    ringFocused: 'ring-sky-500/20',
    glowShadow: 'group-hover:shadow-sky-500/30',
  },
  {
    name: 'Notion / Miro',
    icon: <BrainCircuit size={14} />,
    gap: 'Not career-focused',
    edge: 'Purpose-built career OS with AI at every step',
    accentFrom: 'from-violet-500',
    accentTo: 'to-purple-600',
    cursorColor: 'bg-violet-400',
    accentText: 'text-violet-400',
    borderFocused: 'border-violet-500/50',
    ringFocused: 'ring-violet-500/20',
    glowShadow: 'group-hover:shadow-violet-500/30',
  },
  {
    name: 'ChatGPT',
    icon: <ShieldCheck size={14} />,
    gap: 'No structured workflow',
    edge: 'Guided flows with templates, tracking, and export',
    accentFrom: 'from-emerald-500',
    accentTo: 'to-teal-600',
    cursorColor: 'bg-emerald-400',
    accentText: 'text-emerald-400',
    borderFocused: 'border-emerald-500/50',
    ringFocused: 'ring-emerald-500/20',
    glowShadow: 'group-hover:shadow-emerald-500/30',
  },
];

// ── Animation Variants ────────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 90, damping: 18 },
  },
};

// ── Terminal-style Competitor Card ────────────────────────────────────────────

const CompetitorCard: React.FC<{
  c: Competitor;
  anyHovered: boolean;
  isFocused: boolean;
  onEnter: () => void;
  onLeave: () => void;
}> = ({ c, anyHovered, isFocused, onEnter, onLeave }) => {
  const dimmed = anyHovered && !isFocused;

  return (
    <motion.div
      layout
      variants={cardVariants}
      animate={{
        opacity: dimmed ? 0.35 : 1,
        flexGrow: isFocused ? 1.8 : dimmed ? 0.6 : 1,
      }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative min-h-[200px] md:min-h-0 flex flex-col rounded-xl overflow-hidden shadow-2xl ring-1 cursor-pointer ${
        isFocused
          ? `border ${c.borderFocused} ${c.ringFocused} ${c.glowShadow} shadow-xl`
          : 'border border-gray-200 dark:border-gray-800 ring-gray-900/5 dark:ring-white/10'
      } transition-shadow duration-300`}
      style={{ flexBasis: 0, minWidth: 0 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Gradient top bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.accentFrom} ${c.accentTo} transition-opacity duration-300 ${
          isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />

      {/* Background glow blob */}
      <div
        className={`absolute -bottom-10 -right-10 w-32 h-32 blur-2xl rounded-full pointer-events-none bg-gradient-to-br ${c.accentFrom} ${c.accentTo} transition-opacity duration-500 ${
          isFocused ? 'opacity-25' : 'opacity-0 group-hover:opacity-20'
        }`}
      />

      {/* ── Terminal header bar ── */}
      <div
        className={`flex items-center px-4 py-3 border-b gap-2 shrink-0 transition-colors ${
          isFocused
            ? 'bg-gray-900 dark:bg-black border-gray-700'
            : 'bg-gray-50 dark:bg-[#111] border-gray-200 dark:border-gray-800'
        }`}
      >
        <div className="flex gap-1.5 mr-auto">
          <div className="w-3 h-3 rounded-full bg-rose-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <span
          className={`text-xs font-mono ${
            isFocused ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          careervivid — agent
        </span>
      </div>

      {/* ── Terminal body ── */}
      <div className="p-5 font-mono text-xs sm:text-sm flex flex-col gap-3 flex-1 bg-white dark:bg-[#0a0a0a]">
        {/* Competitor badge */}
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold border px-2.5 py-1 rounded-full transition-colors ${
              isFocused
                ? `${c.accentText} border-current/30`
                : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700'
            }`}
          >
            {c.icon}
            {c.name}
            {isFocused && (
              <span className={`inline-block w-1.5 h-3.5 ${c.cursorColor} animate-pulse rounded-sm ml-0.5`} />
            )}
          </span>
        </div>

        {/* Their Gap */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
            Their Gap
          </p>
          <div className="flex items-start gap-2 border-l-2 border-gray-200 dark:border-gray-700 pl-3 font-sans text-[13px] text-gray-500 dark:text-gray-400">
            <X size={11} className="shrink-0 mt-0.5 text-gray-400 dark:text-gray-500" strokeWidth={3} />
            <span>{c.gap}</span>
          </div>
        </div>

        {/* Hover-reveal: CareerVivid Edge */}
        <AnimatePresence mode="wait">
          {isFocused ? (
            <motion.div
              key="edge"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="my-2 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                CareerVivid's Edge
              </p>
              <div className="flex items-start gap-2 border-l-2 border-emerald-400/50 pl-3 font-sans text-[13px] font-semibold text-gray-800 dark:text-gray-100">
                <Check size={11} className="shrink-0 mt-0.5 text-emerald-500" strokeWidth={3.5} />
                <span>{c.edge}</span>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-400 dark:text-gray-600 italic font-sans text-[12px] mt-auto pt-2"
            >
              Hover to see CareerVivid's edge →
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const CompetitorComparison: React.FC = () => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold mb-6 border border-amber-200/60 dark:border-amber-700/40">
          <Sparkles size={14} className="animate-pulse" />
          Why CareerVivid Wins
        </div>

        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-5">
          The only{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-violet-500 to-purple-600">
            complete career OS
          </span>
        </h2>
        <p className="max-w-2xl mx-auto text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
          Every alternative solves one piece. CareerVivid is the only platform that connects
          resume, interview, portfolio, and job tracking — powered by one unified AI.
        </p>
      </motion.div>

      {/* Terminal bento grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="flex flex-col sm:flex-row gap-5"
      >
        {competitors.map((c) => (
          <CompetitorCard
            key={c.name}
            c={c}
            anyHovered={hoveredCard !== null}
            isFocused={hoveredCard === c.name}
            onEnter={() => setHoveredCard(c.name)}
            onLeave={() => setHoveredCard(null)}
          />
        ))}
      </motion.div>

      {/* Bottom callout banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-12 rounded-2xl border border-primary-200/50 dark:border-primary-800/40 bg-gradient-to-r from-primary-50 to-violet-50 dark:from-primary-900/20 dark:to-violet-900/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500/15 flex items-center justify-center">
            <Sparkles size={18} className="text-primary-600 dark:text-primary-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            <span className="text-primary-600 dark:text-primary-400 font-black">CareerVivid </span>
            replaces 4+ separate tools — for a fraction of the combined cost.
          </p>
        </div>
        <div className="flex-shrink-0 text-xs font-black uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-900 border border-primary-200 dark:border-primary-800 px-4 py-2 rounded-full">
          One platform. One credit system.
        </div>
      </motion.div>
    </section>
  );
};

export default CompetitorComparison;
