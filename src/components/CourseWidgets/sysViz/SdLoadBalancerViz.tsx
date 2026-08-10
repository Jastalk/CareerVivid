import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Server } from 'lucide-react';
import type { CourseWidgetProps } from '../types';
import StepPlayerShell from '../algoViz/StepPlayerShell';

/**
 * Load balancer animation — requests spread across a server fleet, one server
 * dies and gets pulled by health checks, then autoscaling adds capacity.
 */

interface ServerState { id: string; status: 'healthy' | 'dead' | 'new' | 'absent'; load: number }
interface Step { servers: ServerState[]; note: string }

const STEPS: Step[] = [
  {
    note: 'Three stateless API servers behind a load balancer. Traffic splits evenly — each carries 33%.',
    servers: [{ id: 'A', status: 'healthy', load: 33 }, { id: 'B', status: 'healthy', load: 33 }, { id: 'C', status: 'healthy', load: 33 }, { id: 'D', status: 'absent', load: 0 }],
  },
  {
    note: 'Server B stops answering health checks (2 consecutive failures). It is NOT removed yet — the LB is confirming.',
    servers: [{ id: 'A', status: 'healthy', load: 33 }, { id: 'B', status: 'dead', load: 33 }, { id: 'C', status: 'healthy', load: 33 }, { id: 'D', status: 'absent', load: 0 }],
  },
  {
    note: 'Health check threshold reached → B is ejected from rotation. Its traffic redistributes: A and C now carry 50% each. No client ever saw B\'s failure.',
    servers: [{ id: 'A', status: 'healthy', load: 50 }, { id: 'B', status: 'absent', load: 0 }, { id: 'C', status: 'healthy', load: 50 }, { id: 'D', status: 'absent', load: 0 }],
  },
  {
    note: '50% per server is above the 60%-utilization target under peak. Autoscaling launches server D — possible ONLY because servers hold no session state.',
    servers: [{ id: 'A', status: 'healthy', load: 50 }, { id: 'B', status: 'absent', load: 0 }, { id: 'C', status: 'healthy', load: 50 }, { id: 'D', status: 'new', load: 0 }],
  },
  {
    note: 'D passes health checks and joins rotation: 33% each again. Detect → eject → redistribute → replace, all automatic.',
    servers: [{ id: 'A', status: 'healthy', load: 33 }, { id: 'C', status: 'healthy', load: 33 }, { id: 'D', status: 'healthy', load: 33 }, { id: 'B', status: 'absent', load: 0 }],
  },
];

const SdLoadBalancerViz: React.FC<CourseWidgetProps> = ({ completed, onComplete }) => (
  <StepPlayerShell
    icon={Network}
    title="Load balancer · health checks & redistribution"
    totalSteps={STEPS.length}
    nextLabel="Advance"
    captions={STEPS.map((s) => s.note)}
    completed={completed}
    onComplete={onComplete}
    doneText="✓ Lesson complete! Stateless servers + health-checked LB = the unit of horizontal scaling. Session state lives in Redis/DB, never on the box."
    todoText="Watch a server die, get ejected, and be replaced — with zero user impact."
    legend={
      <>
        <span><span className="mr-1.5 inline-block h-3 w-3 rounded-sm border border-[#b9e3c8] bg-[#eef9f2] align-middle" /> in rotation</span>
        <span><span className="mr-1.5 inline-block h-3 w-3 rounded-sm border border-[#b03a54] bg-[#fdeef1] align-middle" /> failing health checks</span>
        <span><span className="mr-1.5 inline-block h-3 w-3 rounded-sm border border-[#5f8fd9] bg-[#ecf4fd] align-middle" /> booting (autoscaled)</span>
      </>
    }
  >
    {(step) => {
      const { servers } = STEPS[step];
      const visible = servers.filter((s) => s.status !== 'absent');
      return (
        <div className="mx-auto max-w-md">
          {/* LB node */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-4 py-2 text-xs font-extrabold text-[var(--cv-action-primary)]">
              <Network size={14} /> Load balancer
            </div>
          </div>
          {/* Animated request dots */}
          <div className="relative mx-auto h-8 w-full max-w-sm">
            {visible.map((s, i) => (
              s.status === 'healthy' && (
                <motion.span
                  key={`dot-${s.id}-${step}`}
                  className="absolute left-1/2 top-0 h-2 w-2 rounded-full bg-[var(--cv-action-solid)]"
                  animate={{
                    x: [0, (i - (visible.length - 1) / 2) * 96],
                    y: [0, 30],
                    opacity: [1, 0.2],
                  }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.25, ease: 'easeIn' }}
                />
              )
            ))}
          </div>
          {/* Server fleet */}
          <div className="flex items-end justify-center gap-4">
            <AnimatePresence>
              {visible.map((s) => {
                const cls = s.status === 'dead'
                  ? 'border-[#b03a54] bg-[#fdeef1] text-[#b03a54] dark:bg-[#3c2229]'
                  : s.status === 'new'
                    ? 'border-[#5f8fd9] bg-[#ecf4fd] text-[#1861a8] dark:bg-[#1c2a3a]'
                    : 'border-[#b9e3c8] bg-[#eef9f2] text-[#15803d] dark:bg-[#1d3226]';
                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: s.status === 'dead' ? [0, -3, 3, -2, 0] : 0 }}
                    exit={{ opacity: 0, y: 16, scale: 0.7 }}
                    className={`flex w-24 flex-col items-center rounded-xl border-2 p-3 ${cls}`}
                  >
                    <Server size={18} />
                    <span className="mt-1 text-xs font-extrabold">API {s.id}</span>
                    <span className="mt-0.5 font-mono text-[10px] font-bold">
                      {s.status === 'dead' ? '✕ no pulse' : s.status === 'new' ? 'booting…' : `${s.load}% load`}
                    </span>
                    {s.status === 'healthy' && (
                      <span className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                        <motion.span className="block h-full rounded-full bg-current" animate={{ width: `${s.load}%` }} transition={{ duration: 0.5 }} />
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      );
    }}
  </StepPlayerShell>
);

export default SdLoadBalancerViz;
