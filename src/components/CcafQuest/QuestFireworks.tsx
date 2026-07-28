import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Fireworks over the city skyline, for the end of the course.
 *
 * One `<points>` cloud for every shell rather than a mesh per spark: the whole
 * display is a few draw calls, so it can run over the full city without
 * costing the frame rate the celebration is meant to show off.
 *
 * Bursts are seeded deterministically — a finale that looks different every
 * time it is screenshotted is harder to recognise as *the* finale.
 */

const SHELL_COUNT = 7;
const SPARKS_PER_SHELL = 90;
const SHELL_LIFETIME = 2.6;
/**
 * Shells launch on a steady rolling cadence and each reloads exactly one full
 * rotation later, so a shell goes up every LAUNCH_GAP seconds for as long as
 * the finale is on screen.
 *
 * The first version reset every shell together on a shared cycle. That left the
 * sky briefly empty and then replayed the whole volley from shell one, which
 * read as the animation restarting rather than as fireworks continuing.
 */
const LAUNCH_GAP = 0.9;
const RELOAD_PERIOD = SHELL_COUNT * LAUNCH_GAP;   // 6.3s — ~3 shells lit at all times

const PALETTE = ['#ffd166', '#7c74e0', '#1d9e75', '#f5871f', '#e5645f', '#8fe3ff', '#ffffff'];

/** Deterministic pseudo-random, so every run of the finale matches. */
const seeded = (n: number) => {
    const x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
};

interface Shell {
    origin: THREE.Vector3;
    velocities: Float32Array;
    positions: Float32Array;
    colour: string;
    launchAt: number;
    period: number;
}

const buildShells = (radius: number): Shell[] =>
    Array.from({ length: SHELL_COUNT }, (_, s) => {
        const angle = (s / SHELL_COUNT) * Math.PI * 2 + seeded(s) * 0.8;
        const distance = radius * (0.35 + seeded(s + 40) * 0.5);
        const origin = new THREE.Vector3(
            Math.cos(angle) * distance,
            34 + seeded(s + 80) * 22,
            Math.sin(angle) * distance,
        );

        const velocities = new Float32Array(SPARKS_PER_SHELL * 3);
        const positions = new Float32Array(SPARKS_PER_SHELL * 3);
        for (let i = 0; i < SPARKS_PER_SHELL; i += 1) {
            // Even spread over a sphere, so the burst reads as round.
            const theta = Math.acos(1 - 2 * ((i + 0.5) / SPARKS_PER_SHELL));
            const phi = Math.PI * (1 + Math.sqrt(5)) * i;
            const speed = 9 + seeded(s * 100 + i) * 7;
            velocities[i * 3] = Math.sin(theta) * Math.cos(phi) * speed;
            velocities[i * 3 + 1] = Math.cos(theta) * speed;
            velocities[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * speed;
        }

        return {
            origin,
            velocities,
            positions,
            colour: PALETTE[s % PALETTE.length],
            launchAt: s * LAUNCH_GAP,
            period: RELOAD_PERIOD,
        };
    });

const Shell: React.FC<{ shell: Shell; startedAt: React.MutableRefObject<number> }> = ({ shell, startedAt }) => {
    const points = useRef<THREE.Points>(null);
    const material = useRef<THREE.PointsMaterial>(null);
    const geometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(shell.positions, 3));
        return g;
    }, [shell]);

    useFrame(({ clock }) => {
        const since = clock.getElapsedTime() - startedAt.current - shell.launchAt;
        const node = points.current;
        if (!node || !material.current) return;

        // Not yet launched for the first time.
        if (since < 0) { node.visible = false; return; }

        // Rolls round forever. Because the launches are evenly spaced there is
        // no moment the sky is empty, and so no perceptible restart.
        const elapsed = since % shell.period;
        if (elapsed > SHELL_LIFETIME) {
            node.visible = false;
            return;
        }
        node.visible = true;

        const { positions, velocities } = shell;
        for (let i = 0; i < SPARKS_PER_SHELL; i += 1) {
            const o = i * 3;
            // Ballistic, with drag — sparks slow as they spread and then fall.
            const drag = 1 - Math.min(elapsed / SHELL_LIFETIME, 1) * 0.75;
            positions[o] = velocities[o] * elapsed * drag;
            positions[o + 1] = velocities[o + 1] * elapsed * drag - 4.2 * elapsed * elapsed;
            positions[o + 2] = velocities[o + 2] * elapsed * drag;
        }
        geometry.attributes.position.needsUpdate = true;

        const life = elapsed / SHELL_LIFETIME;
        material.current.opacity = Math.min(1, (1 - life) * 2.2);
        material.current.size = 1.5 - life * 0.7;
    });

    return (
        <points ref={points} geometry={geometry} position={shell.origin} visible={false}>
            <pointsMaterial
                ref={material}
                color={shell.colour}
                size={1.5}
                sizeAttenuation
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export const QuestFireworks: React.FC<{ radius: number; active: boolean }> = ({ radius, active }) => {
    const shells = useMemo(() => buildShells(radius), [radius]);
    const startedAt = useRef(0);
    const armed = useRef(false);

    useFrame(({ clock }) => {
        if (!active) { armed.current = false; return; }
        if (!armed.current) {
            armed.current = true;
            startedAt.current = clock.getElapsedTime();
        }
    });

    if (!active) return null;

    return (
        <group>
            {shells.map((shell, i) => (
                <Shell key={i} shell={shell} startedAt={startedAt} />
            ))}
        </group>
    );
};

export default QuestFireworks;
