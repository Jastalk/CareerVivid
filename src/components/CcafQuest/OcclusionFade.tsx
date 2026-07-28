import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/** Paired with the ghost tint in InstancedBuildings — see the note there. */
const FADED_OPACITY = 0.12;
/** How quickly a building fades out and back in. */
const FADE_SPEED = 6;

/**
 * Heights up the character to aim at, in world units from their feet.
 *
 * One ray at chest height is far too thin: a tower can cover the head and the
 * legs while leaving that single line clear, so the building stayed solid over
 * a character it was plainly hiding.
 */
const SAMPLE_HEIGHTS = [0.3, 1.5, 2.6];
/** Sideways offsets across the view, so the figure's width is covered too. */
const SAMPLE_LATERAL = [-0.85, 0, 0.85];

/**
 * How far a wall can be from the character and still be faded.
 *
 * Standing at the foot of a tower nothing is technically between the camera and
 * the character — the tower simply fills the frame. Proximity is its own rule
 * for that reason, not a wider version of the sight line.
 */
const NEAR_MARGIN = 5.5;
/** Below this a building is scenery, not a wall — no need to fade it. */
const NEAR_MIN_HEIGHT = 3;

interface OcclusionFadeProps {
    /** Live player position, shared by ref so this costs no re-renders. */
    playerPosition: React.MutableRefObject<THREE.Vector3>;
    /** The per-instance fade buffer owned by InstancedBuildings. */
    fadeRef: React.MutableRefObject<Float32Array | null>;
    /** Skipped while the camera is already above the rooftops. */
    enabled?: boolean;
}

/** Footprint of one building in world space, read off its instance matrix. */
interface Footprint {
    x: number;
    z: number;
    halfW: number;
    halfD: number;
    height: number;
}

/**
 * Keeps the character visible when a building sits between them and the camera,
 * or when they are standing right up against one.
 *
 * Two rules, because they catch different problems:
 *
 *   sight line — a fan of rays from the camera across the character's body,
 *                fading everything they cross
 *   proximity  — any building whose wall is within `NEAR_MARGIN`, which is what
 *                actually blocks the view at street level
 *
 * Fading beats moving the camera here: the city layout stays readable and the
 * player never loses their bearings.
 *
 * Buildings are instanced, so this writes a per-instance `aFade` value rather
 * than touching `material.opacity` — one shared material cannot hold a
 * different opacity per building. A raycast against an InstancedMesh reports
 * the `instanceId` it hit, which is exactly the index into that buffer.
 */
export const OcclusionFade: React.FC<OcclusionFadeProps> = ({ playerPosition, fadeRef, enabled = true }) => {
    const { camera, scene } = useThree();
    const raycaster = useRef(new THREE.Raycaster());
    const direction = useRef(new THREE.Vector3());
    const right = useRef(new THREE.Vector3());
    const sample = useRef(new THREE.Vector3());
    const blocked = useRef(new Set<number>());
    /** Cached so the fade loop doesn't traverse the scene graph every frame. */
    const attributes = useRef<THREE.BufferAttribute[]>([]);
    /** The depth-writing building meshes — the only things worth raycasting. */
    const targets = useRef<THREE.Object3D[]>([]);
    /** Footprints for the proximity test, built once from the instance data. */
    const footprints = useRef<Footprint[] | null>(null);

    useFrame((_, rawDelta) => {
        const fade = fadeRef.current;
        if (!fade) return;
        const delta = Math.min(rawDelta, 0.05);

        if (!attributes.current.length) {
            scene.traverse(object => {
                const attribute = (object as THREE.Mesh).geometry?.getAttribute?.('aFade');
                if (attribute) attributes.current.push(attribute as THREE.BufferAttribute);
                // Raycasting the whole scene would re-test the ground, every
                // marker and every quest giver on each of nine rays. Only the
                // solid building passes can block the view; the ghost pass sits
                // at the same coordinates and would report each hit twice.
                if (object.userData?.isBuilding) targets.current.push(object);
                if (object.userData?.isBuildingBody) {
                    const mesh = object as THREE.InstancedMesh;
                    const matrix = new THREE.Matrix4();
                    const position = new THREE.Vector3();
                    const quaternion = new THREE.Quaternion();
                    const scale = new THREE.Vector3();
                    const list: Footprint[] = [];
                    for (let i = 0; i < mesh.count; i += 1) {
                        mesh.getMatrixAt(i, matrix);
                        matrix.decompose(position, quaternion, scale);
                        list.push({
                            x: position.x,
                            z: position.z,
                            halfW: scale.x / 2,
                            halfD: scale.z / 2,
                            height: scale.y,
                        });
                    }
                    footprints.current = list;
                }
            });
        }

        blocked.current.clear();

        if (enabled) {
            const feet = playerPosition.current;

            // Screen-right, so the lateral offsets straddle the figure however
            // the camera has been orbited.
            direction.current.subVectors(feet, camera.position);
            right.current.crossVectors(direction.current, camera.up).normalize();

            for (const height of SAMPLE_HEIGHTS) {
                for (const lateral of SAMPLE_LATERAL) {
                    sample.current.copy(feet)
                        .addScaledVector(camera.up, height)
                        .addScaledVector(right.current, lateral);
                    direction.current.subVectors(sample.current, camera.position);
                    const distance = direction.current.length();
                    direction.current.normalize();

                    raycaster.current.set(camera.position, direction.current);
                    raycaster.current.far = distance;

                    for (const hit of raycaster.current.intersectObjects(targets.current, false)) {
                        if (hit.instanceId === undefined || hit.instanceId === null) continue;
                        blocked.current.add(hit.instanceId);
                    }
                }
            }

            // Proximity: anything the character could reach out and touch.
            const list = footprints.current;
            if (list) {
                for (let i = 0; i < list.length; i += 1) {
                    const box = list[i];
                    if (box.height < NEAR_MIN_HEIGHT) continue;
                    if (Math.abs(feet.x - box.x) > box.halfW + NEAR_MARGIN) continue;
                    if (Math.abs(feet.z - box.z) > box.halfD + NEAR_MARGIN) continue;
                    blocked.current.add(i);
                }
            }
        }

        if (import.meta.env.DEV) {
            // Dev handle: which buildings are currently being faded.
            (window as unknown as { __ccafBlocked?: number[] }).__ccafBlocked = [...blocked.current];
        }

        // Ease blockers down and everything else back up. Writing the whole
        // buffer is cheaper than tracking which entries moved — it is a couple
        // of hundred floats, and the GPU upload happens once either way.
        let dirty = false;
        const step = Math.min(1, delta * FADE_SPEED);
        for (let i = 0; i < fade.length; i += 1) {
            const goal = blocked.current.has(i) ? FADED_OPACITY : 1;
            const current = fade[i];
            if (current === goal) continue;
            const next = current + (goal - current) * step;
            // Snap when close, so a building never lingers a hair off solid and
            // keeps paying for the transparent pass forever.
            fade[i] = Math.abs(goal - next) < 0.004 ? goal : next;
            dirty = true;
        }

        if (!dirty) return;
        for (const attribute of attributes.current) attribute.needsUpdate = true;
    });

    return null;
};

export default OcclusionFade;
