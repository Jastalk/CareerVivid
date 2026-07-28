import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Trophy, ArrowRight, X, Lightbulb, PlayCircle } from 'lucide-react';
import type { PlacedMission } from '../../lib/questSource';
import { domainVideoFor } from '../../lib/ccafVideoLessons';
import { LessonPlayer } from './LessonPlayer';
import { useQuestLocale } from './useQuestLocale';

interface MissionDialogProps {
    mission: PlacedMission;
    alreadyCleared: boolean;
    /** Fires once, after every step in the mission has been answered. */
    onComplete: () => void;
    onMiss: () => void;
    onClose: () => void;
    /** Already sat through this domain's course video at least once. */
    hasWatched?: boolean;
    /** Fired when the video finishes, so the domain's gate opens for good. */
    onWatched?: () => void;
    /** Reopen the course video while a question is on screen. */
    onRewatch?: () => void;
    /** Interaction cue, so answering sounds like answering. */
    onSfx?: (name: 'select' | 'correct' | 'wrong') => void;
    /** Straight into the next question, without returning to the city first. */
    onNextMission?: () => void;
    /**
     * True when clearing this mission finishes the whole course.
     *
     * Without it the final debrief ends on the muted "back to the city" link,
     * which reads as nothing having happened — and because the finale only
     * plays once this dialog closes, a player who never finds that link never
     * sees it. The last question gets a primary button of its own instead.
     */
    finishesCourse?: boolean;
}

/**
 * The dialog's primary action. Same shape every time — only the colour changes
 * — so "next step", "next question" and "finish the course" read as one control
 * the player learns once.
 */
