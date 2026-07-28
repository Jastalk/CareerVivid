import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CITY_BOUNDS } from './City';
import { BrickFigure, outfitFor } from './BrickFigure';
import type { QuestControls } from './useQuestControls';

const SPEED = 11;
const CAMERA_OFFSET = new THREE.Vector3(0, 16, 18);
/** Pulled-back overview used for the domain-clear fly-up. */
const CINEMATIC_OFFSET = new THREE.Vector3(0, 62, 54);
/** Auto-walk stops here — just inside the marker's interact range. */
const ARRIVE_RADIUS = 3.2;
/** Bird's-eye framing that fits every district on screen. */
const OVERVIEW_POSITION = new THREE.Vector3(0, 122, 96);
const CITY_CENTRE = new THREE.Vector3(0, 0, 0);
/** Finale framing: high enough to hold the whole city, low enough to read it. */
const FINALE_HEIGHT = 96;
const FINALE_RADIUS = 132;
const FINALE_ORBIT_RATE = 0.085;
const UP = new THREE.Vector3(0, 1, 0);

interface PlayerProps {
    controls: QuestControls;
    /** Movement is frozen while a mission dialog is open. */
    frozen: boolean;
    /** Reports the player position each frame so markers can test proximity. */
    onMove: (position: THREE.Vector3) => void;
    /** Lifts the camera into an overview shot for the domain-clear moment. */
    cinematic?: boolean;
    /** When set, the character walks here on its own (click-to-move). */
    autoTarget?: [number, number, number] | null;
    /** Fired when the auto-walk finishes or the player takes over manually. */
    onAutoEnd?: () => void;
    /** 0 = over the shoulder, 1 = whole-city overview. Driven by the scroll wheel. */
    zoom?: number;
    /** Orbit angle in radians, so buildings can be looked around. */
    orbit?: number;
    /** District the player is standing in — picks which outfit they wear. */
    domainOrder?: number;
    /** Course complete: the camera leaves the character and circles the city. */
    finale?: boolean;
    reduceMotion?: boolean;
}

/**
 * The player figure plus a chase camera. Movement is screen-relative (up on
 * the keyboard walks away from the camera), which is what players expect from
 * a third-person city game.
 *
 * The character re-dresses as they cross districts, so which domain you are
 * working in is readable from the character alone.
 */
