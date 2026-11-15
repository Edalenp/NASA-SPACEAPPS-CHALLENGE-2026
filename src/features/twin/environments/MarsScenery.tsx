import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { random } from './config';
import { Beam, type Vec3 } from './geometry';
import Glows, { type Glow } from './Glows';

/** The low sun both Martian scenes face: ahead and a little to the left, just above the ridges. */
const MARS_SUN = new THREE.Vector3(-0.42, 0.05, -1).normalize();

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * The Martian sky. By day it is butterscotch dust, darker overhead, with the small blue halo Mars
 * keeps around its sun. At night (the console's night lighting) it is dusk: a deep sky full of
 * stars over the blue sunset that Martian dust makes, the glow pooled where the sun went down.
 */
export function MarsSky({ night }: { night: boolean }) {
  const uniforms = useMemo(() => ({ uNight: { value: night ? 1 : 0 }, uSun: { value: MARS_SUN.clone() } }), [night]);
  return (
    <mesh name="mars-sky" renderOrder={-10}>
      <sphereGeometry args={[240, 48, 24]} />
      <shaderMaterial vertexShader={skyVertex} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} fog={false}
        fragmentShader={/* glsl */ `
          uniform float uNight;
          uniform vec3 uSun;
          varying vec3 vDir;
          float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          void main() {
            vec3 dir = normalize(vDir);
            float e = dir.y;
            float sun = max(dot(dir, uSun), 0.0);
            float low = 1.0 - smoothstep(-0.02, 0.45, e);
            // Day: dust lit through, tan at the horizon, deeper rose-brown overhead, a blue halo at the sun.
            vec3 day = mix(vec3(0.86, 0.64, 0.45), vec3(0.42, 0.27, 0.21), smoothstep(0.0, 0.7, e));
            day += vec3(0.45, 0.62, 0.8) * pow(sun, 60.0) * 0.9 + vec3(0.9, 0.85, 0.75) * pow(sun, 900.0);
            // Dusk: a near-black sky with a blue glow on the horizon around the set sun.
            vec3 dusk = mix(vec3(0.1, 0.12, 0.2), vec3(0.015, 0.02, 0.05), smoothstep(0.0, 0.6, e));
            dusk += vec3(0.25, 0.52, 0.9) * pow(sun, 3.0) * low * 1.6;
            dusk += vec3(0.55, 0.8, 1.0) * pow(sun, 40.0) * 1.4;
            dusk += vec3(0.5, 0.26, 0.2) * low * 0.22 * (1.0 - sun);
            // Stars, only where the dusk sky is dark enough.
            vec3 cell = floor(dir * 520.0);
            float star = step(0.9965, hash(cell)) * smoothstep(0.05, 0.35, e) * (0.55 + 0.45 * hash(cell + 3.1));
            dusk += vec3(0.9, 0.92, 1.0) * star * (1.0 - pow(sun, 3.0));
            vec3 sky = mix(day, dusk, uNight);
            // Below the horizon the ground hides the sky; keep it dark so no seam shows.
            sky = mix(sky, sky * 0.25, 1.0 - smoothstep(-0.2, 0.0, e));
            gl_FragColor = vec4(sky, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `} />
    </mesh>
  );
}

