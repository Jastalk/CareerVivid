import React from 'react';
import { ArrowRight, Battery, FileText, Sparkles, Wifi } from 'lucide-react';
import DeskWindow from './DeskWindow';
import LiveWhiteboard from './LiveWhiteboard';
import { QUEST_DEMOS } from './QuestTape';
import { useClock, useCountUp, useHasBeenSeen, useTypedText } from './liveHooks';

/** The strip along the top. It is a menu bar, and the clock is the real time. */
export const MenuBar: React.FC = () => {
    const time = useClock();
    return (
        <header
            className="sticky top-0 z-40 border-b backdrop-blur-md"
            style={{ borderColor: 'var(--cvl-line)', background: 'color-mix(in srgb, var(--cvl-desk) 82%, transparent)' }}
        >
            <div className="mx-auto flex h-9 max-w-[1400px] items-center gap-5 px-4 text-[12.5px]">
                <a href="/" className="font-semibold tracking-tight">careervivid</a>
                <nav className="hidden gap-4 sm:flex" style={{ color: 'var(--cvl-muted)' }}>
                    <a href="#quests" className="transition hover:opacity-70">quests</a>
                    <a href="#resume" className="transition hover:opacity-70">resume</a>
                    <a href="#studio" className="transition hover:opacity-70">studio</a>
                    <a href="#pricing" className="transition hover:opacity-70">pricing</a>
                </nav>
                <div className="ml-auto flex items-center gap-3" style={{ color: 'var(--cvl-faint)' }}>
                    <Wifi size={13} className="hidden sm:block" />
                    <Battery size={14} className="hidden sm:block" />
                    <span className="cvl-mono text-[12px] tabular-nums">{time}</span>
                    <a
                        href="/signup"
                        className="font-semibold transition hover:opacity-70"
                        style={{ color: 'var(--cvl-purple)' }}
                    >
                        start free
                    </a>
                </div>
            </div>
        </header>
    );
};

const MiniWave: React.FC = () => (
    <div className="flex h-[104px] items-center gap-[3px] px-4" style={{ background: 'var(--cvl-paper)' }}>
        {Array.from({ length: 26 }, (_, index) => (
            <span
                key={index}
                className="cvl-wave-bar"
                style={{
                    display: 'block',
                    flex: 1,
                    height: 10 + ((index * 17) % 34),
                    borderRadius: 999,
                    background: 'var(--cvl-purple)',
                    opacity: 0.7,
                    ['--cvl-wave-delay' as string]: `${(index * 63) % 700}ms`,
                    ['--cvl-wave-dur' as string]: `${700 + ((index * 89) % 500)}ms`,
                }}
            />
        ))}
    </div>
);

const MiniScore: React.FC<{ playing: boolean }> = ({ playing }) => {
    const score = useCountUp(0, 88, playing, 1800);
    return (
        <div className="flex items-center gap-3 px-4 py-4" style={{ background: 'var(--cvl-paper)' }}>
            <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--cvl-line)" strokeWidth="11" />
                    <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke="var(--cvl-green)" strokeWidth="11" strokeLinecap="round"
                        pathLength={100} strokeDasharray="100" strokeDashoffset={100 - score}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold">{score}</span>
            </div>
            <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-tight">Design round passed</p>
                <p className="text-[10.5px] leading-snug" style={{ color: 'var(--cvl-faint)' }}>
                    caching, partitioning, one gap
                </p>
            </div>
        </div>
    );
};

