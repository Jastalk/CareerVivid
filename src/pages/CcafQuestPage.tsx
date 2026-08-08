import React, { Suspense, useState } from 'react';
import { Gamepad2, Trophy, ArrowLeft, Loader2, Check, Lock, Target, Zap, ChevronRight } from 'lucide-react';
import { navigate } from '../utils/navigation';
import { listDomains, totalXpAvailable } from '../lib/questSource';
import { useQuestLocale } from '../components/CcafQuest/useQuestLocale';
import { useCcafProgress } from '../hooks/useCcafProgress';
import { FloatingCard } from '../components/FloatingCard';
import { CourseCertificate } from '../components/CcafQuest/CourseCertificate';

const CcafQuestGame = React.lazy(() => import('../components/CcafQuest/CcafQuestGame'));

/** Soft colour wash behind the cards — gives the shadows something to fall on. */
const Aurora: React.FC = () => (
    <div className="quest-aurora" aria-hidden>
        <span className="left-[-10%] top-[-8%] h-[46vmin] w-[46vmin] bg-[#7c74e0]" />
        <span className="right-[-12%] top-[18%] h-[38vmin] w-[38vmin] bg-[#f5871f]" />
        <span className="bottom-[-6%] left-[22%] h-[42vmin] w-[42vmin] bg-[#1d9e75]" />
    </div>
);

/**
 * The one control this whole page exists to lead to, so it appears both above
 * and below the fold. Landing here and having to scroll past five domain cards
 * to find "play" put the course itself behind a scroll.
 *
 * Declared at module scope rather than inside the page: a component defined in
 * a render body gets a new identity every render, so React tears the button
 * down and rebuilds it each time instead of updating it.
 */
const PlayButton: React.FC<{ label: string; onPlay: () => void; className?: string }> = ({
    label, onPlay, className = '',
}) => (
    <button
        type="button"
        onClick={onPlay}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f5871f] to-[#ffb066] px-6 py-4 text-base font-extrabold text-[#3d2400] shadow-[0_10px_30px_-10px_rgba(245,135,31,0.65)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-12px_rgba(245,135,31,0.75)] focus:outline-none focus:ring-2 focus:ring-[#f5871f] focus:ring-offset-2 active:translate-y-0 ${className}`}
    >
        <Gamepad2 size={18} />
        {label}
    </button>
);

/**
 * The quest's home base: exam readiness, the mission lines for every domain,
 * and the weak-spot drill. The 3D bundle only loads once the player enters, so
 * landing here stays cheap.
 */
