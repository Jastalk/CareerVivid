import React, { useEffect, useRef } from 'react';
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

    useEffect(() => {
        yesRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            // Escape is not a dismissal here, it is an answer: play nothing.
            // Leaving the prompt closable-without-choosing would let a player
            // reach a silent game with no idea why.
            if (e.key === 'Escape') { e.preventDefault(); choose(false); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const choose = (musicOn: boolean) => {
        rememberAnswered();
        onChoose(musicOn);
    };

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quest-audio-title"
        >
            <div className="w-full max-w-sm rounded-3xl border border-sky-400/30 bg-slate-900/95 p-6 text-center shadow-2xl shadow-sky-500/10 sm:p-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 text-3xl">
                    🎧
                </div>

                <h2 id="quest-audio-title" className="text-xl font-bold text-white sm:text-2xl">
                    {t('ccaf_quest.audio_prompt_title')}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {t('ccaf_quest.audio_prompt_body')}
                </p>

                {/* Stacked on phones so neither button is a thumb-stretch, side by
                    side once there is room. */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                        ref={yesRef}
                        type="button"
                        onClick={() => choose(true)}
                        className="flex-1 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    >
                        {t('ccaf_quest.audio_prompt_on')}
                    </button>
                    <button
                        type="button"
                        onClick={() => choose(false)}
                        className="flex-1 rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    >
                        {t('ccaf_quest.audio_prompt_off')}
                    </button>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                    {t('ccaf_quest.audio_prompt_hint')}
                </p>
            </div>
        </div>
    );
};
