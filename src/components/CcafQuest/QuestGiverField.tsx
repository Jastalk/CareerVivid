import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { PlacedMission } from '../../lib/questSource';
import { outfitFor, type Outfit } from './BrickFigure';
import type { MarkerState } from './MissionMarker';

/**
 * Every quest giver in the city, drawn as instanced geometry.
 *
 * One figure per mission used to be its own little tree of ~10 meshes. At 45
 * missions that was ~450 draw calls and ~450 separate geometries and materials
 * — over a third of the whole frame, for a crowd that never moves.
 *
 * Instancing renders the identical pixels from one draw call per body part.
 * Nothing about the look changes: same geometry, same colours, same positions.
 * The colours ride along as per-instance attributes, so five different outfits
 * still share a single material.
 *
 * Body parts are shared module-level constants rather than JSX children, so
 * the geometry is uploaded to the GPU once for the whole city.
 */

/** Matches BrickFigure's layout so the instanced crowd lines up with the player. */
const SCALE = 0.62;
const OFFSET = new THREE.Vector3(1.9, 0, 0.6);
const ROTATION_Y = -0.6;

const GREY: Outfit = {
    torso: '#8a8578', legs: '#6f6b60', headgear: 'cap', headgearColor: '#7d786d', accent: '#8a8578',
};
const SKIN = new THREE.Color('#f0c49a');

/**
 * Each part is one instanced draw call. `color` picks which outfit field tints
 * it; `skin` parts ignore the outfit entirely.
 */
type Part = {
    key: string;
    geometry: THREE.BufferGeometry;
    /** Local offset within the figure, before scale and placement. */
    offsets: [number, number, number][];
    tint: 'torso' | 'legs' | 'skin';
    castShadow?: boolean;
};

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

const PARTS: Part[] = [
    // Legs: two blocks, so one instanced mesh carries 2 per figure.
    { key: 'legs', geometry: box(0.31, 0.95, 0.38), offsets: [[-0.18, 0.475, 0], [0.18, 0.475, 0]], tint: 'legs', castShadow: true },
    { key: 'hips', geometry: box(0.74, 0.2, 0.42), offsets: [[0, 1.05, 0]], tint: 'legs', castShadow: true },
    { key: 'torso', geometry: new THREE.CylinderGeometry(0.33, 0.45, 0.9, 4, 1), offsets: [[0, 1.6, 0]], tint: 'torso', castShadow: true },
    { key: 'arms', geometry: box(0.18, 0.6, 0.21), offsets: [[-0.42, 1.62, 0], [0.42, 1.62, 0]], tint: 'torso', castShadow: true },
    { key: 'head', geometry: new THREE.CylinderGeometry(0.3, 0.3, 0.63, 12), offsets: [[0, 2.365, 0]], tint: 'skin', castShadow: true },
    { key: 'stud', geometry: new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), offsets: [[0, 2.73, 0]], tint: 'skin' },
];

/** Headgear geometry differs per outfit, so each type gets its own instance run. */
const HEADGEAR: Record<Outfit['headgear'], { geometry: THREE.BufferGeometry; offset: [number, number, number] }> = {
    cap: { geometry: new THREE.CylinderGeometry(0.32, 0.33, 0.16, 12), offset: [0, 2.64, 0] },
    hardhat: { geometry: new THREE.SphereGeometry(0.33, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), offset: [0, 2.66, 0] },
    goggles: { geometry: box(0.62, 0.14, 0.58), offset: [0, 2.58, 0] },
    headband: { geometry: new THREE.CylinderGeometry(0.315, 0.315, 0.11, 12), offset: [0, 2.56, 0] },
    headset: { geometry: new THREE.CylinderGeometry(0.12, 0.12, 0.62, 10), offset: [0, 2.4, 0] },
};

interface QuestGiverFieldProps {
    missions: PlacedMission[];
    /** Locked givers are greyed out, so the city reads at a glance. */
    stateOf: (mission: PlacedMission) => MarkerState;
    detailed?: boolean;
}

/** Where a mission's giver stands, in world space. */
const placementOf = (mission: PlacedMission) => {
    const base = new THREE.Vector3(mission.position[0], mission.position[1], mission.position[2]);
    return base.add(OFFSET.clone().multiplyScalar(1));
};

