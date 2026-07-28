import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The course's cast: a blocky toy figure built from primitives, matching the
 * concept art in scripts/ccaf/generate-character-concepts.mjs.
 *
 * The design is our own — brick-toy proportions (cylinder head with a stud,
 * tapered torso, C-clamp hands, split legs) without reproducing any protected
 * commercial figure, and no brand name appears anywhere in the UI.
 *
 * One silhouette, five outfits. At the game's camera distance only three
 * things actually read: headgear, torso colour, and one accent — so those are
 * the only things the outfits change.
 *
 * Vertical layout (feet at y=0, total 2.78):
 *   legs  0.00 → 0.95   hips 0.95 → 1.15   torso 1.15 → 2.05
 *   head  2.05 → 2.68   stud 2.68 → 2.78
 */

export interface Outfit {
    /** Torso colour — the strongest signal at distance. */
    torso: string;
    legs: string;
    headgear: 'cap' | 'goggles' | 'hardhat' | 'headband' | 'headset';
    headgearColor: string;
    /** A single chest detail, so districts stay distinguishable up close. */
    accent: string;
}

/** Shared across the cast — the outfits carry the identity, not the skin. */
const SKIN = '#f0c49a';

const HIP_Y = 0.95;
const SHOULDER_Y = 1.92;
const HEAD_Y = 2.365;

export const DOMAIN_OUTFITS: Record<number, Outfit> = {
    // 1 · Orchestration — dispatcher: indigo uniform, peaked cap, headset.
    1: { torso: '#4a44a8', legs: '#2b2752', headgear: 'cap', headgearColor: '#3b3690', accent: '#e8b93f' },
    // 2 · Tool & MCP — maker: burnt orange apron, goggles pushed up.
    2: { torso: '#c1761c', legs: '#5c3d18', headgear: 'goggles', headgearColor: '#7a4a12', accent: '#ffe0a3' },
    // 3 · Claude Code config — engineer: teal shirt, yellow hard hat.
    3: { torso: '#177f66', legs: '#2f4a55', headgear: 'hardhat', headgearColor: '#f2c230', accent: '#bfe9dd' },
    // 4 · Prompt & structured output — instructor: magenta gi, white headband.
    4: { torso: '#b93a72', legs: '#5e2140', headgear: 'headband', headgearColor: '#f4f1e9', accent: '#2a2a2a' },
    // 5 · Context & reliability — tower control: steel blue, hi-vis stripe.
    5: { torso: '#3b6ea8', legs: '#26364f', headgear: 'headset', headgearColor: '#242424', accent: '#a8dd35' },
};

export const outfitFor = (domainOrder: number): Outfit =>
    DOMAIN_OUTFITS[domainOrder] ?? DOMAIN_OUTFITS[1];

