import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { Navigation, ArrowLeft } from 'lucide-react';
import { levelForXp } from '../../lib/ccafMissions';
import { listDomains, type PlacedMission } from '../../lib/questSource';
import { useCcafProgress } from '../../hooks/useCcafProgress';
import { City } from './City';
import { Player } from './Player';
import { MissionMarker, type MarkerState } from './MissionMarker';
import { MissionDialog } from './MissionDialog';
import { QuestHud, Joystick } from './QuestHud';
import { QuestCelebration, type Celebration } from './QuestCelebration';
import { useQuestControls } from './useQuestControls';
import { useQuestLocale } from './useQuestLocale';
import { OcclusionFade } from './OcclusionFade';
import { DomainLabels } from './DomainLabels';
import { QuestGiverField } from './QuestGiverField';
import { QuestLanguagePanel } from './QuestLanguagePanel';
import { LessonPlayer } from './LessonPlayer';
import { domainVideoFor } from '../../lib/ccafVideoLessons';
import { useQuestAudio } from './useQuestAudio';
import { QuestAudioPrompt, hasAnsweredAudioPrompt } from './QuestAudioPrompt';
import { useQuestCamera } from './useQuestCamera';
import { useQuestProximity, INTERACT_RADIUS } from './useQuestProximity';
import { useQuestPanelKey } from './useQuestPanelKey';
import { QuestToolbar } from './QuestToolbar';
import { QuestVideoOverlay } from './QuestVideoOverlay';
import { QuestFireworks } from './QuestFireworks';
import { CITY_BOUNDS } from './City';

const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(query.matches);
        const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
        query.addEventListener('change', listener);
        return () => query.removeEventListener('change', listener);
    }, []);
    return reduced;
};

interface CcafQuestGameProps {
    /** Optional mission to open on entry — used by the weak-spot drill. */
    focusMissionId?: string | null;
}

