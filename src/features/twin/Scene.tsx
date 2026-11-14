/**
 * The body twin: Open Anatomy 3D (CC BY 4.0) in a procedural cabin.
 * Ported from demo-vitruvio (Santiago) and merged with the v0.1 graphic
 * system: status tints like a highlighter, leader line, mission ring.
 */
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Canvas,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  ContactShadows,
  Line,
  OrbitControls,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import {
  history,
  MISSION_DAY,
  systems,
  type SystemId,
} from "../../data/mission";
import { deviation, type Status } from "../../engine/status";
import Cabin from "./Cabin";
import MissionRing from "./MissionRing";
import { day, night as nightPalette, type ScenePalette } from "./palette";

const MODEL = "/models/anatomy-male.glb";

function systemFor(name: string): SystemId {
  if (/brain|skull|cranium|mandible|nerve/i.test(name)) return "head";
  if (/heart|arter|vein|aorta|vessel/i.test(name)) return "heart";
  if (/lung|trache|bronch|diaphragm/i.test(name)) return "lungs";
  if (/liver|kidney|stomach|pancreas|spleen|intestin|bladder|organ/i.test(name))
    return "immune";
  return "bones";
}

/** Registries shared by the anchors in the scene and the DOM pins over it. One twin per page. */
const anchorObjects = new Map<SystemId, THREE.Object3D>();
const pinElements = new Map<SystemId, HTMLButtonElement>();

function Body({
  p,
  states,
}: {
  p: ScenePalette;
  states: Record<SystemId, Status>;
}) {
  const gltf = useGLTF(MODEL, false, true);
  const selected = useMission((s) => s.selected);
  const layer = useMission((s) => s.layer);
  const rotation = useMission((s) => s.rotation);
  const select = useMission((s) => s.select);
  const [hovered, setHovered] = useState<string | null>(null);
  const invalidate = useThree((s) => s.invalidate);

  const { object, offset, scale } = useMemo(() => {
    const object = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    return {
      object,
      offset: new THREE.Vector3(-c.x, -box.min.y, -c.z),
      scale: 1.8 / size.y,
    };
  }, [gltf.scene]);

  useEffect(() => {
    const materials: THREE.Material[] = [];
    object.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const name = node.name;
      const lineage = [name];
      for (let parent = node.parent; parent; parent = parent.parent)
        lineage.push(parent.name);
      const path = lineage.join("/").toLowerCase();
      const isSkin = /skin/.test(path);
      const isMuscle = /muscle/.test(path);
      const isBone = /skeleton/.test(path);
      const isVessel = /vessel/.test(path);
      const isNerve = /nerve/.test(path);
      const isJoint = /joint/.test(path);
      node.visible =
        !isJoint &&
        !isNerve &&
        !isSkin &&
        (layer === "skeleton" ? isBone || /heart|lung/.test(name) : true);
      if (!node.visible) return;

      const sys = systemFor(name);
      const state = states[sys];
      const isSelected = sys === selected && selected !== "bones";
      const revealChest =
        layer === "anatomy" &&
        (selected === "heart" || selected === "lungs") &&
        (/chest_muscles|intercostals|sternum/.test(name) ||
          (selected === "heart" && /lung/.test(name)));

      // Colour law: grey at rest, status tints like a highlighter, sage marks the selection.
      let color = isBone
        ? p.bone
        : isMuscle
          ? p.muscle
          : isVessel
            ? p.vessel
            : p.organ;
      if (
        sys !== "bones" &&
        (state === "watch" || state === "alert") &&
        (isSelected || !isMuscle)
      ) {
        color = state === "alert" ? p.alert : p.watch;
      } else if (isSelected) {
        color = p.select;
      }
      if (hovered === name) color = p.hover;

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: isBone ? 0.57 : 0.65,
        metalness: isBone ? 0.08 : 0.2,
        transparent: revealChest,
        opacity: revealChest ? 0.18 : 1,
        depthWrite: !revealChest,
        side: THREE.DoubleSide,
      });
      materials.push(material);
      node.material = material;
      node.castShadow = !revealChest;
      node.receiveShadow = true;
    });
    invalidate();
    return () => materials.forEach((m) => m.dispose());
  }, [object, selected, layer, hovered, invalidate, p, states]);

  return (
    <group rotation={[0, rotation, 0]}>
      <group scale={scale}>
        <primitive
          object={object}
          position={offset}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            select(systemFor(e.object.name));
          }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHovered(e.object.name);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(null);
            document.body.style.cursor = "auto";
          }}
        />
      </group>
      <Anchors p={p} states={states} />
    </group>
  );
}

