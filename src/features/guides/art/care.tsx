/**
 * Emergency step plates: one drawing per care step. Bodies and hands are traced from Blender
 * silhouette renders of the Open Anatomy skin (CC BY 4.0); devices and cues are drawn on top.
 * They show where to look and where to put your hands. They never show a rate, a dose or a value.
 */
import { gsap } from 'gsap';
import { anatomy } from './anatomy-paths';
import { Anatomy, ArtFrame, Callout } from './ArtFrame';
import { q, revealCallouts, type ArtMotion } from './art-motion';

/* ------------------------------------------------------------ figures */

/** Landmarks on the lying patient, from the traced Open Anatomy side view. */
const CHEST = { x: 140, y: 188 };
const SHOULDER = { x: 100, y: 208 };

/** Crewmate lying face up on a restraint board, head left, seen from the side. */
function Patient() {
  return (
    <g>
      <rect className="b" x="20" y="252" width="446" height="9" rx="2" />
      <Anatomy view={anatomy.body} transform="translate(25 290) rotate(-90)" />
      <rect className="b" x="296" y="196" width="10" height="60" rx="2" />
      <rect className="b" x="386" y="210" width="10" height="46" rx="2" />
    </g>
  );
}

/** Crewmate from the front, head and shoulders. */
function Bust({ transform = 'translate(66 -14)', scale = 1 }: { transform?: string; scale?: number }) {
  return <Anatomy view={anatomy.bust} transform={transform} scale={scale} />;
}

/** Where the chest pain is felt: a dashed zone on the centre of the chest. */
function ChestZone() {
  return (
    <g data-art="zone">
      <ellipse className="cue" cx="240" cy="236" rx="34" ry="24" strokeDasharray="5 5" />
    </g>
  );
}

/* -------------------------------------------------------------- plates */

function CallPlate() {
  return (
    <>
      <Bust />
      <path className="l" d="M198 88C194 -6 286 -6 282 88" />
      <rect className="b" x="190" y="82" width="14" height="28" rx="4" />
      <rect className="b" x="276" y="82" width="14" height="28" rx="4" />
      <path className="l" d="M197 108C196 132 212 140 226 138" />
      <circle className="ink" cx="229" cy="138" r="4" />
      <g data-art="waves">
        <path className="cue" d="M304 76Q316 96 304 116" />
        <path className="cue" d="M320 62Q338 96 320 130" />
        <path className="cue" d="M336 48Q360 96 336 144" />
      </g>
      <Callout x={229} y={138} tx={176} ty={112} label="CREW MEDICAL OFFICER" anchor="end" />
      <text className="lbl" x="170" y="134" textAnchor="end">+ BRING THE AED</text>
    </>
  );
}

function RestPlate({ clock = false }: { clock?: boolean }) {
  return (
    <>
      <g data-art="body">
        <Bust />
      </g>
      <ChestZone />
      {clock && (
        <g data-art="clock">
          <circle className="b" cx="396" cy="88" r="38" />
          <path className="t" d="M396 54V60M430 88H424M396 122V116M362 88H368" />
          <path className="cue" data-art="since" d="M396 58A30 30 0 0 1 424 98" pathLength={1} strokeDasharray="1" />
          <path className="l" d="M396 88V62" />
          <path className="l" data-art="clock-hand" d="M396 88L420 96" />
          <circle className="ink" cx="396" cy="88" r="3" />
        </g>
      )}
      {clock ? (
        <Callout x={396} y={88} tx={350} ty={170} label="WHEN IT BEGAN" />
      ) : (
        <Callout x={240} y={236} tx={306} ty={150} label="STOP AND REST" />
      )}
    </>
  );
}

function RespondPlate() {
  return (
    <>
      <Patient />
      <g data-art="waves">
        <path className="cue" d="M38 168Q55 154 72 168" />
        <path className="cue" d="M30 156Q55 136 80 156" />
      </g>
      <Callout x={SHOULDER.x} y={SHOULDER.y - 4} tx={250} ty={110} label="TAP THE SHOULDER, SHOUT" />
      <text className="lbl" x="256" y="134">CHECK BREATHING TOGETHER</text>
    </>
  );
}

