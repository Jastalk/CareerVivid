import React, { useCallback, useRef, useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import type { DomainVideo } from '../../lib/ccafVideoLessons';
import { domainVideoSrc } from '../../lib/ccafVideoLessons';
import { useQuestLocale } from './useQuestLocale';

/**
 * Plays a domain's course video before its questions unlock.
 *
 * The video is produced externally and dropped into public/ccaf-lessons/; this
 * component only gates on it. One video covers a whole domain, so watching it
 * once opens every mission in that district.
 *
 * The gate is watch-once: mandatory the first time, freely skippable after —
 * anything stricter punishes the people replaying to drill their weak spots.
 */

interface LessonPlayerProps {
    video: DomainVideo;
    /** Watched before — the skip control is available immediately. */
    alreadyWatched: boolean;
    /** Fired when the video ends, or when a returning player skips. */
    onFinish: () => void;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({ video, alreadyWatched, onFinish }) => {
    const { localize, t } = useQuestLocale();
    const [missing, setMissing] = useState(false);
    const [ended, setEnded] = useState(false);
    const finished = useRef(false);

    const finish = useCallback(() => {
        if (finished.current) return;
        finished.current = true;
        onFinish();
    }, [onFinish]);

    // A missing or unplayable file must never trap the player behind the gate,
    // so a load error opens it rather than closing it.
    const handleError = useCallback(() => {
        setMissing(true);
        setEnded(true);
    }, []);

    const canContinue = alreadyWatched || ended;

    return (
        <div className="flex flex-col gap-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
                {missing ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
                        <AlertCircle size={22} className="text-[#ffb066]" />
                        <p className="text-sm font-bold text-white/80">{t('ccaf_quest.lesson_missing')}</p>
                        <p className="font-mono text-[11px] text-white/40">public/ccaf-lessons/{video.src}</p>
                    </div>
                ) : (
                    <video
                        key={video.src}
                        src={domainVideoSrc(video)}
                        poster={video.poster ? `/ccaf-lessons/${video.poster}` : undefined}
                        controls
                        autoPlay
                        playsInline
                        onEnded={() => setEnded(true)}
                        onError={handleError}
                        className="h-full w-full"
                    />
                )}
            </div>

            <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {localize(video.title)}
                </p>

                {canContinue ? (
                    <button
                        type="button"
                        onClick={finish}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#4a4392] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#37316f]"
                    >
                        {t('ccaf_quest.lesson_start_questions')} <Check size={13} />
                    </button>
                ) : (
                    <span className="shrink-0 text-[11px] font-semibold text-gray-400">
                        {t('ccaf_quest.lesson_first_time')}
                    </span>
                )}
            </div>
        </div>
    );
};

export default LessonPlayer;
