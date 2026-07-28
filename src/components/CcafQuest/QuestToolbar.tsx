import React from 'react';
import { Map as MapIcon, Rotate3d, PlayCircle, Music, Music2, Bell, BellOff } from 'lucide-react';
import { useQuestLocale } from './useQuestLocale';

/** Shared shell so every control in the column looks and behaves the same. */
const ToolButton: React.FC<{
    label: string;
    onClick: () => void;
    /** Set for the toggles; left undefined for one-shot actions. */
    active?: boolean;
    children: React.ReactNode;
}> = ({ label, onClick, active, children }) => (
    <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        aria-pressed={active}
        className={`rounded-full p-2.5 backdrop-blur-sm transition-colors ${
            active === true ? 'bg-[#625bd5] text-white'
                : active === false ? 'bg-[#171411]/85 text-white/30 hover:text-white/60'
                    : 'bg-[#171411]/85 text-white/70 hover:text-white'
        }`}
    >
        {children}
    </button>
);

interface QuestToolbarProps {
    isOverview: boolean;
    onToggleOverview: () => void;
    onRotate: () => void;
    musicOn: boolean;
    onToggleMusic: () => void;
    sfxOn: boolean;
    onToggleSfx: () => void;
    /** Omitted when the current district has no course video yet. */
    onRewatch?: () => void;
}

/**
 * The floating control column: framing, then audio, then the course video.
 *
 * Music and sound effects are separate switches on purpose — wanting the
 * interaction cues but not the ambient pad is a common preference, and one
 * combined control cannot express it.
 */
export const QuestToolbar: React.FC<QuestToolbarProps> = ({
    isOverview, onToggleOverview, onRotate,
    musicOn, onToggleMusic, sfxOn, onToggleSfx, onRewatch,
}) => {
    const { t } = useQuestLocale();

    return (
        <div className="absolute right-3 top-24 z-20 flex flex-col gap-2 sm:right-4">
            <ToolButton label={t('ccaf_quest.overview')} onClick={onToggleOverview} active={isOverview}>
                <MapIcon size={15} />
            </ToolButton>

            <ToolButton label={t('ccaf_quest.rotate')} onClick={onRotate}>
                <Rotate3d size={15} />
            </ToolButton>

            <ToolButton
                label={t(musicOn ? 'ccaf_quest.music_off' : 'ccaf_quest.music_on')}
                onClick={onToggleMusic}
                active={musicOn}
            >
                {musicOn ? <Music size={15} /> : <Music2 size={15} />}
            </ToolButton>

            <ToolButton
                label={t(sfxOn ? 'ccaf_quest.sfx_off' : 'ccaf_quest.sfx_on')}
                onClick={onToggleSfx}
                active={sfxOn}
            >
                {sfxOn ? <Bell size={15} /> : <BellOff size={15} />}
            </ToolButton>

            {onRewatch && (
                <ToolButton label={t('ccaf_quest.lesson_rewatch')} onClick={onRewatch}>
                    <PlayCircle size={15} />
                </ToolButton>
            )}
        </div>
    );
};

export default QuestToolbar;