export const CcafQuestGame: React.FC<CcafQuestGameProps> = ({ focusMissionId = null }) => {
    const {
        progress, loaded, level, completeMission, recordMiss, reset,
        isCleared, isUnlocked, examReadiness, hasWatchedDomain, markDomainWatched,
    } = useCcafProgress();
    const [openMission, setOpenMission] = useState<PlacedMission | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [queue, setQueue] = useState<Celebration[]>([]);
    const [autoTarget, setAutoTarget] = useState<[number, number, number] | null>(null);
    const [langOpen, setLangOpen] = useState(false);
    // Rewatching the course video mid-run, without touching progress.
    const [videoOpen, setVideoOpen] = useState(false);

    const reduceMotion = usePrefersReducedMotion();
    const { localize, t } = useQuestLocale();
    const domains = useMemo(() => listDomains(), []);
    const missions = useMemo(() => domains.flatMap(d => d.missions), [domains]);

    /** Where the player should head next — drives the highlight and the travel prompt. */
    const nextMission = useMemo(
        () => missions.find(m => !isCleared(m.id) && isUnlocked(m.id)) ?? null,
        [missions, isCleared, isUnlocked],
    );

    /**
     * How far through the course the player is, as a domain number.
     *
     * Deliberately *not* the district they happen to be standing in. Walking
     * across town is navigation, not progress — so the outfit and the music
     * stay put until a domain is actually finished, and only then change
     * together. Once everything is cleared there is no next mission, so the
     * final domain's look and theme are held.
     */
    const progressDomainOrder = useMemo(
        () => nextMission?.domainOrder ?? domains[domains.length - 1]?.order ?? 1,
        [nextMission, domains],
    );

    const controls = useQuestControls(!openMission && !langOpen && !videoOpen);
    const camera = useQuestCamera(Boolean(openMission));
    const {
        nearbyId, nearbyRef, domainOrder: currentDomainOrder, position: playerPos, handleMove,
    } = useQuestProximity(missions, domains);

    // The bed runs while the player is in the city, and pauses behind a video
    // so the two never talk over each other.
    //
    // Held until `loaded`: saved progress arrives in an effect, so for one
    // render the player looks like a beginner. Starting on that frame plays
    // domain 1's track for a moment before swapping to the right one — audible
    // on every single page load.
    const { musicOn, sfxOn, toggleMusic, toggleSfx, setMusic, sfx } = useQuestAudio(loaded && !videoOpen, progressDomainOrder);

    // Asked once, on the very first visit. Read lazily so a returning player
    // never sees it flash. The prompt gates nothing — it sits over a world that
    // is already running — but answering it is also the user gesture browsers
    // require before any audio may start.
    const [askAudio, setAskAudio] = useState(() => !hasAnsweredAudioPrompt());
    const [confirmReset, setConfirmReset] = useState(false);

    useQuestPanelKey('KeyL', langOpen, () => { sfx('panel'); setLangOpen(true); });
    useQuestPanelKey('KeyV', videoOpen, () => { sfx('panel'); setVideoOpen(true); });

    // Rewards are built on completion but held back until the debrief closes,
    // so the animation plays over the city rather than behind the dialog.
    const pending = useRef<Celebration[]>([]);
    // Per-building fade values, owned by InstancedBuildings and driven by
    // OcclusionFade. Shared by ref so neither re-renders to move a building.
    const buildingFade = useRef<Float32Array | null>(null);
    // Which domain's video the rewatch control should play. The open mission
    // wins: the weak-spot drill can open a mission from a domain the player is
    // not currently working through.
    const rewatchDomain = openMission?.domainOrder ?? progressDomainOrder;

    // Every other mission is done, so leaving this debrief ends the course.
    //
    // Deliberately not conditioned on this mission still being outstanding:
    // answering the last step clears it immediately, which would flip the flag
    // false on the very frame the button is supposed to appear.
    const finishesCourse = useMemo(
        () => Boolean(openMission)
            && missions.every(m => m.id === openMission!.id || isCleared(m.id)),
        [openMission, missions, isCleared],
    );

    // Jump straight into a drilled mission when the player came from the
    // weak-spot list, so they don't have to walk across town to find it.
    useEffect(() => {
        if (!focusMissionId || !loaded) return;
        const target = missions.find(m => m.id === focusMissionId);
        if (target) setOpenMission(target);
    }, [focusMissionId, loaded, missions]);

    useEffect(() => {
        controls.onInteract.current = () => {
            const id = nearbyRef.current;
            if (!id) return;
            const mission = missions.find(m => m.id === id);
            if (!mission) return;
            if (!isUnlocked(mission.id)) {
                sfx('wrong');
                setToast(t('ccaf_quest.locked'));
                return;
            }
            sfx('interact');
            setAutoTarget(null);
            setOpenMission(mission);
        };
        return () => { controls.onInteract.current = null; };
    }, [controls, missions, isUnlocked, t, sfx]);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const markerState = useCallback((mission: PlacedMission): MarkerState => {
        if (isCleared(mission.id)) return 'cleared';
        return isUnlocked(mission.id) ? 'available' : 'locked';
    }, [isCleared, isUnlocked]);

    const handleComplete = useCallback(() => {
        if (!openMission || isCleared(openMission.id)) return;

        const nextXp = progress.xp + openMission.xp;
        const levelledUp = levelForXp(nextXp) > levelForXp(progress.xp);
        const domain = domains.find(d => d.order === openMission.domainOrder);
        const domainCleared = domain
            ? domain.missions.filter(m => progress.cleared.includes(m.id)).length + 1
            : 0;
        const domainDone = Boolean(domain) && domainCleared === domain!.missions.length;

        completeMission(openMission.id, openMission.xp);

        const stamp = `${openMission.id}-${nextXp}`;
        const next: Celebration[] = [
            { kind: 'mission', id: `m-${stamp}`, xp: openMission.xp, title: localize(openMission.name) },
        ];
        if (levelledUp) next.push({ kind: 'levelup', id: `l-${stamp}`, level: levelForXp(nextXp) });
        if (domainDone && domain) {
            const missed = domain.missions.filter(m => (progress.misses[m.id] ?? 0) > 0).length;
            next.push({
                kind: 'domain',
                id: `d-${stamp}`,
                domain: localize(domain.name),
                missions: domain.missions.length,
                xp: nextXp,
                perfect: Math.round(((domain.missions.length - missed) / domain.missions.length) * 100),
                // The last district has nothing after it, so promising one read
                // as a bug right as the course ended.
                hasNext: domains.some(d => d.order > domain.order),
            });
        }
        // Course complete: this mission was the last uncleared one anywhere.
        const clearedAfter = progress.cleared.length + 1;
        if (clearedAfter === missions.length) {
            const missedAll = missions.filter(m => (progress.misses[m.id] ?? 0) > 0).length;
            next.push({
                kind: 'finale',
                id: `f-${stamp}`,
                missions: missions.length,
                xp: nextXp,
                perfect: Math.round(((missions.length - missedAll) / missions.length) * 100),
                domains: domains.map(d => ({ order: d.order, name: localize(d.name), weight: d.weight })),
            });
        }

        pending.current = next;
    }, [openMission, isCleared, progress, domains, missions, completeMission, localize]);



    const celebration = queue[0] ?? null;
    const cinematic = celebration?.kind === 'domain';
    const finale = celebration?.kind === 'finale';
    const advanceQueue = useCallback(() => setQueue(rest => rest.slice(1)), []);

    const nearbyMission = useMemo(
        () => missions.find(m => m.id === nearbyId) ?? null,
        [missions, nearbyId],
    );


    /**
     * The question before the current one, for going back over it.
     *
     * Taken from the flat mission list, which runs domain by domain — so at the
     * first question of a district this correctly points at the last question of
     * the previous one. At the very first question of all there is nothing
     * before it, and the control is simply absent.
     */
    const previous = useMemo(() => {
        if (!nextMission) return null;
        const at = missions.findIndex(m => m.id === nextMission.id);
        const mission = at > 0 ? missions[at - 1] : null;
        if (!mission) return null;
        // Crossing a district needs saying, or "previous" looks like it belongs
        // to the domain the player is currently in.
        const otherDomain = mission.domainOrder !== nextMission.domainOrder
            ? domains.find(d => d.order === mission.domainOrder) ?? null
            : null;
        return { mission, otherDomain };
    }, [missions, domains, nextMission]);

    // Clicking a marker walks the character there instead of making the player
    // hunt for it. Locked objectives explain themselves rather than moving.
    const travelTo = useCallback((mission: PlacedMission) => {
        if (!isUnlocked(mission.id)) {
            sfx('wrong');
            setToast(t('ccaf_quest.locked'));
            return;
        }
        sfx('travel');
        setAutoTarget(mission.position);
    }, [isUnlocked, t, sfx]);

    const activeDomain = useMemo(
        () => domains.find(d => d.order === currentDomainOrder) ?? domains[0] ?? null,
        [domains, currentDomainOrder],
    );

    const domainClearedCount = activeDomain
        ? activeDomain.missions.filter(m => progress.cleared.includes(m.id)).length
        : 0;

    /** District lighting: 0–1 completion per domain. */
    const litByDomain = useMemo(() => {
        const map: Record<number, number> = {};
        for (const domain of domains) {
            const done = domain.missions.filter(m => progress.cleared.includes(m.id)).length;
            map[domain.order] = domain.missions.length ? done / domain.missions.length : 0;
        }
        return map;
    }, [domains, progress.cleared]);

    return (
        <div
            className="relative h-full w-full overflow-hidden bg-[#cfe3f0]"
            {...camera.handlers}
        >
            <Canvas
                shadows={!reduceMotion}
                dpr={[1, 1.8]}
                // near/far are set explicitly: the defaults (0.1 / 2000) spread the depth
                // buffer over a 20000:1 range, which leaves too little precision at ground
                // level and makes the road and plaza decals z-fight as the camera moves.
                // Nothing renders closer than a unit away — the chase camera sits 24 back.
                camera={{ position: [0, 16, 22], fov: 50, near: 1, far: 600 }}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
                <Suspense fallback={null}>
                    <Sky sunPosition={[40, 30, -20]} turbidity={5} rayleigh={1.2} />
                    <ambientLight intensity={0.75} />
                    <directionalLight
                        position={[24, 34, 12]}
                        intensity={1.5}
                        castShadow={!reduceMotion}
                        shadow-mapSize={[1024, 1024]}
                        shadow-camera-left={-90}
                        shadow-camera-right={90}
                        shadow-camera-top={90}
                        shadow-camera-bottom={-90}
                    />
                    {/* Pushed well past the overview distance, or the city greys out from above. */}
                    <fog attach="fog" args={['#cfe3f0', 150, 460]} />

                    <City litByDomain={litByDomain} detailed={!reduceMotion} fadeRef={buildingFade} />

                    {/* Fade whatever stands between the camera and the character. */}
                    <QuestFireworks radius={CITY_BOUNDS} active={finale} />

                    <OcclusionFade playerPosition={playerPos} fadeRef={buildingFade} enabled={!camera.isOverview && !cinematic} />

                    {/* District names, only legible once pulled back. */}
                    <DomainLabels domains={domains} litByDomain={litByDomain} visible={camera.isOverview} />

                    {/* The whole crowd of quest givers in one instanced pass —
                        45 figures used to cost ~450 draw calls on their own. */}
                    <QuestGiverField missions={missions} stateOf={markerState} detailed={!reduceMotion} />

                    {missions.map(mission => (
                        <MissionMarker
                            key={mission.id}
                            mission={mission}
                            state={markerState(mission)}
                            isNear={nearbyId === mission.id}
                            onTravel={travelTo}
                            isNext={nextMission?.id === mission.id}
                            reduceMotion={reduceMotion}
                        />
                    ))}

                    <Player
                        controls={controls}
                        frozen={Boolean(openMission) || langOpen || finale}
                        finale={finale}
                        domainOrder={progressDomainOrder}
                        onMove={handleMove}
                        cinematic={cinematic}
                        autoTarget={autoTarget}
                        onAutoEnd={() => setAutoTarget(null)}
                        zoom={camera.zoom}
                        orbit={camera.orbit}
                        reduceMotion={reduceMotion}
                    />

                    <AdaptiveDpr pixelated />
                    <Preload all />
                </Suspense>
            </Canvas>

            {loaded && (
                <QuestHud
                    xp={progress.xp}
                    level={level}
                    clearedCount={progress.cleared.length}
                    domain={activeDomain}
                    domainCleared={domainClearedCount}
                    readinessPct={examReadiness.overall}
                    // `window.confirm` looked wired up and did nothing: several
                    // embedded and preview browsers suppress native dialogs and
                    // return false, so the button silently never reset anything.
                    // An in-app dialog cannot be suppressed.
                    onReset={() => { sfx('panel'); setConfirmReset(true); }}
                />
            )}

            {!openMission && (
                <QuestToolbar
                    isOverview={camera.isOverview}
                    onToggleOverview={camera.toggleOverview}
                    onRotate={camera.nudgeOrbit}
                    musicOn={musicOn}
                    onToggleMusic={toggleMusic}
                    sfxOn={sfxOn}
                    onToggleSfx={toggleSfx}
                    onRewatch={domainVideoFor(progressDomainOrder)
                        ? () => { sfx('panel'); setVideoOpen(true); }
                        : undefined}
                />
            )}

            <QuestCelebration celebration={celebration} onDone={advanceQueue} />

            <Joystick onMove={controls.setJoystick} />

            {!openMission && (
                <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex flex-col items-center gap-2 px-4">
                    {nearbyMission && !isCleared(nearbyMission.id) ? (
                        <button
                            type="button"
                            onClick={() => controls.onInteract.current?.()}
                            className="pointer-events-auto rounded-full bg-[#4a4392] px-6 py-3 text-sm font-bold text-white shadow-xl transition-transform active:scale-95"
                        >
                            {t('ccaf_quest.accept')}: {localize(nearbyMission.name)}
                            <span className="ml-2 hidden rounded bg-white/25 px-1.5 py-0.5 text-[11px] md:inline">E</span>
                        </button>
                    ) : nextMission && (
                        <span className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
                            {previous && (
                                <button
                                    type="button"
                                    onClick={() => travelTo(previous.mission)}
                                    className="flex items-center gap-1.5 rounded-full bg-[#171411]/85 px-4 py-3 text-sm font-semibold text-white/85 shadow-xl backdrop-blur-sm transition-transform hover:text-white active:scale-95"
                                >
                                    <ArrowLeft size={14} />
                                    {/* Composed as one string: JSX inserts whitespace between
                                        sibling expressions, which read as "上一题 : 名字". */}
                                    <span>{`${t('ccaf_quest.prev_question')}:`}</span>
                                    {previous.otherDomain && (
                                        <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-bold text-[#ffb066]">
                                            D{previous.otherDomain.order}
                                        </span>
                                    )}
                                    <span className="max-w-[9rem] truncate">{localize(previous.mission.name)}</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => travelTo(nextMission)}
                                className="flex items-center gap-2 rounded-full bg-[#f5871f] px-6 py-3 text-sm font-bold text-white shadow-xl transition-transform active:scale-95"
                            >
                                <Navigation size={15} />
                                {autoTarget ? t('ccaf_quest.travelling') : t('ccaf_quest.next_question')}: {localize(nextMission.name)}
                            </button>
                        </span>
                    )}
                    <p className="hidden rounded-full bg-[#171411]/70 px-4 py-1.5 text-[11px] text-white/85 backdrop-blur-sm md:block">
                        {camera.isOverview ? t('ccaf_quest.overview_hint') : t('ccaf_quest.controls_hint')}
                        <span className="mx-1.5 text-white/30">·</span>
                        {t('ccaf_quest.language_hint')}
                        <span className="mx-1.5 text-white/30">·</span>
                        {t('ccaf_quest.lesson_hint')}
                    </p>
                </div>
            )}

            {toast && (
                <div className="pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2 rounded-full bg-[#171411]/90 px-5 py-2.5 text-sm font-bold text-white shadow-xl backdrop-blur-sm">
                    {toast}
                </div>
            )}

            {openMission && (
                <MissionDialog
                    mission={openMission}
                    alreadyCleared={isCleared(openMission.id)}
                    onComplete={handleComplete}
                    onMiss={() => recordMiss(openMission.id)}
                    hasWatched={hasWatchedDomain(openMission.domainOrder)}
                    onWatched={() => markDomainWatched(openMission.domainOrder)}
                    onRewatch={() => { sfx('panel'); setVideoOpen(true); }}
                    onSfx={sfx}
                    finishesCourse={finishesCourse}
                    onNextMission={nextMission && nextMission.id !== openMission.id
                        ? () => { setOpenMission(null); travelTo(nextMission); }
                        : undefined}
                    onClose={() => {
                        setOpenMission(null);
                        if (pending.current.length) {
                            setQueue(pending.current);
                            pending.current = [];
                        }
                    }}
                />
            )}

            {videoOpen && domainVideoFor(rewatchDomain) && (
                <QuestVideoOverlay
                    video={domainVideoFor(rewatchDomain)!}
                    onClose={() => setVideoOpen(false)}
                />
            )}

            {askAudio && (
                <QuestAudioPrompt
                    onChoose={(on) => {
                        setMusic(on);
                        setAskAudio(false);
                        if (on) sfx('panel');
                    }}
                />
            )}

            {confirmReset && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quest-reset-title"
                >
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" />
                    <div className="relative w-full max-w-sm rounded-[1.75rem] bg-gradient-to-br from-rose-400/40 via-slate-600/30 to-slate-700/20 p-px shadow-2xl shadow-rose-900/30">
                        <div className="rounded-[1.7rem] bg-slate-900/95 px-6 py-8 text-center sm:px-8">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-2xl">
                                ↺
                            </div>
                            <h2 id="quest-reset-title" className="text-xl font-extrabold text-white">
                                {t('ccaf_quest.reset')}
                            </h2>
                            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                                {t('ccaf_quest.reset_confirm')}
                            </p>
                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    autoFocus
                                    onClick={() => { setConfirmReset(false); reset(); sfx('complete'); }}
                                    className="flex-1 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition hover:from-rose-400 hover:to-rose-500 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                                >
                                    {t('ccaf_quest.reset_yes')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmReset(false)}
                                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/40 px-5 py-3.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                                >
                                    {t('ccaf_quest.reset_no')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Last so it layers over everything — L works mid-question. */}
            <QuestLanguagePanel open={langOpen} onClose={() => setLangOpen(false)} />
        </div>
    );
};

export default CcafQuestGame;
