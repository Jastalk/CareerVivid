/**
 * The agent's checklist.
 *
 * A spoken multi-step request is otherwise opaque — the user hears talking and
 * cannot tell what is happening or how much is left. This makes the work
 * legible while it runs.
 */

import React from 'react';
import { Check, Loader2, Circle, AlertTriangle } from 'lucide-react';
import type { LivePlan } from './useLiveCareerAgent';
import '../../components/Landing/live/liveLanding.css';

const ICON = {
    done: <Check className="h-3.5 w-3.5" style={{ color: 'var(--cvl-green)' }} />,
    running: <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--cvl-amber)' }} />,
    blocked: <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--cvl-danger)' }} />,
    pending: <Circle className="h-3.5 w-3.5" style={{ color: 'var(--cvl-faint)' }} />,
} as const;

const STEP_TONE = {
    done: { color: 'var(--cvl-faint)', textDecoration: 'line-through' },
    running: { color: 'var(--cvl-ink)' },
    blocked: { color: 'var(--cvl-danger)' },
    pending: { color: 'var(--cvl-ink)' },
} as const;

export const TaskPlan: React.FC<{ plan: LivePlan }> = ({ plan }) => {
    const done = plan.steps.filter((s) => s.status === 'done').length;

    return (
        <div className="cvl-panel p-3 text-[13.5px]">
            <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="font-semibold">{plan.goal}</p>
                <span className="cvl-mono shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--cvl-muted)' }}>
                    {done}/{plan.steps.length}
                </span>
            </div>

            <ol className="space-y-1.5">
                {plan.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">{ICON[step.status]}</span>
                        <span className="min-w-0 flex-1">
                            <span style={STEP_TONE[step.status] ?? STEP_TONE.pending}>
                                {step.title}
                            </span>
                            {step.note && (
                                <span className="block text-[12px]" style={{ color: 'var(--cvl-muted)' }}>{step.note}</span>
                            )}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default TaskPlan;
