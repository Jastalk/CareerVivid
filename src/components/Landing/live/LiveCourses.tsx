import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Code2, Cpu, Network, Sparkles } from 'lucide-react';
import { usePrefersReducedMotion } from './liveHooks';

interface CourseItem {
    id: string;
    tag: string;
    title: string;
    stat: string;
    badge: string;
    preview: {
        headline: string;
        details: string[];
    };
}

const COURSES: CourseItem[] = [
    {
        id: 'coding',
        tag: 'Coding Patterns',
        title: '16 Algorithmic Patterns',
        stat: '100% Free · In-Browser Python & WASM',
        badge: 'Free Course',
        preview: {
            headline: 'Two Pointers & Sliding Window',
            details: [
                'def max_subarray_sum(nums, k):',
                '    window_sum = sum(nums[:k])',
                '    # Real-time WebAssembly test suite',
                '    ✓ Test 1: [2, 1, 5, 1, 3, 2] → Output: 9',
                '    ✓ Test 2: Edge cases & negative bounds (0.2ms)',
            ],
        },
    },
    {
        id: 'system-design',
        tag: 'System Design',
        title: 'Distributed System Roadmap',
        stat: '25+ Production Architectures',
        badge: 'Free Course',
        preview: {
            headline: 'Rate Limiting & Token Bucket',
            details: [
                'Client ➔ API Gateway ➔ Redis Token Bucket',
                'High Throughput: 100k+ QPS with sub-5ms latency',
                'Consistent Hashing & Partition Failover',
                '✓ Graded against FAANG hiring rubrics',
            ],
        },
    },
    {
        id: 'ai-agents',
        tag: 'AI Engineering',
        title: 'AI Agents & LLM Curriculum',
        stat: 'Production Agentic Systems',
        badge: 'Free Course',
        preview: {
            headline: 'Multi-Agent Tool Calling & RAG',
            details: [
                'Agent Loop: Reason ➔ Tool Select ➔ Execute',
                'Vector Search + Hybrid Semantic Retrieval',
                'Chain-of-Thought scratchpads & schema validation',
                '✓ 12-step recursive execution safety',
            ],
        },
    },
];

export const LiveCourses: React.FC<{ playing: boolean }> = ({ playing }) => {
    const reduced = usePrefersReducedMotion();
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        if (!playing || reduced) return undefined;
        const interval = window.setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % COURSES.length);
        }, 3800);
        return () => window.clearInterval(interval);
    }, [playing, reduced]);

    const current = COURSES[activeIdx];

    return (
        <div className="flex flex-col" style={{ background: 'var(--cvl-paper)' }}>
            {/* Top course selector bar */}
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
                    <span className="cvl-mono text-[11px] font-semibold tracking-wide" style={{ color: 'var(--cvl-text)' }}>
                        interactive-courses.catalog
                    </span>
                </div>
                <span
                    className="cvl-mono rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                >
                    {current.badge}
                </span>
            </div>

            {/* Course Tabs */}
            <div className="flex border-b text-[11.5px]" style={{ borderColor: 'var(--cvl-line)' }}>
                {COURSES.map((c, i) => {
                    const isActive = i === activeIdx;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setActiveIdx(i)}
                            className="flex-1 py-2.5 px-2 text-center font-medium transition-colors"
                            style={{
                                color: isActive ? 'var(--cvl-text)' : 'var(--cvl-muted)',
                                background: isActive ? 'var(--cvl-paper)' : 'var(--cvl-paper-2)',
                                borderBottom: isActive ? '2px solid var(--cvl-amber)' : '2px solid transparent',
                            }}
                        >
                            {c.tag}
                        </button>
                    );
                })}
            </div>

            {/* Main Interactive Preview Card */}
            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-1.5">
                            {current.id === 'coding' && <Code2 size={15} style={{ color: 'var(--cvl-purple)' }} />}
                            {current.id === 'system-design' && <Network size={15} style={{ color: 'var(--cvl-amber)' }} />}
                            {current.id === 'ai-agents' && <Cpu size={15} style={{ color: 'var(--cvl-green)' }} />}
                            <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
                                {current.title}
                            </h3>
                        </div>
                        <p className="mt-0.5 text-[12px] font-medium" style={{ color: 'var(--cvl-muted)' }}>
                            {current.stat}
                        </p>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Sparkles size={11} /> Free Access
                    </span>
                </div>

                {/* Simulated interactive drill box */}
                <div
                    className="mt-3.5 rounded-lg border p-3 font-mono text-[11.5px] leading-relaxed shadow-sm transition-all"
                    style={{
                        borderColor: 'var(--cvl-line)',
                        background: 'var(--cvl-paper-2)',
                    }}
                >
                    <div className="mb-2 flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'var(--cvl-line)' }}>
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cvl-muted)' }}>
                            Module Preview · {current.preview.headline}
                        </span>
                        <span className="flex items-center gap-1 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 size={11} /> Executable
                        </span>
                    </div>

                    <div className="space-y-1">
                        {current.preview.details.map((line, idx) => {
                            const isCode = line.startsWith('def') || line.startsWith('    ');
                            const isSuccess = line.includes('✓');
                            return (
                                <p
                                    key={idx}
                                    className={`truncate ${
                                        isSuccess
                                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                            : isCode
                                            ? 'text-gray-800 dark:text-gray-200'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    {line}
                                </p>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                    <span>✓ Complete curriculum included</span>
                    <span>No sign-in required to browse</span>
                </div>
            </div>
        </div>
    );
};

export default LiveCourses;
