import * as THREE from 'three';
import type { SystemId } from '../../data/mission';
import { focusPoint, inspectionViews } from './inspection';

export function makeToonRamp() {
  const map = new THREE.DataTexture(new Uint8Array([64, 128, 200, 255]), 4, 1, THREE.RedFormat);
  // Interpolate the GPU palette: the reference calls for soft cel transitions.
  map.minFilter = map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = false;
  map.needsUpdate = true;
  return map;
}

export function updateToonRamp(map: THREE.DataTexture, bands: Uint8Array) {
  (map.image.data as Uint8Array).set(bands);
  map.needsUpdate = true;
}

export interface MaterialTransition { material: THREE.MeshStandardMaterial; opacity: number }

/** Shared uniforms are updated only when the demand-driven medical camera renders. */
export function jellyUniforms() {
  return { intensity: { value: 0 }, point: { value: new THREE.Vector3() } };
}
export type JellyUniforms = ReturnType<typeof jellyUniforms>;

export function updateJellyZoom(uniforms: JellyUniforms, camera: THREE.Camera, point: THREE.Vector3) {
  uniforms.point.value.copy(point);
  uniforms.intensity.value = THREE.MathUtils.smoothstep(3.9 - camera.position.distanceTo(point), 0, 3);
}

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
export function localiseSelection(material: THREE.Material, focus: SystemId | null, rotation: number, tint: string, ramp: THREE.Texture, jelly: JellyUniforms) {
  const point = focusPoint(focus, rotation);
  const radius = new THREE.Vector3(...(focus ? inspectionViews[focus].radius : [1, 2, 1] as const));
  material.onBeforeCompile = (shader) => {
    shader.uniforms.vtPoint = { value: point };
    shader.uniforms.vtRadius = { value: radius };
    shader.uniforms.vtTint = { value: new THREE.Color(tint) };
    shader.uniforms.vtFocused = { value: focus ? 1 : 0 };
    shader.uniforms.vtZoom = jelly.intensity;
    shader.uniforms.vtRamp = { value: ramp };
    shader.vertexShader = `varying vec3 vtWorld;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvtWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = `varying vec3 vtWorld; uniform vec3 vtPoint; uniform vec3 vtRadius; uniform vec3 vtTint; uniform float vtFocused; uniform float vtZoom; uniform sampler2D vtRamp;\n${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float vtRegion = 1.0 - smoothstep(0.65, 1.25, length((vtWorld - vtPoint) / vtRadius));
       diffuseColor.a *= mix(1.0, mix(0.07, 1.0, vtRegion), vtFocused);`,
    ).replace(
      '#include <opaque_fragment>',
      `// Soft x-ray volume: translucent centres, a grey grazing edge and gentle cel response.
       float vtFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
       float vtRim = pow(1.0 - vtFacing, 2.4);
       float vtLight = clamp(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
       float vtBand = texture2D(vtRamp, vec2(vtLight, 0.5)).r;
       outgoingLight *= mix(1.0, 0.82 + vtBand * 0.25, vtFocused * 0.45);
       outgoingLight += mix(vec3(0.31, 0.34, 0.33), vtTint, 0.18) * vtRim * (0.2 + vtZoom * 0.13);
       diffuseColor.a *= mix(0.48, 0.91, smoothstep(0.0, 0.95, vtRim));
       diffuseColor.a *= 1.0 + vtFocused * vtZoom * 0.35;
       #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => 'vitruvio-jelly-inspection-v2';
}

/** Inverted hull: a thin silhouette, limited to the selected anatomical region. */
export function selectionOutline(node: THREE.Mesh, focus: SystemId, rotation: number, jelly: JellyUniforms) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false,
    uniforms: {
      point: { value: focusPoint(focus, rotation) },
      radius: { value: new THREE.Vector3(...inspectionViews[focus].radius) },
      ink: { value: new THREE.Color('#969d98') },
      zoom: jelly.intensity,
    },
    vertexShader: /* glsl */ `
      varying vec3 worldPoint;
      varying float facing;
      void main() {
        worldPoint = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vec3 viewNormal = normalize(normalMatrix * normal);
        facing = abs(dot(viewNormal, normalize(-view.xyz)));
        view.xyz += viewNormal * 0.0012;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 point;
      uniform vec3 radius;
      uniform vec3 ink;
      uniform float zoom;
      varying vec3 worldPoint;
      varying float facing;
      void main() {
        float region = 1.0 - smoothstep(0.65, 1.25, length((worldPoint - point) / radius));
        if (region < 0.03) discard;
        float edge = 1.0 - smoothstep(0.0, 0.5, facing);
        gl_FragColor = vec4(ink, region * edge * (0.14 + zoom * 0.12));
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