const Headgear: React.FC<{ outfit: Outfit; castShadow: boolean }> = ({ outfit, castShadow }) => {
    const { headgear, headgearColor } = outfit;

    if (headgear === 'hardhat') {
        return (
            <group position={[0, 2.66, 0]}>
                <mesh castShadow={castShadow}>
                    <sphereGeometry args={[0.33, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color={headgearColor} roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.005, 0.2]} rotation={[-0.1, 0, 0]} castShadow={castShadow}>
                    <boxGeometry args={[0.44, 0.05, 0.24]} />
                    <meshStandardMaterial color={headgearColor} roughness={0.4} />
                </mesh>
                {/* Centre ridge — reads as a hard hat rather than a bowl. */}
                <mesh position={[0, 0.16, 0]}>
                    <boxGeometry args={[0.07, 0.12, 0.5]} />
                    <meshStandardMaterial color={headgearColor} roughness={0.4} />
                </mesh>
            </group>
        );
    }

    if (headgear === 'cap') {
        return (
            <group position={[0, 2.64, 0]}>
                <mesh castShadow={castShadow}>
                    <cylinderGeometry args={[0.32, 0.33, 0.16, 16]} />
                    <meshStandardMaterial color={headgearColor} roughness={0.55} />
                </mesh>
                <mesh position={[0, -0.06, 0.26]} castShadow={castShadow}>
                    <boxGeometry args={[0.44, 0.05, 0.26]} />
                    <meshStandardMaterial color={headgearColor} roughness={0.55} />
                </mesh>
                {/* Gold band, matching the concept art. */}
                <mesh position={[0, -0.07, 0]}>
                    <cylinderGeometry args={[0.335, 0.335, 0.05, 16]} />
                    <meshStandardMaterial color={outfit.accent} roughness={0.35} metalness={0.4} />
                </mesh>
                {/* Headset boom — the dispatcher is always on the line. */}
                <mesh position={[0.3, -0.3, 0.06]}>
                    <sphereGeometry args={[0.08, 8, 6]} />
                    <meshStandardMaterial color="#242424" roughness={0.5} />
                </mesh>
            </group>
        );
    }

    if (headgear === 'goggles') {
        return (
            <group position={[0, 2.58, 0]}>
                <mesh>
                    <boxGeometry args={[0.62, 0.14, 0.58]} />
                    <meshStandardMaterial color={headgearColor} roughness={0.5} />
                </mesh>
                {[-0.15, 0.15].map(x => (
                    <mesh key={x} position={[x, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.1, 0.1, 0.07, 10]} />
                        <meshStandardMaterial color="#a8e4f2" roughness={0.15} metalness={0.35} />
                    </mesh>
                ))}
            </group>
        );
    }

    if (headgear === 'headband') {
        return (
            <mesh position={[0, 2.56, 0]}>
                <cylinderGeometry args={[0.315, 0.315, 0.11, 16]} />
                <meshStandardMaterial color={headgearColor} roughness={0.8} />
            </mesh>
        );
    }

    // headset — over-ear cups on a band.
    return (
        <group position={[0, 2.4, 0]}>
            <mesh position={[0, 0.28, 0]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.3, 0.035, 6, 16, Math.PI]} />
                <meshStandardMaterial color={headgearColor} roughness={0.5} />
            </mesh>
            {/* Rotation goes on the mesh — a geometry carries no transform. */}
            {[-0.3, 0.3].map(x => (
                <mesh key={x} position={[x, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.11, 12]} />
                    <meshStandardMaterial color={headgearColor} roughness={0.5} />
                </mesh>
            ))}
        </group>
    );
};

/** Radians per second of stride. Tuned against the player's SPEED of 11. */
const STRIDE_RATE = 9;
const LEG_SWING = 0.62;
const ARM_SWING = 0.42;

interface BrickFigureProps {
    outfit: Outfit;
    /**
     * How hard the figure is walking, 0–1, read every frame.
     *
     * A ref rather than a prop: the value changes 60 times a second and going
     * through React state would re-render the whole scene at frame rate.
     * Omitted for NPCs, who stand still.
     */
    strideRef?: React.MutableRefObject<number>;
    /** NPCs drop the fiddly bits — 45 of them stand in the city at once. */
    detail?: 'full' | 'simple';
    castShadow?: boolean;
}