const CcafQuestPage: React.FC = () => {
    const [playing, setPlaying] = useState(false);
    const [focusMissionId, setFocusMissionId] = useState<string | null>(null);
    const { localize, t } = useQuestLocale();
    const { progress, loaded, level, isCleared, isUnlocked, weakSpots, examReadiness } = useCcafProgress();

    const domains = listDomains();
    const started = loaded && progress.cleared.length > 0;

    const allMissions = domains.flatMap(d => d.missions);
    const courseComplete = loaded && allMissions.every(m => isCleared(m.id));
    // First-try rate across the whole course, matching the finale's figure.
    const perfect = allMissions.length
        ? Math.round(
            ((allMissions.length - allMissions.filter(m => (progress.misses[m.id] ?? 0) > 0).length)
                / allMissions.length) * 100,
        )
        : 0;

    const enter = (missionId: string | null = null) => {
        setFocusMissionId(missionId);
        setPlaying(true);
    };

    if (playing) {
        return (
            <div className="fixed inset-0 z-40 bg-[#cfe3f0]">
                <Suspense fallback={
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#171411] text-white">
                        <Loader2 className="animate-spin" size={26} />
                        <p className="text-sm font-semibold">{t('ccaf_quest.loading')}</p>
                    </div>
                }>
                    <CcafQuestGame focusMissionId={focusMissionId} />
                </Suspense>
                <button
                    type="button"
                    onClick={() => { setPlaying(false); setFocusMissionId(null); }}
                    className="absolute bottom-5 right-5 z-30 rounded-full bg-[#171411]/85 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-[#171411]"
                >
                    {t('ccaf_quest.exit')}
                </button>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[var(--cv-surface-warm)] px-4 py-10 sm:px-6">
            <Aurora />
            <div className="relative mx-auto max-w-3xl">
                <button
                    type="button"
                    onClick={() => navigate('/learning')}
                    className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-800 dark:hover:text-gray-200"
                >
                    <ArrowLeft size={15} /> {t('ccaf_quest.back_to_courses')}
                </button>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f2ff] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#625bd5] dark:bg-[#2a2657] dark:text-[#b8b4ff]">
                    <Gamepad2 size={13} /> {t('ccaf_quest.badge')}
                </span>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--cv-text-heading)] sm:text-4xl">
                    Claude Certified Architect
                </h1>
                <p className="mt-1 text-lg font-semibold text-[#625bd5]">Foundations · CCA-F</p>

                <PlayButton className="mt-5" label={started ? t('ccaf_quest.resume') : t('ccaf_quest.enter')} onPlay={() => enter(null)} />

                {/* Exam readiness — the number that actually matters. */}
                {loaded && (
                    <FloatingCard wrapperClassName="mt-6" className="p-5">
                        <div className="flex items-baseline justify-between gap-3">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {t('ccaf_quest.readiness_title')}
                            </h2>
                            <span className="text-2xl font-black text-[#625bd5]">
                                {Math.round(examReadiness.overall)}%
                            </span>
                        </div>

                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#f5871f] via-[#625bd5] to-[#1d9e75] transition-[width] duration-700"
                                style={{ width: `${examReadiness.overall}%` }}
                            />
                        </div>

                        <div className="mt-4 space-y-2.5">
                            {examReadiness.domains.map(({ domain, cleared, total, ratio }) => (
                                <div key={domain.id} className="flex items-center gap-3">
                                    <span className="w-7 shrink-0 text-[11px] font-bold text-gray-400">
                                        D{domain.order}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
                                        {localize(domain.name)}
                                    </span>
                                    <span className="w-24 shrink-0">
                                        <span className="block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                            <span
                                                className="block h-full rounded-full bg-[#625bd5] transition-[width] duration-500"
                                                style={{ width: `${ratio * 100}%` }}
                                            />
                                        </span>
                                    </span>
                                    <span className="w-14 shrink-0 text-right text-[11px] font-bold text-gray-500">
                                        {cleared}/{total}
                                    </span>
                                    <span className="w-9 shrink-0 text-right text-[10px] font-bold text-[#c1761c]">
                                        {domain.weight}%
                                    </span>
                                </div>
                            ))}
                            {/* Remaining exam weight that has no content yet — kept honest. */}
                            {examReadiness.weightShipped < 100 && (
                                <p className="pt-1 text-[11px] text-gray-400">
                                    {t('ccaf_quest.domain_locked')} · {100 - examReadiness.weightShipped}%
                                </p>
                            )}
                        </div>
                        <p className="mt-3 text-[11px] text-gray-400">{t('ccaf_quest.readiness_note')}</p>
                    </FloatingCard>
                )}

                {/* The reward for finishing, kept permanently rather than only
                    in the finale overlay that plays once. */}
                {courseComplete && (
                    <CourseCertificate
                        missions={allMissions.length}
                        xp={progress.xp}
                        perfect={perfect}
                        domains={domains.map(d => ({ order: d.order, name: localize(d.name), weight: d.weight }))}
                    />
                )}

                {/* Weak-spot drill — turns recorded misses into targeted practice. */}
                {loaded && weakSpots.length > 0 && (
                    <FloatingCard wrapperClassName="mt-4" className="border-[#e5645f]/35 bg-[#fdeceb]/85 p-5 dark:border-[#e5645f]/25 dark:bg-[#3d1f1e]/70">
                        <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#a32d2d] dark:text-[#f0a6a3]">
                            <Zap size={15} /> {t('ccaf_quest.weak_spots')} · {weakSpots.length}
                        </h2>
                        <p className="mt-1 text-xs text-[#7a2523] dark:text-[#e8c4c2]">{t('ccaf_quest.drill_desc')}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {weakSpots.map(mission => (
                                <button
                                    key={mission.id}
                                    type="button"
                                    onClick={() => enter(mission.id)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e5645f]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#a32d2d] transition-colors hover:bg-[#a32d2d] hover:text-white dark:bg-gray-900 dark:text-[#f0a6a3]"
                                >
                                    {localize(mission.name)}
                                    <span className="opacity-60">×{progress.misses[mission.id]}</span>
                                </button>
                            ))}
                        </div>
                    </FloatingCard>
                )}

                {/* Mission lines, one card per domain. */}
                {domains.map((domain, domainIndex) => {
                    const cleared = domain.missions.filter(m => isCleared(m.id)).length;
                    return (
                        <FloatingCard key={domain.id} wrapperClassName="mt-4" className="p-5">
                            <div className="flex items-baseline justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#c1761c]">
                                        Domain {domain.order} · {domain.weight}%
                                    </p>
                                    <h2 className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {localize(domain.name)}
                                    </h2>
                                </div>
                                {loaded && (
                                    <span className="shrink-0 text-xs font-bold text-[#625bd5]">
                                        {cleared}/{domain.missions.length}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                {localize(domain.blurb)}
                            </p>

                            <ol className="mt-3 space-y-1.5">
                                {domain.missions.map((mission, index) => {
                                    const done = loaded && isCleared(mission.id);
                                    const open = loaded && isUnlocked(mission.id);
                                    const current = open && !done;
                                    const missCount = progress.misses[mission.id] ?? 0;

                                    return (
                                        <li key={mission.id}>
                                            {/* Three states, three different signals, so none of
                                                them can be mistaken for another:
                                                  current — a purple rail down the left edge
                                                  hover   — a barely-there wash plus the arrow
                                                  locked  — inert, since entering from here would
                                                            sidestep the gate the E key enforces.
                                                The old design gave hover and "current" the same
                                                heavy fill, which read as one smeared highlight. */}
                                            <button
                                                type="button"
                                                disabled={!open}
                                                onClick={() => enter(mission.id)}
                                                aria-label={open ? `${localize(mission.name)} — ${t('ccaf_quest.open_mission')}` : undefined}
                                                className={`group relative flex w-full items-center gap-3 rounded-lg py-1.5 pl-3 pr-2 text-left text-sm transition-colors duration-150 ${
                                                    current ? 'bg-[#625bd5]/[0.07] dark:bg-[#7c74e0]/[0.10]' : ''
                                                } ${open
                                                    ? 'cursor-pointer hover:bg-black/[0.035] dark:hover:bg-white/[0.05]'
                                                    : 'cursor-default'}`}
                                            >
                                            {current && (
                                                <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-[#625bd5]" aria-hidden />
                                            )}
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                                done ? 'bg-[#1d9e75] text-white'
                                                    : current ? 'bg-[#625bd5] text-white'
                                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                                            }`}>
                                                {done ? <Check size={13} /> : open ? index + 1 : <Lock size={11} />}
                                            </span>
                                            <span className={`font-semibold transition-colors ${
                                                open
                                                    ? 'text-gray-800 group-hover:text-[#625bd5] dark:text-gray-100 dark:group-hover:text-[#b8b4ff]'
                                                    : 'text-gray-400 dark:text-gray-600'
                                            }`}>
                                                {mission.isBoss && <span className="mr-1 text-[#f5871f]">★</span>}
                                                {localize(mission.name)}
                                            </span>
                                            <span className="text-gray-300 dark:text-gray-700">·</span>
                                            <span className="truncate text-gray-500 dark:text-gray-400">{localize(mission.site)}</span>
                                            <span className="ml-auto flex shrink-0 items-center gap-2">
                                                {mission.steps.length > 1 && (
                                                    <span className="rounded-full bg-[#fff0e0] px-1.5 py-0.5 text-[10px] font-bold text-[#c1761c] dark:bg-[#3a2a16]">
                                                        {mission.steps.length} {t('ccaf_quest.steps_badge')}
                                                    </span>
                                                )}
                                                {missCount > 0 && (
                                                    <span className="rounded-full bg-[#fdeceb] px-1.5 py-0.5 text-[10px] font-bold text-[#a32d2d] dark:bg-[#3d1f1e] dark:text-[#f0a6a3]">
                                                        ×{missCount}
                                                    </span>
                                                )}
                                                {done && <span className="text-[10px] font-bold text-[#1d9e75]">+{mission.xp}</span>}
                                                {/* The affordance rides in on hover and takes no
                                                    room when idle, so the row stays quiet. */}
                                                {open && (
                                                    <ChevronRight
                                                        size={14}
                                                        className="-ml-1 shrink-0 text-[#625bd5] opacity-0 transition-all duration-150 group-hover:ml-0 group-hover:opacity-100 dark:text-[#b8b4ff]"
                                                        aria-hidden
                                                    />
                                                )}
                                            </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        </FloatingCard>
                    );
                })}

                {/* Middle stat lifts a little higher than its neighbours — the
                    same staggered arrangement the iOS page uses. */}
                <div className="mt-5 grid grid-cols-3 items-start gap-3">
                    {[
                        { icon: Target, label: t('ccaf_quest.missions'), value: domains.reduce((n, d) => n + d.missions.length, 0) },
                        { icon: Trophy, label: t('ccaf_quest.total_xp'), value: totalXpAvailable },
                        { icon: Gamepad2, label: t('ccaf_quest.domains'), value: domains.length },
                    ].map(({ icon: Icon, label, value }, index) => (
                        <FloatingCard
                            key={label}
                            // Offset on the wrapper, not the surface: framer drives the
                            // surface's transform, so a translate utility there is lost.
                            wrapperClassName={index === 1 ? 'sm:-mt-3' : ''}
                            className="p-4"
                            delay={index * 0.06}
                        >
                            <Icon size={16} className="text-[#f5871f]" />
                            <p className="mt-2 text-lg font-extrabold text-[var(--cv-text-heading)]">{value}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                        </FloatingCard>
                    ))}
                </div>

                <PlayButton className="mt-5" label={started ? t('ccaf_quest.resume') : t('ccaf_quest.enter')} onPlay={() => enter(null)} />
                <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                    {t('ccaf_quest.controls_note')}
                </p>

                <p className="mt-8 text-center text-[11px] leading-relaxed text-gray-400">
                    {t('ccaf_quest.attribution')}
                </p>
            </div>
        </div>
    );
};

export default CcafQuestPage;
