import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * The whole skyline in four draw calls instead of four hundred.
 *
 * Buildings are identical boxes at different scales and colours, which is
 * exactly what instancing is for. The catch is the occlusion fade: it needs one
 * building to go translucent while its neighbours stay solid, and instances
 * share a material — so `material.opacity` can no longer be the mechanism.
 *
 * The fix is a per-instance `aFade` attribute plus two passes over the same
 * instance buffer:
 *
 *   solid pass  — opaque material, depth written, discards any faded instance
 *   faded pass  — transparent material, no depth write, discards solid ones
 *
 * Every pixel matches the per-mesh version it replaces: solid buildings still
 * render through the opaque path with depth, and a fading building still draws
 * translucent without occluding what is behind it. Only the draw-call count
 * changes.
 */

export interface BuildingInstance {
    position: [number, number, number];
    size: [number, number, number];
    color: string;
    roof: string;
}

/** Unit box, scaled per instance — one geometry for the entire city. */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/** Below this a building counts as "fading" and moves to the transparent pass. */
const SOLID_CUTOFF = 0.999;

/**
 * Ghosted buildings are also tinted, not just made translucent.
 *
 * Alpha alone was not enough: the buildings are pale, so on a bright screen a
 * faded one still reads as a solid cream wall. Pulling the colour toward a cool
 * blue-grey makes "you are seeing through this" unmistakable at any display
 * brightness, without branching on the site's light/dark theme — the 3D scene
 * has no theme of its own.
 */
const GHOST_TINT = 'vec3(0.36, 0.43, 0.56)';
const GHOST_TINT_MIX = '0.6';

/**
 * Splits an instanced material into one of the two passes.
 *
 * `keepFaded` false → the solid pass: discard anything that has started to fade.
 * `keepFaded` true  → the transparent pass: discard anything still solid, and
 * multiply alpha by the instance's fade so it actually looks translucent.
 */
const patchForPass = (material: THREE.Material, keepFaded: boolean) => {
    material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');

        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vFade;')
            .replace(
                '#include <dithering_fragment>',
                keepFaded
                    ? `if (vFade > ${SOLID_CUTOFF}) discard;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, ${GHOST_TINT}, ${GHOST_TINT_MIX});
  gl_FragColor.a *= vFade;
#include <dithering_fragment>`
                    : `if (vFade <= ${SOLID_CUTOFF}) discard;\n#include <dithering_fragment>`,
            );
    };
    // Force a recompile if this material was already used.
    material.needsUpdate = true;
};

interface InstancedBuildingsProps {
    buildings: BuildingInstance[];
    castShadow?: boolean;
    /** Shared with OcclusionFade so it can drive individual buildings. */
    fadeRef: React.MutableRefObject<Float32Array | null>;
    /** Set once the instance buffers exist, so the fader can find them. */
    onReady?: (meshes: THREE.InstancedMesh[]) => void;
}

export const InstancedBuildings: React.FC<InstancedBuildingsProps> = ({
    buildings, castShadow = true, fadeRef, onReady,
}) => {
    const solidBody = useRef<THREE.InstancedMesh>(null);
    const fadedBody = useRef<THREE.InstancedMesh>(null);
    const solidRoof = useRef<THREE.InstancedMesh>(null);
    const fadedRoof = useRef<THREE.InstancedMesh>(null);

    const count = buildings.length;

    // One shared fade buffer: both passes read it, OcclusionFade writes it.
    const fade = useMemo(() => new Float32Array(count).fill(1), [count]);

    const materials = useMemo(() => {
        const make = (keepFaded: boolean) => {
            const material = new THREE.MeshStandardMaterial({
                roughness: 0.85,
                transparent: keepFaded,
                depthWrite: !keepFaded,
            });
            patchForPass(material, keepFaded);
            return material;
        };
        return { bodySolid: make(false), bodyFaded: make(true), roofSolid: make(false), roofFaded: make(true) };
    }, []);

    useLayoutEffect(() => {
        fadeRef.current = fade;
        const meshes = [solidBody.current, fadedBody.current, solidRoof.current, fadedRoof.current]
            .filter(Boolean) as THREE.InstancedMesh[];
        if (meshes.length < 4) return;

        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const colour = new THREE.Color();

        buildings.forEach((building, i) => {
            const [x, y, z] = building.position;
            const [w, h, d] = building.size;

            position.set(x, y, z);
            scale.set(w, h, d);
            matrix.compose(position, quaternion, scale);
            solidBody.current!.setMatrixAt(i, matrix);
            fadedBody.current!.setMatrixAt(i, matrix);
            colour.set(building.color);
            solidBody.current!.setColorAt(i, colour);
            fadedBody.current!.setColorAt(i, colour);

            // Roof cap sits just above the body, slightly inset.
            position.set(x, y + h / 2 + 0.35, z);
            scale.set(w * 0.92, 0.7, d * 0.92);
            matrix.compose(position, quaternion, scale);
            solidRoof.current!.setMatrixAt(i, matrix);
            fadedRoof.current!.setMatrixAt(i, matrix);
            colour.set(building.roof);
            solidRoof.current!.setColorAt(i, colour);
            fadedRoof.current!.setColorAt(i, colour);
        });

        for (const mesh of meshes) {
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
            // Both passes read the same buffer, so a single write drives all four.
            mesh.geometry.setAttribute('aFade', new THREE.InstancedBufferAttribute(fade, 1));
            mesh.computeBoundingSphere();
        }
        onReady?.(meshes);

        // Dev-only handle so the occlusion fade can be inspected from the
        // console. Stripped from production builds by the bundler.
        if (import.meta.env.DEV) {
            (window as unknown as { __ccafFade?: Float32Array }).__ccafFade = fade;
        }
    }, [buildings, fade, fadeRef, onReady]);

    return (
        <group>
            {/* Solid pass writes depth; the faded pass never does. */}
            <instancedMesh
                ref={solidBody}
                args={[UNIT_BOX, materials.bodySolid, count]}
                castShadow={castShadow}
                receiveShadow
                // `isBuildingBody` marks the one mesh whose instance matrices
                // describe a whole building, so the fader can read footprints
                // off it without the roof caps doubling every entry.
                userData={{ isBuilding: true, isBuildingBody: true }}
            />
            <instancedMesh
                ref={fadedBody}
                args={[UNIT_BOX, materials.bodyFaded, count]}
                userData={{ isBuildingGhost: true }}
            />
            <instancedMesh
                ref={solidRoof}
                args={[UNIT_BOX, materials.roofSolid, count]}
                castShadow={castShadow}
                userData={{ isBuilding: true }}
            />
            <instancedMesh
                ref={fadedRoof}
                args={[UNIT_BOX, materials.roofFaded, count]}
                userData={{ isBuildingGhost: true }}
            />
        </group>
    );
};

export default InstancedBuildings;
