import { activeCrew } from '../../store/crew';
/**
 * The body twin: Open Anatomy 3D (CC BY 4.0) in a procedural cabin.
 * Ported from demo-vitruvio (Santiago) and merged with the v0.1 graphic
 * system: status tints like a highlighter, leader line, mission ring.
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { flowGeometry, vesselArrays, VESSELS, type FlowArrays } from './bloodFlow';
import { useMission } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import { systems, type SystemId } from '../../data/mission';
import { consciousnessActivity } from '../../data/indicators';
import type { Status } from '../../engine/status';
import Cabin from './Cabin';
import BodyFallback2D from './fallback/BodyFallback2D';
import { twinMode } from './fallback/webgl';
import MotionControl from './environments/MotionControl';
import { HabitatCameraLink, MedicalCameraLink } from './environments/CameraLink';
import SubjectLighting from './environments/SubjectLighting';
import AdaptiveResolution from './AdaptiveResolution';
import { stripBlobs } from './meshRepair';
import { prepareModelGeometry } from './modelGeometry';
import { addLungLobes } from './lungShell';
import { ViewLink } from './environments/ViewLink';
import InspectionCamera from './InspectionCamera';
import FocusControl from './FocusControl';
import { useHabitatMotion, useReducedMotion } from './environments/motion';
import { SCAN_SECONDS, SCAN_TOP, scanLine, trackModelBytes, useIntro } from './intro';
import { useTour } from '../tour/tourSteps';
import { MousePointer2 } from 'lucide-react';
import { ScanBeam } from './ScanBeam';
import { focusPoint, inspectionViews, pickHit, systemFor } from './inspection';
import { animateMaterials, easeLens, placeLens, gelStops, jellyUniforms, setScan, type Activity, localiseSelection, turnHead, updateHeadTurn, makeToonRamp, selectionOutline, updateBodyMotion, updateJellyZoom, updateToonRamp, type MaterialTransition } from './selectionMaterials';
import { day, night as nightPalette, type ScenePalette } from './palette';

const MODEL = '/models/anatomy-male.glb';
const modelUrl = () => activeCrew().anatomy === 'female' ? '/models/anatomy-female.glb' : MODEL;
const modelUrls = () => activeCrew().anatomy === 'female'
  ? [modelUrl(), '/models/female-muscles-fit.glb'] : [MODEL];

/** The mesh a pointer means: what the translucent body shows through, not just the nearest skin of muscle. */
function bodyTarget(e: ThreeEvent<PointerEvent | MouseEvent>) {
  const hits = e.intersections.map(({ object }) => {
    let visible = object.visible;
    for (let parent = object.parent; parent && visible; parent = parent.parent) visible = parent.visible;
    return { name: object.name, group: object.parent?.name ?? '', visible };
  });
  return pickHit(hits)?.name;
}
/** The body's sharpest render resolution, lowered on slow GPUs by AdaptiveResolution. */
const BODY_MAX_DPR = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 1.6);

/** Neurons fire faster and erratically with new confusion, and fade as responsiveness drops (ACVPU). */

/** Registries shared by the anchors in the scene and the DOM pins over it. One twin per page. */
const anchorObjects = new Map<SystemId, THREE.Object3D>();
const pinElements = new Map<SystemId, HTMLButtonElement>();
/** Each pin's leader: the line from its label to the body, and the dot where it lands. */
const leaderElements = new Map<SystemId, { line: SVGPolylineElement; dot: SVGCircleElement }>();
/** The body and its bounds in its own space, so the pins can stand clear of its outline. */
const bodyFrame = { object: null as THREE.Object3D | null, box: new THREE.Box3() };
/** The X-ray lens's radius on screen, in CSS pixels. */
const LENS_RADIUS = 92;
/** How long the X-ray hint stays over Truvi. */
const HINT_SECONDS = 7;
/** The hint shows once per page load. */
let hintShown = false;