function BreathingPlate({ label }: { label: string }) {
  return (
    <>
      <defs>
        <clipPath id="vt-rescuer-head"><circle cx="45" cy="52" r="44" /></clipPath>
      </defs>
      <g transform="translate(92 150) rotate(32) translate(-45 -48)" clipPath="url(#vt-rescuer-head)">
        <Anatomy view={anatomy.head_s} />
      </g>
      <Patient />
      <path className="h" d="M112 170L146 186" />
      <g data-art="rise">
        <path className="h" d="M110 176C140 166 176 166 214 176" />
        <path className="cue" d="M168 160V140M162 146L168 139L174 146" />
      </g>
      <Callout x={CHEST.x + 20} y={CHEST.y - 2} tx={250} ty={110} label={label} />
    </>
  );
}

function CprPlate() {
  return (
    <>
      <Patient />
      <rect className="b" x="370" y="40" width="82" height="56" rx="6" />
      <text className="lbl" x="411" y="73" textAnchor="middle">AED</text>
      <path className="t" d="M118 196C150 120 300 86 370 74M196 196C232 140 322 104 370 88" />
      <rect className="b" x="106" y="194" width="24" height="7" rx="2" transform="rotate(-8 118 197)" />
      <rect className="b" x="184" y="194" width="24" height="7" rx="2" transform="rotate(6 196 197)" />
      <path className="cue" data-art="arrow" d={`M${CHEST.x} ${CHEST.y - 64}V${CHEST.y - 18}M${CHEST.x - 8} ${CHEST.y - 28}L${CHEST.x} ${CHEST.y - 16}L${CHEST.x + 8} ${CHEST.y - 28}`} />
      <Callout x={CHEST.x} y={CHEST.y + 2} tx={260} ty={150} label="CENTRE OF THE CHEST" />
      <text className="lbl" x="266" y="174">FOLLOW THE AED PROMPTS</text>
    </>
  );
}

function HandoverPlate() {
  return (
    <>
      <Bust transform="translate(-1 125) scale(0.55)" scale={0.55} />
      <Bust transform="translate(289 125) scale(0.55)" scale={0.55} />
      <rect className="b" x="190" y="96" width="100" height="150" rx="4" />
      <rect className="b" x="222" y="88" width="36" height="14" rx="3" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} data-art="row">
          <path className="l" d={`M204 ${128 + i * 22}H214`} />
          <path className="t" d={`M222 ${128 + i * 22}H${276 - (i % 2) * 14}`} />
        </g>
      ))}
      <Callout x={240} y={150} tx={296} ty={60} label="TIMES + OBSERVATIONS" />
    </>
  );
}

/* -------------------------------------------------------------- motion */

const waves = (root: SVGSVGElement, tl: gsap.core.Timeline, at: number) => {
  const arcs = root.querySelectorAll('[data-art="waves"] path');
  tl.fromTo(arcs, { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.15, repeat: 1, repeatDelay: 0.25, ease: 'none' }, at);
};