const DeskHero: React.FC = () => {
    const [ref, seen] = useHasBeenSeen<HTMLDivElement>();
    const typedPrompt = useTypedText('design a rate limiter', seen, 46);

    return (
        <section ref={ref} className="relative overflow-hidden px-4 pb-16 pt-10 sm:pb-24 sm:pt-16">
            {/* The desk. Windows are scattered around the name, not under it. */}
            <div className="pointer-events-none absolute inset-0 hidden lg:block">
                <div className="relative mx-auto h-full max-w-[1400px]">
                    <div className="pointer-events-auto absolute left-[1%] top-[6%] w-[236px]" style={{ ['--cvl-tilt' as string]: '-2.4deg', ['--cvl-float-dur' as string]: '11s' }}>
                        <DeskWindow filename="google-quest.mov" accent="purple" floating>
                            <div className="aspect-[320/200]">
                                <LiveWhiteboard spec={QUEST_DEMOS[0].spec} playing={seen} replayKey="hero-google" />
                            </div>
                        </DeskWindow>
                    </div>

                    <div className="pointer-events-auto absolute right-[2%] top-[4%] w-[248px]" style={{ ['--cvl-tilt' as string]: '2deg', ['--cvl-float-dur' as string]: '9.5s', ['--cvl-float-delay' as string]: '-3s' }}>
                        <DeskWindow filename="voice-round.mov" accent="amber" floating>
                            <MiniWave />
                        </DeskWindow>
                    </div>

                    <div className="pointer-events-auto absolute bottom-[8%] left-[4%] w-[228px]" style={{ ['--cvl-tilt' as string]: '1.6deg', ['--cvl-float-dur' as string]: '10.5s', ['--cvl-float-delay' as string]: '-5s' }}>
                        <DeskWindow filename="score-report.png" accent="green" floating>
                            <MiniScore playing={seen} />
                        </DeskWindow>
                    </div>

                    <div className="pointer-events-auto absolute bottom-[12%] right-[4%] w-[244px]" style={{ ['--cvl-tilt' as string]: '-1.8deg', ['--cvl-float-dur' as string]: '12s', ['--cvl-float-delay' as string]: '-1.5s' }}>
                        <DeskWindow filename="uber-dispatch.mov" accent="purple" floating>
                            <div className="aspect-[320/200]">
                                <LiveWhiteboard spec={QUEST_DEMOS[3].spec} playing={seen} replayKey="hero-uber" />
                            </div>
                        </DeskWindow>
                    </div>

                    {/* Desk clutter. Nothing here is load-bearing. */}
                    <div
                        className="cvl-sticky cvl-float absolute left-[19%] top-[46%] rounded-lg px-2.5 py-1.5"
                        style={{ ['--cvl-tilt' as string]: '-6deg', ['--cvl-float-dur' as string]: '8s' }}
                    >
                        <span className="cvl-mono text-[10.5px] font-semibold" style={{ color: 'var(--cvl-amber)' }}>
                            onsite · thursday
                        </span>
                    </div>
                    <div
                        className="cvl-sticky cvl-float absolute right-[21%] top-[52%] rounded-lg px-2.5 py-1.5"
                        style={{ ['--cvl-tilt' as string]: '5deg', ['--cvl-float-dur' as string]: '9s', ['--cvl-float-delay' as string]: '-2s' }}
                    >
                        <span className="cvl-mono text-[10.5px] font-semibold" style={{ color: 'var(--cvl-amber)' }}>
                            +340 xp
                        </span>
                    </div>
                </div>
            </div>

            <div className="relative mx-auto max-w-2xl text-center">
                <span
                    className="cvl-mono inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]"
                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)', color: 'var(--cvl-muted)' }}
                >
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="cvl-live-ring absolute inset-0 rounded-full" style={{ color: 'var(--cvl-green)' }} />
                        <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: 'var(--cvl-green)' }} />
                    </span>
                    everything on this page is running live
                </span>

                <h1 className="mt-6 text-[13vw] font-bold leading-[0.92] tracking-[-0.045em] sm:text-[86px]">
                    careervivid
                </h1>

                <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed sm:text-[18px]" style={{ color: 'var(--cvl-muted)' }}>
                    Practise the interview before it happens — the whiteboard, the voice round,
                    and the resume that gets you in the room.
                </p>

                {/* A prompt box that types itself, then hands you the button. */}
                <div
                    className="mx-auto mt-7 flex max-w-md items-center gap-2 rounded-xl border p-1.5 pl-3.5 text-left"
                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)' }}
                >
                    <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: 'var(--cvl-muted)' }}>
                        {typedPrompt || 'design a…'}
                        <span className="cvl-caret" />
                    </span>
                    <a
                        href="/interview-studio"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                        style={{ background: 'var(--cvl-purple)' }}
                    >
                        Start a quest <ArrowRight size={14} />
                    </a>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
                    <a
                        href="/newresume"
                        className="inline-flex items-center gap-1.5 font-semibold transition hover:opacity-70"
                        style={{ color: 'var(--cvl-ink)' }}
                    >
                        <FileText size={14} /> Open the resume editor
                    </a>
                    <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--cvl-faint)' }}>
                        <Sparkles size={13} /> free to start, no card
                    </span>
                </div>
            </div>

            {/* Below lg the desk collapses into a plain, scrollable row. */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:hidden">
                <DeskWindow filename="google-quest.mov" accent="purple">
                    <div className="aspect-[320/200]">
                        <LiveWhiteboard spec={QUEST_DEMOS[0].spec} playing={seen} replayKey="hero-google-sm" />
                    </div>
                </DeskWindow>
                <DeskWindow filename="voice-round.mov" accent="amber">
                    <MiniWave />
                </DeskWindow>
            </div>
        </section>
    );
};

export default DeskHero;
