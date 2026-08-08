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

const ICON = {
    done: <Check className="h-3.5 w-3.5 text-emerald-500" />,
    running: <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />,
    blocked: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
    pending: <Circle className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />,
} as const;

export const TaskPlan: React.FC<{ plan: LivePlan }> = ({ plan }) => {
    const done = plan.steps.filter((s) => s.status === 'done').length;

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="font-medium text-gray-900 dark:text-gray-100">{plan.goal}</p>
                <span className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {done}/{plan.steps.length}
                </span>
            </div>

            <ol className="space-y-1.5">
                {plan.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">{ICON[step.status]}</span>
                        <span className="min-w-0 flex-1">
                            <span
                                className={
                                    step.status === 'done'
                                        ? 'text-gray-400 line-through dark:text-gray-500'
                                        : step.status === 'blocked'
                                          ? 'text-red-700 dark:text-red-300'
                                          : 'text-gray-800 dark:text-gray-200'
                                }
                            >
                                {step.title}
                            </span>
                            {step.note && (
                                <span className="block text-xs text-gray-500 dark:text-gray-400">{step.note}</span>
                            )}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default TaskPlan;