function Body({ p, states }: { p: ScenePalette; states: Record<SystemId, Status> }) {
  const [gltf, muscleFit] = useGLTF(modelUrls(), false, true, trackModelBytes);
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
  const stance = useRef<THREE.Group>(null);
  const look = useRef<THREE.Group>(null);
  const glance = useRef({ from: 0, to: 0, start: 0, next: 1.5 });
  const neckPoint = useMemo(() => new THREE.Vector3(), []);
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

  const { object, bounds, offset, scale, heartCentre, centres, head } = useMemo(() => {
    const object = prepareModelGeometry(gltf.scene, activeCrew().anatomy, muscleFit?.scene);
    // `veins_abdomen` ships a liver-shaped shell among its veins; circulation should light the
    // vessels around the liver, not the organ itself.
    object.traverse((node) => { if (node instanceof THREE.Mesh && node.name === 'veins_abdomen') { node.geometry = node.geometry.clone(); stripBlobs(node.geometry); } });
    // Each lung's bronchial tree gets a lobe drawn as a translucent shell, so the tree reads inside
    // its outline. The model's flat ribbons for bronchi and `larynx` stay hidden (it runs from the
    // neck into the chest, and was the source of green shards inside the lungs).
    // The female model's lungs are whole organs (HuBMAP), not bronchial trees: they keep their form.
    const treeLungs = activeCrew().anatomy === 'male';
    if (treeLungs) addLungLobes(object);
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
      if (!(node instanceof THREE.Mesh) || !/^(heart|lung_[lr](_lobe)?)$/.test(node.name)) return;
      node.geometry.computeBoundingBox();
      node.geometry.computeBoundingSphere();
      centres.set(node.name, { centre: node.geometry.boundingBox!.getCenter(new THREE.Vector3()), radius: node.geometry.boundingSphere!.radius });
    });
    // The head turns about a vertical axis through the skull; the neck twists from the collarbones
    // up to the jaw's lower edge.
    object.updateMatrixWorld(true);
    const skull = object.getObjectByName('skull');
    const jaw = object.getObjectByName('mandible');
    const skullBox = skull ? new THREE.Box3().setFromObject(skull) : box;
    const head = {
      axis: skullBox.getCenter(new THREE.Vector3()),
      chin: (jaw ? new THREE.Box3().setFromObject(jaw) : skullBox).min.y,
      reach: size.y,
    };
    return { object, bounds: box.clone(), offset: new THREE.Vector3(-c.x, -box.min.y, -c.z), scale: 1.8 / size.y, heartCentre, centres, head };
  }, [gltf.scene, muscleFit?.scene]);

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
        !isJoint && !isNerve && !/^(bronchi|larynx)$/.test(name) &&
        (layer === 'surface' ? isSkin || selectedInternal : layer === 'skeleton' ? isBone || /heart|lung/.test(name) : !isSkin);
      if (!node.visible) return;

      const state = states[sys];
      // Bones & muscles shows on the muscles (and on the bones in the skeleton view, where the
      // muscles are hidden); the skin and other unclassified meshes never carry its status.
      const locomotor = sys === 'bones' && (isMuscle || (isBone && layer === 'skeleton'));
      const isSelected = sys === selected && (selected !== 'bones' || locomotor);
      const related = Boolean(focus && !isSkin && (focus === 'bones' ? isBone || isMuscle : focus === 'sleep' ? sys === 'head' : sys === focus));
      const obstructsHead = Boolean((focus === 'head' || focus === 'sleep') && /skull|mandible|teeth/.test(name));
      const focused = related && !obstructsHead;
      const revealChest =
        layer === 'anatomy' && (selected === 'heart' || selected === 'lungs') &&
        (/chest_muscles|intercostals|sternum/.test(name) || (selected === 'heart' && /lung/.test(name)));

      // Colour law: grey at rest, status tints like a highlighter, green marks a selected system that is well.
      const rest = isBone ? p.bone : isMuscle ? p.muscle : isVessel ? p.vessel : p.organ;
      let color = layer === 'surface' ? p.skin : rest;
      const strained = locomotor && (state === 'watch' || state === 'alert');
      if (strained || (sys !== 'bones' && (state === 'watch' || state === 'alert') && (isSelected || !isMuscle))) {
        color = state === 'alert' ? p.alert : p.watch;
      } else if (isSelected && state === 'normal') {
        // Selected and well: the green of the all-clear aura. With no data it stays grey.
        color = p.select;
      }
      // Resting context around an inspected system is bright frosted glass; status tints still show.
      const ghost = Boolean(focus) && !focused && color === rest;
      if (ghost) color = p.ghost;

      // The bronchial tree is the quieter layer inside its lung's outline, so the lung reads first.
      const airway = activeCrew().anatomy === 'male' && /^lung_[lr]$/.test(name) ? 0.5 : 1;
      const opacity = airway * (focus ? isSkin ? 0.12 : focused ? 0.78 : isMuscle ? 0.045 : 0.075 : revealChest ? 0.12 : isSkin ? 0.9 : isMuscle ? (strained ? 0.4 : 0.26) : isBone ? 0.62 : 0.76);
      const options = {
        color, transparent: layer !== 'surface' || Boolean(focus),
        opacity: reduced ? opacity : opacityCache.get(name) ?? opacity,
        // The fitted female surfaces have overlapping folds. Without a depth buffer,
        // their rear triangles show through the front as a field of broken shards.
        // Keep surrounding ghost tissues transparent when an organ is inspected.
        // Only the female organs (other sources, with real folds) write depth: her bones and skin
        // stay translucent gel like the male's, instead of opaque white facets.
        depthWrite: (layer === 'surface' && !focus) ||
          (activeCrew().anatomy === 'female' && !isVessel && !isMuscle && !isBone && !isSkin && (!focus || focused)),
        // Front faces only: drawing the far side of every translucent layer too doubled the GPU
        // time of the body for a difference that cannot be seen.
        side: THREE.FrontSide, forceSinglePass: true,
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
        const motion = { ...centres.get(name), beat: name === 'heart', breath: /^lung_[lr](_lobe)?$/.test(name), shell: /_lobe$/.test(name), xray: isMuscle ? 'muscle' as const : isBone ? 'bone' as const : 'organ' as const, activity };
        const flow = VESSELS.test(name) ? (/vein|vena/i.test(name) ? -1 : 1) : 0;
        localiseSelection(material, focused ? focus : null, ramp, jelly, gelStops(color, stops), { ...motion, flow });
      } else {
        turnHead(material, jelly);
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
      // The body casts its shadow on the deck but takes none itself: on translucent tissue a
      // shadow cannot be seen, and sampling it cost every pixel of every layer.
      node.receiveShadow = false;
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

  useEffect(() => {
    bodyFrame.object = object;
    bodyFrame.box.copy(bounds);
    return () => { if (bodyFrame.object === object) bodyFrame.object = null; };
  }, [object, bounds]);

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

  // The X-ray lens follows the pointer over the body (never a touch, never while dragging), in the
  // canvas's own drawing-buffer pixels; the DOM ring around it reads the same position.
  const gl = useThree((s) => s.gl);
  const lensTarget = useRef(0);
  useEffect(() => {
    const canvas = gl.domElement;
    const layer = canvas.closest<HTMLElement>('.medical-layer');
    const hide = () => { lensTarget.current = 0; layer?.classList.remove('is-xray', 'is-xray-near'); invalidate(); };
    // The square follows the pointer everywhere over the stage, small; over the body it opens to
    // its full size and the X-ray switches on. Listened on the window, so panels and labels over the
    // canvas do not lose it.
    const move = (event: PointerEvent) => {
      // A selected system already has its own bold view: the X-ray stands down.
      if (event.pointerType === 'touch' || !useIntro.getState().done || useMission.getState().focus) { hide(); return; }
      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left, y = event.clientY - box.top;
      if (x < 0 || y < 0 || x > box.width || y > box.height) { hide(); return; }
      layer?.style.setProperty('--lens-x', `${x.toFixed(0)}px`);
      layer?.style.setProperty('--lens-y', `${y.toFixed(0)}px`);
      // The projector writes the body's place on screen (centre and height, px).
      const read = (name: string) => parseFloat(layer?.style.getPropertyValue(name) ?? '') || 0;
      const bodyX = read('--body-x'), bodyY = read('--body-y'), bodyH = read('--body-h');
      const onBody = bodyH > 0 && Math.abs(x - bodyX) <= bodyH * 0.28 && Math.abs(y - bodyY) <= bodyH * 0.55;
      if (!onBody || event.buttons) {
        lensTarget.current = 0; layer?.classList.remove('is-xray'); layer?.classList.add('is-xray-near'); invalidate(); return;
      }
      const scale = canvas.width / Math.max(box.width, 1);
      placeLens(jelly, x * scale, (box.height - y) * scale, LENS_RADIUS * scale);
      layer?.classList.remove('is-xray-near');
      layer?.classList.add('is-xray');
      lensTarget.current = 1;
      invalidate();
    };
    // Selecting a system hides the lens at once, without waiting for the pointer to move.
    const unsubscribe = useMission.subscribe((state, previous) => { if (state.focus && !previous.focus) hide(); });
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', hide);
    return () => { unsubscribe(); window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', hide); };
  }, [gl, jelly, invalidate]);

  useFrame(({ camera }, delta) => {
    // A frame of the body has been drawn with its materials compiled: the loader may step aside.
    if (!useIntro.getState().ready) useIntro.setState({ ready: true });
    if (!introDone) {
      // The opening scan climbs from the deck to the crown, then hands over to the interface. It runs
      // on wall-clock time, so a slow device does not stretch it, and waits for the loader to leave.
      if (!useIntro.getState().revealed) { setScan(jelly, -0.05); invalidate(); return; }
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
    // The lens eases in and out rather than snapping.
    if (easeLens(jelly, lensTarget.current, delta, reduced)) invalidate();
    if (animateMaterials(transitions.current, delta, reduced)) invalidate();
    updateBodyMotion(jelly, delta, typeof pulse === 'number' && pulse > 0 ? pulse : 72, typeof respiration === 'number' && respiration > 0 ? respiration : 14, beating, consciousnessActivity[String(consciousness)] ?? 1);
    // Standing idle (the model has no rig, so no clip can drive it): a sway made of two slow,
    // unrelated rhythms plus a weight shift that drifts over ten seconds or so, so it never settles
    // into a metronome. Breathing stays local to the lungs; the feet stay on the deck.
    if (stance.current) {
      const t = jelly.time.value;
      const drift = Math.sin(t * 0.11 + 0.7) * 0.6 + Math.sin(t * 0.047) * 0.4;
      stance.current.rotation.z = beating ? (Math.sin(t * 0.55) * 0.6 + Math.sin(t * 0.23 + 2.1) * 0.4) * 0.006 + drift * 0.003 : 0;
      stance.current.rotation.x = beating ? (Math.sin(t * 0.37 + 1.3) * 0.7 + Math.sin(t * 0.19) * 0.3) * 0.004 : 0;
      stance.current.position.x = beating ? Math.sin(t * 0.55) * 0.003 + drift * 0.004 : 0;
      stance.current.position.y = 0;
    }
    // Glances, like someone waiting to be examined: after a pause of 2.5 to 7 seconds the head turns
    // to another spot, usually back towards the front and now and then further aside, then holds.
    // Off while inspecting, so the inspected organ stays where the camera aims.
    if (look.current && stance.current) {
      const g = glance.current;
      const now = jelly.time.value;
      if (now >= g.next) {
        g.from = g.to;
        g.to = Math.random() < 0.45 ? (Math.random() - 0.5) * 0.3 : (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6);
        g.start = now;
        g.next = now + 2.5 + Math.random() * 4.5;
      }
      const ease = THREE.MathUtils.smoothstep(Math.min((now - g.start) / 0.7, 1), 0, 1);
      const target = beating && !focus ? THREE.MathUtils.lerp(g.from, g.to, ease) : 0;
      look.current.rotation.y = THREE.MathUtils.damp(look.current.rotation.y, target * 0.04, 1.5, delta);
      const low = stance.current.localToWorld(neckPoint.set(0, head.chin - head.reach * 0.07, 0).add(offset)).y;
      const high = stance.current.localToWorld(neckPoint.set(0, head.chin + head.reach * 0.01, 0).add(offset)).y;
      const axis = stance.current.localToWorld(neckPoint.copy(head.axis).add(offset));
      updateHeadTurn(jelly, delta, target * 0.4, axis, low, high);
    }
  });

  useEffect(() => {
    const renderer = getScene().gl;
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  }, [rotation, getScene, invalidate]);

  return (
    <group rotation={[0, rotation, 0]}>
      <group ref={look}>
      <group ref={stance} name="body-stance" scale={scale}>
        <primitive
          object={object}
          position={offset}
          onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); const target = bodyTarget(e); if (target) select(systemFor(target)); }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(bodyTarget(e) ?? null); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(null); document.body.style.cursor = 'auto'; }}
        />
      </group>
      <Anchors />
      </group>
      {!introDone && <ScanBeam ref={scanRing} />}
    </group>
  );
}

