/**
 * Mission positions are derived, never hand-authored.
 *
 * Hand-placing `[x, y, z]` per mission works at ten missions and collapses at
 * four hundred. Each domain gets its own district offset from the city centre,
 * and missions spiral outward inside it, so adding a mission — or a whole
 * domain — needs no manual placement and can never overlap an existing marker.
 */

export interface DistrictLayout {
    /** Centre of the district in world space. */
    center: [number, number];
    /** Half-width of the walkable district, used to size ground and bounds. */
    radius: number;
}

/** Districts sit on a ring around the plaza, one slot per exam domain. */
const DISTRICT_RING_RADIUS = 46;
const DISTRICT_RADIUS = 30;

export const districtFor = (domainOrder: number, domainCount = 5): DistrictLayout => {
    if (domainOrder <= 1) {
        // Domain 1 owns the central plaza so the first-run experience starts at spawn.
        return { center: [0, 0], radius: DISTRICT_RADIUS };
    }
    // Remaining domains ring the centre, starting north and going clockwise.
    const slots = Math.max(domainCount - 1, 1);
    const angle = ((domainOrder - 2) / slots) * Math.PI * 2 - Math.PI / 2;
    return {
        center: [
            Math.round(Math.cos(angle) * DISTRICT_RING_RADIUS),
            Math.round(Math.sin(angle) * DISTRICT_RING_RADIUS),
        ],
        radius: DISTRICT_RADIUS,
    };
};

/**
 * Places mission `index` of `total` inside its district on a phyllotaxis
 * spiral — the sunflower-seed arrangement. It spreads any count evenly with no
 * clustering, so 10 missions and 80 missions both lay out cleanly.
 */
export const missionPosition = (
    domainOrder: number,
    index: number,
    total: number,
    domainCount = 5,
): [number, number, number] => {
    const district = districtFor(domainOrder, domainCount);
    if (total <= 1) return [district.center[0], 0, district.center[1]];

    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
    // Keep the first marker off the exact spawn point so the player can see it.
    const t = (index + 1) / total;
    const radius = Math.sqrt(t) * (district.radius - 6) + 6;
    const angle = index * GOLDEN_ANGLE;

    return [
        Math.round((district.center[0] + Math.cos(angle) * radius) * 10) / 10,
        0,
        Math.round((district.center[1] + Math.sin(angle) * radius) * 10) / 10,
    ];
};

/** World half-extent that comfortably contains every district. */
export const cityBoundsFor = (domainCount: number): number =>
    (domainCount <= 1 ? DISTRICT_RADIUS : DISTRICT_RING_RADIUS + DISTRICT_RADIUS) + 8;
