import { useEffect, useMemo, useRef } from 'react';
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMission } from '../../../store/mission';
import { useAssessment } from '../../../store/derived';
import { STATUS_LIGHT } from '../palette';
import { useReducedMotion } from './motion';

/** The deck's face: a plate of glass cut into hexagonal panes. Each pane is a slightly different
 *  frost, its edges bevelled (lit towards the key light, shaded away from it), and the seams
 *  between them catch the light. The glass carries the crew member's status: on every recorded
 *  heartbeat a wave of the status colour (the interface's green, amber or red) runs out pane by
 *  pane from under the feet, and the rim glows in it, swelling on the beat. Panes under the pointer
 *  light up and a click sends its own wave. Seams fade where the panes get too small on screen to
 *  draw cleanly, so the plate never shimmers with moiré at a grazing angle. */
const GLASS = /* glsl */ `
  uniform float uTime;
  uniform float uAge;
  uniform float uScale;
  uniform vec3 uLine;
  uniform vec3 uShade;
  uniform vec3 uGlow;
  uniform vec3 uPointer;
  uniform vec3 uRipple;
  varying vec2 vUv;

  // Distance from a pane's centre: 0.5 on its seam.
  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.5, 0.8660254)), p.x);
  }

  // Layers composite front to back like paint: colour over what is already there.
  void over(inout vec3 colour, inout float alpha, vec3 layer, float amount) {
    amount = clamp(amount, 0.0, 1.0);
    colour = layer * amount + colour * (1.0 - amount);
    alpha = amount + alpha * (1.0 - amount);
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;
    vec2 uv = p * uScale;
    vec2 h = vec2(0.5, 0.8660254);
    vec2 a = mod(uv, vec2(1.0, 1.7320508)) - h;
    vec2 b = mod(uv - h, vec2(1.0, 1.7320508)) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    vec2 cell = (uv - gv) / uScale;
    float edge = 0.5 - hexDist(gv);
    float clarity = 1.0 - smoothstep(0.12, 0.32, length(fwidth(uv)));
    float seam = (1.0 - smoothstep(0.0, fwidth(edge) * 1.5 + 0.008, edge)) * clarity;
    vec2 towards = normalize(gv + 1e-4);
    float rimBand = (1.0 - smoothstep(0.0, 0.07, edge)) * clarity;
    float litSide = max(dot(towards, vec2(-0.6, 0.8)), 0.0);
    float shadeSide = max(dot(towards, vec2(0.6, -0.8)), 0.0);
    float frost = fract(sin(dot(floor(cell * uScale * 2.0 + 0.5), vec2(127.1, 311.7))) * 43758.5453);

    float wave = exp(-pow((length(cell) - uAge * 1.15) * 5.0, 2.0)) * exp(-uAge * 1.8);
    float hover = exp(-pow(distance(cell, uPointer.xy) * 6.0, 2.0)) * uPointer.z;
    float age = uTime - uRipple.z;
    float ripple = age < 1.4 ? exp(-pow((distance(cell, uRipple.xy) - age * 1.2) * 6.0, 2.0)) * (1.0 - age / 1.4) : 0.0;
    float lit = clamp(wave + hover * 0.7 + ripple, 0.0, 1.0);
    float beat = exp(-uAge * 7.0);

    float inner = smoothstep(1.0, 0.86, r);
    float rim = smoothstep(0.962, 0.99, r) * (1.0 - smoothstep(0.993, 1.0, r));
    float sheen = exp(-pow(dot(p, vec2(0.876, 0.482)) * 2.2 - 0.6, 2.0)) * 0.05;

    vec3 colour = vec3(0.0);
    float alpha = 0.0;
    // The panes themselves carry a breath of the status colour.
    over(colour, alpha, mix(uLine, uGlow, 0.3), (0.035 + frost * 0.035) * inner);
    over(colour, alpha, uShade, rimBand * shadeSide * 0.2 * inner);
    over(colour, alpha, uLine, rimBand * litSide * 0.16 * inner);
    over(colour, alpha, uLine, seam * 0.24 * inner);
    over(colour, alpha, uGlow, lit * 0.2 * smoothstep(0.0, 0.3, edge) * inner);
    over(colour, alpha, uGlow, seam * lit * 0.75 * inner);
    over(colour, alpha, uLine, sheen);
    over(colour, alpha, mix(uLine, uGlow, 0.65), rim * (0.45 + 0.35 * beat));
    gl_FragColor = vec4(colour / max(alpha, 1e-4), alpha);
  }
`;

const RADIUS = 0.95;

export default function GlassDeck({ night }: { night: boolean }) {
  const { counts } = useAssessment();
  const status = counts.alert ? 'alert' : counts.watch ? 'watch' : 'normal';
  const pulse = useMission((s) => s.readings.pulse);
  const bpm = typeof pulse === 'number' && pulse > 0 ? pulse : 72;
  const reduced = useReducedMotion();
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uAge: { value: 10 }, uScale: { value: 9 },
      uLine: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
      uPointer: { value: new THREE.Vector3(0, 0, 0) }, uRipple: { value: new THREE.Vector3(0, 0, -10) },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: GLASS, transparent: true, depthWrite: false, toneMapped: false,
  }), []);
  const mesh = useRef<THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>>(null);
  const hover = useRef(0);
  useEffect(() => invalidate(), [night, status, invalidate]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }, delta) => {
    const u = mesh.current?.material.uniforms;
    if (!u) return;
    const t = clock.elapsedTime;
    u.uTime.value = t;
    u.uLine.value.set(night ? '#cfe2dc' : '#f7fcfa');
    u.uShade.value.set(night ? '#101511' : '#5d6a63');
    u.uGlow.value.set(STATUS_LIGHT[status]);
    // Seconds since the last beat of the recorded pulse; held still when motion is reduced.
    u.uAge.value = reduced ? 10 : (((t * bpm) / 60) % 1) * (60 / bpm);
    const settled = Math.abs(u.uPointer.value.z - hover.current) < 0.01;
    u.uPointer.value.z += (hover.current - u.uPointer.value.z) * (reduced ? 1 : 1 - Math.exp(-delta * 10));
    // Keep drawing while the pointer's light fades or a ripple runs, even when the twin is still.
    if (!settled || t - u.uRipple.value.z < 1.4) invalidate();
  });
  /** Where the pointer is on the deck, in its own unit disc. */
  const touch = (event: ThreeEvent<PointerEvent | MouseEvent>, ripple: boolean) => {
    const u = mesh.current?.material.uniforms;
    if (!u) return;
    const local = event.object.worldToLocal(event.point.clone());
    const x = local.x / RADIUS;
    const y = -local.y / RADIUS;
    if (ripple) u.uRipple.value.set(x, y, u.uTime.value);
    else u.uPointer.value.setX(x).setY(y);
    invalidate();
  };
  return (
    <mesh ref={mesh} material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}
      onPointerMove={(e) => { hover.current = 1; touch(e, false); }}
      onPointerOut={() => { hover.current = 0; invalidate(); }}
      onClick={(e) => { if (!reduced) touch(e, true); }}>
      <circleGeometry args={[RADIUS, 128]} />
    </mesh>
  );
}