/** Where each system's leader lands on the body: the centre of its inspection view, on the front
 *  of the body; the lungs on the right lung, bones and muscles on the thigh, and sleep and mood
 *  on the left temple, beside the head's own. */
function anchorFor(id: SystemId): [number, number, number] {
  if (id === 'bones') return systems.find((s) => s.id === 'bones')!.pin;
  const [x, y] = inspectionViews[id === 'sleep' ? 'head' : id].center;
  if (id === 'sleep') return [x - 0.065, y + 0.03, 0.07];
  return [id === 'lungs' ? -0.14 : x, y, 0.13];
}

/** Anchor points on the body: where each system's pin sits. */
function Anchors() {
  return (
    <>
      {systems.map((sys) => (
        <group key={sys.id} position={anchorFor(sys.id)} ref={(o) => { if (o) anchorObjects.set(sys.id, o); else anchorObjects.delete(sys.id); }} />
      ))}
    </>
  );
}

/** Which side of the body each pin's label takes when its organ sits near the middle, so the
 *  six labels split three and three. */
const PREFERRED_SIDE: Record<SystemId, -1 | 1> = { lungs: -1, immune: -1, sleep: -1, head: 1, heart: 1, bones: 1 };
const LABEL_GAP = 34;
const LABEL_HEIGHT = 28;