export const QuestGiverField: React.FC<QuestGiverFieldProps> = ({ missions, stateOf, detailed = true }) => {
    const outfits = useMemo(
        () => missions.map(mission => (stateOf(mission) === 'locked' ? GREY : outfitFor(mission.domainOrder))),
        [missions, stateOf],
    );

    return (
        <group>
            {PARTS.map(part => (
                <InstancedPart
                    key={part.key}
                    part={part}
                    missions={missions}
                    outfits={outfits}
                    detailed={detailed}
                />
            ))}
            {(Object.keys(HEADGEAR) as Outfit['headgear'][]).map(type => (
                <InstancedHeadgear
                    key={type}
                    type={type}
                    missions={missions}
                    outfits={outfits}
                    detailed={detailed}
                />
            ))}
            <InstancedShadows missions={missions} />
        </group>
    );
};

/** One instanced draw call for one body part across the whole city. */
const InstancedPart: React.FC<{
    part: Part;
    missions: PlacedMission[];
    outfits: Outfit[];
    detailed: boolean;
}> = ({ part, missions, outfits, detailed }) => {
    const ref = useRef<THREE.InstancedMesh>(null);
    const count = missions.length * part.offsets.length;

    useLayoutEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ROTATION_Y, 0));
        const scale = new THREE.Vector3(SCALE, SCALE, SCALE);
        const colour = new THREE.Color();

        let i = 0;
        missions.forEach((mission, index) => {
            const base = placementOf(mission);
            const outfit = outfits[index];
            for (const offset of part.offsets) {
                // The figure is scaled about its own origin, so local offsets
                // scale with it before being placed in the world.
                position.set(offset[0], offset[1], offset[2])
                    .applyQuaternion(quaternion)
                    .multiplyScalar(SCALE)
                    .add(base);
                matrix.compose(position, quaternion, scale);
                mesh.setMatrixAt(i, matrix);
                colour.set(part.tint === 'skin' ? SKIN : new THREE.Color(outfit[part.tint]));
                mesh.setColorAt(i, colour);
                i += 1;
            }
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [missions, outfits, part]);

    return (
        <instancedMesh
            ref={ref}
            args={[part.geometry, undefined, count]}
            castShadow={detailed && part.castShadow}
        >
            <meshStandardMaterial roughness={0.6} />
        </instancedMesh>
    );
};

const InstancedHeadgear: React.FC<{
    type: Outfit['headgear'];
    missions: PlacedMission[];
    outfits: Outfit[];
    detailed: boolean;
}> = ({ type, missions, outfits, detailed }) => {
    const ref = useRef<THREE.InstancedMesh>(null);
    // Only the missions whose outfit uses this headgear take an instance slot.
    const wearing = useMemo(
        () => missions.map((mission, index) => ({ mission, outfit: outfits[index] }))
            .filter(entry => entry.outfit.headgear === type),
        [missions, outfits, type],
    );

    useLayoutEffect(() => {
        const mesh = ref.current;
        if (!mesh || !wearing.length) return;
        const { offset } = HEADGEAR[type];
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ROTATION_Y, 0));
        const scale = new THREE.Vector3(SCALE, SCALE, SCALE);
        const colour = new THREE.Color();

        wearing.forEach((entry, i) => {
            position.set(offset[0], offset[1], offset[2])
                .applyQuaternion(quaternion)
                .multiplyScalar(SCALE)
                .add(placementOf(entry.mission));
            matrix.compose(position, quaternion, scale);
            mesh.setMatrixAt(i, matrix);
            colour.set(entry.outfit.headgearColor);
            mesh.setColorAt(i, colour);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [wearing, type]);

    if (!wearing.length) return null;

    return (
        <instancedMesh
            ref={ref}
            args={[HEADGEAR[type].geometry, undefined, wearing.length]}
            castShadow={detailed}
        >
            <meshStandardMaterial roughness={0.5} />
        </instancedMesh>
    );
};

const SHADOW_GEOMETRY = new THREE.CircleGeometry(0.6, 10);

const InstancedShadows: React.FC<{ missions: PlacedMission[] }> = ({ missions }) => {
    const ref = useRef<THREE.InstancedMesh>(null);

    useLayoutEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        const scale = new THREE.Vector3(SCALE, SCALE, SCALE);
        missions.forEach((mission, i) => {
            const position = placementOf(mission).setY(0.1);
            matrix.compose(position, quaternion, scale);
            mesh.setMatrixAt(i, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [missions]);

    return (
        <instancedMesh ref={ref} args={[SHADOW_GEOMETRY, undefined, missions.length]}>
            <meshBasicMaterial color="#000000" transparent opacity={0.16} />
        </instancedMesh>
    );
};

export default QuestGiverField;
