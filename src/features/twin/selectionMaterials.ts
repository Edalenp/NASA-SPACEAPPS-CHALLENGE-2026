import * as THREE from 'three';
import type { SystemId } from '../../data/mission';
import { inspectionViews } from './inspection';

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

/** Shared uniforms are updated only when the demand-driven medical camera renders. `point` is the
 *  inspected point in world space, so turning the body moves it without rebuilding any material. */
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
  return ink.setHSL(hsl.h, Math.min(1, hsl.s * 1.2), hsl.l * 0.72);
}

/** Spatial fading keeps long vessels and the single skin mesh local to the inspected region. */
export function localiseSelection(material: THREE.Material, focus: SystemId | null, ramp: THREE.Texture, jelly: JellyUniforms) {
  const radius = new THREE.Vector3(...(focus ? inspectionViews[focus].radius : [1, 2, 1] as const));
  // The cel response sets its own value range; filmic tone mapping would wash the status colour out.
  material.toneMapped = false;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.vtPoint = jelly.point;
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
      `// Ballistic gelatine lit from within: light crosses the thin centre, which glows lighter
       // and pinker, while the long path through the edge deepens it to a darker, denser shade.
       float vtFacing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
       float vtCentre = pow(smoothstep(0.1, 1.0, vtFacing), 1.5);
       vec3 vtBase = vtSaturate(diffuseColor.rgb, 1.2);
       vec3 vtLit = mix(vtBase, vec3(1.0, 0.84, 0.9), 0.4 + vtZoom * 0.08);
       vec3 vtDeep = vtSaturate(vtBase, 1.35) * 0.5;
       vec3 vtInk = vtSaturate(vtBase, 1.3) * 0.38;

       // Cel bands follow a fixed key from the upper left of the view, like the subject key light,
       // so every organ shows all four steps whatever the strength of the inspection spot.
       vec3 vtKey = normalize(vec3(-0.55, 0.6, 0.58));
       float vtLight = dot(normalize(normal), vtKey) * 0.5 + 0.5;
       float vtX = clamp(vtLight, 0.0, 0.999) * 4.0;
       float vtIndex = floor(vtX);
       float vtSoft = fwidth(vtX) + 0.08;
       float vtStep = mix(vtBandAt(vtIndex), vtBandAt(min(vtIndex + 1.0, 3.0)), smoothstep(1.0 - vtSoft, 1.0, fract(vtX)));
       float vtShade = mix(0.62, 1.1, vtStep);

       vec3 vtBody = mix(vtDeep, vtLit, vtCentre) * vtShade;
       // Keep the physical sheen and soft specular; only the diffuse term is re-shaded.
       outgoingLight = max(outgoingLight - totalDiffuse, 0.0) * 0.85 + vtBody;

       // The inner glow fills the centre in its own light colour; the key leaves a broad, velvet
       // bloom instead of a sharp glint.
       float vtGlow = vtCentre * vtCentre * (0.12 + vtFocused * 0.06 + vtZoom * 0.1);
       float vtBloom = smoothstep(0.3, 0.95, pow(max(dot(normalize(normal), normalize(vtKey + normalize(vViewPosition))), 0.0), 6.0));
       outgoingLight += vtLit * (vtGlow + vtBloom * 0.14);

       float vtContour = 1.0 - smoothstep(0.03, 0.03 + 1.5 * fwidth(vtFacing) + 0.03, vtFacing);
       outgoingLight = mix(outgoingLight, vtInk, vtContour * 0.7);
       // Denser at the edge, clearer where light passes straight through.
       diffuseColor.a *= mix(1.1, 0.62, vtCentre);
       diffuseColor.a = min(diffuseColor.a * mix(1.0, 1.5, vtContour), 1.0);
       diffuseColor.a *= 1.0 + vtFocused * vtZoom * 0.35;
       #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => 'vitruvio-gelatine-v4';
}

/** Inverted hull: a cel silhouette in the tint's own ink, limited to the selected anatomical region. */
export function selectionOutline(node: THREE.Mesh, focus: SystemId, tint: string, jelly: JellyUniforms) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, toneMapped: false,
    uniforms: {
      point: jelly.point,
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
        // Translucent tissue cannot hide the hull's far side, so the ink stays light enough to read through.
        gl_FragColor = vec4(ink, region * edge * (0.32 + zoom * 0.18));
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