/**
 * Places the pins as callouts. Each frame it projects the anchors and the body's bounds to the
 * screen, stands every label in a column just clear of the body's outline (left or right, by
 * where its organ lies), keeps the labels from overlapping or covering the side panels, and draws
 * a leader from each label to its organ. The DOM is written directly; nothing re-renders.
 */
/**
 * Where the body stands on screen, for the atmosphere layer behind it (a DOM layer between the
 * habitat and the body, so its glow, veil and mist cost the GPU nothing): the centre of its bounds,
 * its feet and its height in pixels, as CSS variables on the medical layer. Written only when they
 * change, which is only when the camera moves.
 */
function AtmosphereProjector() {
  const corner = useMemo(() => new THREE.Vector3(), []);
  const last = useRef('');
  useFrame(({ camera, size, gl }) => {
    const body = bodyFrame.object;
    const layer = gl.domElement.closest<HTMLElement>('.medical-layer');
    if (!body || !layer) return;
    const { min, max } = bodyFrame.box;
    let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).applyMatrix4(body.matrixWorld).project(camera);
      const x = ((corner.x + 1) / 2) * size.width, y = ((1 - corner.y) / 2) * size.height;
      top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
    }
    const key = `${Math.round(left + right)}|${Math.round(top)}|${Math.round(bottom)}`;
    if (key === last.current) return;
    last.current = key;
    layer.style.setProperty('--body-x', `${((left + right) / 2).toFixed(0)}px`);
    layer.style.setProperty('--body-y', `${((top + bottom) / 2).toFixed(0)}px`);
    layer.style.setProperty('--body-foot', `${bottom.toFixed(0)}px`);
    layer.style.setProperty('--body-h', `${Math.max(1, bottom - top).toFixed(0)}px`);
  });
  return null;
}

