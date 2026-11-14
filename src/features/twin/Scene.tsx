/**
 * The body twin: Open Anatomy 3D (CC BY 4.0) in a procedural cabin.
 * Ported from demo-vitruvio (Santiago) and merged with the v0.1 graphic
 * system: status tints like a highlighter, leader line, mission ring.
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Line, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';
import { flowGeometry, vesselArrays, VESSELS, type FlowArrays } from './bloodFlow';
import { useMission } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import { history, MISSION_DAY, systems, type SystemId } from '../../data/mission';
import { deviation, type Status } from '../../engine/status';
import Cabin from './Cabin';
import MissionRing from './MissionRing';
import MotionControl from './environments/MotionControl';
import { HabitatCameraLink, MedicalCameraLink } from './environments/CameraLink';
import SubjectLighting from './environments/SubjectLighting';
import { ViewLink } from './environments/ViewLink';
import InspectionCamera from './InspectionCamera';
import FocusControl from './FocusControl';
import { useHabitatMotion, useReducedMotion } from './environments/motion';
import { SCAN_SECONDS, SCAN_TOP, scanLine, useIntro } from './intro';
import { ScanBeam } from './ScanBeam';
import { focusPoint, inspectionViews, systemFor } from './inspection';
import { animateMaterials, gelStops, jellyUniforms, setScan, type Activity, localiseSelection, makeToonRamp, selectionOutline, updateBodyMotion, updateJellyZoom, updateToonRamp, type MaterialTransition } from './selectionMaterials';
import { day, night as nightPalette, type ScenePalette } from './palette';

const MODEL = '/models/anatomy-male.glb';
/** Meshes of the respiratory system whose normals need welding. */
const RESPIRATORY = /lung|bronch|trache|diaphragm|larynx/i;

/** Neurons fire faster and erratically with new confusion, and fade as responsiveness drops (ACVPU). */
const NEURAL_RATE: Record<string, number> = { alert: 1, newConfusion: 1.9, voice: 0.55, pain: 0.35, unresponsive: 0.08 };

/** Laplacian smoothing: each vertex moves halfway towards the average of its neighbours. */
function relax(geometry: THREE.BufferGeometry, rounds: number) {
  const index = geometry.getIndex()!;
  const pos = geometry.getAttribute('position');
  const near: Set<number>[] = Array.from({ length: pos.count }, () => new Set());
  for (let t = 0; t < index.count; t += 3) {
    const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    near[a].add(b).add(c); near[b].add(a).add(c); near[c].add(a).add(b);
  }
  const v = new THREE.Vector3(), sum = new THREE.Vector3();
  for (let round = 0; round < rounds; round++) {
    const next = Float32Array.from(pos.array as ArrayLike<number>);
    for (let i = 0; i < pos.count; i++) {
      sum.set(0, 0, 0);
      near[i].forEach((j) => sum.add(v.fromBufferAttribute(pos, j)));
      sum.divideScalar(near[i].size).lerp(v.fromBufferAttribute(pos, i), 0.5);
      next.set([sum.x, sum.y, sum.z], i * 3);
    }
    (pos.array as Float32Array).set(next);
  }
  pos.needsUpdate = true;
}

/** Registries shared by the anchors in the scene and the DOM pins over it. One twin per page. */
const anchorObjects = new Map<SystemId, THREE.Object3D>();
const pinElements = new Map<SystemId, HTMLButtonElement>();

