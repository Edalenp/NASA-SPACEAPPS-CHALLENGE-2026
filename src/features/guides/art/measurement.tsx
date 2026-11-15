/**
 * Measurement plates. Hands and heads are traced from Blender silhouette renders of the Open Anatomy
 * skin (CC BY 4.0), so proportions come from a real body; devices and cutaways are drawn on top.
 * Each guide has three poses that match its written steps. No device ever shows a value.
 */
import { gsap } from 'gsap';
import type { VisualGuideId } from '../../../data/guides';
import { anatomy } from './anatomy-paths';
import { Anatomy, ArtFrame, Callout } from './ArtFrame';
import { q, revealCallouts, type ArtMotion } from './art-motion';
import { RoutineArt } from './routine';
import type { PlateId } from './plate-steps';

/* ---------------------------------------------------------------- pulse */

/** Radial pulse point, thumb side of the wrist, on the palm-up forearm. */
const RADIAL = { x: 220, y: 169 };

function SixtySecondDial() {
  return (
    <g data-art="dial">
      <circle className="b" cx="70" cy="70" r="30" />
      <path className="t" d="M70 44V50M96 70H90M70 96V90M44 70H50" />
      <path className="cue" data-art="sweep" d="M70 40A30 30 0 1 1 69.9 40" pathLength={1} strokeDasharray="1" />
      <path className="l" data-art="hand" d="M70 70V50" />
      <circle className="ink" cx="70" cy="70" r="2.5" />
      <text className="lbl" x="70" y="122" textAnchor="middle">60 S</text>
    </g>
  );
}

function PulsePlate({ step }: { step: number }) {
  return (
    <>
      {/* Left forearm, palm up: fingers point right, thumb on top. */}
      <Anatomy view={anatomy.palm_l} transform="translate(-25 273) rotate(-90)" />
      {step > 0 && (
        <g data-art="examiner">
          {/* Examiner's right hand from above: index and middle pads on the radial pulse. */}
          <g transform={`translate(${RADIAL.x} ${RADIAL.y + 4}) rotate(23) translate(-117.5 -338.5)`}>
            <Anatomy view={anatomy.dorsal_r} />
            {/* The index and middle fingers touch; this line keeps them two fingers. */}
            <path className="l" d="M110 268C110.8 286 113 306 117.2 328" />
          </g>
        </g>
      )}
      {step === 0 && <Callout x={RADIAL.x} y={RADIAL.y} tx={236} ty={292} label="THUMB SIDE OF THE WRIST" />}
      {step === 1 && <Callout x={RADIAL.x} y={RADIAL.y} tx={236} ty={292} label="INDEX + MIDDLE FINGERTIPS" />}
      {step === 2 && (
        <>
          <SixtySecondDial />
          <Callout x={RADIAL.x} y={RADIAL.y} tx={236} ty={292} label="COUNT EVERY BEAT" />
        </>
      )}
    </>
  );
}

const pulseMotion: Record<number, ArtMotion> = {
  0: (root) => revealCallouts(gsap.timeline(), root, 0.2),
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'examiner'), { y: -170, duration: 1.1, ease: 'power3.out' });
    tl.to(q(root, 'examiner'), { y: 2.5, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    return revealCallouts(tl, root);
  },
  2: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'sweep'), { strokeDashoffset: 1, duration: 2.6, ease: 'none' }, 0);
    tl.from(q(root, 'hand'), { rotation: -360, svgOrigin: '70 70', duration: 2.6, ease: 'none' }, 0);
    return revealCallouts(tl, root, 0.3);
  },
};

/* ---------------------------------------------------------- temperature */

/** Where the lips meet on the traced profile. */
const LIPS = { x: 252, y: 184 };
const THERMO_SCALE = 0.65;

/** Digital oral thermometer along its own axis; x = 0 is the lip line. */
function Thermometer({ hidden = false }: { hidden?: boolean }) {
  return (
    <g transform={`rotate(-6) scale(${THERMO_SCALE})`}>
      <path
        className={hidden ? 'h' : 'b'}
        d="M-54 -4L50 -4C58 -4 62 -12 72 -12L134 -12C146 -12 148 12 134 12L72 12C62 12 58 4 50 4L-54 4C-60 4 -60 -4 -54 -4Z"
      />
      {!hidden && (
        <>
          <rect className="l" x="80" y="-6" width="32" height="12" rx="2" />
          <circle className="l" cx="125" cy="0" r="4" />
          <g data-art="signal">
            <path className="cue" d="M117 -20Q125 -27 133 -20" />
            <path className="cue" d="M111 -29Q125 -39 139 -29" />
          </g>
        </>
      )}
    </g>
  );
}

