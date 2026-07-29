import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PlacedMission } from '../../lib/questSource';
import { useQuestLocale } from './useQuestLocale';

export type MarkerState = 'locked' | 'available' | 'cleared';

const STATE_COLOR: Record<MarkerState, string> = {
    locked: '#8a8578',
    available: '#f5871f',
    cleared: '#1d9e75',
};


interface MissionMarkerProps {
    mission: PlacedMission;
    state: MarkerState;
    /** True when the player is standing close enough to interact. */
    isNear: boolean;
    /** Clicking the marker walks the character over to it. */
    onTravel?: (mission: PlacedMission) => void;
    /** Highlights this marker as the recommended next objective. */
    isNext?: boolean;
    reduceMotion?: boolean;
}

/**
 * A GTA-style waypoint: a floating beacon over the objective, with a label
 * that only appears once the player is close enough to trigger it.
 */
export const MissionMarker: React.FC<MissionMarkerProps> = ({ mission, state, isNear, onTravel, isNext = false, reduceMotion }) => {
    const beacon = useRef<THREE.Mesh>(null);
    const halo = useRef<THREE.Mesh>(null);
    const color = STATE_COLOR[state];
    const { localize, t } = useQuestLocale();

    useFrame(({ clock }) => {
        if (reduceMotion) return;
        const t = clock.getElapsedTime();
        if (beacon.current) {
            beacon.current.position.y = 2.6 + Math.sin(t * 1.6 + mission.position[0]) * 0.22;
            beacon.current.rotation.y = t * 0.9;
        }
        if (halo.current) {
            const pulse = 1 + Math.sin(t * 2.2) * (isNear ? 0.16 : 0.07);
            halo.current.scale.set(pulse, pulse, pulse);
        }
    });

    return (
        <group position={mission.position}>
            {/* Invisible, generous click target — clicking walks the player here. */}
            <mesh
                position={[0, 2, 0]}
                onClick={event => {
                    event.stopPropagation();
                    onTravel?.(mission);
                }}
                onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
                <cylinderGeometry args={[2.4, 2.4, 6, 10]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Ground halo */}
            <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                <ringGeometry args={[1.5, 2.2, 28]} />
                <meshBasicMaterial color={color} transparent opacity={state === 'locked' ? 0.3 : 0.62} side={THREE.DoubleSide} />
            </mesh>

            {/* Light shaft — reads as a waypoint from across the map. */}
            {state !== 'cleared' && (
                <mesh position={[0, 6, 0]}>
                    <cylinderGeometry args={[0.42, 0.42, 12, 12, 1, true]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={state === 'locked' ? 0.08 : 0.19}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* Beacon: diamond for an open mission, cube once cleared. */}
            <mesh ref={beacon} position={[0, 2.6, 0]} castShadow>
                {state === 'cleared'
                    ? <boxGeometry args={[0.8, 0.8, 0.8]} />
                    : <octahedronGeometry args={[mission.isBoss ? 0.95 : 0.72, 0]} />}
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={state === 'locked' ? 0.15 : 0.75}
                    roughness={0.35}
                />
            </mesh>

            {/* Boss missions get a second ring so they stand out on approach. */}
            {mission.isBoss && state !== 'cleared' && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
                    <ringGeometry args={[2.6, 3.0, 28]} />
                    <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
                </mesh>
            )}

            {isNext && state === 'available' && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                    <ringGeometry args={[3.2, 3.8, 32]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
                </mesh>
            )}

            {isNear && (
                <Html center distanceFactor={16} position={[0, 4.6, 0]} zIndexRange={[20, 0]}>
                    <div className="pointer-events-none select-none whitespace-nowrap rounded-xl bg-[#171411]/92 px-3 py-2 text-center text-white shadow-lg">
                        <div className="text-[13px] font-bold leading-tight">
                            {mission.isBoss ? '★ ' : ''}{localize(mission.name)}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/60">{localize(mission.site)}</div>
                        <div className="mt-1 text-[11px] font-semibold text-[#ffb066]">
                            {state === 'locked' ? t('ccaf_quest.locked')
                                : state === 'cleared' ? t('ccaf_quest.cleared_review')
                                    : t('ccaf_quest.press_e')}
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
};

export default MissionMarker;
