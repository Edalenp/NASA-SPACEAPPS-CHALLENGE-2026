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
 *  inspected point in world space, so turning the body moves it without rebuilding any material.
 *  `time`, `beat` and `breath` drive the body's motion from the recorded rates, and the gains
 *  deepen it as those rates climb; `flowOn` switches the blood off when motion is paused. */
export function jellyUniforms() {
  return {
    intensity: { value: 0 },
    point: { value: new THREE.Vector3() },
    time: { value: 0 },
    beat: { value: 0 },
    beatPhase: { value: 0 },
    beatGain: { value: 0.045 },
    breath: { value: 0 },
    breathPhase: { value: 0 },
    breathGain: { value: 0.03 },
    flowOn: { value: 0 },
  };
}
export type JellyUniforms = ReturnType<typeof jellyUniforms>;

/** Lub-dub: a strong contraction at the start of each beat and a softer one a third later. Each
 *  lasts about 50 ms whatever the rate, so a fast heart still shows every beat at 30 frames a
 *  second instead of slipping between frames; at high rates the two merge into one strong beat. */
export function heartbeat(phase: number, period: number) {
  const sigma = Math.min(0.22, 0.05 / period);
  const pulse = (at: number) => Math.exp(-0.5 * ((((phase - at + 1.5) % 1) - 0.5) / sigma) ** 2);
  return Math.min(1, pulse(0) + 0.55 * pulse(0.3));
}

/** Advances the heartbeat (bpm), the breath (breaths a minute) and the blood, only while motion
 *  plays. Faster rates also beat and breathe deeper, so agitation reads at a glance. */
export function updateBodyMotion(uniforms: JellyUniforms, delta: number, bpm: number, rpm: number, moving: boolean) {
  const step = Math.min(delta, 0.1);
  if (moving) {
    uniforms.beatPhase.value = (uniforms.beatPhase.value + step * (bpm / 60)) % 1;
    uniforms.breathPhase.value = (uniforms.breathPhase.value + step * (rpm / 60)) % 1;
    uniforms.time.value += step * (bpm / 72);
  }
  uniforms.beat.value = moving ? heartbeat(uniforms.beatPhase.value, 60 / bpm) : 0;
  uniforms.breath.value = moving ? 0.5 - 0.5 * Math.cos(uniforms.breathPhase.value * Math.PI * 2) : 0;
  uniforms.beatGain.value = 0.045 + 0.04 * THREE.MathUtils.clamp((bpm - 80) / 80, 0, 1);
  uniforms.breathGain.value = 0.03 + 0.03 * THREE.MathUtils.clamp((rpm - 16) / 14, 0, 1);
  uniforms.flowOn.value = moving ? 1 : 0;
}

/** How a tissue moves: about `centre` (mesh space) it contracts with each `beat` or swells with
 *  each `breath`; `flow` sends blood away from the heart (1, arteries) or towards it (-1, veins). */
export interface TissueMotion { centre?: THREE.Vector3; beat?: boolean; breath?: boolean; flow?: number }

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

export interface GelStops { light: THREE.Color; deep: THREE.Color }

/** The gel's edge and centre colours: the status aura's own stops, or a lighter and a deeper
 *  shade of the tint when the tissue carries no status. */
export function gelStops(tint: string, stops?: [string, string]): GelStops {
  if (stops) return { light: new THREE.Color(stops[0]), deep: new THREE.Color(stops[1]) };
  const base = new THREE.Color(tint);
  return { light: base.clone().lerp(new THREE.Color('#ffffff'), 0.45), deep: base.clone().multiplyScalar(0.55) };
}