function PinProjector() {
  const v = useMemo(() => new THREE.Vector3(), []);
  const corner = useMemo(() => new THREE.Vector3(), []);
  const widths = useRef(new Map<SystemId, number>());
  useFrame(({ camera, size, gl }) => {
    const body = bodyFrame.object;
    if (!body) return;
    // The body's outline on screen, from the eight corners of its bounds.
    let left = Infinity, right = -Infinity;
    const { min, max } = bodyFrame.box;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).applyMatrix4(body.matrixWorld).project(camera);
      const x = ((corner.x + 1) / 2) * size.width;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
    const centre = (left + right) / 2;
    // Free room between the side panels (none while the panels are hidden).
    const stage = gl.domElement.getBoundingClientRect();
    const wide = gl.domElement.closest('.shell')?.classList.contains('is-wide');
    const leftPanel = wide ? null : document.querySelector('.stage-left')?.getBoundingClientRect();
    const rightPanel = wide ? null : document.querySelector('.stage-right')?.getBoundingClientRect();
    const minX = (leftPanel ? leftPanel.right - stage.left : 0) + 16;
    const maxX = (rightPanel ? rightPanel.left - stage.left : size.width) - 16;
    const top = 20;
    const bottom = size.height - 76;

    const columns: Record<-1 | 1, { id: SystemId; ax: number; ay: number; y: number }[]> = { [-1]: [], [1]: [] };
    for (const sys of systems) {
      const anchor = anchorObjects.get(sys.id);
      const el = pinElements.get(sys.id);
      const leader = leaderElements.get(sys.id);
      if (!anchor || !el || !leader) continue;
      anchor.getWorldPosition(v);
      const scanned = v.y < scanLine.height;
      v.project(camera);
      const visible = v.z < 1 && v.z > -1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      el.style.visibility = visible ? 'visible' : 'hidden';
      leader.line.style.visibility = leader.dot.style.visibility = visible ? 'visible' : 'hidden';
      // During the opening scan a system's pin lights up as the line passes it.
      el.classList.toggle('is-scanned', scanned);
      leader.line.classList.toggle('is-scanned', scanned);
      leader.dot.classList.toggle('is-scanned', scanned);
      if (!visible) continue;
      const ax = ((v.x + 1) / 2) * size.width;
      const ay = ((1 - v.y) / 2) * size.height;
      const half = Math.max((right - left) / 2, 1);
      const side = Math.abs(ax - centre) < half * 0.25 ? PREFERRED_SIDE[sys.id] : ax < centre ? -1 : 1;
      columns[side].push({ id: sys.id, ax, ay, y: ay });
    }

    for (const side of [-1, 1] as const) {
      const column = columns[side].sort((a, b) => a.ay - b.ay);
      // Down the column, each label at least one gap below the one above; then back up from the
      // bottom if the last ones ran off.
      column.forEach((pin, i) => { pin.y = Math.max(pin.ay, top, i ? column[i - 1].y + LABEL_GAP : -Infinity); });
      for (let i = column.length - 1; i >= 0; i--) {
        column[i].y = Math.min(column[i].y, i === column.length - 1 ? bottom : column[i + 1].y - LABEL_GAP);
      }
      for (const pin of column) {
        const el = pinElements.get(pin.id)!;
        const leader = leaderElements.get(pin.id)!;
        let width = widths.current.get(pin.id) ?? 0;
        if (!width) {
          width = el.offsetWidth;
          if (width) widths.current.set(pin.id, width);
        }
        // Just clear of the outline, but never over a panel: the column moves in instead.
        const x = side < 0
          ? Math.min(Math.max(left - 28 - width, minX), maxX - width)
          : Math.max(Math.min(right + 28, maxX - width), minX);
        const edge = side < 0 ? x + width : x;
        const elbow = edge + side * 14;
        el.style.transform = `translate(${x}px, ${pin.y - LABEL_HEIGHT / 2}px)`;
        leader.line.setAttribute('points', `${edge},${pin.y} ${elbow},${pin.y} ${pin.ax},${pin.ay}`);
        leader.dot.setAttribute('cx', String(pin.ax));
        leader.dot.setAttribute('cy', String(pin.ay));
      }
    }
  });
  return null;
}