function Body({ p, states }: { p: ScenePalette; states: Record<SystemId, Status> }) {
  const gltf = useGLTF(MODEL, false, true);
  const selected = useMission((s) => s.selected);
  const focus = useMission((s) => s.focus);
  const layer = useMission((s) => s.layer);
  const rotation = useMission((s) => s.rotation);
  const select = useMission((s) => s.select);
  const [hovered, setHovered] = useState<string | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  const getScene = useThree((s) => s.get);
  const reduced = useReducedMotion();
  const playing = useHabitatMotion((s) => s.playing);
  const pulse = useMission((s) => s.readings.pulse);
  const respiration = useMission((s) => s.readings.respiration);
  const consciousness = useMission((s) => s.readings.consciousness);
  const beating = playing && !reduced;
  const introDone = useIntro((s) => s.done);
  const finishIntro = useIntro((s) => s.finish);
  const scanRing = useRef<THREE.Group>(null);
  const scanStart = useRef<number | null>(null);
  const ramp = useMemo(() => makeToonRamp(), []);
  const jelly = useMemo(() => jellyUniforms(), []);
  const aim = useMemo(() => focusPoint(focus, rotation), [focus, rotation]);
  const transitions = useRef<MaterialTransition[]>([]);
  const tints = useRef(new Map<string, { material: THREE.MeshStandardMaterial; color: string }[]>());
  const previousOpacity = useRef(new Map<string, number>());
  useEffect(() => () => ramp.dispose(), [ramp]);
  useEffect(() => {
    if (!focus) return;
    let mounted = true;
    void import('../../gpu/toonRamp').then((module) => module.getToonRamp()).then((bands) => {
      if (!mounted) return;
      updateToonRamp(ramp, bands);
      invalidate();
    });
    return () => { mounted = false; };
  }, [focus, ramp, invalidate]);

  const { object, offset, scale, heartCentre, centres } = useMemo(() => {
    const object = gltf.scene.clone(true);
    // The respiratory meshes ship with split, quantised normals that facet into shards under the cel
    // bands; weld them and rebuild smooth normals once. Textures are never used, so UVs go too.
    object.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || !RESPIRATORY.test(node.name)) return;
      const source = node.geometry.clone();
      ['normal', 'uv', 'uv1', 'tangent'].forEach((name) => source.deleteAttribute(name));
      const smooth = mergeVertices(source, 1e-4);
      smooth.computeVertexNormals();
      source.dispose();
      node.geometry = smooth;
    });
    // The model's lungs are only bronchial trees. Each lung becomes an organ: a fine sphere cast out
    // from the tree's centre onto its convex hull, a little fuller and gently smoothed, so it keeps
    // the lung's outline with even triangles (the bare hull leaves long slivers). The trees are not
    // drawn, nor the flat ribbons the model ships for bronchi and as `larynx` (it runs from the neck
    // down into the chest, and was the source of the green shards inside the lungs).
    const trees: THREE.Mesh[] = [];
    object.traverse((node) => { if (node instanceof THREE.Mesh && /^lung_[lr]$/.test(node.name)) trees.push(node); });
    trees.forEach((tree) => {
      const pos = tree.geometry.getAttribute('position');
      const points = Array.from({ length: pos.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(pos, i));
      const centre = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
      points.forEach((point) => point.sub(centre));
      const faces = new ConvexHull().setFromPoints(points).faces;
      const shell = new THREE.IcosahedronGeometry(1, 4);
      shell.deleteAttribute('normal');
      shell.deleteAttribute('uv');
      const geometry = mergeVertices(shell, 1e-6);
      shell.dispose();
      const surface = geometry.getAttribute('position');
      const dir = new THREE.Vector3();
      for (let i = 0; i < surface.count; i++) {
        dir.fromBufferAttribute(surface, i).normalize();
        let reach = Infinity;
        for (const face of faces) {
          const facing = face.normal.dot(dir);
          if (facing > 1e-6) reach = Math.min(reach, face.constant / facing);
        }
        dir.multiplyScalar(reach * 1.06);
        surface.setXYZ(i, dir.x, dir.y, dir.z);
      }
      relax(geometry, 3);
      geometry.translate(centre.x, centre.y, centre.z);
      geometry.computeVertexNormals();
      const lobe = new THREE.Mesh(geometry, tree.material);
      lobe.name = `${tree.name}_lobe`;
      lobe.position.copy(tree.position);
      lobe.quaternion.copy(tree.quaternion);
      lobe.scale.copy(tree.scale);
      tree.parent?.add(lobe);
    });
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const heart = object.getObjectByName('heart');
    const heartCentre = new THREE.Vector3();
    if (heart instanceof THREE.Mesh) {
      heart.geometry.computeBoundingBox();
      heart.geometry.boundingBox?.getCenter(heartCentre);
    }
    // Each moving organ beats or breathes about its own centre, in mesh space.
    const centres = new Map<string, { centre: THREE.Vector3; radius: number }>();
    object.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || !/^(heart|lung_[lr]_lobe)$/.test(node.name)) return;
      node.geometry.computeBoundingBox();
      node.geometry.computeBoundingSphere();
      centres.set(node.name, { centre: node.geometry.boundingBox!.getCenter(new THREE.Vector3()), radius: node.geometry.boundingSphere!.radius });
    });
    return { object, offset: new THREE.Vector3(-c.x, -box.min.y, -c.z), scale: 1.8 / size.y, heartCentre, centres };
  }, [gltf.scene]);

  useEffect(() => {
    const materials: THREE.Material[] = [];
    const outlines: THREE.Mesh[] = [];
    const opacityCache = previousOpacity.current;
    transitions.current = [];
    tints.current.clear();
    object.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || node.userData.inspectionOutline) return;
      const name = node.name;
      const lineage = [name];
      for (let parent = node.parent; parent; parent = parent.parent) lineage.push(parent.name);
      const path = lineage.join('/').toLowerCase();
      const isSkin = /skin/.test(path);
      const isMuscle = /muscle/.test(path);
      const isBone = /skeleton/.test(path);
      const isVessel = /vessel/.test(path);
      const isNerve = /nerve/.test(path);
      const isJoint = /joint/.test(path);
      const sys = systemFor(name);
      const selectedInternal = Boolean(focus && (focus === 'bones' ? isBone : focus === 'sleep' ? sys === 'head' : sys === focus));
      node.visible =
        !isJoint && !isNerve && !/^(lung_[lr]|bronchi|larynx)$/.test(name) &&
        (layer === 'surface' ? isSkin || selectedInternal : layer === 'skeleton' ? isBone || /heart|lung/.test(name) : !isSkin);
      if (!node.visible) return;

      const state = states[sys];
      const isSelected = sys === selected && selected !== 'bones';
      const related = Boolean(focus && !isSkin && (focus === 'bones' ? isBone || isMuscle : focus === 'sleep' ? sys === 'head' : sys === focus));
      const obstructsHead = Boolean((focus === 'head' || focus === 'sleep') && /skull|mandible|teeth/.test(name));
      const focused = related && !obstructsHead;
      const revealChest =
        layer === 'anatomy' && (selected === 'heart' || selected === 'lungs') &&
        (/chest_muscles|intercostals|sternum/.test(name) || (selected === 'heart' && /lung/.test(name)));

      // Colour law: grey at rest, status tints like a highlighter, green marks a selected system that is well.
      const rest = isBone ? p.bone : isMuscle ? p.muscle : isVessel ? p.vessel : p.organ;
      let color = layer === 'surface' ? p.skin : rest;
      if (sys !== 'bones' && (state === 'watch' || state === 'alert') && (isSelected || !isMuscle)) {
        color = state === 'alert' ? p.alert : p.watch;
      } else if (isSelected && state === 'normal') {
        // Selected and well: the green of the all-clear aura. With no data it stays grey.
        color = p.select;
      }
      // Resting context around an inspected system is bright frosted glass; status tints still show.
      const ghost = Boolean(focus) && !focused && color === rest;
      if (ghost) color = p.ghost;

      const opacity = focus ? isSkin ? 0.12 : focused ? 0.78 : isMuscle ? 0.045 : 0.075 : revealChest ? 0.12 : isSkin ? 0.9 : isMuscle ? 0.26 : isBone ? 0.62 : 0.76;
      const options = {
        color, transparent: layer !== 'surface' || Boolean(focus),
        opacity: reduced ? opacity : opacityCache.get(name) ?? opacity,
        depthWrite: layer === 'surface' && !focus,
        side: focused ? THREE.FrontSide : THREE.DoubleSide, forceSinglePass: true,
      };
      const material = focused
        // Gelatine, not glass: a rough wet surface with a velvet sheen and only a faint coat.
        ? new THREE.MeshPhysicalMaterial({ ...options, roughness: 0.62, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.65, ior: 1.34, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.2), emissive: color, emissiveIntensity: 0.06 })
        : new THREE.MeshStandardMaterial({ ...options, roughness: isBone ? 0.4 : 0.48, metalness: 0.02, ...(ghost && { emissive: color, emissiveIntensity: 0.5 }) });
      if (focused || (!focus && layer !== 'surface')) {
        const stops = color === p.select ? p.gel.select : color === p.watch ? p.gel.watch : color === p.alert ? p.gel.alert : undefined;
        // The heart contracts about its own centre; vessels carry blood glints, out in arteries, back in veins.
        const activity: Activity = /brain|cerebr|cerebell/i.test(name) ? 'neural' : /_lobe$/.test(name) ? 'air' : isMuscle ? 'muscle'
          : sys === 'immune' && /liver|stomach|intestin|colon|kidney|spleen|pancreas|bladder/i.test(name) ? 'gut' : 'none';
        const motion = { ...centres.get(name), beat: name === 'heart', breath: /^lung_[lr]_lobe$/.test(name), activity };
        const flow = VESSELS.test(name) ? (/vein|vena/i.test(name) ? -1 : 1) : 0;
        localiseSelection(material, focused ? focus : null, ramp, jelly, gelStops(color, stops), { ...motion, flow });
      }
      if (focus && focused) {
        // Folded or wrapped organs (lungs, brain) show the hull's far side as a tangle, so they go without.
        if (sys !== 'lungs' && !/brain|cerebell/i.test(name)) outlines.push(selectionOutline(node, focus, color, jelly));
      }
      materials.push(material);
      tints.current.set(name, [...(tints.current.get(name) ?? []), { material, color }]);
      transitions.current.push({ material, opacity });
      node.material = material;
      node.castShadow = focus ? focused : !revealChest;
      // Alpha-composited tissue must not receive opaque shadows from ghost layers.
      node.receiveShadow = !focus;
    });
    const renderer = getScene().gl;
    renderer.shadowMap.needsUpdate = true;
    invalidate();
    return () => {
      object.traverse((node) => { if (node instanceof THREE.Mesh && !node.userData.inspectionOutline) opacityCache.set(node.name, (node.material as THREE.Material).opacity); });
      outlines.forEach((outline) => { outline.removeFromParent(); (outline.material as THREE.Material).dispose(); });
      materials.forEach((m) => m.dispose());
    };
  }, [object, selected, focus, layer, reduced, ramp, jelly, invalidate, getScene, p, states, centres]);

  // Each vessel learns, in a worker, how far along itself every point lies from the heart; the
  // blood follows the vessels once those coordinates arrive, without stalling the first screen.
  useEffect(() => {
    const heart = object.getObjectByName('heart');
    if (!heart) return;
    // Model space, before the twin's own scale and turn, so `scale` converts it to metres.
    object.updateMatrixWorld(true);
    const toModel = object.matrixWorld.clone().invert();
    const inModel = (node: THREE.Object3D) => toModel.clone().multiply(node.matrixWorld);
    const heartInModel = heartCentre.clone().applyMatrix4(inModel(heart));
    const vessels = new Map<string, THREE.Mesh>();
    object.traverse((node) => { if (node instanceof THREE.Mesh && VESSELS.test(node.name) && !node.userData.inspectionOutline) vessels.set(node.uuid, node); });
    const worker = new Worker(new URL('./bloodFlow.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<{ id: string; flow: FlowArrays }>) => {
      const mesh = vessels.get(data.id);
      if (!mesh) return;
      mesh.geometry = flowGeometry(data.flow);
      invalidate();
    };
    vessels.forEach((mesh, id) => {
      const vessel = vesselArrays(mesh);
      worker.postMessage({ id, vessel, matrix: inModel(mesh).toArray(), heart: heartInModel.toArray(), metres: scale }, [vessel.position.buffer, vessel.index.buffer]);
    });
    return () => worker.terminate();
  }, [object, heartCentre, scale, invalidate]);

  // The heart beats and the lungs breathe at the recorded rates and the blood keeps moving, at
  // 30 frames a second and only while motion plays: Pause motion and reduced motion hold it still.
  useEffect(() => {
    if (!beating) return;
    const id = window.setInterval(invalidate, 33);
    return () => window.clearInterval(id);
  }, [beating, invalidate]);

  // Hover only retints the hovered mesh: rebuilding every material here recompiled the shaders.
  useEffect(() => {
    const entries = hovered ? tints.current.get(hovered) : undefined;
    if (!entries) return;
    entries.forEach(({ material }) => material.color.set(p.hover));
    invalidate();
    return () => {
      entries.forEach(({ material, color }) => material.color.set(color));
      invalidate();
    };
  }, [hovered, p.hover, invalidate]);

  // Reduced motion skips the opening scan.
  useEffect(() => { if (reduced) finishIntro(); }, [reduced, finishIntro]);

  useFrame(({ camera }, delta) => {
    if (!introDone) {
      // The opening scan climbs from the deck to the crown, then hands over to the interface. It runs
      // on wall-clock time, so a slow device does not stretch it.
      scanStart.current ??= performance.now();
      const t = Math.min((performance.now() - scanStart.current) / 1000 / SCAN_SECONDS, 1);
      const height = -0.05 + t * t * (3 - 2 * t) * (SCAN_TOP + 0.05);
      setScan(jelly, t < 1 ? height : 100);
      scanLine.height = t < 1 ? height : Infinity;
      if (scanRing.current) scanRing.current.position.y = height;
      if (t < 1) invalidate();
      else finishIntro();
    }
    updateJellyZoom(jelly, camera, aim);
    if (animateMaterials(transitions.current, delta, reduced)) invalidate();
    updateBodyMotion(jelly, delta, typeof pulse === 'number' && pulse > 0 ? pulse : 72, typeof respiration === 'number' && respiration > 0 ? respiration : 14, beating, NEURAL_RATE[String(consciousness)] ?? 1);
  });

  useEffect(() => {
    const renderer = getScene().gl;
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  }, [rotation, getScene, invalidate]);

  return (
    <group rotation={[0, rotation, 0]}>
      <group scale={scale}>
        <primitive
          object={object}
          position={offset}
          onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); select(systemFor(e.object.name)); }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(e.object.name); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(null); document.body.style.cursor = 'auto'; }}
        />
      </group>
      <Anchors p={p} states={states} />
      {!introDone && <ScanBeam ref={scanRing} />}
    </group>
  );
}