const PrimaryAction: React.FC<{
    onClick: () => void;
    tone?: 'default' | 'finale';
    children: React.ReactNode;
}> = ({ onClick, tone = 'default', children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95 ${
            tone === 'finale'
                ? 'bg-gradient-to-r from-[#f5871f] to-[#ffb066] shadow-lg shadow-[#f5871f]/30'
                : 'bg-[#625bd5] hover:bg-[#514ac5]'
        }`}
    >
        {children}
    </button>
);

/**
 * The mission "contract" panel. Ordinary missions hold one decision; boss
 * missions chain several, and the player must carry the architecture through
 * all of them. A wrong pick explains why that option is weaker and lets them
 * retry — the goal is to teach the distinction, not to score.
 */
export const MissionDialog: React.FC<MissionDialogProps> = ({
    mission, alreadyCleared, onComplete, onMiss, onClose, hasWatched = false, onWatched, onRewatch, onSfx, onNextMission,
    finishesCourse = false,
}) => {
    const { localize, t } = useQuestLocale();
    const video = domainVideoFor(mission.domainOrder);
    // Learn, then answer. The domain's course video leads the first time any of
    // its missions is opened; once watched, it never blocks again.
    const [showingLesson, setShowingLesson] = useState(Boolean(video) && !hasWatched);
    const [stepIndex, setStepIndex] = useState(0);
    const [picked, setPicked] = useState<string | null>(null);
    const [stepSolved, setStepSolved] = useState(alreadyCleared);
    const [missedKeys, setMissedKeys] = useState<string[]>([]);
    const closeRef = useRef<HTMLButtonElement>(null);
    // The listener is bound once per gate change; these keep it current without
    // adding per-render dependencies that would rebind it constantly.
    const stepRef = useRef(mission.steps[0]);
    const chooseRef = useRef<(key: string) => void>(() => {});

    const step = mission.steps[stepIndex];
    const isLastStep = stepIndex === mission.steps.length - 1;
    const isChained = mission.steps.length > 1;
    // A replayed mission shows its debrief immediately rather than re-testing.
    const missionSolved = stepSolved && isLastStep;

    // Answering from the keyboard: A–D pick the matching option. Bound to the
    // option's own key rather than its position, so the letter on screen is
    // always the letter you press.
    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { onClose(); return; }
            if (showingLesson || stepSolved) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const el = event.target as HTMLElement | null;
            if (el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '')) return;

            const letter = event.key.toUpperCase();
            if (!stepRef.current.options.some(o => o.key === letter)) return;
            event.preventDefault();
            chooseRef.current(letter);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, showingLesson, stepSolved]);

    // Completing the final step is what clears the mission.
    useEffect(() => {
        if (missionSolved && !alreadyCleared) onComplete();
        // Intentionally keyed on the solved flag only — onComplete guards itself.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [missionSolved]);

    const choose = (key: string) => {
        if (stepSolved) return;
        // Two cues: the tap lands immediately, the verdict follows.
        onSfx?.('select');
        setPicked(key);
        if (key === step.correct) {
            onSfx?.('correct');
            setStepSolved(true);
        } else {
            onSfx?.('wrong');
            setMissedKeys(prev => (prev.includes(key) ? prev : [...prev, key]));
            onMiss();
        }
    };

    const advance = () => {
        setStepIndex(i => i + 1);
        setStepSolved(false);
        setPicked(null);
        setMissedKeys([]);
    };

    const finishLesson = () => {
        onWatched?.();
        setShowingLesson(false);
    };

    stepRef.current = step;
    chooseRef.current = choose;

    const wrongPick = picked && picked !== step.correct
        ? step.options.find(o => o.key === picked)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#171411]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`${localize(mission.name)} — ${localize(mission.site)}`}
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:rounded-3xl"
            >
                {/* Header */}
                <div className="flex items-start gap-3 border-b border-gray-200 bg-[#fbf8f2] p-5 dark:border-gray-700 dark:bg-gray-800/60">
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#c1761c]">
                            {localize(mission.site)} · {showingLesson ? t('ccaf_quest.lesson_kicker') : step.scenario}
                        </p>
                        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                            {mission.isBoss && <span className="mr-1 text-[#f5871f]">★</span>}
                            {localize(mission.name)}
                        </h2>
                        {/* Chained bosses show which link the player is on. */}
                        {isChained && !showingLesson && (
                            <div className="mt-2 flex items-center gap-1.5">
                                {mission.steps.map((_, i) => (
                                    <span
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all ${
                                            i < stepIndex || (i === stepIndex && stepSolved)
                                                ? 'w-8 bg-[#1d9e75]'
                                                : i === stepIndex ? 'w-8 bg-[#625bd5]' : 'w-4 bg-gray-300 dark:bg-gray-600'
                                        }`}
                                    />
                                ))}
                                <span className="ml-1 text-[10px] font-bold text-gray-400">
                                    {t('ccaf_quest.step')} {stepIndex + 1}/{mission.steps.length}
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label={t('ccaf_quest.close')}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {/* Learn, then answer: the lesson owns the body until it ends. */}
                    {showingLesson && video ? (
                        <LessonPlayer
                            video={video}
                            alreadyWatched={hasWatched}
                            onFinish={finishLesson}
                        />
                    ) : (
                    <>
                    {/* Narrative brief, only on the opening step. */}
                    {stepIndex === 0 && (
                        <p className="rounded-xl border-l-4 border-[#f5871f] bg-[#fff6ea] px-4 py-3 text-sm italic leading-relaxed text-[#7a4b12] dark:bg-[#3a2a16]/50 dark:text-[#f0c9a4]">
                            {localize(mission.brief)}
                        </p>
                    )}

                    <p className="mt-4 text-[15px] font-semibold leading-relaxed text-gray-900 dark:text-gray-100">
                        {localize(step.prompt)}
                    </p>

                    <div className="mt-4 space-y-2.5">
                        {step.options.map(option => {
                            const isCorrect = option.key === step.correct;
                            const wasMissed = missedKeys.includes(option.key);
                            const revealCorrect = stepSolved && isCorrect;

                            let tone = 'border-gray-200 bg-white hover:border-[#625bd5] hover:bg-[#f5f4ff] dark:border-gray-700 dark:bg-gray-800 dark:hover:border-[#7c74e0]';
                            if (revealCorrect) tone = 'border-[#1d9e75] bg-[#e7f7f1] dark:bg-[#0f3b2c]';
                            else if (wasMissed) tone = 'border-[#e5645f] bg-[#fdeceb] opacity-70 dark:bg-[#3d1f1e]';

                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    disabled={stepSolved || wasMissed}
                                    onClick={() => choose(option.key)}
                                    className={`flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all disabled:cursor-default ${tone}`}
                                >
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        revealCorrect ? 'bg-[#1d9e75] text-white'
                                            : wasMissed ? 'bg-[#e5645f] text-white'
                                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                    }`}>
                                        {revealCorrect ? <CheckCircle2 size={14} /> : wasMissed ? <XCircle size={14} /> : option.key}
                                    </span>
                                    <span className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">
                                        {localize(option.text)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {wrongPick && !stepSolved && (
                        <div className="mt-4 rounded-xl border border-[#e5645f]/40 bg-[#fdeceb] p-4 dark:bg-[#3d1f1e]/60">
                            <p className="flex items-center gap-2 text-sm font-bold text-[#a32d2d] dark:text-[#f0a6a3]">
                                <XCircle size={16} /> {t('ccaf_quest.weaker_option')}
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#7a2523] dark:text-[#e8c4c2]">
                                {localize(wrongPick.rebuttal)}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-[#a32d2d]/80 dark:text-[#f0a6a3]/80">
                                {t('ccaf_quest.try_again')}
                            </p>
                        </div>
                    )}

                    {stepSolved && (
                        <div className="mt-4 space-y-3">
                            <div className="rounded-xl border border-[#1d9e75]/40 bg-[#e7f7f1] p-4 dark:bg-[#0f3b2c]/60">
                                <p className="flex items-center gap-2 text-sm font-bold text-[#0f6e56] dark:text-[#9fe1cb]">
                                    <CheckCircle2 size={16} /> {t('ccaf_quest.correct_answer')} {step.correct}
                                </p>
                                <p className="mt-1.5 text-sm leading-relaxed text-[#0d5b47] dark:text-[#c6ecdf]">
                                    {localize(step.explanation)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-[#625bd5]/30 bg-[#f3f2ff] p-4 dark:bg-[#2a2657]/60">
                                <p className="flex items-center gap-2 text-sm font-bold text-[#534ab7] dark:text-[#b8b4ff]">
                                    <Lightbulb size={16} /> {t('ccaf_quest.takeaway')}
                                </p>
                                <p className="mt-1.5 text-sm leading-relaxed text-[#443c9c] dark:text-[#cecbf6]">
                                    {localize(step.takeaway)}
                                </p>
                            </div>
                            <p className="text-center text-[10px] text-gray-400">
                                {/* sourceQuestion names the upstream repo, so the licence note trails it. */}
                                {step.sourceQuestion} · {t('ccaf_quest.source_note')}
                            </p>
                        </div>
                    )}
                    </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-[#c1761c]">
                        <Trophy size={15} /> +{mission.xp} XP
                    </span>
                    {showingLesson ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('ccaf_quest.lesson_first_time')}
                        </span>
                    ) : (
                    <span className="flex items-center gap-3">
                    {/* Stuck on a question is exactly when someone wants the
                        lesson again, so the way back is offered right here. */}
                    {video && onRewatch && (
                        <button
                            type="button"
                            onClick={onRewatch}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-[#625bd5] dark:text-gray-400"
                        >
                            <PlayCircle size={14} /> {t('ccaf_quest.lesson_rewatch')}
                        </button>
                    )}
                    {stepSolved && !isLastStep ? (
                        <PrimaryAction onClick={advance}>
                            {t('ccaf_quest.next_step')} <ArrowRight size={15} />
                        </PrimaryAction>
                    ) : stepSolved && finishesCourse ? (
                        <PrimaryAction onClick={onClose} tone="finale">
                            <Trophy size={15} /> {t('ccaf_quest.finish_course')}
                        </PrimaryAction>
                    ) : stepSolved ? (
                        <span className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                {t('ccaf_quest.back_to_city')}
                            </button>
                            {/* Chaining question to question is the common path once
                                the lesson is watched, so it gets the primary button. */}
                            {onNextMission && (
                                <PrimaryAction onClick={onNextMission}>
                                    {t('ccaf_quest.next_question')} <ArrowRight size={15} />
                                </PrimaryAction>
                            )}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('ccaf_quest.pick_best')}</span>
                    )}
                    </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MissionDialog;
