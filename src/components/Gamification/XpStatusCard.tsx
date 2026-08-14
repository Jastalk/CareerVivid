import React from 'react';
import { Flame, Zap } from 'lucide-react';
import { useUserProgress } from '../../hooks/useUserProgress';

interface XpStatusCardProps {
    /**
     * `strip` is the sidebar footer form: no card chrome, no separate caption
     * line. The bordered `expanded` card and the credits card below it were two
     * boxes saying the same kind of thing, and between them they crowded the
     * navigation above.
     */
    variant?: 'expanded' | 'collapsed' | 'strip';
    onClick?: () => void;
}

/**
 * Sidebar gamification status: level, XP progress toward next level,
 * and the daily streak flame.
 */
const XpStatusCard: React.FC<XpStatusCardProps> = ({ variant = 'expanded', onClick }) => {
    const { progress, levelInfo, isLoading, isStreakActiveToday } = useUserProgress();

    if (isLoading) return null;

    const streakCount = progress.streak.current;
    const flameTone = isStreakActiveToday
        ? 'text-[#d97706]'
        : 'text-gray-300 dark:text-gray-600';

    if (variant === 'collapsed') {
        return (
            <button
                type="button"
                onClick={onClick}
                title={`Level ${levelInfo.level} · ${streakCount}-day streak`}
                aria-label={`Level ${levelInfo.level}, ${streakCount} day streak`}
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#ececf4] bg-white text-[11px] font-extrabold text-[#4a4392] shadow-sm transition hover:border-[#dfe2ff] dark:border-[#4a4392]/40 dark:bg-[#252244]/70 dark:text-[#c9ccff] dark:hover:border-[#8d88e6]"
            >
                <span className="flex items-center gap-0.5">
                    <Zap size={11} className="shrink-0" />
                    {levelInfo.level}
                </span>
                {streakCount > 0 && (
                    <span className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#ececf4] bg-white px-1 text-[8px] font-bold dark:border-gray-700 dark:bg-gray-900 ${flameTone}`}>
                        {streakCount}
                    </span>
                )}
            </button>
        );
    }

    if (variant === 'strip') {
        return (
            <button
                type="button"
                onClick={onClick}
                aria-label={`Level ${levelInfo.level}, ${levelInfo.currentLevelXp} of ${levelInfo.nextLevelXp} XP, ${streakCount} day streak`}
                className="w-full rounded-xl px-2 py-1.5 text-left transition hover:bg-[var(--cv-surface-warm-card-strong)]"
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--cv-text-heading)]">
                        <Zap size={12} className="text-[var(--cv-action-primary)]" />
                        Level {levelInfo.level}
                    </span>
                    <span className="flex items-center gap-2 text-[11px] font-semibold tabular-nums text-[var(--cv-text-muted)]">
                        <span>{levelInfo.currentLevelXp}/{levelInfo.nextLevelXp} XP</span>
                        {streakCount > 0 && (
                            <span className={`flex items-center gap-0.5 ${flameTone}`} title={isStreakActiveToday ? 'Streak active today' : 'Practice today to keep your streak'}>
                                <Flame size={12} className={isStreakActiveToday ? 'fill-amber-400/60' : ''} />
                                {streakCount}
                            </span>
                        )}
                    </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--cv-surface-muted)]">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--cv-action-solid)] to-[var(--cv-purple-500)] transition-[width] duration-500"
                        style={{ width: `${Math.max(levelInfo.progress * 100, 2)}%` }}
                    />
                </div>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Level ${levelInfo.level}, ${levelInfo.currentLevelXp} of ${levelInfo.nextLevelXp} XP, ${streakCount} day streak`}
            className="mb-2 w-full rounded-xl border border-[#ececf4] bg-white px-3 py-2 text-left shadow-sm transition hover:border-[#dfe2ff] hover:shadow-[0_8px_24px_rgba(98,91,213,0.08)] dark:border-[#4a4392]/40 dark:bg-[#252244]/70 dark:hover:border-[#8d88e6]"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-gray-900 dark:text-gray-100">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#eef0ff] text-[#4a4392] ring-1 ring-[#dfe2ff] dark:bg-[#312d6b]/50 dark:text-[#b8b4ff] dark:ring-[#4a4392]/40">
                        <Zap size={11} />
                    </span>
                    Level {levelInfo.level}
                </span>
                <span className={`flex items-center gap-1 text-[11px] font-extrabold ${flameTone}`} title={isStreakActiveToday ? 'Streak active today' : 'Practice today to keep your streak'}>
                    <Flame size={13} className={isStreakActiveToday ? 'fill-amber-400/60' : ''} />
                    {streakCount}
                </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f3f4f6] dark:bg-gray-800">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4a4392] to-[#5b5599] transition-[width] duration-500 dark:from-[#5b5599] dark:to-[#8d88e6]"
                    style={{ width: `${Math.max(levelInfo.progress * 100, 2)}%` }}
                />
            </div>
            <p className="mt-1 text-[10px] font-semibold tabular-nums text-gray-400 dark:text-gray-500">
                {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP to level {levelInfo.level + 1}
            </p>
        </button>
    );
};

export default XpStatusCard;
