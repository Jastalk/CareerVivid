import React from 'react';
import { X } from 'lucide-react';
import type { DomainVideo } from '../../lib/ccafVideoLessons';
import { LessonPlayer } from './LessonPlayer';
import { useQuestLocale } from './useQuestLocale';

interface QuestVideoOverlayProps {
    video: DomainVideo;
    onClose: () => void;
}

/**
 * Replaying a domain's course video mid-run.
 *
 * Layered above the mission dialog so it can be opened while a question is on
 * screen — being stuck on a question is exactly when someone wants the lesson
 * again. Progress is untouched: by the time this is reachable the domain is
 * already marked watched.
 */
export const QuestVideoOverlay: React.FC<QuestVideoOverlayProps> = ({ video, onClose }) => {
    const { t } = useQuestLocale();

    return (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-[#171411]/80 p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('ccaf_quest.lesson_rewatch')}
                className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            >
                <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {t('ccaf_quest.lesson_rewatch')}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('ccaf_quest.close')}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    >
                        <X size={18} />
                    </button>
                </div>
                <LessonPlayer video={video} alreadyWatched onFinish={onClose} />
            </div>
        </div>
    );
};

export default QuestVideoOverlay;