/** Anchor points on the body, plus the selection ring and leader line. */
function Anchors({ p, states }: { p: ScenePalette; states: Record<SystemId, Status> }) {
  const selected = useMission((s) => s.selected);
  return (
    <>
      {systems.map((sys) => {
        const st = states[sys.id];
        const tint = st === 'watch' ? p.watch : st === 'alert' ? p.alert : p.ink;
        return (
          <group key={sys.id} position={sys.id === 'bones' || sys.id === 'sleep' ? sys.pin : [sys.id === 'lungs' ? -0.14 : inspectionViews[sys.id].center[0], inspectionViews[sys.id].center[1], 0.13]} ref={(o) => { if (o) anchorObjects.set(sys.id, o); else anchorObjects.delete(sys.id); }}>
            {selected === sys.id && (
              <>
                <Line points={[[0, 0, 0], [0.18, 0.055, 0.01], [0.26, 0.055, 0.01]]} color={tint} lineWidth={1} />
              </>
            )}
          </group>
        );
      })}
    </>
  );
}

/**
 * Projects each anchor to screen space on every rendered frame and moves the
 * DOM pin there. Pins live outside the canvas: real buttons, one React root.
 */
function PinProjector() {
  const v = useMemo(() => new THREE.Vector3(), []);
  const placed = useRef(systems.map(() => ({ x: 0, y: 0, visible: false })));
  useFrame(({ camera, size }) => {
    for (let index = 0; index < systems.length; index++) {
      const sys = systems[index];
      const a = anchorObjects.get(sys.id);
      const el = pinElements.get(sys.id);
      if (!a || !el) continue;
      a.getWorldPosition(v).project(camera);
      const hidden = v.z > 1 || v.z < -1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98;
      const point = placed.current[index];
      point.x = ((v.x + 1) / 2) * size.width;
      point.y = ((1 - v.y) / 2) * size.height;
      point.visible = !hidden;
      for (let prior = 0; prior < index; prior++) {
        const other = placed.current[prior];
        if (other.visible && Math.abs(point.x - other.x) < 27 && Math.abs(point.y - other.y) < 27) {
          point.y = other.y + 28 < size.height - 16 ? other.y + 28 : other.y - 28;
        }
      }
      el.style.visibility = hidden ? 'hidden' : 'visible';
      // During the opening scan a system's pin lights up as the line passes it.
      el.classList.toggle('is-scanned', a.getWorldPosition(v).y < scanLine.height);
      el.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
    }
  });
  return null;
}