function TemperaturePlate({ step }: { step: number }) {
  const inMouth = step > 0;
  const at = `translate(${LIPS.x} ${LIPS.y})${inMouth ? '' : ' translate(26 -3)'}`;
  return (
    <>
      <defs>
        <clipPath id="vt-mouth-inside"><path d={`M150 140H${LIPS.x}V230H150Z`} /></clipPath>
        <clipPath id="vt-mouth-outside"><path d={`M${LIPS.x} 0H480V320H${LIPS.x}Z`} /></clipPath>
      </defs>
      <Anatomy view={anatomy.profile} transform="translate(20 -40)" />
      {inMouth && (
        <>
          <rect x={LIPS.x - 3} y={LIPS.y - 4} width="7" height="8" fill="var(--art-ground)" />
          <g data-art="cutaway">
            <path className="h" d="M196 176C210 166 234 168 250 177" />
            <path className="h" d="M200 202C216 208 236 206 249 197" />
          </g>
        </>
      )}
      <g clipPath={inMouth ? 'url(#vt-mouth-inside)' : undefined}>
        <g data-art="therm"><g transform={at}>{inMouth && <Thermometer hidden />}</g></g>
      </g>
      <g clipPath={inMouth ? 'url(#vt-mouth-outside)' : undefined}>
        <g data-art="therm"><g transform={at}><Thermometer /></g></g>
      </g>
      {step === 0 && <Callout x={340} y={175} tx={250} ty={296} label="CLEAN DIGITAL THERMOMETER" />}
      {step === 1 && <Callout x={218} y={188} tx={300} ty={296} label="UNDER THE TONGUE" />}
      {step === 2 && <Callout x={333} y={176} tx={250} ty={296} label="WAIT FOR THE DEVICE SIGNAL" />}
    </>
  );
}

const temperatureMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'therm'), { x: 60, opacity: 0, duration: 0.9, ease: 'power3.out' });
    return revealCallouts(tl, root);
  },
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'therm'), { x: 26, y: -3, duration: 1.3, ease: 'power2.inOut' });
    tl.from(q(root, 'cutaway'), { opacity: 0, duration: 0.5 }, 0.5);
    return revealCallouts(tl, root);
  },
  2: (root) => {
    const tl = gsap.timeline();
    tl.fromTo(q(root, 'signal'), { opacity: 0 }, { opacity: 1, duration: 0.25, repeat: 3, yoyo: true, ease: 'steps(1)' }, 0.3);
    tl.set(q(root, 'signal'), { opacity: 1 });
    return revealCallouts(tl, root, 0.2);
  },
};

/* ------------------------------------------------------------- oximeter */

/** Left index fingertip on the back-of-hand view, and the finger's axis. */
const INDEX_TIP = { x: 358, y: 217, angle: 19 };

/** Fingertip pulse oximeter from above; the finger enters from the left. */
function Oximeter() {
  return (
    <g>
      <rect className="b" x="-36" y="-21" width="70" height="42" rx="12" />
      <rect className="l" x="-22" y="-11" width="34" height="22" rx="3" />
      <circle className="l" cx="24" cy="0" r="4" />
    </g>
  );
}

function OximeterPlate({ step }: { step: number }) {
  const fitted = step > 0;
  return (
    <>
      {/* Back of the left hand, fingers right, thumb at the bottom. */}
      <Anatomy view={anatomy.dorsal_l} transform="translate(0 268) rotate(-90)" />
      <g data-art="device">
        <g transform={`translate(${INDEX_TIP.x - 12} ${INDEX_TIP.y - 4}) rotate(${INDEX_TIP.angle})${fitted ? '' : ' translate(84 0)'}`}>
          <Oximeter />
        </g>
      </g>
      {step === 0 && <Callout x={INDEX_TIP.x - 6} y={INDEX_TIP.y - 2} tx={330} ty={296} label="WARM, BARE FINGERTIP" anchor="end" />}
      {step === 1 && <Callout x={INDEX_TIP.x - 12} y={INDEX_TIP.y - 4} tx={330} ty={296} label="FINGERTIP FULLY INSIDE" anchor="end" />}
      {step === 2 && <Callout x={INDEX_TIP.x - 16} y={INDEX_TIP.y - 6} tx={330} ty={296} label="KEEP STILL, THEN READ" anchor="end" />}
    </>
  );
}

const oximeterMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'device'), { opacity: 0, x: 30, duration: 0.6, ease: 'power2.out' });
    return revealCallouts(tl, root);
  },
  1: (root) => {
    const tl = gsap.timeline();
    const rad = (INDEX_TIP.angle * Math.PI) / 180;
    tl.from(q(root, 'device'), { x: 84 * Math.cos(rad), y: 84 * Math.sin(rad), duration: 1.1, ease: 'power2.inOut' });
    return revealCallouts(tl, root);
  },
  2: (root) => {
    const tl = gsap.timeline();
    revealCallouts(tl, root, 0.2);
    tl.to(q(root, 'ring'), { scale: 1.35, transformOrigin: '50% 50%', duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    return tl;
  },
};

/* ---------------------------------------------------------------- entry */

const plates = {
  pulse: { title: 'Wrist pulse placement', Plate: PulsePlate, motion: pulseMotion },
  temperature: { title: 'Oral thermometer placement', Plate: TemperaturePlate, motion: temperatureMotion },
  spo2: { title: 'Fingertip oximeter placement', Plate: OximeterPlate, motion: oximeterMotion },
} satisfies Record<VisualGuideId, unknown>;

const isMeasurementPlate = (id: PlateId): id is VisualGuideId => id in plates;

/** One plate in one pose. `count` is the plate's number of poses, for the kicker. */
export function MeasurementArt({ guide, step, description, count = 3 }: { guide: PlateId; step: number; description: string; count?: number }) {
  if (!isMeasurementPlate(guide)) return <RoutineArt guide={guide} step={step} description={description} count={count} />;
  const { title, Plate, motion } = plates[guide];
  return (
    <ArtFrame title={title} description={description} kicker={`Fig. ${step + 1} / ${count}`} motion={motion[step]} poseKey={`${guide}-${step}`}>
      <Plate step={step} />
    </ArtFrame>
  );
}
