import React from 'react';
import { AlertTriangle, ArrowUpRight, Mic } from 'lucide-react';
import LiveWhiteboard from './LiveWhiteboard';
import { QUEST_DEMOS } from './questDemos';
import { useCycle, useHasBeenSeen, useTypedText } from './liveHooks';

const QuestTape: React.FC = () => {
    const [ref, seen] = useHasBeenSeen<HTMLDivElement>();
    // Each design gets long enough to draw itself and be read before the next.
    const [active, setActive] = useCycle(QUEST_DEMOS.length, seen, 9000);
    const demo = QUEST_DEMOS[active];
    const note = useTypedText(demo.note, seen, 14);

    return (
        <section ref={ref} className="mx-auto max-w-6xl px-4 py-20 sm:px-6" id="quests">
            <div className="mb-10 text-center">
                <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                    system design quests
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                    draw it. get told what&apos;s wrong with it.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                    Pick a company. Get their prompt on a whiteboard. Every gap and diagnosis
                    below is what the coach sent back for the design you can see beside it.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
                <div className="cvl-win">
                    <div className="cvl-bar" style={{ backgroundImage: 'linear-gradient(90deg, rgba(98,91,213,0.16), transparent 65%)' }}>
                        <span className="cvl-dot cvl-dot-r" />
                        <span className="cvl-dot cvl-dot-y" />
                        <span className="cvl-dot cvl-dot-g" />
                        <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                            {demo.id}-system-design.quest
                        </span>
                        <span
                            className="cvl-mono ml-auto hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline"
                            style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                        >
                            recording
                        </span>
                    </div>

                    <div className="grid sm:grid-cols-[minmax(0,1fr)_260px]">
                        <div className="flex items-center justify-center p-2">
                            <div className="aspect-[320/200] w-full max-w-[520px]">
                                <LiveWhiteboard spec={demo.spec} playing={seen} replayKey={demo.id} />
                            </div>
                        </div>

                        <div
                            className="flex flex-col gap-3 border-t p-4 sm:border-l sm:border-t-0"
                            style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                        >
                            <div>
                                <p className="cvl-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--cvl-faint)' }}>
                                    the prompt
                                </p>
                                <p className="mt-1 text-sm font-semibold leading-snug">{demo.prompt}</p>
                            </div>
                            <p
                                className="inline-flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold leading-snug"
                                style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                            >
                                <AlertTriangle size={12} className="mt-[1px] shrink-0" />
                                {demo.gap}
                            </p>
                            <div
                                className="rounded-lg border p-3"
                                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)' }}
                            >
                                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--cvl-purple)' }}>
                                    <Mic size={11} /> coach
                                </p>
                                <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                    {note}
                                    {note.length < demo.note.length && <span className="cvl-caret" />}
                                </p>
                            </div>
                            <a
                                href={`/quest/${demo.slug}`}
                                className="cvl-cta mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition hover:opacity-90"
                            >
                                Open the {demo.company.split(' · ')[0]} quest <ArrowUpRight size={14} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
                    {QUEST_DEMOS.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActive(index)}
                            aria-pressed={index === active}
                            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition"
                            style={{
                                borderColor: index === active ? 'var(--cvl-purple)' : 'var(--cvl-line)',
                                background: index === active ? 'var(--cvl-purple-soft)' : 'var(--cvl-paper)',
                            }}
                        >
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold"
                                style={{
                                    background: index === active ? 'var(--cvl-purple)' : 'var(--cvl-paper-2)',
                                    color: index === active ? '#fff' : 'var(--cvl-muted)',
                                }}
                            >
                                {item.initials}
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold">{item.company}</span>
                                <span className="block truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                                    {item.prompt}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default QuestTape;