function Pins({ states }: { states: Record<SystemId, Status> }) {
  const selected = useMission((s) => s.selected);
  const select = useMission((s) => s.select);
  return (
    <div className="pins">
      <svg className="pin-leaders" aria-hidden="true">
        {systems.map((sys) => (
          <g
            key={sys.id}
            className={`pin-leader is-${states[sys.id]} ${selected === sys.id ? 'is-active' : ''}`}
            ref={(g) => {
              const line = g?.querySelector('polyline');
              const dot = g?.querySelector('circle');
              if (line && dot) leaderElements.set(sys.id, { line, dot });
              else leaderElements.delete(sys.id);
            }}
          >
            <polyline />
            <circle r={selected === sys.id ? 3.5 : 2.5} />
          </g>
        ))}
      </svg>
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
            <b>{sys.code}</b> {sys.short}
          </button>
        );
      })}
    </div>
  );
}

/** Mirrors asset loading into the intro store; the loader screen itself lives in the app shell. */
function Loading() {
  const active = useProgress((s) => s.active);
  const progress = useProgress((s) => s.progress);
  const item = useProgress((s) => s.item);
  useEffect(() => {
    useIntro.setState({ loading: active, progress, item: item.split('/').pop() ?? '' });
  }, [active, progress, item]);
  return null;
}

class SceneBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <BodyFallback2D reason="load-failed" /> : this.props.children; }
}

export default function Scene() {
  const mode = twinMode();
  return mode === '3d' ? <TwinScene /> : <BodyFallback2D reason={mode === '2d-requested' ? 'requested' : 'unavailable'} />;
}

function TwinScene() {
  const isNight = useMission((s) => s.night);
  const environment = useMission((s) => s.environment);
  const { states } = useAssessment();
  const p = isNight ? nightPalette : day;
  const cameraLink = useMemo(() => new ViewLink(), []);
  // The crew member's state as a whole, for the light around the body.
  // Attract mode: while no one is using the console (after the opening and the tour, or after a
  // while without a pointer), the system labels light up in turn and a hint names what to try.
  const introDone = useIntro((s) => s.done);
  const touring = useTour((s) => s.step !== null);
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!introDone || touring) return;
    let timer = window.setTimeout(() => setIdle(true), 2500);
    const wake = () => { setIdle(false); window.clearTimeout(timer); timer = window.setTimeout(() => setIdle(true), 9000); };
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => { window.clearTimeout(timer); window.removeEventListener('pointermove', wake); window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); };
  }, [introDone, touring]);
  const attract = idle && introDone && !touring;
  // The X-ray hint shows on every visit, once the opening scan and the tour are out of the way.
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!introDone || touring || hintShown) return;
    // The tour starts a moment after the scan on a first visit: wait to see whether it does.
    const show = window.setTimeout(() => { if (useTour.getState().step !== null) return; hintShown = true; setHint(true); }, 1500);
    return () => window.clearTimeout(show);
  }, [introDone, touring]);
  useEffect(() => {
    if (!hint) return;
    const hide = window.setTimeout(() => setHint(false), HINT_SECONDS * 1000);
    return () => window.clearTimeout(hide);
  }, [hint]);
  const values = Object.values(states);
  const mood: 'normal' | 'watch' | 'alert' = values.includes('alert') ? 'alert' : values.includes('watch') ? 'watch' : 'normal';
  return (
    <SceneBoundary>
      <div className={`three-stage ${attract ? 'is-attract' : ''}`}>
        <div className="habitat-background-layer" aria-hidden="true">
          {/* The habitat is a blurred, dimmed backdrop, so it renders at 60 % resolution: half the
              GPU time, and the blur hides the difference. */}
          <Canvas id="habitat-viewport" shadows dpr={0.6} frameloop="demand"
            onCreated={(state) => { if (import.meta.env.DEV) Object.assign(window, { __vtHabitat: state }); }}
            camera={{ position: [0.7, 1.2, 3.7], fov: 32, far: 500 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}>
            <color attach="background" args={[p.scene]} />
            {/* Haze only where there is air: surface rovers and bases, never in space. */}
            {(environment === 'rover' || environment === 'base') && <fog attach="fog" args={[p.scene, 16, 100]} />}
            <HabitatCameraLink link={cameraLink} />
            <Cabin p={p} night={isNight} />
          </Canvas>
        </div>
        <div className="medical-layer">
        {/* Depth without post-processing: the room's lamp (its light around the body and its pool
            on the floor, tinted by the state), a shadow under the deck, a veil that pushes the
            habitat back, a low mist and a glow in the organs, all pre-rendered gradients. */}
        <div className={`subject-atmosphere is-${mood}`} aria-hidden="true">
          <span className="subject-veil" />
          <span className="subject-lamp" />
          <span className="subject-ground" />
          <span className="subject-pool" />
          <span className="subject-mist" />
          <span className="subject-glow" />
          <span className="xray-window" />
        </div>
        <Canvas
          id="medical-viewport"
          shadows
          dpr={[1, BODY_MAX_DPR]}
          frameloop="demand"
          camera={{ position: [0.7, 1.2, 3.7], fov: 32 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={(state) => { state.gl.shadowMap.autoUpdate = false; state.gl.shadowMap.needsUpdate = true; if (import.meta.env.DEV) Object.assign(window, { __vtMedical: state }); }}
          fallback={<BodyFallback2D />}
        >
          <SubjectLighting p={p} night={isNight} mood={mood} />
          <AtmosphereProjector />
          <AdaptiveResolution max={BODY_MAX_DPR} />
          <Suspense fallback={null}>
            <Body p={p} states={states} />
          </Suspense>
          <InspectionCamera />
          <PinProjector />
          <MedicalCameraLink link={cameraLink} />
        </Canvas>
        {/* The lamp's light on the body, falling from above: a soft-light wash over the canvas. */}
        <div className={`subject-light is-${mood}`} aria-hidden="true" />
        {/* The organs' bloom over the body, in the state's colour. */}
        <div className={`subject-bloom is-${mood}`} aria-hidden="true" />
        {/* Once a session, over Truvi: what the pointer can do, for a few seconds, then gone. */}
        {hint && <p className="stage-hint" role="status"><MousePointer2 size={14} aria-hidden="true" /> Move the pointer over the body to X-ray it <span>·</span> Drag to rotate<i aria-hidden="true" /></p>}
        {/* The X-ray lens's ring, following the pointer over the body. */}
        <div className="xray-lens" aria-hidden="true"><span>X-ray</span></div>
        </div>
        <Pins states={states} />

        <Loading />
        <MotionControl />
        <FocusControl />
      </div>
    </SceneBoundary>
  );
}

useGLTF.preload(modelUrls(), false, true, trackModelBytes);