function Pins({ states }: { states: Record<SystemId, Status> }) {
  const selected = useMission((s) => s.selected);
  const select = useMission((s) => s.select);
  return (
    <div className="pins">
      {systems.map((sys) => {
        const st = states[sys.id];
        return (
          <button
            key={sys.id}
            type="button"
            ref={(el) => { if (el) pinElements.set(sys.id, el); else pinElements.delete(sys.id); }}
            className={`body-pin is-${st} ${selected === sys.id ? 'is-active' : ''}`}
            onClick={() => select(sys.id)}
            aria-label={`${sys.name}, ${st === 'missing' ? 'no data' : st}`}
            aria-pressed={selected === sys.id}
          >
            {sys.code}
          </button>
        );
      })}
    </div>
  );
}

function Loading() {
  const active = useProgress((s) => s.active);
  const progress = useProgress((s) => s.progress);
  return active ? (
    <div className="scene-loading" role="status">
      <span className="micro">Loading anatomical model</span>
      <span className="scene-loading-bar"><i style={{ width: `${progress}%` }} /></span>
    </div>
  ) : null;
}

class SceneBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <Fallback /> : this.props.children; }
}

function Fallback() {
  return (
    <div className="scene-fallback">
      <svg viewBox="0 0 200 400" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="100" cy="43" r="25" />
          <path d="M85 67L80 83L57 92L40 165L25 230L40 235L72 158L72 220L80 265L76 365L95 365L100 267L105 365L124 365L120 265L128 220L128 158L160 235L175 230L160 165L143 92L120 83L115 67" />
        </g>
      </svg>
      <p><b>3D is not available on this device.</b> All six systems stay available in the systems list.</p>
    </div>
  );
}

