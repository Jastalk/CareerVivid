import React, { useEffect, useState } from 'react';
import { Globe, Sparkles } from 'lucide-react';
import { useCountUp, useCycle, usePrefersReducedMotion, useTypedText } from './liveHooks';

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

/*
 * The second half of the demo: the same finished bullet, carried into another
 * language. The editor offers 103 of them (SUPPORTED_TRANSLATE_LANGUAGES in
 * src/constants.ts) and duplicates rather than overwrites, so the English one
 * survives — which is why the panel keeps saying the original stays put.
 *
 * Unlike the rewrite and the scores above, these renderings were not produced
 * by the agent; they stand in for a feature that is real rather than quoting a
 * specific run of it.
 */
const TRANSLATIONS = [
    { code: 'EN', label: 'English', text: AFTER },
    {
        code: 'ES',
        label: 'Español',
        text: 'Diseñé y optimicé el flujo de pago de alta concurrencia, reduciendo la latencia un 40 % y aumentando el rendimiento de transacciones exitosas para una plataforma de pagos global.',
    },
    {
        code: 'JA',
        label: '日本語',
        text: '高同時実行の決済フローを設計・最適化し、レイテンシを 40% 削減、グローバル決済基盤における取引成功スループットを向上させました。',
    },
    {
        code: 'DE',
        label: 'Deutsch',
        text: 'Den hochparallelen Checkout-Flow konzipiert und optimiert: Latenz um 40 % gesenkt und den Durchsatz erfolgreicher Transaktionen für eine globale Zahlungsplattform gesteigert.',
    },
];

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
    // Only once the score has landed — the rewrite has to finish being the
    // point before the translation can be a bonus on top of it.
    const [translating, setTranslating] = useState(false);
    const [lang] = useCycle(TRANSLATIONS.length, translating, 2800);
    const current = TRANSLATIONS[translating ? lang : 0];

    useEffect(() => {
        if (!playing) { setRewriting(false); return undefined; }
        if (reduced) { setRewriting(true); return undefined; }
        // A beat of "before" first, so the change is visible as a change.
        const timer = window.setTimeout(() => setRewriting(true), 900);
        return () => window.clearTimeout(timer);
    }, [playing, reduced]);

    useEffect(() => {
        if (!done || reduced) { setTranslating(false); return undefined; }
        const timer = window.setTimeout(() => setTranslating(true), 2200);
        return () => window.clearTimeout(timer);
    }, [done, reduced]);

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
                        {done ? current.text : typed}
                        {!done && <span className="cvl-caret" />}
                    </p>
                )}

                {translating && current.code !== 'EN' && (
                    <p
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                        style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                    >
                        <Globe size={11} /> translated to {current.label} · 103 languages · English kept
                    </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5" hidden={translating && current.code !== 'EN'}>
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