/** Phobos, the larger and nearer moon, and small Deimos, as lit discs in the dusk sky. */
export function MarsMoons({ night, time }: { night: boolean; time: RefObject<number> }) {
  const phobos = useRef<THREE.Mesh>(null);
  useFrame(() => {
    // Phobos crosses the sky fast enough to notice over a few minutes.
    if (phobos.current) phobos.current.position.x = 38 - ((time.current * 0.05) % 90);
  });
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uSun: { value: MARS_SUN.clone() }, uGain: { value: night ? 1 : 0.35 } },
    transparent: true, depthWrite: false, fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vNormal; varying vec3 vPos;
      void main() { vNormal = normalize(mat3(modelMatrix) * normal); vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform float uGain;
      varying vec3 vNormal; varying vec3 vPos;
      float hash(vec3 p) { return fract(sin(dot(floor(p), vec3(12.9, 78.2, 37.7))) * 43758.5); }
      void main() {
        float lit = smoothstep(-0.15, 0.6, dot(normalize(vNormal), normalize(uSun + vec3(0.0, 0.6, 0.6))));
        float crater = hash(vPos * 3.0) * 0.18;
        vec3 rock = vec3(0.62, 0.56, 0.5) * (0.85 - crater);
        gl_FragColor = vec4(rock * (0.06 + lit * 0.9) * uGain, uGain);
      }
    `,
  }), [night]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group name="mars-moons">
      <mesh ref={phobos} position={[18, 46, -150]} scale={[4.2, 3.3, 3.6]} material={material}>
        <icosahedronGeometry args={[1, 2]} />
      </mesh>
      <mesh position={[52, 34, -170]} scale={1.4} material={material}>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

/**
 * Three ridges of mountains between the plain and the sky, each further one paler with dust (or
 * bluer at dusk), their crests catching the low sun. Drawn as cut-out silhouettes on wide arcs, so
 * the horizon reads in layers.
 */
export function MarsMountains({ night }: { night: boolean }) {
  const layers = useMemo(() => [
    { radius: 120, height: 9, base: -3, seed: 1.3, shade: 0 },
    { radius: 155, height: 15, base: -3, seed: 4.1, shade: 0.45 },
    { radius: 195, height: 22, base: -3, seed: 7.7, shade: 0.8 },
  ], []);
  return (
    <group name="mars-mountains">
      {layers.map((layer, index) => (
        <Ridge key={index} {...layer} night={night} order={-8 + index * -0.5} />
      ))}
    </group>
  );
}

function Ridge({ radius, height, base, seed, shade, night, order }: { radius: number; height: number; base: number; seed: number; shade: number; night: boolean; order: number }) {
  const geometry = useMemo(() => {
    // An arc of the horizon ahead, from far left to far right.
    const g = new THREE.CylinderGeometry(radius, radius, height * 2, 96, 1, true, Math.PI * 0.62, Math.PI * 0.76);
    g.translate(0, base + height, 0);
    return g;
  }, [radius, height, base]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({
    uSeed: { value: seed }, uShade: { value: shade }, uNight: { value: night ? 1 : 0 }, uSun: { value: MARS_SUN.clone() },
  }), [seed, shade, night]);
  return (
    <mesh geometry={geometry} renderOrder={order}>
      <shaderMaterial uniforms={uniforms} side={THREE.BackSide} transparent depthWrite={false} fog={false}
        vertexShader={/* glsl */ `
          varying vec2 vUv; varying vec3 vDir;
          void main() { vUv = uv; vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `}
        fragmentShader={/* glsl */ `
          uniform float uSeed, uShade, uNight; uniform vec3 uSun;
          varying vec2 vUv; varying vec3 vDir;
          float hash(float n) { return fract(sin(n * 91.3) * 47453.5); }
          float noise(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i + uSeed * 13.0), hash(i + 1.0 + uSeed * 13.0), f); }
          float crest(float x) {
            float h = 0.0, a = 0.55, f = 3.0;
            for (int i = 0; i < 5; i++) { h += a * noise(x * f); f *= 2.15; a *= 0.48; }
            return 0.18 + h * 0.72;
          }
          void main() {
            float top = crest(vUv.x);
            float edge = fwidth(vUv.y) * 1.5;
            float inside = 1.0 - smoothstep(top - edge, top + edge, vUv.y);
            if (inside < 0.01) discard;
            // Far ridges fade into the dust (day) or into the blue dusk (night).
            vec3 dayRock = mix(vec3(0.38, 0.19, 0.12), vec3(0.78, 0.6, 0.46), uShade);
            vec3 duskRock = mix(vec3(0.07, 0.05, 0.06), vec3(0.2, 0.27, 0.42), uShade);
            vec3 rock = mix(dayRock, duskRock, uNight);
            // The crest catches the sun: a lit rim, strongest on the side that faces it.
            float facing = pow(max(dot(normalize(vec3(vDir.x, 0.0, vDir.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0), 3.0);
            float rim = smoothstep(top - 0.06, top - edge, vUv.y) * (0.25 + 0.75 * facing);
            vec3 rimColour = mix(vec3(0.95, 0.7, 0.5), vec3(0.45, 0.68, 0.95), uNight);
            rock += rimColour * rim * mix(0.35, 0.9, uNight);
            // Shade towards the foot of each ridge.
            rock *= mix(0.7, 1.0, smoothstep(0.0, top, vUv.y));
            gl_FragColor = vec4(rock, inside);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `} />
    </mesh>
  );
}

/**
 * The rover's marked route: beacons on short posts either side of the track, amber to port and teal
 * to starboard, running past as the rover drives, with a chase of light along each row.
 */
export function TrackBeacons({ time, moving, heightAt }: { time: RefObject<number>; moving: boolean; heightAt: (x: number, z: number) => number }) {
  const SPACING = 9;
  const ROWS = 12;
  const group = useRef<THREE.Group>(null);
  const { glows, posts } = useMemo(() => {
    const glows: Glow[] = [];
    const posts: { from: Vec3; to: Vec3 }[] = [];
    for (let i = 0; i < ROWS; i++) {
      const z = -10 - i * SPACING;
      for (const [x, colour] of [[-5.5, '#ffb24a'], [5.5, '#5ff0d0']] as const) {
        const ground = heightAt(x, z);
        glows.push({ position: [x, ground + 2.1, z], colour, size: 2.4, blink: 0.7, phase: i * 0.11 });
        posts.push({ from: [x, ground, z], to: [x, ground + 2, z] });
      }
    }
    return { glows, posts };
  }, [heightAt]);
  useFrame(() => {
    if (group.current) group.current.position.z = moving ? (time.current * 0.75) % SPACING : 0;
  });
  return (
    <group ref={group} name="rover-track-beacons">
      {posts.map((post, index) => <Beam key={index} from={post.from} to={post.to} width={0.06} color="#5d5a52" />)}
      <Glows glows={glows} time={time} />
    </group>
  );
}

const WINDOW_GLOW = new THREE.MeshBasicMaterial({ color: '#ffd59a', toneMapped: false });
const NEON_TEAL = new THREE.MeshBasicMaterial({ color: '#7ff5dd', toneMapped: false });

/** Lit windows and a neon band for a habitat module of the outpost (in the module's own space). */
export function ModuleLights({ length = 7.4 }: { length?: number }) {
  const windows = useMemo(() => Array.from({ length: 6 }, (_, i) => -length / 2 + 0.9 + i * ((length - 1.8) / 5)), [length]);
  return (
    <group>
      {windows.map((x) => (
        <mesh key={x} position={[x, 1.9, 1.97]} material={WINDOW_GLOW}><planeGeometry args={[0.55, 0.32]} /></mesh>
      ))}
      <mesh position={[0, 0.45, 1.98]} material={NEON_TEAL}><planeGeometry args={[length - 0.3, 0.05]} /></mesh>
    </group>
  );
}

/** A landing pad on the plain: a dark disc ringed with lights that chase round it. */
export function LandingPad({ position }: { position: Vec3 }) {
  const lights = useMemo<Glow[]>(() => Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return { position: [Math.cos(a) * 4.6, 0.12, Math.sin(a) * 4.6] as Vec3, colour: i % 4 === 0 ? '#ffffff' : '#ffb24a', size: 0.9, blink: 0.5, phase: i / 16 };
  }), []);
  const time = useRef(0);
  useFrame((_, delta) => { time.current += delta; });
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial color="#2b2a28" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} material={NEON_TEAL}>
        <ringGeometry args={[2.2, 2.32, 48]} />
      </mesh>
      <Glows glows={lights} time={time} />
    </group>
  );
}

/**
 * The base's emblem: the UTB Astronomy and Data Science seedbed's mark, lit on a tall dark pylon
 * beside the outpost, facing the gallery window. The mark glows teal with a soft halo.
 */
export function BaseEmblem({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  const map = useTexture('/textures/semillero-logo.svg', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  });
  const time = useRef(0);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    time.current += delta;
    if (halo.current) halo.current.opacity = 0.32 + Math.sin(time.current * 1.4) * 0.08;
  });
  const corners = useMemo<Glow[]>(() => [
    { position: [0, 6.25, 0.2], colour: '#ff3b3b', size: 1.1, blink: 0.5 },
  ], []);
  return (
    <group position={position} scale={scale} name="seedbed-emblem">
      <mesh position={[0, 2.9, -0.06]}>
        <boxGeometry args={[4.4, 6.2, 0.12]} />
        <meshStandardMaterial color="#1c1d1f" roughness={0.6} metalness={0.4} />
      </mesh>
      <Beam from={[-1.6, -0.3, -0.1]} to={[-1.6, 0.4, -0.1]} width={0.2} color="#52504a" />
      <Beam from={[1.6, -0.3, -0.1]} to={[1.6, 0.4, -0.1]} width={0.2} color="#52504a" />
      <mesh position={[0, 3.6, 0.02]}>
        <planeGeometry args={[4.6, 4.6]} />
        <meshBasicMaterial ref={halo} map={map} color="#5ff0d0" transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.6, 0.03]}>
        <planeGeometry args={[3.6, 3.6]} />
        <meshBasicMaterial map={map} color="#d9fff7" transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.1, 0.02]} material={NEON_TEAL}><planeGeometry args={[3.4, 0.06]} /></mesh>
      <Glows glows={corners} time={time} />
    </group>
  );
}

/** Dust lifted off the plain, drifting with the wind: warmer by day, a blue-grey shimmer at dusk. */
export function DustVeil({ night, time }: { night: boolean; time: RefObject<number> }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const rng = random(5150);
    const points = Array.from({ length: 360 }, () => [(rng() - 0.5) * 150, rng() * 6 - 2, -14 - rng() * 120]).flat();
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.x = Math.sin(time.current * 0.03) * 10 + time.current * 0.4 % 30;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color={night ? '#8fb2d6' : '#f0d3ad'} size={0.09} transparent opacity={night ? 0.35 : 0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