/** Mission days where a cardiovascular reading left the usual range. */
function useFlaggedDays() {
  return useMemo(() => {
    const out: number[] = [];
    history.pulse.forEach((_, i) => {
      const d = MISSION_DAY - history.pulse.length + 1 + i;
      if (deviation('pulse', history.pulse[i]).status !== 'normal' || deviation('systolic', history.systolic[i]).status !== 'normal') out.push(d);
    });
    return out;
  }, []);
}

export default function Scene() {
  const isNight = useMission((s) => s.night);
  const { states } = useAssessment();
  const p = isNight ? nightPalette : day;
  const flagged = useFlaggedDays();
  const cameraLink = useMemo(() => new ViewLink(), []);
  return (
    <SceneBoundary>
      <div className="three-stage">
        <div className="habitat-background-layer" aria-hidden="true">
          <Canvas id="habitat-viewport" shadows dpr={[0.8, 1.15]} frameloop="demand"
            camera={{ position: [0.7, 1.2, 3.7], fov: 32, far: 500 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}>
            <color attach="background" args={[p.scene]} />
            <fog attach="fog" args={[p.scene, 16, 100]} />
            <HabitatCameraLink link={cameraLink} />
            <Cabin p={p} night={isNight} />
          </Canvas>
        </div>
        <div className="medical-layer">
        <Canvas
          id="medical-viewport"
          shadows
          dpr={[1, 1.6]}
          frameloop="demand"
          camera={{ position: [0.7, 1.2, 3.7], fov: 32 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => { gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; }}
          fallback={<Fallback />}
        >
          <SubjectLighting p={p} night={isNight} />
          <MissionRing p={p} flagged={flagged} />
          <Suspense fallback={null}>
            <Body p={p} states={states} />
          </Suspense>
          <InspectionCamera />
          <PinProjector />
          <MedicalCameraLink link={cameraLink} />
        </Canvas>
        </div>
        <Pins states={states} />
        <Loading />
        <MotionControl />
        <FocusControl />
      </div>
    </SceneBoundary>
  );
}

useGLTF.preload(MODEL, false, true);
