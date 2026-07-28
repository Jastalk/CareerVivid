/**
 * The single place the quest reads its content from.
 *
 * Today it serves the generated static bundle. When the question bank moves to
 * Firestore, only this module changes: it keeps the same shape, so no game or
 * UI code has to be touched. Marker positions are injected here from
 * questLayout, which is why they are absent from the generated data.
 */
import { CCAF_DOMAINS, type CcafDomain, type CcafMission } from './ccafMissions';
import { missionPosition, cityBoundsFor, districtFor } from './questLayout';

/** A mission with its derived world position attached. */
export interface PlacedMission extends CcafMission {
    position: [number, number, number];
    /** Which domain this mission belongs to — handy once districts mix. */
    domainId: string;
    domainOrder: number;
}

export interface PlacedDomain extends Omit<CcafDomain, 'missions'> {
    missions: PlacedMission[];
    district: ReturnType<typeof districtFor>;
}

const DOMAIN_COUNT = 5; // The exam has five domains; districts are reserved for all of them.

const place = (domain: CcafDomain): PlacedDomain => ({
    ...domain,
    district: districtFor(domain.order, DOMAIN_COUNT),
    missions: domain.missions.map(mission => ({
        ...mission,
        domainId: domain.id,
        domainOrder: domain.order,
        position: missionPosition(domain.order, mission.index, domain.missions.length, DOMAIN_COUNT),
    })),
});

const placed: PlacedDomain[] = CCAF_DOMAINS.map(place);

export const listDomains = (): PlacedDomain[] => placed;

export const getDomain = (domainId: string): PlacedDomain | undefined =>
    placed.find(d => d.id === domainId);

export const getDomainByOrder = (order: number): PlacedDomain | undefined =>
    placed.find(d => d.order === order);

export const findMission = (missionId: string): PlacedMission | undefined => {
    for (const domain of placed) {
        const hit = domain.missions.find(m => m.id === missionId);
        if (hit) return hit;
    }
    return undefined;
};

export const CITY_BOUNDS = cityBoundsFor(DOMAIN_COUNT);

/** Total XP obtainable across everything currently shipped. */
export const totalXpAvailable = placed.reduce(
    (sum, d) => sum + d.missions.reduce((s, m) => s + m.xp, 0),
    0,
);

export const domainXpAvailable = (domainId: string): number =>
    getDomain(domainId)?.missions.reduce((s, m) => s + m.xp, 0) ?? 0;

/** Every question step in the bank — used for the readiness denominator. */
export const totalSteps = placed.reduce(
    (sum, d) => sum + d.missions.reduce((s, m) => s + m.steps.length, 0),
    0,
);

export interface DomainReadiness {
    domain: PlacedDomain;
    cleared: number;
    total: number;
    /** 0–1 completion of this domain. */
    ratio: number;
    /** Missions cleared with no wrong pick, as a share of those cleared. */
    accuracy: number | null;
}

/**
 * Exam readiness weighted by each domain's real share of the exam, so
 * finishing the 27% domain moves the needle more than the 18% one. Domains
 * that have not shipped yet still count against the total, which keeps the
 * number honest rather than flattering.
 */
export const readiness = (
    clearedIds: string[],
    misses: Record<string, number>,
): { overall: number; domains: DomainReadiness[]; weightShipped: number } => {
    const cleared = new Set(clearedIds);
    const domains = placed.map(domain => {
        const total = domain.missions.length;
        const done = domain.missions.filter(m => cleared.has(m.id));
        const perfect = done.filter(m => !(misses[m.id] > 0)).length;
        return {
            domain,
            cleared: done.length,
            total,
            ratio: total ? done.length / total : 0,
            accuracy: done.length ? perfect / done.length : null,
        };
    });

    // Weighted against the full 100% exam, not just the domains built so far.
    const overall = domains.reduce((sum, d) => sum + d.ratio * d.domain.weight, 0);
    const weightShipped = placed.reduce((sum, d) => sum + d.weight, 0);

    return { overall, domains, weightShipped };
};
