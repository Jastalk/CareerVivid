import React, { useEffect, useRef, useState } from 'react';
import { useQuestLocale } from './useQuestLocale';

const ASKED_KEY = 'cv_ccaf_quest_audio_asked_v1';

/**
 * Has the player already answered the music question?
 *
 * Read at mount so the prompt never flashes for a returning player. Storage can
 * throw in private mode; treat that as "already asked" rather than nagging on
 * every load — a prompt that cannot remember its own answer is worse than no
 * prompt.
 */
export function hasAnsweredAudioPrompt(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return window.localStorage.getItem(ASKED_KEY) === 'yes';
    } catch {
        return true;
    }
}

function rememberAnswered(): void {
    try {
        window.localStorage.setItem(ASKED_KEY, 'yes');
    } catch {
        /* private mode — the prompt simply asks again next time */
    }
}

/** Bar heights for the equaliser, in percent. Irregular on purpose. */
const BARS = [38, 72, 100, 58, 86, 44, 68];

interface QuestAudioPromptProps {
    /** Called with the player's choice. Also the gesture that unlocks audio. */
    onChoose: (musicOn: boolean) => void;
}

/**
 * The first thing a player sees: do you want music?
 *
 * This exists for two reasons, and the second is the one that actually matters.
 *
 * The obvious one is courtesy — a 3D world that starts playing music into an
 * open-plan office is a bad first second.
 *
 * The load-bearing one is that browsers refuse to start audio without a user
 * gesture. Remembering `musicOn: true` in storage is not enough; on a fresh page
 * load the track is blocked until the player touches something. Tapping a button
 * here *is* that gesture, so music starts on the first frame it is wanted rather
 * than whenever the player happens to click later.
 *
 * Asked once. The answer lives in the same store as the in-game toggles, so the
 * toolbar switch and this prompt are the same setting seen twice.
 */
export const QuestAudioPrompt: React.FC<QuestAudioPromptProps> = ({ onChoose }) => {
    const { t } = useQuestLocale();
    const yesRef = useRef<HTMLButtonElement>(null);
    // Drives the entrance. Starting false and flipping on the first frame lets
    // the card animate in rather than appearing already placed.
    const [shown, setShown] = useState(false);
    // Set while the exit plays, so the answer is not sent twice by an
    // impatient second click.
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setShown(true));
        yesRef.current?.focus();
        return () => cancelAnimationFrame(raf);
    }, []);

    const choose = (musicOn: boolean) => {
        if (leaving) return;
        setLeaving(true);
        rememberAnswered();
        // Let the card fall away before the world takes over. Short enough that
        // it never feels like waiting.
        window.setTimeout(() => onChoose(musicOn), 180);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Escape is not a dismissal here, it is an answer: play nothing.
            // Leaving the prompt closable-without-choosing would let a player
            // reach a silent game with no idea why.
            if (e.key === 'Escape') { e.preventDefault(); choose(false); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leaving]);

    return (
        <div
            className={`fixed inset-0 z-[120] flex items-center justify-center p-4 transition-opacity duration-300 ${
                shown && !leaving ? 'opacity-100' : 'opacity-0'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quest-audio-title"
        >
            {/* Deep enough to read against the bright 3D city behind it. */}
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" />

            <div
                className={`relative w-full max-w-md transition-all duration-300 ease-out ${
                    shown && !leaving ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
                }`}
            >
                {/* A soft coloured bloom behind the card, so it reads as lit from
                    within rather than pasted on top of the scene. */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-sky-500/25 via-cyan-400/10 to-transparent blur-2xl"
                />

                {/* Gradient hairline: a 1px border that is brighter at the top
                    left, which is where the light in this scene comes from. */}
                <div className="relative rounded-[1.75rem] bg-gradient-to-br from-sky-400/50 via-slate-600/30 to-slate-700/20 p-px shadow-2xl shadow-sky-900/40">
                    <div className="rounded-[1.7rem] bg-slate-900/95 px-6 py-8 text-center sm:px-9 sm:py-10">

                        {/* Equaliser. Purely decorative, but it says "sound" faster
                            than any icon and gives the card something alive in it. */}
                        <div className="mx-auto mb-6 flex h-14 items-end justify-center gap-1.5" aria-hidden>
                            {BARS.map((h, i) => (
                                <span
                                    key={i}
                                    className="w-1.5 rounded-full bg-gradient-to-t from-sky-500 to-cyan-300"
                                    style={{
                                        height: `${h}%`,
                                        animation: `cvQuestEq 1100ms ease-in-out ${i * 90}ms infinite alternate`,
                                    }}
                                />
                            ))}
                        </div>

                        <h2
                            id="quest-audio-title"
                            className="text-[22px] font-extrabold leading-tight tracking-tight text-white sm:text-2xl"
                        >
                            {t('ccaf_quest.audio_prompt_title')}
                        </h2>
                        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                            {t('ccaf_quest.audio_prompt_body')}
                        </p>

                        {/* Stacked on phones so neither button is a thumb-stretch,
                            side by side once there is room. The affirmative sits
                            first in the DOM so it is also the first tab stop. */}
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <button
                                ref={yesRef}
                                type="button"
                                onClick={() => choose(true)}
                                className="group relative flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-400 to-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-900/40 transition hover:from-sky-300 hover:to-sky-500 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                            >
                                {/* A highlight that sweeps across on hover. */}
                                <span
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover:translate-x-full"
                                />
                                <span className="relative">🔊&nbsp;&nbsp;{t('ccaf_quest.audio_prompt_on')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => choose(false)}
                                className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/40 px-5 py-3.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                            >
                                {t('ccaf_quest.audio_prompt_off')}
                            </button>
                        </div>

                        <p className="mt-5 text-xs text-slate-500">
                            {t('ccaf_quest.audio_prompt_hint')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scoped here rather than in the global sheet: the animation exists
                only for this card and leaves with it. Respects reduced-motion —
                the bars hold still for anyone who asked for that. */}
            <style>{`
                @keyframes cvQuestEq {
                    from { transform: scaleY(0.35); }
                    to   { transform: scaleY(1); }
                }
                @media (prefers-reduced-motion: reduce) {
                    [style*="cvQuestEq"] { animation: none !important; }
                }
            `}</style>
        </div>
    );
};