const motions: Record<string, ArtMotion> = {
  call: (root) => {
    const tl = gsap.timeline();
    waves(root, tl, 0.1);
    revealCallouts(tl, root);
    return tl;
  },
  rest: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'body'), { y: -6, duration: 0.8, ease: 'power2.out' });
    tl.from(q(root, 'zone'), { scale: 0.6, opacity: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'power2.out' });
    revealCallouts(tl, root);
    return tl;
  },
  symptoms: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'zone'), { scale: 0.6, opacity: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'power2.out' });
    tl.from(q(root, 'since'), { strokeDashoffset: 1, duration: 1.2, ease: 'power1.inOut' }, 0.3);
    tl.from(q(root, 'clock-hand'), { rotation: -110, svgOrigin: '396 88', duration: 1.2, ease: 'power1.inOut' }, 0.3);
    revealCallouts(tl, root);
    return tl;
  },
  respond: (root) => {
    const tl = gsap.timeline();
    revealCallouts(tl, root, 0.1);
    tl.to(q(root, 'ring'), { scale: 1.4, transformOrigin: '50% 50%', duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    waves(root, tl, 0.3);
    return tl;
  },
  breathing: (root) => {
    const tl = gsap.timeline();
    tl.fromTo(q(root, 'rise'), { opacity: 0 }, { opacity: 1, duration: 0.6, yoyo: true, repeat: 2, ease: 'sine.inOut' }, 0.2);
    revealCallouts(tl, root, 0.3);
    return tl;
  },
  cpr: (root) => {
    const tl = gsap.timeline();
    revealCallouts(tl, root, 0.1);
    tl.fromTo(q(root, 'arrow'), { y: -10, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.3, repeat: 5, ease: 'power2.in' });
    return tl;
  },
  handover: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'row'), { opacity: 0, x: -6, duration: 0.25, stagger: 0.18, ease: 'power2.out' });
    revealCallouts(tl, root);
    return tl;
  },
};

/* --------------------------------------------------------------- entry */

interface Plate {
  motion: string;
  title: string;
  description: string;
  draw: () => React.ReactElement;
}

const plates: Record<string, Plate> = {
  call: {
    motion: 'call',
    title: 'Call the Crew Medical Officer',
    description: 'A crewmate wearing a headset calls the Crew Medical Officer and asks for the AED.',
    draw: () => <CallPlate />,
  },
  stop: {
    motion: 'rest',
    title: 'Stop and rest',
    description: 'A crewmate stops and rests. A dashed zone marks the centre of the chest.',
    draw: () => <RestPlate />,
  },
  symptoms: {
    motion: 'symptoms',
    title: 'When the pain began',
    description: 'A crewmate with a dashed zone on the chest, beside a clock that marks how long ago the pain began.',
    draw: () => <RestPlate clock />,
  },
  respond: {
    motion: 'respond',
    title: 'Tap and shout',
    description: 'A crewmate lies on a restraint board. A target marks the shoulder to tap while you shout and check breathing.',
    draw: () => <RespondPlate />,
  },
  breathing: {
    motion: 'breathing',
    title: 'Look for normal breathing',
    description: 'A rescuer looks along the chest of a crewmate on a restraint board. A dashed line marks the chest rising.',
    draw: () => <BreathingPlate label="WATCH THE CHEST RISE" />,
  },
  airway: {
    motion: 'breathing',
    title: 'Keep checking breathing',
    description: 'A rescuer stays at the head of a crewmate on a restraint board and keeps watching the chest.',
    draw: () => <BreathingPlate label="KEEP CHECKING BREATHING" />,
  },
  monitor: {
    motion: 'breathing',
    title: 'Stay and watch',
    description: 'A rescuer stays at the head of a crewmate on a restraint board, watching breathing and response.',
    draw: () => <BreathingPlate label="WATCH BREATHING, RESPONSE" />,
  },
  cpr: {
    motion: 'cpr',
    title: 'Hands on the centre of the chest',
    description: 'A crewmate strapped to a restraint board. An arrow presses on the centre of the chest, with AED pads connected.',
    draw: () => <CprPlate />,
  },
  handover: {
    motion: 'handover',
    title: 'Hand over your record',
    description: 'Two crewmates with a record sheet of times and observations between them.',
    draw: () => <HandoverPlate />,
  },
};

export function CareArt({ stepId, visit }: { stepId: string; visit: number }) {
  const plate = plates[stepId];
  if (!plate) return null;
  return (
    <ArtFrame
      title={plate.title}
      description={plate.description}
      kicker={`Step ${visit}`}
      motion={motions[plate.motion]}
      poseKey={`${stepId}-${visit}`}
      note="Illustration only. Follow your onboard training."
    >
      {plate.draw()}
    </ArtFrame>
  );
}
