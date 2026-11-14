import * as THREE from 'three';
import type { SystemId } from '../../data/mission';
import { focusPoint, inspectionViews } from './inspection';

export function makeToonRamp() {
  const map = new THREE.DataTexture(new Uint8Array([64, 128, 200, 255]), 4, 1, THREE.RedFormat);
  // Bands are read at texel centres, so the cel steps stay crisp; filtering never blends them.
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

/** The contour ink: the tint itself, deeper and darker, never black or grey. */
export function inkFor(tint: string) {
  const ink = new THREE.Color(tint);
  const hsl = { h: 0, s: 0, l: 0 };
  ink.getHSL(hsl);
  return ink.setHSL(hsl.h, Math.min(1, hsl.s * 1.35), hsl.l * 0.48);
}

/** Spatial fading keeps long vessels and the single skin mesh local to the inspected region. */
export function localiseSelection(material: THREE.Material, focus: SystemId | null, rotation: number, ramp: THREE.Texture, jelly: JellyUniforms) {
  const point = focusPoint(focus, rotation);
  const radius = new THREE.Vector3(...(focus ? inspectionViews[focus].radius : [1, 2, 1] as const));
  // The cel response sets its own value range; filmic tone mapping would wash the status colour out.
  material.toneMapped = false;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.vtPoint = { value: point };
    shader.uniforms.vtRadius = { value: radius };
    shader.uniforms.vtFocused = { value: focus ? 1 : 0 };
    shader.uniforms.vtZoom = jelly.intensity;
    shader.uniforms.vtRamp = { value: ramp };
    shader.vertexShader = `varying vec3 vtWorld;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvtWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = `varying vec3 vtWorld; uniform vec3 vtPoint; uniform vec3 vtRadius; uniform float vtFocused; uniform float vtZoom; uniform sampler2D vtRamp;
       const vec3 vtLumaWeights = vec3(0.2126, 0.7152, 0.0722);
       vec3 vtSaturate(vec3 c, float amount) { return max(mix(vec3(dot(c, vtLumaWeights)), c, amount), 0.0); }
       float vtBandAt(float index) { return texture2D(vtRamp, vec2((index + 0.5) / 4.0, 0.5)).r; }
       ${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float vtRegion = 1.0 - smoothstep(0.65, 1.25, length((vtWorld - vtPoint) / vtRadius));
       diffuseColor.a *= mix(1.0, mix(0.07, 1.0, vtRegion), vtFocused);`,
    ).replace(
      '#include <opaque_fragment>',
      `// Candy jelly: a dense saturated core that thins to a clear rim, stepped cel light,
       // and a contour inked in a darker shade of the same colour.
       float vtFacing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
       float vtCore = smoothstep(0.1, 0.85, vtFacing);
       vec3 vtBase = vtSaturate(diffuseColor.rgb, 1.7);
       vec3 vtDeep = vtSaturate(vtBase, 1.2) * 0.92;
       vec3 vtClear = mix(vtBase, vec3(1.0), 0.3);
       vec3 vtInk = vtSaturate(vtBase, 1.35) * 0.4;

       float vtLight = dot(totalDiffuse, vtLumaWeights) / max(dot(diffuseColor.rgb, vtLumaWeights), 1e-4);
       float vtX = clamp(vtLight * 0.8, 0.0, 0.999) * 4.0;
       float vtIndex = floor(vtX);
       float vtSoft = fwidth(vtX) + 0.02;
       float vtStep = mix(vtBandAt(vtIndex), vtBandAt(min(vtIndex + 1.0, 3.0)), smoothstep(1.0 - vtSoft, 1.0, fract(vtX)));
       float vtShade = mix(0.55, 1.08, vtStep);

       vec3 vtBody = mix(vtClear, vtDeep, vtCore) * vtShade;
       vtBody += vtDeep * vtCore * vtCore * (0.14 + vtZoom * 0.16);
       // Keep the glassy specular and clearcoat; only the diffuse term is re-shaded.
       outgoingLight = max(outgoingLight - totalDiffuse, 0.0) * 0.85 + vtBody;

       float vtContour = 1.0 - smoothstep(0.07, 0.07 + 2.5 * fwidth(vtFacing) + 0.08, vtFacing);
       outgoingLight = mix(outgoingLight, vtInk, vtContour * 0.9);
       diffuseColor.a *= mix(0.3, 1.0, vtCore);
       diffuseColor.a = min(diffuseColor.a * mix(1.0, 2.8, vtContour), 1.0);
       diffuseColor.a *= 1.0 + vtFocused * vtZoom * 0.35;
       #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => 'vitruvio-jelly-candy-v3';
}

/** Inverted hull: a cel silhouette in the tint's own ink, limited to the selected anatomical region. */
export function selectionOutline(node: THREE.Mesh, focus: SystemId, rotation: number, tint: string, jelly: JellyUniforms) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, toneMapped: false,
    uniforms: {
      point: { value: focusPoint(focus, rotation) },
      radius: { value: new THREE.Vector3(...inspectionViews[focus].radius) },
      ink: { value: inkFor(tint) },
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
        view.xyz += viewNormal * 0.0022;
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
        gl_FragColor = vec4(ink, region * edge * (0.6 + zoom * 0.3));
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