/** Spatial fading keeps long vessels and the single skin mesh local to the inspected region. */
export function localiseSelection(material: THREE.Material, focus: SystemId | null, ramp: THREE.Texture, jelly: JellyUniforms, gel: GelStops, motion: TissueMotion = {}) {
  const radius = new THREE.Vector3(...(focus ? inspectionViews[focus].radius : [1, 2, 1] as const));
  // The cel response sets its own value range; filmic tone mapping would wash the status colour out.
  material.toneMapped = false;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.vtPoint = jelly.point;
    shader.uniforms.vtRadius = { value: radius };
    shader.uniforms.vtFocused = { value: focus ? 1 : 0 };
    shader.uniforms.vtZoom = jelly.intensity;
    shader.uniforms.vtRamp = { value: ramp };
    shader.uniforms.vtLightStop = { value: gel.light };
    shader.uniforms.vtDeepStop = { value: gel.deep };
    shader.uniforms.vtBeat = jelly.beat;
    shader.uniforms.vtBeatGain = jelly.beatGain;
    shader.uniforms.vtBreath = jelly.breath;
    shader.uniforms.vtBreathGain = jelly.breathGain;
    shader.uniforms.vtMotionCentre = { value: motion.centre ?? new THREE.Vector3() };
    shader.uniforms.vtBeatOn = { value: motion.beat ? 1 : 0 };
    shader.uniforms.vtBreathOn = { value: motion.breath ? 1 : 0 };
    shader.uniforms.vtTime = jelly.time;
    shader.uniforms.vtBeatPhase = jelly.beatPhase;
    shader.uniforms.vtFlowOn = jelly.flowOn;
    shader.uniforms.vtFlow = { value: motion.flow ?? 0 };
    shader.vertexShader = `varying vec3 vtWorld; varying float vtAlong; attribute float vtFlowCoord;
       uniform float vtBeat; uniform float vtBeatGain; uniform float vtBreath; uniform float vtBreathGain;
       uniform vec3 vtMotionCentre; uniform float vtBeatOn; uniform float vtBreathOn;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed = vtMotionCentre + (transformed - vtMotionCentre)
         * (1.0 + vtBeatOn * vtBeatGain * vtBeat + vtBreathOn * vtBreathGain * vtBreath);
       vtWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
       vtAlong = vtFlowCoord;`,
    );
    shader.fragmentShader = `varying vec3 vtWorld; uniform vec3 vtPoint; uniform vec3 vtRadius; uniform float vtFocused; uniform float vtZoom; uniform sampler2D vtRamp; uniform vec3 vtLightStop; uniform vec3 vtDeepStop;
       uniform float vtTime; uniform float vtBeatPhase; uniform float vtFlowOn; uniform float vtFlow;
       varying float vtAlong;
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
      `// Ballistic gelatine shaped by light. A key from the upper left of the view splits each organ
       // into four cel bands, each a step of the status aura's own gradient (deep stop, a deeper
       // tint, the tint, the light stop), so the form reads at a glance. Over it sits the gel: a
       // clear, lighter rim, shadows that keep some light because the gel lets it through, and a
       // soft, stepped wet highlight.
       float vtFacing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
       float vtCentre = smoothstep(0.08, 1.0, vtFacing);
       vec3 vtBase = vtSaturate(diffuseColor.rgb, 1.1);
       vec3 vtInk = vtSaturate(vtDeepStop, 1.1) * 0.8;
       vec3 vtView = normalize(vViewPosition);

       vec3 vtKey = normalize(vec3(-0.55, 0.6, 0.58));
       float vtLight = dot(normalize(normal), vtKey) * 0.5 + 0.5;
       float vtX = clamp(vtLight, 0.0, 0.999) * 4.0;
       float vtIndex = floor(vtX);
       float vtSoft = fwidth(vtX) + 0.06;
       float vtStep = mix(vtBandAt(vtIndex), vtBandAt(min(vtIndex + 1.0, 3.0)), smoothstep(1.0 - vtSoft, 1.0, fract(vtX)));
       // The ramp's bands (0.25, 0.5, 0.78, 1) walk the aura: deep stop, a deeper tint, the tint,
       // and halfway to the light stop. Faces towards the viewer land on the tint, so a status keeps
       // its full colour; only faces turned to the key lift towards the light stop.
       vec3 vtCel = mix(vtDeepStop, mix(vtDeepStop, vtBase, 0.6), smoothstep(0.25, 0.5, vtStep));
       vtCel = mix(vtCel, vtBase, smoothstep(0.5, 0.78, vtStep));
       vtCel = mix(vtCel, mix(vtBase, vtLightStop, 0.55 + vtZoom * 0.1), smoothstep(0.78, 1.0, vtStep));
       vtCel *= mix(1.0, 0.9, vtCentre);
       // Keep a little of the physical sheen; only the diffuse term is re-shaded.
       outgoingLight = max(outgoingLight - totalDiffuse, 0.0) * 0.5 + vtCel;

       // Light carried through the gel lifts the shadow bands, and the gel shines in its own
       // colour where it is thickest.
       outgoingLight += vtBase * ((1.0 - vtStep) * 0.18 + 0.04 + 0.12 * vtCentre * vtCentre) * (0.7 + vtFocused * 0.3 + vtZoom * 0.15);
       // A clear rim towards the light stop, and a soft wet highlight in two steps.
       float vtRim = pow(1.0 - vtFacing, 2.5);
       outgoingLight = mix(outgoingLight, vtLightStop, vtRim * 0.25);
       float vtSpec = pow(max(dot(normalize(normal), normalize(vtKey + vtView)), 0.0), 24.0);
       float vtGloss = smoothstep(0.5, 0.62, vtSpec) * 0.25 + smoothstep(0.15, 0.5, vtSpec) * 0.08;
       outgoingLight += mix(vtLightStop, vec3(1.0), 0.5) * vtGloss * (0.7 + vtZoom * 0.3);

       // Hue-preserving ceiling: a bright orange must not clip its red and drift to yellow.
       outgoingLight /= max(max(max(outgoingLight.r, outgoingLight.g), outgoingLight.b), 1.0);

       // Blood, timed along each vessel (vtAlong: metres from the heart along the tube): glints
       // twinkle as the flow passes, out through arteries and back through veins, and a soft wave
       // leaves with every beat.
       if (vtFlow != 0.0 && vtFlowOn > 0.0) {
         float vtMask = vtFlowOn * mix(1.0, vtRegion, vtFocused);
         vec3 vtCell = vtWorld * 38.0;
         float vtCellSeed = fract(sin(dot(floor(vtCell), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
         float vtRun = fract(vtAlong * 3.0 - vtTime * 0.8 * vtFlow + vtCellSeed);
         float vtDot = 1.0 - smoothstep(0.22, 0.48, length(fract(vtCell) - 0.5));
         float vtGlint = step(0.45, vtCellSeed) * smoothstep(0.72, 0.92, vtRun) * (1.0 - smoothstep(0.92, 1.0, vtRun)) * vtDot;
         float vtWave = exp(-pow((fract(vtBeatPhase - vtAlong * 1.4) - 0.08) * 9.0, 2.0));
         outgoingLight = mix(outgoingLight, mix(vtLightStop, vec3(1.0), 0.45), clamp((vtGlint * 0.95 + vtWave * 0.22) * vtMask, 0.0, 1.0));
         diffuseColor.a = max(diffuseColor.a, vtGlint * 0.8 * vtMask);
       }

       float vtContour = 1.0 - smoothstep(0.03, 0.03 + 1.5 * fwidth(vtFacing) + 0.03, vtFacing);
       outgoingLight = mix(outgoingLight, vtInk, vtContour * 0.6);
       // Dense in the body, a clear jelly towards the edge.
       diffuseColor.a *= mix(0.42, 1.1, vtCentre);
       diffuseColor.a = min(diffuseColor.a * mix(1.0, 1.6, vtContour), 1.0);
       diffuseColor.a *= 1.0 + vtFocused * vtZoom * 0.35;
       #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => 'vitruvio-gelatine-v10';
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
