import React from 'react';
import { Loader2 } from 'lucide-react';
import '../../components/Landing/live/liveLanding.css';

export type AgentActivity = 'thinking' | 'working';

const ACTIVITY_COPY: Record<AgentActivity, { title: string; detail: string }> = {
    thinking: {
        title: 'Thinking…',
        detail: 'Reviewing your request and current workspace.',
    },
    working: {
        title: 'Working…',
        detail: 'Using CareerVivid tools to get your result.',
    },
};

/**
 * A visible progress state without exposing model chain-of-thought. The copy
 * describes only the product phase the user can safely rely on.
 */
export const AgentActivityIndicator: React.FC<{ activity: AgentActivity }> = ({ activity }) => {
    const copy = ACTIVITY_COPY[activity];

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={`${copy.title} ${copy.detail}`}
            className="inline-flex max-w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left"
            style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-purple-soft)' }}
        >
            <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                style={{ background: 'var(--cvl-paper)', color: 'var(--cvl-purple)' }}
            >
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block text-[12px] font-bold" style={{ color: 'var(--cvl-purple-ink)' }}>{copy.title}</span>
                <span className="block truncate text-[10.5px] font-medium" style={{ color: 'var(--cvl-muted)' }}>{copy.detail}</span>
            </span>
            <span className="ml-0.5 flex shrink-0 items-center gap-1" aria-hidden="true">
                {[0, 150, 300].map((delay) => (
                    <span
                        key={delay}
                        className="h-1 w-1 animate-bounce rounded-full motion-reduce:animate-none"
                        style={{ animationDelay: `${delay}ms`, background: 'var(--cvl-purple)' }}
                    />
                ))}
            </span>
        </div>
    );
};

export default AgentActivityIndicator;
