import { useCallback, useEffect, useMemo, useState } from 'react';
import { levelForXp } from '../lib/ccafMissions';
import { findMission, getDomain, listDomains, readiness } from '../lib/questSource';

const STORAGE_KEY = 'cv_ccaf_quest_progress_v1';

export interface CcafProgress {
    /** Mission ids the player has cleared, in completion order. */
    cleared: string[];
    xp: number;
    /** Wrong answers per mission — the source for the weak-spot drill. */
    misses: Record<string, number>;
    /** Domains whose course video has been watched through at least once. */
    watchedDomains: number[];
}

const EMPTY: CcafProgress = { cleared: [], xp: 0, misses: {}, watchedDomains: [] };

const read = (): CcafProgress => {
    if (typeof window === 'undefined') return EMPTY;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return EMPTY;
        const parsed = JSON.parse(raw) as Partial<CcafProgress>;
        return {
            cleared: Array.isArray(parsed.cleared) ? parsed.cleared.filter(id => typeof id === 'string') : [],
            xp: typeof parsed.xp === 'number' && Number.isFinite(parsed.xp) ? parsed.xp : 0,
            misses: parsed.misses && typeof parsed.misses === 'object'
                ? parsed.misses as Record<string, number>
                : {},
            // Absent for anyone who played before the videos existed — they
            // simply watch each domain's video once from here on.
            watchedDomains: Array.isArray(parsed.watchedDomains)
                ? parsed.watchedDomains.filter(order => typeof order === 'number')
                : [],
        };
    } catch {
        return EMPTY;
    }
};

const write = (next: CcafProgress) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Private mode or quota — keep the in-memory run playable.
    }
};

/**
 * Quest progress persisted on-device. Deliberately local for the MVP: the
 * question bank moves to Firestore first, and progress sync lands with that
 * schema rather than being written twice.
 */
export const useCcafProgress = () => {
    const [progress, setProgress] = useState<CcafProgress>(EMPTY);
    const [loaded, setLoaded] = useState(false);

    // Read after mount so server-rendered and first client render agree.
    useEffect(() => {
        setProgress(read());
        setLoaded(true);
    }, []);

    const persist = useCallback((updater: (current: CcafProgress) => CcafProgress) => {
        setProgress(current => {
            const next = updater(current);
            if (next === current) return current;
            write(next);
            return next;
        });
    }, []);

    const completeMission = useCallback((missionId: string, xp: number) => {
        persist(current => (current.cleared.includes(missionId)
            ? current
            : { ...current, cleared: [...current.cleared, missionId], xp: current.xp + xp }));
    }, [persist]);

    const recordMiss = useCallback((missionId: string) => {
        persist(current => ({
            ...current,
            misses: { ...current.misses, [missionId]: (current.misses[missionId] ?? 0) + 1 },
        }));
    }, [persist]);

    const markDomainWatched = useCallback((domainOrder: number) => {
        persist(current => (current.watchedDomains.includes(domainOrder)
            ? current
            : { ...current, watchedDomains: [...current.watchedDomains, domainOrder] }));
    }, [persist]);

    const reset = useCallback(() => persist(() => EMPTY), [persist]);

    const isCleared = useCallback(
        (missionId: string) => progress.cleared.includes(missionId),
        [progress.cleared],
    );

    /**
     * The course gate is watch-once per domain: the video plays before the
     * first question of that district and is freely skippable afterwards.
     * Anything stricter punishes the people drilling their weak spots, who
     * have already sat through it.
     */
    const hasWatchedDomain = useCallback(
        (domainOrder: number) => progress.watchedDomains.includes(domainOrder),
        [progress.watchedDomains],
    );

    /**
     * Missions unlock in order within their own domain, so each district can be
     * played independently once its predecessor domain exists.
     */
    const isUnlocked = useCallback((missionId: string) => {
        const mission = findMission(missionId);
        if (!mission) return false;
        if (mission.index === 0) return true;
        const domain = getDomain(mission.domainId);
        const previous = domain?.missions[mission.index - 1];
        return previous ? progress.cleared.includes(previous.id) : true;
    }, [progress.cleared]);

    /** Missions answered wrong at least once — the weak-spot drill list. */
    const weakSpots = useMemo(
        () => listDomains()
            .flatMap(d => d.missions)
            .filter(m => (progress.misses[m.id] ?? 0) > 0)
            .sort((a, b) => (progress.misses[b.id] ?? 0) - (progress.misses[a.id] ?? 0)),
        [progress.misses],
    );

    const examReadiness = useMemo(
        () => readiness(progress.cleared, progress.misses),
        [progress.cleared, progress.misses],
    );

    return {
        progress,
        loaded,
        level: levelForXp(progress.xp),
        completeMission,
        recordMiss,
        markDomainWatched,
        reset,
        isCleared,
        hasWatchedDomain,
        isUnlocked,
        weakSpots,
        examReadiness,
    };
};
