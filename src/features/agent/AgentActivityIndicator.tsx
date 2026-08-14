import React from 'react';
import { Loader2 } from 'lucide-react';

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
            className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-[#dfe2ff] bg-[#f3f2ff] px-3 py-2 text-left shadow-sm dark:border-[#484273] dark:bg-[#312d6b]/35"
        >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-[#4a4392] ring-1 ring-[#dfe2ff] dark:bg-[#1a1730] dark:text-[#b8b4ff] dark:ring-[#484273]">
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block text-xs font-bold text-[#4a4499] dark:text-[#d8d5ff]">{copy.title}</span>
                <span className="block truncate text-[10px] font-medium text-[#6f6aa8] dark:text-[#aaa6dd]">{copy.detail}</span>
            </span>
            <span className="ml-0.5 flex shrink-0 items-center gap-1" aria-hidden="true">
                {[0, 150, 300].map((delay) => (
                    <span
                        key={delay}
                        className="h-1 w-1 animate-bounce rounded-full bg-[#4a4392] motion-reduce:animate-none dark:bg-[#9b96ef]"
                        style={{ animationDelay: `${delay}ms` }}
                    />
                ))}
            </span>
        </div>
    );
};

export default AgentActivityIndicator;
