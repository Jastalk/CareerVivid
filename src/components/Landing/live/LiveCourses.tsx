import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Code2, Cpu, Network } from 'lucide-react';
import { usePrefersReducedMotion } from './liveHooks';

/*
 * The preview lines are not one kind of thing. A course shows an architecture
 * flow, a throughput figure, the topics it covers and what it grades against —
 * four different shapes of information. They used to be four identical rows of
 * 11.5px mono, every one of them truncated, so the eye had nowhere to land and
 * the whole block read as texture. Typing each line lets it be drawn as what it
 * actually is, which is the entire readability fix.
 */
type PreviewLine =
    | { kind: 'code'; text: string }
    | { kind: 'flow'; steps: string[] }
    | { kind: 'metric'; value: string; label: string }
    | { kind: 'topic'; text: string }
    | { kind: 'check'; text: string };

interface CourseItem {
    id: string;
    tag: string;
    title: string;
    stat: string;
    accent: string;
    headline: string;
    lines: PreviewLine[];
}

const COURSES: CourseItem[] = [
    {
        id: 'coding',
        tag: 'Coding Patterns',
        title: '16 Algorithmic Patterns',
        stat: 'Runs in the browser',
        accent: 'var(--cvl-purple)',
        headline: 'Two Pointers & Sliding Window',
        lines: [
            { kind: 'code', text: 'def max_subarray_sum(nums, k):' },
            { kind: 'code', text: '    window_sum = sum(nums[:k])' },
            { kind: 'metric', value: '0.2ms', label: 'test suite, run locally' },
            { kind: 'check', text: 'Checked against real output, not a model guess' },
        ],
    },
    {
        id: 'system-design',
        tag: 'System Design',
        title: 'Distributed System Roadmap',
        stat: '25+ production architectures',
        accent: 'var(--cvl-amber)',
        headline: 'Rate Limiting & Token Bucket',
        lines: [
            { kind: 'flow', steps: ['Client', 'API Gateway', 'Redis Token Bucket'] },
            { kind: 'metric', value: '100k+ QPS', label: 'at sub-5ms latency' },
            { kind: 'topic', text: 'Consistent hashing, partition failover' },
            { kind: 'check', text: 'Scored against a written rubric, with the gaps named' },
        ],
    },
    {
        id: 'ai-agents',
        tag: 'AI Engineering',
        title: 'AI Agents & LLM Curriculum',
        stat: 'Production agentic systems',
        accent: 'var(--cvl-green)',
        headline: 'Multi-Agent Tool Calling & RAG',
        lines: [
            { kind: 'flow', steps: ['Reason', 'Select tool', 'Execute'] },
            { kind: 'metric', value: '12 steps', label: 'max per agent turn' },
            { kind: 'topic', text: 'Vector search, hybrid retrieval, schema validation' },
            { kind: 'check', text: 'Every tool call validated before it runs' },
        ],
    },
];

const ICONS: Record<string, React.ReactNode> = {
    coding: <Code2 size={15} />,
    'system-design': <Network size={15} />,
    'ai-agents': <Cpu size={15} />,
};

const PreviewRow: React.FC<{ line: PreviewLine; accent: string }> = ({ line, accent }) => {
    if (line.kind === 'code') {
        return (
            <p className="cvl-mono whitespace-pre text-[11.5px] leading-[1.7]" style={{ color: 'var(--cvl-ink)' }}>
                {line.text}
            </p>
        );
    }

    if (line.kind === 'flow') {
        return (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {line.steps.map((step, i) => (
                    <React.Fragment key={step}>
                        {i > 0 && (
                            <span aria-hidden className="text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                                &rarr;
                            </span>
                        )}
                        <span
                            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                            style={{ background: 'var(--cvl-paper)', color: 'var(--cvl-ink)', border: '1px solid var(--cvl-line)' }}
                        >
                            {step}
                        </span>
                    </React.Fragment>
                ))}
            </div>
        );
    }

    if (line.kind === 'metric') {
        // The number is the thing worth reading, so it gets the size and the
        // accent; the qualifier sits beside it rather than competing with it.
        return (
            <p className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-[15px] font-semibold tracking-tight" style={{ color: accent }}>
                    {line.value}
                </span>
                <span className="text-[11.5px]" style={{ color: 'var(--cvl-muted)' }}>
                    {line.label}
                </span>
            </p>
        );
    }

    if (line.kind === 'topic') {
        return (
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                {line.text}
            </p>
        );
    }

    return (
        <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--cvl-green)' }}>
            <Check size={12} className="mt-[3px] shrink-0" />
            <span>{line.text}</span>
        </p>
    );
};