/** Anchor points and selection leader line; marker frames are uniform DOM boxes. */
function Anchors({
  p,
  states,
}: {
  p: ScenePalette;
  states: Record<SystemId, Status>;
}) {
  const selected = useMission((s) => s.selected);
  return (
    <>
      {systems.map((sys) => {
        const st = states[sys.id];
        const tint =
          st === "watch" ? p.watch : st === "alert" ? p.alert : p.ink;
        return (
          <group
            key={sys.id}
            position={sys.pin}
            ref={(o) => {
              if (o) anchorObjects.set(sys.id, o);
              else anchorObjects.delete(sys.id);
            }}
          >
            {selected === sys.id && (
              <>
                <Line
                  points={[
                    [0, 0, 0],
                    [0.18, 0.055, 0.01],
                    [0.26, 0.055, 0.01],
                  ]}
                  color={tint}
                  lineWidth={1}
                />
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
  useFrame(({ camera, size }) => {
    for (const sys of systems) {
      const a = anchorObjects.get(sys.id);
      const el = pinElements.get(sys.id);
      if (!a || !el) continue;
      a.getWorldPosition(v).project(camera);
      const hidden = v.z > 1;
      el.style.visibility = hidden ? "hidden" : "visible";
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
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
            ref={(el) => {
              if (el) pinElements.set(sys.id, el);
              else pinElements.delete(sys.id);
            }}
            className={`body-pin is-${st} ${selected === sys.id ? "is-active" : ""}`}
            onClick={() => select(sys.id)}
            aria-label={`${sys.name}, ${st === "missing" ? "no data" : st}`}
            aria-pressed={selected === sys.id}
          >
            {sys.code}
          </button>
        );
      })}
    </div>
  );
}

function CameraRig() {
  const ref = useRef<OrbitControlsImpl>(null);
  const reset = useMission((s) => s.reset);
  const { camera, invalidate } = useThree();
  useEffect(() => {
    if (!ref.current) return;
    camera.position.set(0.7, 1.2, 3.7);
    ref.current.target.set(0, 0.86, 0);
    ref.current.update();
    invalidate();
  }, [reset, camera, invalidate]);
  return (
    <OrbitControls
      ref={ref}
      target={[0, 0.86, 0]}
      minDistance={2.4}
      maxDistance={5.6}
      minPolarAngle={Math.PI * 0.29}
      maxPolarAngle={Math.PI * 0.58}
      enablePan={false}
      makeDefault
    />
  );
}

function Loading() {
  const active = useProgress((s) => s.active);
  const progress = useProgress((s) => s.progress);
  return active ? (
    <div className="scene-loading" role="status">
      <span className="micro">Loading anatomical model</span>
      <span className="scene-loading-bar">
        <i style={{ width: `${progress}%` }} />
      </span>
    </div>
  ) : null;
}

class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <Fallback /> : this.props.children;
  }
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
      <p>
        <b>3D is not available on this device.</b> All six systems stay
        available in the systems list.
      </p>
    </div>
  );
}

/** Mission days where a cardiovascular reading left the usual range. */
function useFlaggedDays() {
  return useMemo(() => {
    const out: number[] = [];
    history.pulse.forEach((_, i) => {
      const d = MISSION_DAY - history.pulse.length + 1 + i;
      if (
        deviation("pulse", history.pulse[i]).status !== "normal" ||
        deviation("systolic", history.systolic[i]).status !== "normal"
      )
        out.push(d);
    });
    return out;
  }, []);
}

export default function Scene() {
  const isNight = useMission((s) => s.night);
  const { states } = useAssessment();
  const p = isNight ? nightPalette : day;
  const flagged = useFlaggedDays();
  return (
    <SceneBoundary>
      <div className="three-stage">
        <Canvas
          shadows
          dpr={[1, 1.6]}
          frameloop="demand"
          camera={{ position: [0.7, 1.2, 3.7], fov: 32 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          fallback={<Fallback />}
        >
          <color attach="background" args={[p.scene]} />
          <fog attach="fog" args={[p.scene, 7, 17]} />
          <ambientLight intensity={isNight ? 0.3 : 0.45} />
          <hemisphereLight args={["#fff8e8", "#75836a", 0.9]} />
          <directionalLight
            position={[-3, 5, 4]}
            intensity={2.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
          >
            <orthographicCamera
              attach="shadow-camera"
              args={[-3, 3, 3, -3, 0.1, 15]}
            />
          </directionalLight>
          <directionalLight
            position={[3, 2, -1]}
            intensity={0.8}
            color="#e4e7d8"
          />
          <Cabin p={p} night={isNight} />
          <MissionRing p={p} flagged={flagged} />
          <Suspense fallback={null}>
            <Body p={p} states={states} />
            <ContactShadows
              position={[0, 0.001, 0]}
              opacity={0.35}
              scale={5}
              blur={2.3}
              far={3}
              frames={1}
              color={p.shadow}
            />
          </Suspense>
          <CameraRig />
          <PinProjector />
        </Canvas>
        <Pins states={states} />
        <Loading />
      </div>
    </SceneBoundary>
  );
}

useGLTF.preload(MODEL, false, true);
