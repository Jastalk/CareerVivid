import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useCountUp, usePrefersReducedMotion, useTypedText } from './liveHooks';

/*
 * Real output, not written copy. The weak bullet was put to the Career Agent
 * for a senior payments role; the rewrite, the keyword list, and both scores
 * below are what came back. Only the name on the sample resume is invented.
 *
 * Re-run: ask /agent to rewrite BEFORE for that role, then to score both
 * versions 0-100 — and update the constants together, never one alone.
 */
const BEFORE = 'Responsible for the payments team and worked on improving the checkout flow.';
const AFTER = 'Architected and optimized the high-concurrency checkout flow, reducing latency by 40% and increasing successful transaction throughput for a global payments platform.';
const MATCHED = ['architected', 'high-concurrency', 'checkout flow', 'latency reduction', 'transaction throughput', 'payments platform'];
const SCORE_BEFORE = 25;
const SCORE_AFTER = 85;

/**
 * The resume editor, mid-rewrite. A weak bullet is struck out and the stronger
 * one types itself in while the match score climbs — the actual loop the editor
 * runs, at a speed you can watch.
 */
const LiveResume: React.FC<{ playing: boolean }> = ({ playing }) => {
    const reduced = usePrefersReducedMotion();
    const [rewriting, setRewriting] = useState(false);
    const typed = useTypedText(AFTER, rewriting, 13);
    const done = typed.length === AFTER.length;
    const score = useCountUp(SCORE_BEFORE, SCORE_AFTER, done, 1300);
    const delta = SCORE_AFTER - SCORE_BEFORE;

    useEffect(() => {
        if (!playing) { setRewriting(false); return undefined; }
        if (reduced) { setRewriting(true); return undefined; }
        // A beat of "before" first, so the change is visible as a change.
        const timer = window.setTimeout(() => setRewriting(true), 900);
        return () => window.clearTimeout(timer);
    }, [playing, reduced]);

    return (
        <div className="grid sm:grid-cols-[minmax(0,1fr)_150px]">
            <div className="p-5" style={{ background: 'var(--cvl-paper)' }}>
                <p className="text-[15px] font-bold tracking-tight">Priya Raman</p>
                <p className="text-[11px]" style={{ color: 'var(--cvl-faint)' }}>Senior Software Engineer · Seattle, WA</p>
                <div className="my-3 h-px" style={{ background: 'var(--cvl-line)' }} />
                <p className="cvl-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: 'var(--cvl-faint)' }}>
                    Experience
                </p>

                <p
                    className="mt-2 text-[12.5px] leading-relaxed transition-all duration-500"
                    style={{
                        color: 'var(--cvl-faint)',
                        textDecoration: rewriting ? 'line-through' : 'none',
                        opacity: rewriting ? 0.45 : 1,
                    }}
                >
                    {BEFORE}
                </p>

                {rewriting && (
                    <p
                        className="mt-2 rounded-md px-2 py-1.5 text-[12.5px] font-medium leading-relaxed"
                        style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-ink)' }}
                    >
                        {typed}
                        {!done && <span className="cvl-caret" />}
                    </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                    {MATCHED.map((word, index) => (
                        <span
                            key={word}
                            className={done ? 'cvl-fade' : undefined}
                            style={{
                                opacity: done ? undefined : 0,
                                ['--cvl-draw-delay' as string]: `${index * 110}ms`,
                                background: 'var(--cvl-green-soft)',
                                color: 'var(--cvl-green)',
                                borderRadius: 999,
                                padding: '2px 8px',
                                fontSize: 10.5,
                                fontWeight: 600,
                            }}
                        >
                            {word}
                        </span>
                    ))}
                </div>
            </div>

            <div
                className="flex flex-row items-center gap-4 border-t p-4 sm:flex-col sm:justify-center sm:border-l sm:border-t-0"
                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
            >
                <div className="relative h-[86px] w-[86px] shrink-0">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--cvl-line)" strokeWidth="9" />
                        <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="var(--cvl-purple)"
                            strokeWidth="9"
                            strokeLinecap="round"
                            pathLength={100}
                            strokeDasharray="100"
                            strokeDashoffset={100 - score}
                            style={{ transition: 'stroke-dashoffset 120ms linear' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[22px] font-bold leading-none">{score}</span>
                        <span className="cvl-mono text-[8px] uppercase tracking-wider" style={{ color: 'var(--cvl-faint)' }}>
                            match
                        </span>
                    </div>
                </div>
                <p className="flex items-center gap-1.5 text-center text-[11px] font-semibold" style={{ color: 'var(--cvl-purple)' }}>
                    <Sparkles size={11} /> {done ? `+${delta} against this job` : 'scoring…'}
                </p>
            </div>
        </div>
    );
};

export default LiveResume;
