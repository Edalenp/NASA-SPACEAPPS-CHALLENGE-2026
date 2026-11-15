import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { EnvironmentId } from '../../../data/mission';
import { habitats, random } from './config';
import { Beam, Blocks, type Block, type Vec3 } from './geometry';
import Glows, { type Glow } from './Glows';
import { BaseEmblem, DustVeil, LandingPad, MarsMoons, MarsMountains, MarsSky, ModuleLights, TrackBeacons } from './MarsScenery';

/** Navigation lights of the transfer assembly: red to port, green to starboard, a white strobe on
 *  the hub; and slow amber beacons that turn with the ring. */
const NAV_LIGHTS: Glow[] = [
  { position: [-6.15, 0, 0], colour: '#ff3b3b', size: 0.9 },
  { position: [6.15, 0, 0], colour: '#3bff7a', size: 0.9 },
  { position: [0, 0.75, 0], colour: '#ffffff', size: 1.8, blink: 0.75 },
];
const RING_BEACONS: Glow[] = [0, 1, 2, 3].map((i) => ({
  position: [Math.cos(i * Math.PI / 2) * 2.1, Math.sin(i * Math.PI / 2) * 2.1, 0] as Vec3, colour: '#ffb24a', size: 0.7, blink: 0.45, phase: i * 0.25,
}));
/** Running lights chasing along the truss, and the continuous glow of the ring's neon. */
const TRUSS_CHASE: Glow[] = Array.from({ length: 13 }, (_, i) => ({
  position: [-6 + i, 0.16, 0] as Vec3, colour: '#7ff5dd', size: 0.55, blink: 0.6, phase: -i * 0.07,
}));
const RING_GLOW: Glow[] = Array.from({ length: 28 }, (_, i) => ({
  position: [Math.cos((i / 28) * Math.PI * 2) * 2.1, Math.sin((i / 28) * Math.PI * 2) * 2.1, 0] as Vec3, colour: '#5ff0d0', size: 0.6,
}));
const HUB_WINDOWS: Glow[] = Array.from({ length: 6 }, (_, i) => ({
  position: [Math.cos((i / 6) * Math.PI * 2) * 0.66, Math.sin((i / 6) * Math.PI * 2) * 0.66, (i % 2 ? 0.6 : -0.6)] as Vec3, colour: '#ffcf8a', size: 0.4,
}));
const NEON_CORE = new THREE.MeshBasicMaterial({ color: '#d9fff7', toneMapped: false });
const NEON_SHEATH = new THREE.MeshBasicMaterial({ color: '#3fe0c4', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

const vertex = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function Sky({ environment, night }: { environment: EnvironmentId; night: boolean }) {
  const c = habitats[environment];
  const uniforms = useMemo(() => ({
    uHorizon: { value: new THREE.Color(c.horizon).multiplyScalar(night ? 0.28 : 1) },
    uZenith: { value: new THREE.Color(c.zenith).multiplyScalar(night ? 0.2 : 1) },
    uGround: { value: new THREE.Color(c.ground).multiplyScalar(night ? 0.2 : 0.7) },
  }), [c, night]);
  return (
    <mesh name="exterior-sky" renderOrder={-10}>
      <sphereGeometry args={[240, 24, 16]} />
      <shaderMaterial vertexShader={vertex} uniforms={uniforms} side={THREE.BackSide} depthWrite={false}
        fragmentShader={/* glsl */ `
          uniform vec3 uHorizon;
          uniform vec3 uZenith;
          uniform vec3 uGround;
          varying vec3 vPosition;
          void main() {
            float elevation = normalize(vPosition).y;
            vec3 sky = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.65, elevation), 0.6));
            sky = mix(sky, uGround, 1.0 - smoothstep(-0.45, 0.0, elevation));
            gl_FragColor = vec4(sky, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `} />
    </mesh>
  );
}

/** Deep space for the transit cabin: a sky baked once with vgpu (scripts/render-deep-space.mjs),
 *  shown here as a plain texture so every device sees it, WebGPU or not. */
function DeepSpaceSky() {
  const map = useTexture('/textures/deep-space.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
  });
  return (
    <mesh name="deep-space-sky" renderOrder={-10}>
      <sphereGeometry args={[240, 64, 32]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} toneMapped={false} fog={false} />
    </mesh>
  );
}

/** The gas world beyond the window: a static disc baked with vgpu (planet.png), lit from the left
 *  like the baked sky's star. */
function GasWorld() {
  const map = useTexture('/textures/planet.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
  });
  return (
    <mesh name="gas-world" position={[-24, 13, -110]} renderOrder={-5}>
      <planeGeometry args={[48, 48]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false} fog={false} />
    </mesh>
  );
}

