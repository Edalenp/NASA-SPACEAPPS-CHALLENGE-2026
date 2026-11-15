import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { relaxArms } from '../../features/twin/armPose';
import { stripBlobs } from '../../features/twin/meshRepair';
import { flowGeometry, vesselArrays, VESSELS, type FlowArrays } from '../../features/twin/bloodFlow';
import { HEAD_POSE_GLSL, jellyUniforms, localiseSelection, makeToonRamp, turnHead, updateBodyMotion, updateHeadTurn, updateJellyZoom, type GelStops, type JellyUniforms } from '../../features/twin/selectionMaterials';
import { systemFor } from '../../features/twin/inspection';
import type { SystemId } from '../../data/mission';
import { BUST_MODEL as MODEL } from './pointer';
import { FrameCap } from './FrameCap';
import { addLungLobes } from '../../features/twin/lungShell';
import { trackModelBytes } from '../../features/twin/intro';

/**
 * What moves the bust: its colours per body system, its rates, where it looks and how it is
 * framed. The hero drives it through the normal, watch and alert cycle; the features section
 * through its steps. Every method is called once per frame and writes in place.
 */
export interface BustDrive {
  tick(delta: number): void;
  rates(): { bpm: number; rpm: number };
  /** The hologram skin's tint, also the rim light's colour. */
  skin(out: THREE.Color): void;
  /** A system's gel stops; returns its opacity (0 to 1). */
  paint(system: SystemId, light: THREE.Color, deep: THREE.Color): number;
  /** Head turn and pitch, given where the head is on screen (normalised device coordinates). */
  gaze(head: THREE.Vector3): [number, number];
  /** Framing for this aspect, metres: the point the camera centres on and the height in view. */
  view(aspect: number, delta: number): { x: number; y: number; z?: number; span: number };
  /** Show the bronchial trees (the hero hides them; the features section points at them). */
  airways?: boolean;
  /** Organ centres in the model, once the rig is built: heart, lungs, brain, liver. */
  setup?(anchors: Record<string, [number, number, number]>): void;
  /** Where the body is on screen (0 to 1 from the bottom left), after the frame is set. */
  frame?(at: { head: THREE.Vector2; heart: THREE.Vector2; project: (x: number, y: number, z: number) => { x: number; y: number } }): void;
}

/** The skin as a hologram: only its silhouette glows, in the state's light tone, turning with the
 *  head exactly as the lab's tissue does (same axis, same neck). */
const skinVertex = /* glsl */ `
  ${HEAD_POSE_GLSL}
  varying vec3 vN; varying vec3 vView;
  void main() {
    vec4 at = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * normal);
    if (vtHeadTurn != 0.0 || vtHeadPitch != 0.0) {
      vec3 axis = vtHeadPivot();
      mat3 spin = vtHeadRotation(at.xyz);
      at.xyz = axis + spin * (at.xyz - axis);
      n = spin * n;
    }
    vN = n; vView = normalize(cameraPosition - at.xyz);
    gl_Position = projectionMatrix * viewMatrix * at;
  }
`;
const skinFragment = /* glsl */ `
  uniform vec3 uTint; uniform float uReveal;
  varying vec3 vN; varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vN), vView)), 2.6);
    vec3 col = mix(vec3(0.94, 0.95, 0.9), uTint, 0.5);
    gl_FragColor = vec4(col * rim, rim * 0.75 * uReveal);
  }
`;

interface SystemPaint { gel: GelStops; tissue: THREE.MeshStandardMaterial[] }

interface Rig {
  object: THREE.Object3D;
  systems: Map<SystemId, SystemPaint>;
  bones: THREE.MeshStandardMaterial[];
  skin: { uTint: { value: THREE.Color }; uReveal: { value: number } };
  heart: THREE.Vector3;
  axis: THREE.Vector3;
  neck: [number, number];
  metres: number;
  heartInModel: THREE.Vector3;
  anchors: Record<string, [number, number, number]>;
}

/** The lab's anatomy, set up once: relaxed arms, the liver shell gone, gel tissue that beats and
 *  carries blood glints, faint bones, the skin as a hologram, muscles hidden. */
