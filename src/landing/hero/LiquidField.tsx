import { useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { heroClock, heroColour, tickHero } from './heroClock';
import { FrameCap } from './FrameCap';

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/**
 * Domain-warped noise, folded twice into itself, reads as a slow liquid (the same family as the
 * planet outside the habitat window). Its three tones come from the state's aura; an impact
 * pushes a ring out from the heart and the liquid surges, then settles into the new colour.
 */
const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uFlow, uImpact, uRipple, uSeed;
  uniform vec3 uLight, uBody, uDeep, uBase;
  uniform vec2 uRes, uHeart;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }
  // The two warp layers only steer the final one, so they skip the finest octave.
  float fbm4(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
    vec2 p = (vUv - 0.5) * aspect * 2.4;
    vec2 heart = (uHeart - 0.5) * aspect * 2.4;
    vec2 d = p - heart;
    float dist = length(d);
    // The impact: a ring travelling out from the heart, pushing the liquid ahead of it.
    float ring = exp(-pow((dist - uRipple * 1.4) * 1.6, 2.0)) * uImpact;
    p += normalize(d + 1e-4) * ring * 0.18;

    float t = uFlow;
    // A slow rise from the body below, so the whole field visibly streams upwards and swirls.
    p.y -= t * 0.18;
    p += 0.12 * vec2(sin(t * 0.37 + p.y * 1.3), cos(t * 0.29 + p.x * 1.1));
    vec2 q = vec2(fbm4(p + vec2(0.0, t * 0.45)), fbm4(p + vec2(5.2, 1.3) - t * 0.4));
    vec2 r = vec2(fbm4(p + 3.6 * q + vec2(1.7, 9.2) + 0.55 * t), fbm4(p + 3.6 * q + vec2(8.3, 2.8) - 0.5 * t));
    float f = fbm(p + 3.2 * r);

    vec3 col = mix(uBase, uDeep, smoothstep(0.2, 0.75, f));
    col = mix(col, uBody, smoothstep(0.5, 1.0, length(q) * f * 1.5));
    col = mix(col, uLight, smoothstep(0.62, 1.0, r.x * f * 1.7) * 0.75);
    col *= 0.45 + 0.65 * f;
    col += uLight * ring * 0.18;

    // Brightest around the body below; quieter at the top centre, where the words sit, and the edges.
    vec2 c = (vUv - vec2(0.5, 0.32)) * vec2(1.0, 1.15);
    col *= mix(0.34, 1.0, smoothstep(1.05, 0.15, length(c)));
    col *= mix(1.0, 0.55, smoothstep(0.55, 0.95, vUv.y) * smoothstep(0.42, 0.0, abs(vUv.x - 0.5)));

    // Film grain in the liquid itself, so the colour reads textured rather than airbrushed.
    col += (hash(vUv * uRes + uSeed) - 0.5) * 0.06;
    gl_FragColor = vec4(col, 1.0);
  }
`;

type FieldUniforms = ReturnType<typeof fieldUniforms>;
function fieldUniforms() {
  return {
    uFlow: { value: 0 }, uImpact: { value: 0 }, uRipple: { value: 10 }, uSeed: { value: 0 },
    uLight: { value: new THREE.Vector3() }, uBody: { value: new THREE.Vector3() }, uDeep: { value: new THREE.Vector3() },
    uBase: { value: new THREE.Vector3(0.09, 0.105, 0.08) },
    uRes: { value: new THREE.Vector2(1, 1) }, uHeart: { value: new THREE.Vector2(0.66, 0.42) },
  };
}
const tone: [number, number, number] = [0, 0, 0];
/** One frame of the liquid: advance the shared clock, then hand its state to the shader. */
function stepField(u: FieldUniforms, delta: number, reduced: boolean, width: number, height: number) {
  tickHero(Math.min(delta, 0.1), reduced);
  u.uFlow.value = heroClock.flow;
  u.uImpact.value = heroClock.impact;
  u.uRipple.value = heroClock.ripple;
  u.uSeed.value = (u.uSeed.value + 17.13) % 1000;
  u.uLight.value.fromArray(heroColour(0, tone));
  u.uBody.value.fromArray(heroColour(1, tone));
  u.uDeep.value.fromArray(heroColour(2, tone));
  u.uRes.value.set(width, height);
  u.uHeart.value.set(heroClock.heart.x, heroClock.heart.y);
}

function Field({ reduced }: { reduced: boolean }) {
  const size = useThree((s) => s.size);
  // Built here rather than as <shaderMaterial uniforms>: React Three Fiber copies uniform objects
  // on mount, so numbers written each frame (the flow, the impact) never reached the shader.
  const material = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: fieldUniforms(), depthTest: false, depthWrite: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, delta) => stepField(material.uniforms as FieldUniforms, delta, reduced, size.width, size.height));
  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/** The hero's liquid backdrop. Half resolution: the liquid is soft, and the grain hides the rest. */
export default function LiquidField({ reduced, running }: { reduced: boolean; running: boolean }) {
  return (
    <Canvas className="liquid-field" dpr={0.5} frameloop="demand" gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }} flat linear>
      <FrameCap running={running} />
      <Field reduced={reduced} />
    </Canvas>
  );
}