/** Golden motes drifting past the window, each with its own slow sway and glow. */
function Motes({ time }: { time: React.RefObject<number> }) {
  const { geometry, material } = useMemo(() => {
    const rng = random(1207);
    const count = 420;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions.set([(rng() - 0.5) * 70, (rng() - 0.35) * 22, -10 - rng() * 70], i * 3);
      seeds[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: /* glsl */ `
        attribute float seed;
        uniform float uTime;
        varying float vGlow;
        void main() {
          vec3 p = position + vec3(sin(uTime * 0.11 + seed * 40.0) * 0.8, cos(uTime * 0.08 + seed * 25.0) * 0.5, 0.0);
          vec4 view = modelViewMatrix * vec4(p, 1.0);
          vGlow = 0.55 + 0.45 * sin(uTime * (0.6 + seed) + seed * 60.0);
          gl_PointSize = (2.0 + seed * 4.5) * (60.0 / -view.z);
          gl_Position = projectionMatrix * view;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vGlow;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float glow = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.68, 0.3) * (glow * glow + smoothstep(0.12, 0.0, d)), glow * 0.7 * vGlow);
        }
      `,
    });
    return { geometry, material };
  }, []);
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(() => { if (points.current) points.current.material.uniforms.uTime.value = time.current; });
  return <points ref={points} geometry={geometry} material={material} />;
}

