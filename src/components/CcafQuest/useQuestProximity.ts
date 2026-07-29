import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import type { PlacedDomain, PlacedMission } from '../../lib/questSource';

/** How close the player must stand before a mission can be triggered. */
export const INTERACT_RADIUS = 4.2;

/**
 * Tracks what the player is standing next to: the mission within reach, and
 * the district they are currently in.
 *
 * Called from the render loop on every frame, so the answers are held in refs
 * and only pushed into React state when they actually change. Setting state
 * unconditionally here would re-render the whole scene sixty times a second.
 */
export const useQuestProximity = (missions: PlacedMission[], domains: PlacedDomain[]) => {
    const [nearbyId, setNearbyId] = useState<string | null>(null);
    const [domainOrder, setDomainOrder] = useState(1);

    const nearbyRef = useRef<string | null>(null);
    const domainRef = useRef(1);
    /** Live player position, shared by ref so occlusion costs no re-renders. */
    const position = useRef(new THREE.Vector3());

    const handleMove = useCallback((next: THREE.Vector3) => {
        position.current.copy(next);

        let closest: string | null = null;
        let closestDistance = INTERACT_RADIUS;
        for (const mission of missions) {
            const distance = Math.hypot(
                next.x - mission.position[0],
                next.z - mission.position[2],
            );
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = mission.id;
            }
        }
        if (closest !== nearbyRef.current) {
            nearbyRef.current = closest;
            setNearbyId(closest);
        }

        let owner = domains[0]?.order ?? 1;
        let bestDistance = Infinity;
        for (const domain of domains) {
            const distance = Math.hypot(
                next.x - domain.district.center[0],
                next.z - domain.district.center[1],
            );
            if (distance < bestDistance) {
                bestDistance = distance;
                owner = domain.order;
            }
        }
        if (owner !== domainRef.current) {
            domainRef.current = owner;
            setDomainOrder(owner);
        }
    }, [missions, domains]);

    return {
        nearbyId,
        /** Same value as `nearbyId` without the render lag — safe in callbacks. */
        nearbyRef,
        domainOrder,
        position,
        handleMove,
    };
};
