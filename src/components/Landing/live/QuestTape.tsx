import React from 'react';
import { ArrowUpRight, Mic } from 'lucide-react';
import LiveWhiteboard, { DesignSpec } from './LiveWhiteboard';
import { useCycle, useHasBeenSeen, useTypedText } from './liveHooks';

export interface QuestDemo {
    id: string;
    company: string;
    /** Quest slug — every one of these resolves to a real company quest. */
    slug: string;
    prompt: string;
    /** What the coach says back once the diagram lands. */
    note: string;
    initials: string;
    spec: DesignSpec;
    /** Drop a recorded walkthrough here and the card plays it instead. */
    videoSrc?: string;
}

/*
 * Five loops, five different diagrams. The prompts are drawn from the system
 * design canon the quests actually serve, and every slug below is a company
 * that has a real interview guide behind it — WhatsApp ships inside Meta's.
 */
export const QUEST_DEMOS: QuestDemo[] = [
    {
        id: 'google',
        company: 'Google',
        slug: 'google',
        prompt: 'Design a URL shortener',
        note: 'Good — but what happens when one link goes viral and every read hits the same key?',
        initials: 'G',
        spec: {
            nodes: [
                { id: 'client', label: 'client', x: 24, y: 30 },
                { id: 'api', label: 'api', x: 124, y: 30 },
                { id: 'cache', label: 'cache', x: 224, y: 30 },
                { id: 'kgs', label: 'key gen', x: 124, y: 130 },
                { id: 'store', label: 'store', x: 224, y: 130 },
            ],
            edges: [
                { from: 'client', to: 'api' },
                { from: 'api', to: 'cache', label: 'read' },
                { from: 'api', to: 'kgs', label: 'write' },
                { from: 'kgs', to: 'store' },
                { from: 'cache', to: 'store' },
            ],
        },
    },
    {
        id: 'anthropic',
        company: 'Anthropic',
        slug: 'anthropic',
        prompt: 'Design a rate limiter',
        note: 'Token bucket is right. Now: where does the counter live when you run twelve API regions?',
        initials: 'A',
        spec: {
            nodes: [
                { id: 'client', label: 'client', x: 24, y: 84 },
                { id: 'edge', label: 'edge', x: 118, y: 30 },
                { id: 'limiter', label: 'limiter', x: 118, y: 130 },
                { id: 'redis', label: 'redis', x: 224, y: 130 },
                { id: 'api', label: 'model api', x: 218, y: 30, w: 84 },
            ],
            edges: [
                { from: 'client', to: 'edge' },
                { from: 'edge', to: 'limiter', label: 'check' },
                { from: 'limiter', to: 'redis', label: 'tokens' },
                { from: 'edge', to: 'api', label: 'allow' },
            ],
        },
    },
    {
        id: 'openai',
        company: 'OpenAI',
        slug: 'openai',
        prompt: 'Design a realtime voice API',
        note: 'You have the socket. Say what happens to audio already in flight when the model is interrupted.',
        initials: 'O',
        spec: {
            nodes: [
                { id: 'mic', label: 'mic', x: 24, y: 84 },
                { id: 'ws', label: 'websocket', x: 110, y: 84, w: 86 },
                { id: 'stt', label: 'stream in', x: 216, y: 30, w: 82 },
                { id: 'model', label: 'model', x: 216, y: 130 },
            ],
            edges: [
                { from: 'mic', to: 'ws', label: 'pcm' },
                { from: 'ws', to: 'stt' },
                { from: 'stt', to: 'model' },
                { from: 'model', to: 'ws', label: 'audio out' },
            ],
        },
    },
    {
        id: 'uber',
        company: 'Uber',
        slug: 'uber',
        prompt: 'Design ride dispatch',
        note: 'Nice geo index. Two riders, one driver, same second — who wins, and how do you prove it?',
        initials: 'U',
        spec: {
            nodes: [
                { id: 'rider', label: 'rider', x: 24, y: 30 },
                { id: 'driver', label: 'driver', x: 24, y: 130 },
                { id: 'dispatch', label: 'dispatch', x: 122, y: 80, w: 82 },
                { id: 'geo', label: 'geo index', x: 226, y: 30, w: 80 },
                { id: 'trips', label: 'trips', x: 226, y: 130 },
            ],
            edges: [
                { from: 'rider', to: 'dispatch', label: 'request' },
                { from: 'driver', to: 'dispatch', label: 'ping' },
                { from: 'dispatch', to: 'geo', label: 'nearby' },
                { from: 'dispatch', to: 'trips' },
            ],
        },
    },
    {
        id: 'whatsapp',
        company: 'Meta · WhatsApp',
        slug: 'meta-facebook',
        prompt: 'Design an encrypted messenger',
        note: 'End-to-end is settled. Now add a second device without ever shipping the private key.',
        initials: 'W',
        spec: {
            nodes: [
                { id: 'phone', label: 'phone', x: 24, y: 30 },
                { id: 'gateway', label: 'gateway', x: 124, y: 30, w: 80 },
                { id: 'queue', label: 'queue', x: 226, y: 30 },
                { id: 'keys', label: 'key store', x: 124, y: 130, w: 80 },
                { id: 'peer', label: 'peer', x: 226, y: 130 },
            ],
            edges: [
                { from: 'phone', to: 'gateway', label: 'sealed' },
                { from: 'gateway', to: 'queue' },
                { from: 'queue', to: 'peer', label: 'deliver' },
                { from: 'phone', to: 'keys', label: 'prekeys' },
            ],
        },
    },
];

const QuestTape: React.FC = () => {
    const [ref, seen] = useHasBeenSeen<HTMLDivElement>();
    // Each design gets long enough to draw itself and be read before the next.
    const [active, setActive] = useCycle(QUEST_DEMOS.length, seen, 7000);
    const demo = QUEST_DEMOS[active];
    const note = useTypedText(demo.note, seen, 20);

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
                    Pick a company. Get their prompt on a whiteboard. A coach watches you draw and
                    pushes back the way an interviewer would.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
                <div className="cvl-win">
                    <div className="cvl-bar" style={{ backgroundImage: 'linear-gradient(90deg, rgba(98,91,213,0.16), transparent 65%)' }}>
                        <span className="cvl-dot cvl-dot-r" />
                        <span className="cvl-dot cvl-dot-y" />
                        <span className="cvl-dot cvl-dot-g" />
                        <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                            {demo.id}-system-design.quest
                        </span>
                        <span
                            className="cvl-mono ml-auto hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline"
                            style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                        >
                            recording
                        </span>
                    </div>

                    <div className="grid sm:grid-cols-[minmax(0,1fr)_210px]">
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
                                className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
                                style={{ background: 'var(--cvl-purple)' }}
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
