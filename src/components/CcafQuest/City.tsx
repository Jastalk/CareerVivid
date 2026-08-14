import React, { useMemo } from 'react';
import * as THREE from 'three';
import { listDomains, CITY_BOUNDS } from '../../lib/questSource';
import { InstancedBuildings, type BuildingInstance } from './InstancedBuildings';

export { CITY_BOUNDS };

/** Deterministic pseudo-random so the skyline never re-shuffles on a re-render. */
const seeded = (n: number) => {
    const x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
};

const BUILDING_COLORS = ['#e8e3d8', '#dcd5c6', '#cfc7b6', '#efeae1', '#d5cfc2'];
/** Roofs start muted and turn brand-purple as a district gets completed. */
const ROOF_DORMANT = ['#a8a396', '#9c978b', '#b2ada0'];
const ROOF_LIT = ['#4a4392', '#7c74e0', '#8d88e6', '#5a52c9'];

interface Block {
    position: [number, number, number];
    size: [number, number, number];
    color: string;
    /** Which district this building belongs to, so it can light up with it. */
    domainOrder: number;
    tint: number;
}

/**
 * A low-poly block city. Buildings sit on a fixed grid with any that would
 * cover a road or a mission marker removed, so the player always has a clear
 * path to every objective.
 */
const useCityBlocks = (): Block[] => useMemo(() => {
    const domains = listDomains();
    const markers = domains.flatMap(d =>
        d.missions.map(m => ({ v: new THREE.Vector2(m.position[0], m.position[2]), order: d.order })),
    );
    const blocks: Block[] = [];
    const step = 11;

    let seed = 1;
    for (let gx = -CITY_BOUNDS; gx <= CITY_BOUNDS; gx += step) {
        for (let gz = -CITY_BOUNDS; gz <= CITY_BOUNDS; gz += step) {
            seed += 1;
            const x = gx + (seeded(seed) - 0.5) * 3;
            const z = gz + (seeded(seed + 90) - 0.5) * 3;

            // Keep the central plaza and the road cross clear.
            if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
            if (Math.abs(x) < 3.5 || Math.abs(z) < 3.5) continue;

            const point = new THREE.Vector2(x, z);
            if (markers.some(m => m.v.distanceTo(point) < 7)) continue;

            // A building belongs to whichever district centre is nearest.
            let owner = 1;
            let bestDistance = Infinity;
            for (const domain of domains) {
                const centre = new THREE.Vector2(domain.district.center[0], domain.district.center[1]);
                const distance = centre.distanceTo(point);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    owner = domain.order;
                }
            }

            const height = 3 + seeded(seed + 17) * 11;
            blocks.push({
                position: [x, height / 2, z],
                size: [4 + seeded(seed + 33) * 3, height, 4 + seeded(seed + 51) * 3],
                color: BUILDING_COLORS[Math.floor(seeded(seed + 7) * BUILDING_COLORS.length)],
                domainOrder: owner,
                tint: Math.floor(seeded(seed + 71) * 4),
            });
        }
    }
    return blocks;
}, []);

const Roads: React.FC = () => (
    <group position={[0, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[7, CITY_BOUNDS * 2]} />
            <meshStandardMaterial color="#3f3b36" roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
            <planeGeometry args={[7, CITY_BOUNDS * 2]} />
            <meshStandardMaterial color="#3f3b36" roughness={1} />
        </mesh>
        {Array.from({ length: 18 }, (_, i) => (
            <mesh key={`d${i}`} position={[0, 0.01, -CITY_BOUNDS + i * 9]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.4, 2.4]} />
                <meshBasicMaterial color="#e8c976" />
            </mesh>
        ))}
    </group>
);

interface CityProps {
    /** Shared with OcclusionFade so it can fade individual buildings. */
    fadeRef: React.MutableRefObject<Float32Array | null>;
    /** Completion ratio (0–1) per domain order — drives the district lighting. */
    litByDomain?: Record<number, number>;
    /** Dropped on low-power devices to keep the frame rate up. */
    detailed?: boolean;
}

export const City: React.FC<CityProps> = ({ litByDomain = {}, detailed = true, fadeRef }) => {
    const blocks = useCityBlocks();
    const domains = listDomains();

    // Roof colour is the only thing that changes as a district lights up, so the
    // instance list is rebuilt only when that ratio moves — not every frame.
    const buildings = useMemo<BuildingInstance[]>(() => blocks.map(b => {
        const lit = litByDomain[b.domainOrder] ?? 0;
        const roof = new THREE.Color(ROOF_DORMANT[b.tint % ROOF_DORMANT.length])
            .lerp(new THREE.Color(ROOF_LIT[b.tint % ROOF_LIT.length]), lit);
        return { position: b.position, size: b.size, color: b.color, roof: `#${roof.getHexString()}` };
    }), [blocks, litByDomain]);

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[CITY_BOUNDS * 2.4, CITY_BOUNDS * 2.4]} />
                <meshStandardMaterial color="#8fa87c" roughness={1} />
            </mesh>

            {/* District plazas — each one brightens as its domain is completed. */}
            {domains.map(domain => {
                const lit = litByDomain[domain.order] ?? 0;
                return (
                    <mesh
                        key={domain.id}
                        rotation={[-Math.PI / 2, 0, 0]}
                        // Ground decals occupy distinct height bands so none are coplanar:
                        // ground 0, roads 0.02, road dashes 0.03, plazas 0.05, marker rings 0.07+.
                        position={[domain.district.center[0], 0.05, domain.district.center[1]]}
                        receiveShadow
                    >
                        <circleGeometry args={[9, 24]} />
                        <meshStandardMaterial
                            color={new THREE.Color('#b9b2a3').lerp(new THREE.Color('#cfc7ff'), lit)}
                            roughness={1}
                        />
                    </mesh>
                );
            })}

            <Roads />

            <InstancedBuildings
                buildings={buildings}
                castShadow={detailed}
                fadeRef={fadeRef}
            />

        </group>
    );
};

export default City;