export const Player: React.FC<PlayerProps> = ({ controls, frozen, onMove, cinematic = false, autoTarget = null, onAutoEnd, zoom = 0, orbit = 0, domainOrder = 1, finale = false, reduceMotion }) => {
    const group = useRef<THREE.Group>(null);
    /** 0–1 walk effort, read by BrickFigure each frame to drive the gait. */
    const stride = useRef(0);
    const velocity = useRef(new THREE.Vector3());
    const { camera } = useThree();
    const desiredCamera = useRef(new THREE.Vector3());
    const lookTarget = useRef(new THREE.Vector3());
    const lookScratch = useRef(new THREE.Vector3());

    useFrame((_, rawDelta) => {
        const root = group.current;
        if (!root) return;
        // Cap delta so an alt-tab pause doesn't teleport the character.
        const delta = Math.min(rawDelta, 0.05);

        const manual = frozen ? { x: 0, z: 0 } : controls.move.current;
        const hasManualInput = Math.hypot(manual.x, manual.z) > 0.05;

        let input = manual;
        // Keyboard input is read in screen space; the auto-walk already computes
        // a world-space direction, so only the former gets rotated to match the
        // camera.
        let screenRelative = true;
        if (autoTarget && !frozen) {
            if (hasManualInput) {
                // Taking the controls cancels the auto-walk immediately.
                onAutoEnd?.();
            } else {
                screenRelative = false;
                const dx = autoTarget[0] - root.position.x;
                const dz = autoTarget[2] - root.position.z;
                const distance = Math.hypot(dx, dz);
                if (distance <= ARRIVE_RADIUS) {
                    onAutoEnd?.();
                    input = { x: 0, z: 0 };
                } else {
                    // Ease off near the target so the character settles instead
                    // of overshooting and jittering around the marker.
                    const throttle = Math.min(1, distance / (ARRIVE_RADIUS * 2.5));
                    input = { x: (dx / distance) * throttle, z: -(dz / distance) * throttle };
                }
            }
        }

        // Forward (z:1) walks away from the camera. Because the camera can be
        // orbited, that direction has to be rotated by the same angle the camera
        // was — otherwise W keeps walking along world -Z and, once the view has
        // been dragged round, the character strafes sideways across the screen.
        //
        // The overview camera sits at a fixed azimuth (orbit 0), so the angle
        // eases toward 0 on the same curve the framing does. Controls then match
        // what is on screen at every point of the transition, not just the ends.
        const target = new THREE.Vector3(input.x, 0, -input.z);
        if (screenRelative) {
            const framing = THREE.MathUtils.smoothstep(zoom, 0, 1);
            target.applyAxisAngle(UP, orbit * (1 - framing));
        }
        target.multiplyScalar(SPEED);

        // Ease toward the target for weight, rather than snapping.
        velocity.current.lerp(target, 1 - Math.pow(0.0015, delta));
        root.position.addScaledVector(velocity.current, delta);

        // Keep the player inside the city.
        root.position.x = THREE.MathUtils.clamp(root.position.x, -CITY_BOUNDS, CITY_BOUNDS);
        root.position.z = THREE.MathUtils.clamp(root.position.z, -CITY_BOUNDS, CITY_BOUNDS);

        const speed = velocity.current.length();
        if (speed > 0.4) {
            // Face the direction of travel.
            const heading = Math.atan2(velocity.current.x, velocity.current.z);
            const current = root.rotation.y;
            let diff = heading - current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            root.rotation.y = current + diff * Math.min(1, delta * 12);
        }

        // The figure owns its own gait; this only reports how hard it is walking.
        stride.current = reduceMotion ? 0 : Math.min(speed / SPEED, 1);

        onMove(root.position);

        // Camera: an over-the-shoulder chase that the scroll wheel lifts into a
        // whole-city overview, with an orbit angle so towers can be looked around.
        if (finale) {
            // The course is over, so the character stops being the subject —
            // the camera drifts around the whole city instead.
            const angle = performance.now() * 0.001 * FINALE_ORBIT_RATE;
            desiredCamera.current.set(
                Math.cos(angle) * FINALE_RADIUS,
                FINALE_HEIGHT,
                Math.sin(angle) * FINALE_RADIUS,
            );
            lookTarget.current.lerp(CITY_CENTRE, 1 - Math.pow(0.02, delta));
        } else if (cinematic) {
            desiredCamera.current.copy(root.position).add(CINEMATIC_OFFSET);
            lookTarget.current.lerp(root.position, 1 - Math.pow(0.002, delta));
        } else {
            const follow = CAMERA_OFFSET.clone().applyAxisAngle(UP, orbit).add(root.position);
            // Ease the two framings together so the transition never snaps.
            const blend = THREE.MathUtils.smoothstep(zoom, 0, 1);
            desiredCamera.current.lerpVectors(follow, OVERVIEW_POSITION, blend);
            // Look at the character up close, and at the city as we pull away.
            lookScratch.current.lerpVectors(root.position, CITY_CENTRE, blend);
            lookTarget.current.lerp(lookScratch.current, 1 - Math.pow(0.0005, delta));
        }

        // The finale eases in hard at first, then tracks its orbit closely.
        camera.position.lerp(desiredCamera.current, 1 - Math.pow(finale ? 0.35 : cinematic ? 0.28 : 0.002, delta));
        camera.lookAt(lookTarget.current.x, lookTarget.current.y + 1.4, lookTarget.current.z);
    });

    return (
        <group ref={group} position={[0, 0, 4]}>
            <BrickFigure outfit={outfitFor(domainOrder)} strideRef={stride} />
            {/* Contact shadow blob keeps the character grounded on cheap devices.
                Sits above every static ground decal (plazas, marker rings) so it stays
                visible wherever the character walks. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
                <circleGeometry args={[0.65, 16]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.18} />
            </mesh>
        </group>
    );
};

export default Player;