export const BrickFigure: React.FC<BrickFigureProps> = ({
    outfit,
    strideRef,
    detail = 'full',
    castShadow = true,
}) => {
    const full = detail === 'full';
    // Each limb pivots independently. Swinging both legs as one group is what
    // made the old walk read as a hop rather than a stride.
    const legL = useRef<THREE.Group>(null);
    const legR = useRef<THREE.Group>(null);
    const armL = useRef<THREE.Group>(null);
    const armR = useRef<THREE.Group>(null);
    const body = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (!strideRef) return;
        const amount = THREE.MathUtils.clamp(strideRef.current, 0, 1);
        const phase = Math.sin(clock.getElapsedTime() * STRIDE_RATE);

        // Legs alternate; each arm swings against the leg on its own side,
        // which is what real gait does and what sells it as walking.
        if (legL.current) legL.current.rotation.x = phase * LEG_SWING * amount;
        if (legR.current) legR.current.rotation.x = -phase * LEG_SWING * amount;
        if (armL.current) armL.current.rotation.x = -phase * ARM_SWING * amount;
        if (armR.current) armR.current.rotation.x = phase * ARM_SWING * amount;
        // The body rises twice per stride — once per footfall.
        if (body.current) body.current.position.y = Math.abs(phase) * 0.07 * amount;
    });

    return (
        <group ref={body}>
            {/* ── Legs: each on its own hip pivot so they can alternate. The
                 pivot sits at the hip, which keeps the feet on y=0 at rest. ── */}
            {([['left', -0.18, legL], ['right', 0.18, legR]] as const).map(([key, x, ref]) => (
                <group key={key} ref={ref} position={[x, HIP_Y, 0]}>
                    <mesh position={[0, -0.475, 0]} castShadow={castShadow}>
                        <boxGeometry args={[0.31, 0.95, 0.38]} />
                        <meshStandardMaterial color={outfit.legs} roughness={0.7} />
                    </mesh>
                </group>
            ))}

            {/* Hips */}
            <mesh position={[0, 1.05, 0]} castShadow={castShadow}>
                <boxGeometry args={[0.74, 0.2, 0.42]} />
                <meshStandardMaterial color={outfit.legs} roughness={0.7} />
            </mesh>

            {/* ── Torso: narrower at the shoulders, wider at the waist. ── */}
            <mesh position={[0, 1.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={castShadow}>
                <cylinderGeometry args={[0.33, 0.45, 0.9, 4, 1]} />
                <meshStandardMaterial color={outfit.torso} roughness={0.55} />
            </mesh>

            {/* Chest accent — badge, hi-vis stripe, belt, depending on outfit. */}
            {full && (
                <mesh position={[0, 1.62, 0.3]}>
                    <boxGeometry args={[0.26, 0.1, 0.04]} />
                    <meshStandardMaterial
                        color={outfit.accent}
                        roughness={0.4}
                        emissive={outfit.accent}
                        emissiveIntensity={0.22}
                    />
                </mesh>
            )}

            {/* ── Arms, each on its own shoulder pivot so they can counter-swing
                 against the leg on the same side. ── */}
            {([['left', -1, armL], ['right', 1, armR]] as const).map(([key, side, ref]) => (
                <group key={key} ref={ref} position={[side * 0.42, SHOULDER_Y, 0]}>
                    {/* The outward tilt lives on an inner group so the pivot above
                        stays a clean forward/back hinge. */}
                    <group rotation={[0, 0, side * 0.1]}>
                        <mesh position={[0, -0.3, 0]} castShadow={castShadow}>
                            <boxGeometry args={[0.18, 0.6, 0.21]} />
                            <meshStandardMaterial color={outfit.torso} roughness={0.55} />
                        </mesh>
                        {/* C-clamp hand — a ring reads as the classic grip at distance. */}
                        {full && (
                            <mesh position={[0, -0.66, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                                <torusGeometry args={[0.085, 0.035, 6, 12]} />
                                <meshStandardMaterial color={SKIN} roughness={0.6} />
                            </mesh>
                        )}
                    </group>
                </group>
            ))}

            {/* ── Head: cylinder with the stud on top. ── */}
            <mesh position={[0, HEAD_Y, 0]} castShadow={castShadow}>
                <cylinderGeometry args={[0.3, 0.3, 0.63, 16]} />
                <meshStandardMaterial color={SKIN} roughness={0.6} />
            </mesh>
            <mesh position={[0, 2.73, 0]} castShadow={castShadow}>
                <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
                <meshStandardMaterial color={SKIN} roughness={0.6} />
            </mesh>

            {/* Eyes — two dots are all it takes to give the figure a facing. */}
            {full && [-0.1, 0.1].map(x => (
                <mesh key={x} position={[x, 2.42, 0.29]}>
                    <boxGeometry args={[0.055, 0.075, 0.03]} />
                    <meshStandardMaterial color="#2a211b" roughness={0.4} />
                </mesh>
            ))}

            <Headgear outfit={outfit} castShadow={castShadow} />
        </group>
    );
};

export default BrickFigure;
