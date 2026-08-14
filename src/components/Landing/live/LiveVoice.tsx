import React, { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { usePrefersReducedMotion } from './liveHooks';

interface Line {
    who: 'interviewer' | 'you';
    text: string;
}

const TRANSCRIPT: Line[] = [
    { who: 'interviewer', text: 'Walk me through a system you took from design to production.' },
    { who: 'you', text: 'We replaced a nightly batch job with a streaming pipeline…' },
    { who: 'interviewer', text: 'What broke first when you turned it on?' },
    { who: 'you', text: 'Backpressure. Consumers fell behind within about ten minutes.' },
    { who: 'interviewer', text: 'Good. Say what you measured before you changed anything.' },
];

const SCORES = [
    { label: 'clarity', value: 82 },
    { label: 'depth', value: 74 },
    { label: 'signal', value: 91 },
];

/** 21 bars on their own slightly different clocks, so the line never marches. */
const BARS = Array.from({ length: 21 }, (_, index) => ({
    delay: (index * 71) % 620,
    duration: 620 + ((index * 97) % 420),
    height: 8 + ((index * 13) % 26),
}));

/**
 * A voice round in progress: the waveform moves while the transcript arrives a
 * line at a time and the scores land at the end.
 */
const LiveVoice: React.FC<{ playing: boolean }> = ({ playing }) => {
    const reduced = usePrefersReducedMotion();
    const [shown, setShown] = useState(0);

    useEffect(() => {
        if (!playing) { setShown(0); return undefined; }
        if (reduced) { setShown(TRANSCRIPT.length); return undefined; }
        setShown(0);
        const timer = window.setInterval(() => {
            setShown((current) => {
                if (current >= TRANSCRIPT.length) {
                    window.clearInterval(timer);
                    return current;
                }
                return current + 1;
            });
        }, 1500);
        return () => window.clearInterval(timer);
    }, [playing, reduced]);

    const finished = shown >= TRANSCRIPT.length;

    return (
        <div style={{ background: 'var(--cvl-paper)' }}>
            <div
                className="flex items-center gap-3 border-b px-4 py-3"
                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
            >
                <span
                    className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: 'var(--cvl-purple)' }}
                >
                    <Mic size={13} />
                </span>
                <div
                    className="flex h-9 flex-1 items-center gap-[3px]"
                    aria-hidden="true"
                >
                    {BARS.map((bar, index) => (
                        <span
                            key={index}
                            className={playing ? 'cvl-wave-bar' : undefined}
                            style={{
                                display: 'block',
                                flex: 1,
                                height: bar.height,
                                borderRadius: 999,
                                background: 'var(--cvl-purple)',
                                opacity: 0.75,
                                ['--cvl-wave-delay' as string]: `${bar.delay}ms`,
                                ['--cvl-wave-dur' as string]: `${bar.duration}ms`,
                            }}
                        />
                    ))}
                </div>
                <span className="cvl-mono shrink-0 text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                    04:12
                </span>
            </div>

            <div className="flex flex-col gap-2.5 p-4" style={{ minHeight: 208 }}>
                {TRANSCRIPT.slice(0, shown).map((line) => (
                    <div
                        key={line.text}
                        className="cvl-fade flex"
                        style={{
                            justifyContent: line.who === 'you' ? 'flex-end' : 'flex-start',
                            ['--cvl-draw-delay' as string]: '0ms',
                        }}
                    >
                        <p
                            className="max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed"
                            style={line.who === 'you'
                                ? { background: 'var(--cvl-purple)', color: '#fff', borderBottomRightRadius: 6 }
                                : { background: 'var(--cvl-paper-2)', color: 'var(--cvl-ink)', borderBottomLeftRadius: 6 }}
                        >
                            {line.text}
                        </p>
                    </div>
                ))}
            </div>

            {finished && (
                <div
                    className="flex flex-wrap gap-2 border-t px-4 py-3"
                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                >
                    {SCORES.map((score, index) => (
                        <span
                            key={score.label}
                            className="cvl-fade inline-flex items-baseline gap-1.5 rounded-full px-2.5 py-1"
                            style={{
                                ['--cvl-draw-delay' as string]: `${index * 140}ms`,
                                background: 'var(--cvl-green-soft)',
                                color: 'var(--cvl-green)',
                            }}
                        >
                            <span className="text-[13px] font-bold">{score.value}</span>
                            <span className="text-[10.5px] font-semibold">{score.label}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LiveVoice;