export const LiveCourses: React.FC<{ playing: boolean }> = ({ playing }) => {
    const reduced = usePrefersReducedMotion();
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        if (!playing || reduced) return undefined;
        const interval = window.setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % COURSES.length);
        }, 4600);
        return () => window.clearInterval(interval);
    }, [playing, reduced]);

    const current = COURSES[activeIdx];

    return (
        <div className="flex flex-col" style={{ background: 'var(--cvl-paper)' }}>
            {/* Catalog bar */}
            <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
            >
                <div className="flex items-center gap-2">
                    <span
                        className="flex h-6 w-6 items-center justify-center rounded-md text-white shadow-sm"
                        style={{ background: 'var(--cvl-amber)' }}
                    >
                        <BookOpen size={12} />
                    </span>
                    {/* was var(--cvl-text), which is not a token in this set — the
                        colour silently fell through to whatever it inherited. */}
                    <span className="cvl-mono text-[11px] font-semibold tracking-wide" style={{ color: 'var(--cvl-ink)' }}>
                        interactive-courses.catalog
                    </span>
                </div>
                {/*
                 * One free signal, not four. The card used to carry a FREE COURSE
                 * badge, a "Free Access" line, "Complete curriculum included" and
                 * "No sign-in required to browse" — all saying roughly the same
                 * thing in the same small space, so none of them landed.
                 */}
                <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                >
                    Free &middot; no sign-in
                </span>
            </div>

            {/* Course tabs */}
            <div className="flex border-b text-[11.5px]" style={{ borderColor: 'var(--cvl-line)' }} role="tablist">
                {COURSES.map((c, i) => {
                    const isActive = i === activeIdx;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveIdx(i)}
                            className="flex-1 px-2 py-2.5 text-center font-medium transition-colors"
                            style={{
                                color: isActive ? 'var(--cvl-ink)' : 'var(--cvl-muted)',
                                background: isActive ? 'var(--cvl-paper)' : 'var(--cvl-paper-2)',
                                borderBottom: `2px solid ${isActive ? c.accent : 'transparent'}`,
                            }}
                        >
                            {c.tag}
                        </button>
                    );
                })}
            </div>

            <div className="p-4 sm:p-5">
                <div className="flex items-center gap-1.5">
                    <span style={{ color: current.accent }}>{ICONS[current.id]}</span>
                    <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--cvl-ink)' }}>
                        {current.title}
                    </h3>
                </div>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--cvl-muted)' }}>
                    {current.stat}
                </p>

                {/*
                 * min-height holds the frame steady while the tabs auto-rotate.
                 * Without it the window resizes under the reader every few seconds,
                 * since the three courses do not produce equal-height previews.
                 */}
                <div
                    className="mt-3.5 min-h-[132px] rounded-lg border p-3 shadow-sm"
                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                >
                    <p
                        className="mb-2.5 border-b pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider"
                        style={{ borderColor: 'var(--cvl-line)', color: 'var(--cvl-faint)' }}
                    >
                        {current.headline}
                    </p>
                    <div className="space-y-1.5">
                        {current.lines.map((line, idx) => (
                            <PreviewRow key={idx} line={line} accent={current.accent} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveCourses;