function buildRig(scene: THREE.Object3D, jelly: JellyUniforms, ramp: THREE.Texture, airways: boolean): Rig {
  const object = scene.clone(true);
  relaxArms(object);
  object.traverse((node) => { if (node instanceof THREE.Mesh && node.name === 'veins_abdomen') { node.geometry = node.geometry.clone(); stripBlobs(node.geometry); } });
  // Where the airways show, each bronchial tree sits inside its lung's translucent outline.
  if (airways) addLungLobes(object);
  object.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  const systems = new Map<SystemId, SystemPaint>();
  const paintFor = (name: string) => {
    const id = systemFor(name);
    if (!systems.has(id)) systems.set(id, { gel: { light: new THREE.Color(), deep: new THREE.Color() }, tissue: [] });
    return systems.get(id)!;
  };
  const skin = { uTint: { value: new THREE.Color() }, uReveal: { value: 0 } };
  const bones: THREE.MeshStandardMaterial[] = [];
  let heart = new THREE.Vector3(0.02, 1.36, 0.03);
  let heartInModel = heart.clone();

  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const group = node.parent?.name ?? '';
    const name = node.name;
    node.frustumCulled = false;
    if (group === 'skin') {
      node.material = new THREE.ShaderMaterial({
        vertexShader: skinVertex, fragmentShader: skinFragment,
        uniforms: { vtHeadTurn: jelly.headTurn, vtHeadPitch: jelly.headPitch, vtHeadAxis: jelly.headAxis, vtNeck: jelly.neck, ...skin },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      return;
    }
    if (group === 'muscles' || (!airways && /^(lung_[lr]|bronchi)$/.test(name)) || name === 'larynx' || /joint|nerve/i.test(name)) { node.visible = false; return; }
    if (group === 'skeleton') {
      const material = new THREE.MeshStandardMaterial({ color: '#e9e7dc', roughness: 0.5, transparent: true, opacity: 0, depthWrite: false });
      turnHead(material, jelly);
      bones.push(material);
      node.material = material;
      return;
    }
    // Organs and vessels: the lab's gel, beating about the heart's own centre, glints in vessels.
    node.geometry.computeBoundingBox();
    node.geometry.computeBoundingSphere();
    const beat = name === 'heart';
    const breath = /^lung_[lr](_lobe)?$/.test(name);
    const motion = {
      ...((beat || breath) && { centre: node.geometry.boundingBox!.getCenter(new THREE.Vector3()), radius: node.geometry.boundingSphere!.radius }),
      beat, breath, shell: /_lobe$/.test(name),
      flow: VESSELS.test(name) ? (/vein|vena/i.test(name) ? -1 : 1) : 0,
    };
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.48, metalness: 0.02, transparent: true, opacity: 0, depthWrite: false });
    const paint = paintFor(name);
    localiseSelection(material, null, ramp, jelly, paint.gel, motion);
    paint.tissue.push(material);
    node.material = material;
    if (beat) {
      heart = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      heartInModel = node.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(node.matrixWorld);
    }
  });

  // Organ centres the features section frames and labels.
  const anchors: Record<string, [number, number, number]> = {};
  const centre = (name: string) => {
    const node = object.getObjectByName(name);
    return node ? new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).toArray() : undefined;
  };
  for (const name of ['heart', 'brain', 'liver', 'lung_l', 'lung_r']) {
    const at = centre(name);
    if (at) anchors[name] = at;
  }
  const skull = object.getObjectByName('skull');
  const jaw = object.getObjectByName('mandible');
  const skullBox = skull ? new THREE.Box3().setFromObject(skull) : new THREE.Box3(new THREE.Vector3(-0.1, 1.5, -0.1), new THREE.Vector3(0.1, 1.75, 0.1));
  const chin = (jaw ? new THREE.Box3().setFromObject(jaw) : skullBox).min.y;
  return {
    object, systems, bones, skin, heart, heartInModel, anchors,
    axis: skullBox.getCenter(new THREE.Vector3()),
    neck: [chin - size.y * 0.07, chin + size.y * 0.01],
    metres: 1.8 / size.y,
  };
}

const lift = new THREE.Vector3(0, 0.1, 0);
const headScreen = new THREE.Vector3();
const heartScreen = new THREE.Vector3();
const headOut = new THREE.Vector2();
const heartOut = new THREE.Vector2();
const projected = new THREE.Vector3();
const projectedOut = { x: 0, y: 0 };
const hsl = { h: 0, s: 0, l: 0 };

