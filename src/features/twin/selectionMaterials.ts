import * as THREE from 'three';
import type { SystemId } from '../../data/mission';
import { focusPoint, inspectionViews } from './inspection';

export function makeToonRamp() {
  const map = new THREE.DataTexture(new Uint8Array([64, 128, 200, 255]), 4, 1, THREE.RedFormat);
  map.minFilter = map.magFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  return map;
}

export function updateToonRamp(map: THREE.DataTexture, bands: Uint8Array) {
  (map.image.data as Uint8Array).set(bands);
  map.needsUpdate = true;
}

export interface MaterialTransition { material: THREE.MeshStandardMaterial | THREE.MeshToonMaterial; opacity: number }

export function animateMaterials(entries: MaterialTransition[], delta: number, reduced: boolean) {
  let moving = false;
  for (const entry of entries) {
    if (Math.abs(entry.material.opacity - entry.opacity) < 0.004) { entry.material.opacity = entry.opacity; continue; }
    entry.material.opacity = reduced ? entry.opacity : THREE.MathUtils.damp(entry.material.opacity, entry.opacity, 12, delta);
    moving = true;
  }
  return moving;
}

/** Spatial fading keeps long vessels and the single skin mesh local to the inspected region. */
export function localiseSelection(material: THREE.Material, focus: SystemId, rotation: number, skin: boolean, tint: string) {
  const point = focusPoint(focus, rotation);
  const radius = new THREE.Vector3(...inspectionViews[focus].radius);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.vtPoint = { value: point };
    shader.uniforms.vtRadius = { value: radius };
    shader.uniforms.vtTint = { value: new THREE.Color(tint) };
    shader.uniforms.vtSkin = { value: skin ? 1 : 0 };
    shader.vertexShader = `varying vec3 vtWorld;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvtWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = `varying vec3 vtWorld; uniform vec3 vtPoint; uniform vec3 vtRadius; uniform vec3 vtTint; uniform float vtSkin;\n${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float vtRegion = 1.0 - smoothstep(0.65, 1.25, length((vtWorld - vtPoint) / vtRadius));
       diffuseColor.a *= mix(0.07, 1.0, vtRegion);
       diffuseColor.rgb = mix(diffuseColor.rgb, vtTint, vtRegion * vtSkin * 0.3);`,
    );
  };
  material.customProgramCacheKey = () => 'vitruvio-local-inspection-v1';
}

/** Inverted hull: a thin silhouette, limited to the selected anatomical region. */
export function selectionOutline(node: THREE.Mesh, focus: SystemId, rotation: number) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false,
    uniforms: {
      point: { value: focusPoint(focus, rotation) },
      radius: { value: new THREE.Vector3(...inspectionViews[focus].radius) },
      ink: { value: new THREE.Color('#25312a') },
    },
    vertexShader: /* glsl */ `
      varying vec3 worldPoint;
      void main() {
        worldPoint = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        view.xyz += normalize(normalMatrix * normal) * 0.0017;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 point;
      uniform vec3 radius;
      uniform vec3 ink;
      varying vec3 worldPoint;
      void main() {
        float region = 1.0 - smoothstep(0.65, 1.25, length((worldPoint - point) / radius));
        if (region < 0.03) discard;
        gl_FragColor = vec4(ink, region * 0.88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const outline = new THREE.Mesh(node.geometry, material);
  outline.name = `inspection-outline-${node.name}`;
  outline.userData.inspectionOutline = true;
  outline.renderOrder = 4;
  outline.raycast = () => {};
  node.add(outline);
  return outline;
}