function Starfield({ night }: { night: boolean }) {
  const geometry = useMemo(() => {
    const rng = random(601);
    const positions: number[] = [];
    for (let i = 0; i < 760; i++) {
      const theta = rng() * Math.PI * 2;
      const y = rng() * 1.45 - 0.45;
      const radius = Math.sqrt(1 - y * y);
      positions.push(Math.cos(theta) * radius * 180, y * 180, Math.sin(theta) * radius * 180);
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color={night ? '#b3bcb8' : '#e7e7d9'} size={0.13} sizeAttenuation transparent opacity={0.72} depthWrite={false} />
    </points>
  );
}

function EarthSurface({ night }: { night: boolean }) {
  const texture = useTexture('/textures/earth-blue-marble.png');
  const uniforms = useMemo(() => ({ uMap: { value: texture }, uNight: { value: night ? 0.8 : 1 } }), [texture, night]);
  return <shaderMaterial uniforms={uniforms}
    vertexShader={/* glsl */ `
      varying vec2 vUv;
      varying vec3 vPoint;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vPoint = normalize(position);
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `}
    fragmentShader={/* glsl */ `
      uniform sampler2D uMap;
      uniform float uNight;
      varying vec2 vUv;
      varying vec3 vPoint;
      varying vec3 vNormal;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float noise(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 map = pow(texture2D(uMap, vUv).rgb, vec3(2.2));
        float grey = dot(map, vec3(0.2126, 0.7152, 0.0722));
        // Land is anything not deep blue: it carries the city lights on the dark side.
        float land = smoothstep(0.02, 0.09, map.r + map.g * 0.6 - map.b * 0.9);
        map = mix(vec3(grey), map, 0.92);
        map = mix(vec3(0.03, 0.12, 0.28), map, 0.85);
        float clouds = noise(vPoint * 14.0) * 0.55 + noise(vPoint * 31.0) * 0.3 + noise(vPoint * 65.0) * 0.15;
        clouds = smoothstep(0.48, 0.72, clouds + sin(vPoint.y * 19.0 + vPoint.x * 5.0) * 0.065);
        map = mix(map, vec3(0.92, 0.95, 0.96), clouds * 0.9);
        vec3 sunDir = normalize(vec3(-0.9, 0.45, 0.55));
        float day = dot(vNormal, sunDir);
        float lit = smoothstep(-0.12, 0.35, day);
        vec3 colour = map * (0.04 + lit * 1.05);
        // A warm band where the sun is rising over the limb.
        colour += vec3(1.0, 0.45, 0.15) * exp(-pow(day * 6.0, 2.0)) * 0.35 * (1.0 - clouds * 0.5);
        // Cities, in clusters, only on land in the dark.
        float cities = step(0.72, noise(vPoint * 180.0)) * noise(vPoint * 40.0) * land * (1.0 - clouds);
        colour += vec3(1.0, 0.72, 0.36) * cities * (1.0 - lit) * 1.6;
        gl_FragColor = vec4(colour * uNight, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `} />;
}

function Planet({ earth, time, night }: { earth: boolean; time: React.RefObject<number>; night: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = (earth ? 2.4 : 0.8) + time.current * 0.006;
  });
  return (
    <group position={earth ? [-12, -12, -44] : [-22, 4.7, -65]} rotation={[0, 0, earth ? 0.27 : -0.1]}>
      {earth && <Atmosphere radius={20} />}
      <group ref={ref}>
        <mesh name={earth ? 'earth-blue-marble' : 'distant-mars'}>
          <sphereGeometry args={[earth ? 20 : 4.3, 96, 64]} />
          {earth ? (
            <Suspense fallback={<meshStandardMaterial color="#91a8b3" roughness={1} />}><EarthSurface night={night} /></Suspense>
          ) : (
            <shaderMaterial vertexShader={vertex} fragmentShader={/* glsl */ `
              varying vec3 vPosition;
              varying vec3 vNormal;
              void main() {
                vec3 p = normalize(vPosition);
                float markings = sin(p.x * 14.0 + sin(p.y * 11.0) * 3.0) * sin(p.z * 17.0 + p.y * 9.0);
                vec3 base = mix(vec3(0.42, 0.32, 0.24), vec3(0.7, 0.53, 0.38), markings * 0.35 + 0.5);
                float light = 0.22 + 0.78 * max(0.0, dot(vNormal, normalize(vec3(-1.0, 0.7, 1.0))));
                base = mix(base, vec3(0.77, 0.76, 0.66), smoothstep(0.87, 0.98, abs(p.y)));
                gl_FragColor = vec4(base * light, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
              }
            `} />
          )}
        </mesh>
      </group>
    </group>
  );
}

/** Earth's air seen edge-on: a thin blue limb glowing on the sunlit side, fading into space. */
function Atmosphere({ radius }: { radius: number }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, toneMapped: false, fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vNormal; varying vec3 vView;
      void main() {
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal; varying vec3 vView;
      void main() {
        float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
        float glow = pow(smoothstep(0.0, 1.0, rim), 5.0);
        float sunward = 0.35 + 0.65 * smoothstep(-0.4, 0.8, dot(normalize(vNormal), normalize(vec3(-0.9, 0.45, 0.55))));
        gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * glow * sunward * 1.6, glow);
      }
    `,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh scale={1.06} material={material}>
      <sphereGeometry args={[radius, 64, 40]} />
    </mesh>
  );
}

/** One merged mesh for all photovoltaic cells; no texture or network request. */
function SolarWing({ position, rotation = [0, 0, 0], scale = 1 }: { position: Vec3; rotation?: Vec3; scale?: number }) {
  const cells = useMemo(() => {
    const items: Block[] = [];
    for (let x = 0; x < 4; x++) for (let y = 0; y < 10; y++) {
      items.push({ at: [(x - 1.5) * 0.39, (y - 4.5) * 0.42, 0.025], size: [0.365, 0.39, 0.016] });
    }
    return items;
  }, []);
  const rails = useMemo<Block[]>(() => [
    { at: [-0.83, 0, 0], size: [0.045, 4.3, 0.05] },
    { at: [0.83, 0, 0], size: [0.045, 4.3, 0.05] },
    { at: [0, -2.13, 0], size: [1.7, 0.045, 0.05] },
    { at: [0, 2.13, 0], size: [1.7, 0.045, 0.05] },
    { at: [0, 0, -0.08], size: [0.08, 4.4, 0.16] },
  ], []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Blocks items={cells} color="#536f7a" metalness={0.48} roughness={0.42} />
      <Blocks items={rails} color="#b8bdb2" metalness={0.5} roughness={0.5} />
    </group>
  );
}

function OrbitalStructure({ transit, time }: { transit: boolean; time: React.RefObject<number> }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame(() => {
    if (rotor.current) rotor.current.rotation.z = -0.28 + time.current * (transit ? 0.018 : 0.002);
  });
  return (
    <group position={transit ? [1.5, 2.2, -27] : [3, 2.1, -24]} rotation={[0.15, -0.32, 0.12]} scale={transit ? 1 : 1.3}>
      <Beam from={[-6, 0, 0]} to={[6, 0, 0]} width={0.18} color="#b5bcb7" />
      {/* A neon tube along the truss: white-hot core in a teal additive sheath, lights chasing it. */}
      <mesh position={[0, 0.13, 0]} material={NEON_CORE}><boxGeometry args={[12, 0.035, 0.035]} /></mesh>
      <mesh position={[0, 0.13, 0]} material={NEON_SHEATH}><boxGeometry args={[12.1, 0.11, 0.11]} /></mesh>
      <Glows glows={NAV_LIGHTS} time={time} />
      <Glows glows={TRUSS_CHASE} time={time} />
      <Glows glows={HUB_WINDOWS} time={time} />
      {[-4, -2, 0, 2, 4].map((x) => (
        <Beam key={x} from={[x, -0.25, 0]} to={[x + 1.6, 0.25, 0]} width={0.045} color="#a3ada7" />
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.65, 0.65, transit ? 3.4 : 2.1, 24]} />
        <meshStandardMaterial color="#d5d6c9" metalness={0.23} roughness={0.7} />
      </mesh>
      <group ref={rotor}>
        {[-4.7, -2.6, 2.6, 4.7].map((x) => <SolarWing key={x} position={[x, 0, 0]} rotation={[0, 0.2, 0]} scale={1.2} />)}
        {transit && (
          <>
            <mesh rotation={[0, 0, 0]}>
              <torusGeometry args={[2.1, 0.085, 8, 64]} />
              <meshStandardMaterial color="#d4d1bc" metalness={0.4} roughness={0.55} />
            </mesh>
            {/* The ring's neon, glowing all the way round. */}
            <mesh material={NEON_CORE}><torusGeometry args={[2.1, 0.03, 6, 96]} /></mesh>
            <mesh material={NEON_SHEATH}><torusGeometry args={[2.1, 0.1, 6, 96]} /></mesh>
            <Glows glows={RING_GLOW} time={time} />
            <Glows glows={RING_BEACONS} time={time} />
          </>
        )}
      </group>
    </group>
  );
}

function terrainHeight(x: number, z: number) {
  const dunes = Math.sin(x * 0.055 + z * 0.08) * 1.4 + Math.sin(x * 0.15 - z * 0.03) * 0.7;
  const texture = Math.sin(x * 0.7 + Math.sin(z * 0.17)) * Math.sin(z * 0.51) * 0.12;
  const ridge = Math.exp(-Math.pow((z + 145) / 22, 2)) * (5 + 3 * Math.sin(x * 0.033) + 2 * Math.sin(x * 0.12));
  return -2.9 + dunes + texture + ridge;
}

function Terrain({ night }: { night: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(290, 250, 150, 132);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -135);
    const positions = g.getAttribute('position');
    const colors: number[] = [];
    // Rust-red regolith and darker basalt; at dusk the far plain sinks into the blue haze.
    const sand = new THREE.Color('#b8653f').multiplyScalar(night ? 0.5 : 1);
    const stone = new THREE.Color('#6a3524').multiplyScalar(night ? 0.5 : 1);
    const haze = new THREE.Color(night ? '#33507a' : '#d9a982').multiplyScalar(0.9);
    const color = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = terrainHeight(x, z);
      positions.setY(i, h);
      color.copy(sand).lerp(stone, Math.min(0.75, Math.max(0, (h + 2) / 17)));
      color.lerp(haze, THREE.MathUtils.smoothstep(-z, 60, 230) * 0.78);
      colors.push(color.r, color.g, color.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [night]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <shaderMaterial vertexColors vertexShader={/* glsl */ `
        varying vec3 vPoint;
        varying vec3 vNormal;
        varying vec3 vColor;
        varying float vDistance;
        void main() {
          vPoint = position;
          vNormal = normal;
          vColor = color;
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          vDistance = -view.z;
          gl_Position = projectionMatrix * view;
        }
      `} fragmentShader={/* glsl */ `
        varying vec3 vPoint;
        varying vec3 vNormal;
        varying vec3 vColor;
        varying float vDistance;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
        }
        void main() {
          vec2 p = vPoint.xz;
          float detail = noise(p * 0.45) * 0.5 + noise(p * 2.0) * 0.3 + noise(p * 9.0) * 0.2;
          float ripples = sin(p.x * 8.0 + p.y * 5.0 + detail * 5.0) * 0.018;
          // The low sun ahead lights the faces turned to it and leaves long shade behind the dunes.
          float sunlight = 0.55 + 0.6 * max(0.0, dot(normalize(vNormal), normalize(vec3(-0.42, 0.35, -1.0))));
          vec3 sand = vColor * (0.83 + detail * 0.27 + ripples) * sunlight;
          float haze = smoothstep(45.0, 220.0, vDistance) * 0.25;
          sand = mix(sand, vColor * 1.12, haze);
          gl_FragColor = vec4(sand, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `} />
    </mesh>
  );
}

function Rocks({ moving, time, night }: { moving: boolean; time: React.RefObject<number>; night: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rocks = useMemo(() => {
    const rng = random(1776);
    return Array.from({ length: 160 }, () => ({ x: (rng() - 0.5) * 130, z: rng() * 120, scale: 0.12 + rng() ** 3 * 1.8, angle: rng() * 6.28 }));
  }, []);
  useFrame(() => {
    if (!ref.current) return;
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      const z = -12 - ((rock.z - (moving ? time.current * 0.75 : 0) + 10000) % 120);
      dummy.position.set(rock.x, terrainHeight(rock.x, z) + rock.scale * 0.36, z);
      dummy.rotation.set(rock.angle, rock.angle * 2, 0.15);
      dummy.scale.set(rock.scale, rock.scale * 0.65, rock.scale * 0.85);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, rocks.length]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={night ? '#3a2a24' : '#7a4a36'} roughness={1} />
    </instancedMesh>
  );
}

function HabitatModule({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  const frames = useMemo<Block[]>(() => [
    { at: [-3.6, 1.4, 0], size: [0.3, 3, 4.1] },
    { at: [3.6, 1.4, 0], size: [0.3, 3, 4.1] },
    { at: [0, 0.15, 0], size: [7.5, 0.3, 4.1] },
    { at: [0, 2.8, 0], size: [7.5, 0.3, 4.1] },
    { at: [0, 1.45, 2.05], size: [0.15, 2.6, 0.12] },
  ], []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[7.4, 2.7, 3.9]} />
        <meshStandardMaterial color="#c7c6b4" roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh position={[0, 1.55, 2]}>
        <boxGeometry args={[6.9, 1.45, 0.04]} />
        <meshStandardMaterial color="#566969" metalness={0.35} roughness={0.3} />
      </mesh>
      <Blocks items={frames} color="#e1ddc8" metalness={0.25} />
      <ModuleLights />
      {[-2.7, 2.7].map((x) => <Beam key={x} from={[x, -0.8, 1]} to={[x, 0.4, 1]} width={0.25} color="#84897c" />)}
      <mesh position={[1.7, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.22, 16]} />
        <meshStandardMaterial color="#aaa995" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Outpost({ time }: { time: React.RefObject<number> }) {
  const dish = useRef<THREE.Group>(null);
  useFrame(() => {
    if (dish.current) dish.current.rotation.y = 0.3 + Math.sin(time.current * 0.045) * 0.09;
  });
  return (
    <group name="illustrative-mars-outpost">
      <HabitatModule position={[-12, terrainHeight(-12, -40) + 0.7, -40]} scale={1.65} />
      <HabitatModule position={[-27, terrainHeight(-27, -49) + 0.7, -49]} scale={1.25} />
      <Suspense fallback={null}><BaseEmblem position={[5.6, terrainHeight(5.6, -27) + 0.2, -27]} scale={1.15} /></Suspense>
      <LandingPad position={[20, terrainHeight(20, -44) + 0.1, -44]} />
      <mesh position={[-21, 0.7, -43]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.8, 0.8, 12, 16]} />
        <meshStandardMaterial color="#b1b09c" roughness={0.8} />
      </mesh>
      <group position={[1, terrainHeight(1, -37), -37]}>
        <Beam from={[0, 0, 0]} to={[0, 7, 0]} width={0.2} color="#c4c3ae" />
        <group ref={dish} position={[0, 7, 0]}>
          <mesh rotation={[0.65, 0.3, 0]}>
            <sphereGeometry args={[1.35, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36]} />
            <meshStandardMaterial color="#d7d3bc" side={THREE.DoubleSide} metalness={0.3} roughness={0.65} />
          </mesh>
        </group>
      </group>
      {[0, 1, 2, 3].map((i) => <SolarWing key={i} position={[-0.5 + i * 2.4, -0.5, -27 - i * 1.7]} rotation={[-0.75, 0.2, Math.PI / 2]} scale={0.85} />)}
    </group>
  );
}

export default function Exterior({ environment, night, time }: {
  environment: EnvironmentId; night: boolean; time: React.RefObject<number>;
}) {
  const surface = environment === 'rover' || environment === 'base';
  return (
    <group name={`${environment}-exterior`}>
      {surface ? (
        <>
          <MarsSky night={night} />
          <MarsMoons night={night} time={time} />
          <MarsMountains night={night} />
          <Terrain night={night} />
          <Rocks moving={environment === 'rover'} time={time} night={night} />
          <DustVeil time={time} night={night} />
          {environment === 'rover' && <TrackBeacons time={time} moving heightAt={terrainHeight} />}
          {environment === 'base' && <Outpost time={time} />}
        </>
      ) : (
        <>
          {/* Both space scenes share the baked deep sky; the station looks down on Earth. */}
          <Suspense fallback={<><Sky environment={environment} night={night} /><Starfield night={night} /></>}><DeepSpaceSky /></Suspense>
          {environment === 'transit' ? (
            <>
              <Suspense fallback={null}><GasWorld /></Suspense>
              <Motes time={time} />
            </>
          ) : (
            <Planet earth time={time} night={night} />
          )}
          <OrbitalStructure transit={environment === 'transit'} time={time} />
        </>
      )}
    </group>
  );
}