/** One frame: frame the bust, paint each system, beat at the drive's rates, turn the head. */
function stepBody(rig: Rig, jelly: JellyUniforms, camera: THREE.PerspectiveCamera, width: number, height: number, delta: number, reveal: { current: number }, reduced: boolean, drive: BustDrive) {
  drive.tick(delta);
  const { x, y, z = 0, span } = drive.view(width / height, delta);
  camera.fov = 24;
  camera.position.set(x, y, z + span / (2 * Math.tan((12 * Math.PI) / 180)));
  camera.lookAt(x, y, z);
  camera.updateProjectionMatrix();

  reveal.current = Math.min(1, reveal.current + delta / 1.4);
  const r = reveal.current;
  const { bpm, rpm } = drive.rates();
  updateBodyMotion(jelly, delta, bpm, rpm, !reduced, 1);
  updateJellyZoom(jelly, camera, rig.heart);

  // Each system's gel takes the drive's stops; the base colour is its light tone.
  drive.skin(rig.skin.uTint.value);
  rig.systems.forEach((paint, id) => {
    const opacity = drive.paint(id, paint.gel.light, paint.gel.deep);
    // The shadow band is the organ's own colour, deeper and darker, never black: stronger cel
    // steps than the lab so the form reads over the landing's grounds.
    paint.gel.light.getHSL(hsl);
    paint.gel.deep.setHSL(hsl.h, Math.min(1, hsl.s * 1.2), hsl.l * 0.32);
    paint.tissue.forEach((m) => { m.color.copy(paint.gel.light); m.opacity = 0.78 * opacity * r; });
  });
  rig.bones.forEach((m) => { m.opacity = 0.16 * r; });
  rig.skin.uReveal.value = r;

  // The head turns as the drive says, measured from where the head is on screen.
  headScreen.copy(rig.axis).project(camera);
  const [turn, pitch] = reduced ? [0, 0] : drive.gaze(headScreen);
  updateHeadTurn(jelly, delta, turn, rig.axis, rig.neck[0], rig.neck[1], pitch);

  if (!drive.frame) return;
  // Reading labels sit above the head; that offset must not move the gaze's neutral point.
  headScreen.copy(rig.axis).add(lift).project(camera);
  heartScreen.copy(rig.heart).project(camera);
  headOut.set((headScreen.x + 1) / 2, (headScreen.y + 1) / 2);
  heartOut.set((heartScreen.x + 1) / 2, (heartScreen.y + 1) / 2);
  drive.frame({
    head: headOut, heart: heartOut,
    project: (x, y, z) => {
      projected.set(x, y, z).project(camera);
      projectedOut.x = (projected.x + 1) / 2;
      projectedOut.y = (projected.y + 1) / 2;
      return projectedOut;
    },
  });
}

function Body({ reduced, drive, onReady }: { reduced: boolean; drive: BustDrive; onReady?: () => void }) {
  const gltf = useGLTF(MODEL, false, true, trackModelBytes);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const reveal = useRef(0);
  const ramp = useMemo(() => makeToonRamp(), []);
  const jelly = useMemo(() => { const uniforms = jellyUniforms(); uniforms.celDepth.value = 1; return uniforms; }, []);
  const airways = !!drive.airways;
  const rig = useMemo(() => buildRig(gltf.scene, jelly, ramp, airways), [gltf.scene, jelly, ramp, airways]);
  useEffect(() => drive.setup?.(rig.anchors), [drive, rig]);

  // The cel bands the lab computes with vgpu (or its fallback), so the gel reads the same here.
  useEffect(() => {
    let live = true;
    void import('../../gpu/toonRamp').then((module) => module.getToonRamp()).then((bands) => {
      if (!live) return;
      (ramp.image.data as Uint8Array).set(bands);
      ramp.needsUpdate = true;
    });
    return () => { live = false; };
  }, [ramp]);

  // Blood glints need each vessel's distance along itself from the heart: the lab's worker.
  useEffect(() => {
    const vessels = new Map<string, THREE.Mesh>();
    rig.object.traverse((node) => { if (node instanceof THREE.Mesh && node.visible && VESSELS.test(node.name)) vessels.set(node.uuid, node); });
    const worker = new Worker(new URL('../../features/twin/bloodFlow.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<{ id: string; flow: FlowArrays }>) => {
      const mesh = vessels.get(data.id);
      if (mesh) mesh.geometry = flowGeometry(data.flow);
    };
    vessels.forEach((mesh, id) => {
      const vessel = vesselArrays(mesh);
      worker.postMessage({ id, vessel, matrix: mesh.matrixWorld.toArray(), heart: rig.heartInModel.toArray(), metres: rig.metres }, [vessel.position.buffer, vessel.index.buffer]);
    });
    return () => worker.terminate();
  }, [rig]);

  const told = useRef(false);
  useFrame((_, delta) => {
    stepBody(rig, jelly, camera, size.width, size.height, Math.min(delta, 0.1), reveal, reduced, drive);
    // The first frame is drawn with every material compiled: the page may stop waiting for it.
    if (!told.current && onReady) { told.current = true; requestAnimationFrame(onReady); }
  });
  return <primitive object={rig.object} />;
}

/** A soft key from the front and a rim in the drive's skin colour. */
function Lights({ drive }: { drive: BustDrive }) {
  const rim = useRef<THREE.DirectionalLight>(null);
  useFrame(() => { if (rim.current) drive.skin(rim.current.color); });
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[1.2, 2.4, 3]} intensity={1.2} />
      <directionalLight ref={rim} position={[-2, 1.8, -1.5]} intensity={2.2} />
    </>
  );
}

export default function Bust({ running, reduced, drive, className = 'hero-bust-canvas', onReady }: { running: boolean; reduced: boolean; drive: BustDrive; className?: string; onReady?: () => void }) {
  return (
    <Canvas className={className} dpr={[1, 1.5]} frameloop="demand" camera={{ fov: 24, near: 0.02, far: 20 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <FrameCap running={running} />
      <Lights drive={drive} />
      <Body reduced={reduced} drive={drive} onReady={onReady} />
    </Canvas>
  );
}
