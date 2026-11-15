/**
 * Plates for the rest of the daily check: blood pressure, breathing rate, glucose, alertness,
 * sleep and mood. Same method as measurement.tsx: bodies, hands and heads are traced from Blender
 * silhouette renders of the Open Anatomy skin (CC BY 4.0); devices, scales and cues are drawn on
 * top; GSAP plays each pose once. No device ever shows a value and no scale shows a choice.
 */
import { gsap } from 'gsap';
import { anatomy } from './anatomy-paths';
import { Anatomy, ArtFrame, Callout } from './ArtFrame';
import type { RoutinePlateId } from './plate-steps';
import { q, revealCallouts, type ArtMotion } from './art-motion';

/* -------------------------------------------------------------- shared */

/** A dial with a sweep, for a duration the guide states (never a running timer). */
function Dial({ cx, cy, r = 30, label }: { cx: number; cy: number; r?: number; label: string }) {
  return (
    <g data-art="dial">
      <circle className="b" cx={cx} cy={cy} r={r} />
      <path className="t" d={`M${cx} ${cy - r + 4}V${cy - r + 10}M${cx + r - 4} ${cy}H${cx + r - 10}M${cx} ${cy + r - 4}V${cy + r - 10}M${cx - r + 4} ${cy}H${cx - r + 10}`} />
      <path className="cue" data-art="sweep" d={`M${cx} ${cy - r + 4}A${r - 4} ${r - 4} 0 1 1 ${cx - 0.1} ${cy - r + 4}`} pathLength={1} strokeDasharray="1" />
      <path className="l" data-art="hand" d={`M${cx} ${cy}V${cy - r + 10}`} />
      <circle className="ink" cx={cx} cy={cy} r="2.5" />
      <text className="lbl" x={cx} y={cy + r + 18} textAnchor="middle">{label}</text>
    </g>
  );
}

const sweep = (tl: gsap.core.Timeline, root: SVGSVGElement, cx: number, cy: number, duration = 2.4) => {
  tl.from(q(root, 'sweep'), { strokeDashoffset: 1, duration, ease: 'none' }, 0);
  tl.from(q(root, 'hand'), { rotation: -360, svgOrigin: `${cx} ${cy}`, duration, ease: 'none' }, 0);
  return tl;
};

/** Head and shoulders from the front, left of the plate. */
function Bust({ transform = 'translate(10 40) scale(0.7)', scale = 0.7 }: { transform?: string; scale?: number }) {
  return <Anatomy view={anatomy.bust} transform={transform} scale={scale} />;
}

/* ------------------------------------------------------- blood pressure */

/** Front view at 0.9: plate = (40 + 0.9x, 0.9y). Left upper arm, heart and cuff in plate units. */
const HEART = { x: 150, y: 135 };
const CUFF = { x: 182, y: 124, w: 30, h: 36 };
const MONITOR = { x: 300, y: 158, w: 104, h: 76 };

function BloodPressurePlate({ step }: { step: number }) {
  const cuffMid = CUFF.y + CUFF.h / 2;
  return (
    <>
      <Anatomy view={anatomy.front} transform="translate(40 0) scale(0.9)" scale={0.9} />
      {step === 0 && (
        <>
          <Dial cx={392} cy={92} r={34} label="5 MIN" />
          <Callout x={HEART.x - 14} y={HEART.y + 30} tx={250} ty={292} label="REST 5 MIN FIRST" />
        </>
      )}
      {step > 0 && (
        <>
          <g data-art="level">
            <circle className="cue-fill" cx={HEART.x} cy={cuffMid} r="3.5" />
            <path className="h" d={`M${HEART.x} ${cuffMid}H${step === 1 ? 300 : CUFF.x}`} />
            {step === 1 && <text className="lbl" x="306" y={cuffMid + 4}>HEART LEVEL</text>}
          </g>
          <g data-art="cuff">
            <rect className="b" x={CUFF.x} y={CUFF.y} width={CUFF.w} height={CUFF.h} rx="5" />
            <path className="t" d={`M${CUFF.x + 4} ${CUFF.y + 9}H${CUFF.x + CUFF.w - 4}M${CUFF.x + 4} ${CUFF.y + CUFF.h - 9}H${CUFF.x + CUFF.w - 4}`} />
          </g>
        </>
      )}
      {step === 1 && <Callout x={CUFF.x + CUFF.w / 2} y={CUFF.y + CUFF.h} tx={232} ty={292} label="BARE UPPER ARM, ABOVE ELBOW" />}
      {step === 2 && (
        <>
          <path className="l" data-art="tube" pathLength={1} strokeDasharray="1"
            d={`M${CUFF.x + CUFF.w} ${CUFF.y + 10}C${CUFF.x + 70} ${CUFF.y - 10} ${MONITOR.x - 50} ${MONITOR.y + 10} ${MONITOR.x} ${MONITOR.y + 22}`} />
          <g data-art="monitor">
            <rect className="b" x={MONITOR.x} y={MONITOR.y} width={MONITOR.w} height={MONITOR.h} rx="8" />
            <rect className="l" x={MONITOR.x + 14} y={MONITOR.y + 12} width={MONITOR.w - 28} height="30" rx="3" />
            <circle className="l" cx={MONITOR.x + MONITOR.w / 2} cy={MONITOR.y + 58} r="7" />
          </g>
          {[0, 1, 2].map((i) => (
            <g key={i} data-art="reading">
              <rect className={i < 2 ? 'cue' : 'h'} x={MONITOR.x + 4 + i * 36} y={MONITOR.y - 34} width="24" height="16" rx="2" />
              <text className="lbl" x={MONITOR.x + 16 + i * 36} y={MONITOR.y - 22} textAnchor="middle">{i + 1}</text>
            </g>
          ))}
          <text className="lbl" x={MONITOR.x + MONITOR.w / 2} y={MONITOR.y - 44} textAnchor="middle">~1 MIN APART</text>
          <Callout x={MONITOR.x + MONITOR.w / 2} y={MONITOR.y + MONITOR.h} tx={250} ty={292} label="2–3 READINGS, STAY STILL" />
        </>
      )}
    </>
  );
}

const bloodPressureMotion: Record<number, ArtMotion> = {
  0: (root) => revealCallouts(sweep(gsap.timeline(), root, 392, 92), root, 0.3),
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'cuff'), { y: 46, opacity: 0, duration: 1, ease: 'power3.out' });
    tl.from(q(root, 'level'), { opacity: 0, duration: 0.5 }, '-=0.2');
    return revealCallouts(tl, root);
  },
  2: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'tube'), { strokeDashoffset: 1, duration: 0.9, ease: 'power2.out' });
    tl.from(q(root, 'monitor'), { opacity: 0, x: 24, duration: 0.6, ease: 'power2.out' }, '<0.3');
    tl.from(q(root, 'reading'), { opacity: 0, y: 6, duration: 0.3, stagger: 0.5, ease: 'power2.out' });
    return revealCallouts(tl, root);
  },
};

/* ---------------------------------------------------------- respiration */

/** Bust at 0.82 from (30, 10): the chest line sits about y 250. */
const CHEST_LINE = 'M112 252C140 240 206 240 236 252';

function RespirationPlate({ step }: { step: number }) {
  return (
    <>
      <Bust transform="translate(30 10) scale(0.82)" scale={0.82} />
      {step === 0 && <Callout x={174} y={96} tx={290} ty={292} label="SIT QUIETLY, RELAX" />}
      {step > 0 && (
        <g data-art="rise">
          <path className="h" d={CHEST_LINE} />
          <path className="cue" d="M174 236V214M168 220L174 213L180 220" />
        </g>
      )}
      {step === 1 && (
        <>
          <Dial cx={404} cy={88} label="60 S" />
          <Callout x={174} y={246} tx={290} ty={292} label="COUNT EACH RISE" />
        </>
      )}
      {step === 2 && (
        <>
          <g data-art="crewmate">
            <g transform="translate(468 118) scale(-0.95 0.95)">
              <Anatomy view={anatomy.head_s} scale={0.95} />
            </g>
          </g>
          <path className="h" data-art="sight" d="M396 168L240 240" />
          <Callout x={318} y={204} tx={290} ty={292} label="A CREWMATE COUNTS" />
        </>
      )}
    </>
  );
}

const respirationMotion: Record<number, ArtMotion> = {
  0: (root) => revealCallouts(gsap.timeline(), root, 0.2),
  1: (root) => {
    const tl = sweep(gsap.timeline(), root, 404, 88, 3);
    // Three slow rises: a cue for where to look, not a breathing rate.
    tl.to(q(root, 'rise'), { y: -7, duration: 0.5, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0);
    return revealCallouts(tl, root, 0.4);
  },
  2: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'crewmate'), { x: 50, opacity: 0, duration: 0.9, ease: 'power3.out' });
    tl.from(q(root, 'sight'), { opacity: 0, duration: 0.5 });
    return revealCallouts(tl, root);
  },
};

/* --------------------------------------------------------------- glucose */

/** Back of the left hand as on the oximeter plate; the index fingertip and its side. */
const TIP = { x: 358, y: 217 };

function Lancet() {
  return (
    <g>
      <rect className="b" x="-8" y="-78" width="16" height="62" rx="6" />
      <rect className="b" x="-5" y="-16" width="10" height="12" rx="2" />
      <path className="t" d="M-8 -60H8" />
    </g>
  );
}

function Meter() {
  return (
    <g>
      <rect className="b" x="0" y="-36" width="62" height="78" rx="9" />
      <rect className="l" x="10" y="-26" width="42" height="28" rx="3" />
      <circle className="l" cx="31" cy="24" r="6" />
      {/* Test strip, out of the port toward the finger. */}
      <rect className="b" x="-40" y="-4" width="42" height="9" rx="1.5" />
    </g>
  );
}

function GlucosePlate({ step }: { step: number }) {
  return (
    <>
      <Anatomy view={anatomy.dorsal_l} transform="translate(0 268) rotate(-90)" />
      {step === 0 && (
        <>
          <g data-art="water">
            {[180, 236, 292].map((x, i) => (
              <path key={x} className="l" d={`M${x} ${18 + (i % 2) * 10}C${x - 6} ${30 + (i % 2) * 10} ${x - 6} ${38 + (i % 2) * 10} ${x} ${38 + (i % 2) * 10}C${x + 6} ${38 + (i % 2) * 10} ${x + 6} ${30 + (i % 2) * 10} ${x} ${18 + (i % 2) * 10}Z`} />
            ))}
          </g>
          <Callout x={236} y={120} tx={120} ty={296} label="WASH, THEN DRY WELL" />
        </>
      )}
      {step === 1 && (
        <>
          <g data-art="lancet"><g transform={`translate(${TIP.x + 6} ${TIP.y - 8}) rotate(-24)`}><Lancet /></g></g>
          <Callout x={TIP.x} y={TIP.y + 2} tx={300} ty={296} label="SIDE OF THE FINGERTIP" anchor="end" />
        </>
      )}
      {step === 2 && <circle className="cue-fill" data-art="drop" cx={TIP.x + 7} cy={TIP.y - 6} r="4.5" />}
      {step >= 2 && (
        <g data-art="meter"><g transform={`translate(${step === 2 ? TIP.x + 50 : 396} ${step === 2 ? TIP.y - 6 : 120})`}><Meter /></g></g>
      )}
      {step === 2 && <Callout x={TIP.x + 7} y={TIP.y - 6} tx={300} ty={296} label="SMALL DROP ON THE STRIP" anchor="end" />}
      {step === 3 && <Callout x={427} y={98} tx={300} ty={296} label="READ, THEN RECORD" anchor="end" />}
    </>
  );
}

const glucoseMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'water'), { y: -26, opacity: 0, duration: 0.7, stagger: 0.18, ease: 'power2.in' });
    return revealCallouts(tl, root);
  },
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'lancet'), { x: 34, y: -70, duration: 1, ease: 'power3.out' });
    tl.to(q(root, 'lancet'), { x: -2, y: 3, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    return revealCallouts(tl, root);
  },
  2: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'drop'), { scale: 0, transformOrigin: '50% 100%', duration: 0.5, ease: 'back.out(2)' });
    tl.from(q(root, 'meter'), { x: 70, opacity: 0, duration: 0.9, ease: 'power2.out' });
    return revealCallouts(tl, root);
  },
  3: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'meter'), { y: 60, x: -20, duration: 0.8, ease: 'power2.inOut' });
    revealCallouts(tl, root);
    tl.to(q(root, 'ring'), { scale: 1.3, transformOrigin: '50% 50%', duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    return tl;
  },
};

/* --------------------------------------------------------- consciousness */

const ACVPU = [
  ['A', 'ALERT'],
  ['C', 'NEW CONFUSION'],
  ['V', 'RESPONDS TO VOICE'],
  ['P', 'RESPONDS TO PAIN'],
  ['U', 'UNRESPONSIVE'],
] as const;
const ROW = (i: number) => 64 + i * 40;

function ConsciousnessPlate({ step }: { step: number }) {
  return (
    <>
      <Bust />
      {ACVPU.map(([letter, word], i) => (
        <g key={letter} data-art="row">
          <rect className="l" x="300" y={ROW(i) - 12} width="22" height="22" rx="2" />
          <text className="lbl" x="311" y={ROW(i) + 4} textAnchor="middle">{letter}</text>
          <text className="lbl" x="332" y={ROW(i) + 4}>{word}</text>
        </g>
      ))}
      <rect className="cue" data-art="marker" x="295" y={ROW(step === 0 ? 0 : 1) - 17} width="180" height="32" rx="3" />
      {step === 0 && <path className="h" data-art="sight" d={`M190 96L292 ${ROW(0)}`} />}
      {step === 1 && (
        <g data-art="bracket">
          <path className="l" d={`M290 ${ROW(1) - 12}H284V${ROW(4) + 10}H290`} />
          <text className="lbl" x="300" y={ROW(4) + 34}>C TO U = 3 POINTS EACH</text>
        </g>
      )}
      <text className="lbl" x="470" y="296" textAnchor="end">{step === 0 ? 'AWAKE AND ORIENTED' : 'ASSUME CONFUSION IS NEW'}</text>
    </>
  );
}

const consciousnessMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'row'), { opacity: 0, x: 10, duration: 0.3, stagger: 0.12, ease: 'power2.out' });
    tl.from(q(root, 'marker'), { opacity: 0, scale: 0.9, transformOrigin: '50% 50%', duration: 0.4 });
    tl.from(q(root, 'sight'), { opacity: 0, duration: 0.4 });
    return tl;
  },
  1: (root) => {
    const tl = gsap.timeline();
    // The marker steps down the scale once, then rests on new confusion.
    tl.from(q(root, 'marker'), { y: -40, duration: 0.5, ease: 'power2.out' });
    tl.to(q(root, 'marker'), { y: 120, duration: 1.2, ease: 'steps(3)' });
    tl.to(q(root, 'marker'), { y: 0, duration: 0.5, ease: 'power2.inOut' });
    tl.from(q(root, 'bracket'), { opacity: 0, x: 8, duration: 0.5 }, '<');
    return tl;
  },
};

/* ------------------------------------------------------------------ sleep */

function SleepPlate({ step }: { step: number }) {
  return (
    <>
      {/* Crew quarters wall, a sleeping bag tethered to it, the sleeper inside. */}
      <rect className="b" x="28" y="14" width="8" height="296" rx="2" />
      <path className="l" d="M36 92H74M36 270H74" />
      <Anatomy view={anatomy.body} transform="translate(56 26) scale(0.64)" scale={0.64} />
      <rect className="b" x="66" y="84" width="76" height="222" rx="34" />
      <path className="t" d="M104 100V290" />
      <g data-art="timeline">
        <path className="t" d="M216 150H452" />
        <g data-art="mark">
          <circle className="cue" cx="240" cy="150" r="9" />
          <text className="lbl" x="240" y="126" textAnchor="middle">ASLEEP</text>
        </g>
        <g data-art="mark">
          <circle className="cue" cx="428" cy="150" r="9" />
          <text className="lbl" x="428" y="126" textAnchor="middle">AWAKE</text>
        </g>
      </g>
      {step === 1 && (
        <g data-art="span">
          <path className="l" d="M240 176V186H428V176" pathLength={1} strokeDasharray="1" data-art="span-line" />
          <text className="lbl" x="334" y="210" textAnchor="middle">HOURS SLEPT</text>
          <text className="lbl" x="334" y="228" textAnchor="middle">SINCE LAST CHECK-IN</text>
        </g>
      )}
      <text className="lbl" x="216" y="292">{step === 0 ? 'NOTE WHEN YOU SLEPT AND WOKE' : 'RECORD THE HOURS'}</text>
    </>
  );
}

const sleepMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'mark'), { scale: 0.4, opacity: 0, transformOrigin: '50% 50%', duration: 0.45, stagger: 0.5, ease: 'back.out(2)' });
    return tl;
  },
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'span-line'), { strokeDashoffset: 1, duration: 1.2, ease: 'power2.inOut' });
    tl.from(root.querySelectorAll('[data-art="span"] text'), { opacity: 0, duration: 0.4, stagger: 0.15 });
    return tl;
  },
};

/* ------------------------------------------------------------------- mood */

const BOXES = [1, 2, 3, 4, 5];
const BOX_X = (n: number) => 262 + (n - 1) * 40;

function MoodPlate({ step }: { step: number }) {
  return (
    <>
      <Bust />
      {step === 0 && (
        <>
          <g data-art="pause">
            <rect className="cue" x="224" y="58" width="7" height="26" rx="1" />
            <rect className="cue" x="238" y="58" width="7" height="26" rx="1" />
          </g>
          <Callout x={132} y={84} tx={290} ty={292} label="TAKE A MOMENT" />
        </>
      )}
      {step === 1 && (
        <>
          {BOXES.map((n) => (
            <g key={n} data-art="box">
              <rect className="l" x={BOX_X(n)} y="130" width="28" height="28" rx="3" />
              <text className="lbl" x={BOX_X(n) + 14} y="180" textAnchor="middle">{n}</text>
            </g>
          ))}
          {/* Hidden at rest so the still drawing never looks like a chosen rating. */}
          <rect className="cue" data-art="scan" x={BOX_X(1) - 5} y="125" width="38" height="38" rx="4" opacity="0" />
          <text className="lbl" x={BOX_X(1)} y="206">VERY LOW</text>
          <text className="lbl" x={BOX_X(5) + 28} y="206" textAnchor="end">VERY GOOD</text>
          <text className="lbl" x="262" y="292">YOUR OWN RATING, 1 TO 5</text>
        </>
      )}
    </>
  );
}

const moodMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'pause'), { opacity: 0, duration: 0.5 });
    return revealCallouts(tl, root);
  },
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'box'), { opacity: 0, y: 8, duration: 0.3, stagger: 0.12, ease: 'power2.out' });
    // The frame passes over every box and leaves none chosen: the rating is yours.
    tl.fromTo(q(root, 'scan'), { x: 0, opacity: 1 }, { x: 160, duration: 1.6, ease: 'steps(4)' });
    tl.to(q(root, 'scan'), { opacity: 0, duration: 0.4 });
    return tl;
  },
};

/* ---------------------------------------------------------------- oxygen */

/** Profile at (20, -40) as on the temperature plate: nose tip about (272, 140), nostril (258, 156). */
const NOSTRIL = { x: 258, y: 156 };

function OxygenPlate({ step }: { step: number }) {
  return (
    <>
      <Anatomy view={anatomy.profile} transform="translate(20 -40)" />
      {step === 0 && (
        <>
          <g data-art="air">
            {[132, 152, 172].map((y) => (
              <path key={y} className="cue" d={`M392 ${y}Q370 ${y - 8} 350 ${y}T306 ${y}M314 ${y - 6}L305 ${y}L314 ${y + 6}`} />
            ))}
          </g>
          <text className="lbl" x="352" y="112" textAnchor="middle">CABIN AIR</text>
          <text className="lbl" x="470" y="296" textAnchor="end">AIR OR ADDED OXYGEN?</text>
        </>
      )}
      {step === 1 && (
        <>
          <g data-art="cannula">
            <path className="l" data-art="tube" pathLength={1} strokeDasharray="1"
              d={`M${NOSTRIL.x} ${NOSTRIL.y}C236 150 198 142 172 130C148 118 136 136 148 162L162 320`} />
            <rect className="b" x={NOSTRIL.x - 8} y={NOSTRIL.y - 4} width="12" height="8" rx="3" />
          </g>
          <g data-art="supply">
            <path className="l" d="M160 300C220 300 300 290 380 250" />
            <rect className="b" x="372" y="206" width="44" height="66" rx="8" />
            <path className="t" d="M384 220V258M404 220V258" />
          </g>
          <Callout x={NOSTRIL.x - 2} y={NOSTRIL.y} tx={340} ty={110} label="ANY ADDED OXYGEN" />
          <text className="lbl" x="346" y="128">= ON OXYGEN</text>
        </>
      )}
    </>
  );
}

const oxygenMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'air'), { x: 40, opacity: 0, duration: 1.1, ease: 'power2.out' });
    tl.to(q(root, 'air'), { x: -8, duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    return tl;
  },
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'tube'), { strokeDashoffset: 1, duration: 1.2, ease: 'power2.inOut' });
    tl.from(q(root, 'supply'), { opacity: 0, x: 20, duration: 0.5 }, '-=0.3');
    return revealCallouts(tl, root);
  },
};

/* -------------------------------------------------------------- reaction */

const SIGNAL = { x: 300, y: 220 };

function ReactionPlate({ step }: { step: number }) {
  return (
    <>
      {step === 0 && (
        <>
          <Bust />
          <Dial cx={404} cy={92} r={32} label="SAME TIME" />
          <Callout x={132} y={84} tx={290} ty={292} label="RESTED AND QUIET" />
        </>
      )}
      {step === 1 && (
        <>
          <g data-art="device">
            <rect className="b" x="168" y="150" width="224" height="146" rx="12" />
            <rect className="l" x="182" y="162" width="196" height="122" rx="3" />
          </g>
          <g data-art="signal">
            <circle className="cue" cx={SIGNAL.x} cy={SIGNAL.y} r="18" />
            <circle className="cue-fill" cx={SIGNAL.x} cy={SIGNAL.y} r="7" />
          </g>
          <g data-art="finger">
            <g transform={`translate(${SIGNAL.x - 45.9} ${SIGNAL.y - 147.6}) scale(0.9)`}>
              <Anatomy view={anatomy.dorsal_r_s} scale={0.9} />
            </g>
          </g>
          <text className="lbl" x="160" y="120" textAnchor="end">TAP AS SOON</text>
          <text className="lbl" x="160" y="138" textAnchor="end">AS IT APPEARS</text>
        </>
      )}
      {step === 2 && (
        <>
          <path className="l" d="M60 70V270H440" />
          <g data-art="band">
            <path className="h" d="M60 150H440M60 210H440" />
            <text className="lbl" x="66" y="142">YOUR USUAL</text>
          </g>
          {[[100, 182], [140, 170], [180, 194], [220, 176], [260, 188], [300, 168], [340, 184]].map(([x, y]) => (
            <circle key={x} className="ink" data-art="dot" cx={x} cy={y} r="4" />
          ))}
          <g data-art="today">
            <circle className="ink" cx="400" cy="176" r="4" />
          </g>
          <Callout x={400} y={176} tx={250} ty={296} label="COMPARE WITH YOUR OWN" />
        </>
      )}
    </>
  );
}

const reactionMotion: Record<number, ArtMotion> = {
  0: (root) => revealCallouts(sweep(gsap.timeline(), root, 404, 92, 2), root, 0.3),
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'device'), { opacity: 0, y: 12, duration: 0.5 });
    // The signal appears after a pause, then the finger meets it: an illustration, not a test.
    tl.from(q(root, 'signal'), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', duration: 0.25, ease: 'back.out(3)' }, '+=0.8');
    tl.from(q(root, 'finger'), { y: -90, duration: 0.35, ease: 'power3.in' }, '+=0.1');
    return tl;
  },
  2: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'band'), { opacity: 0, duration: 0.5 });
    tl.from(q(root, 'dot'), { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.2, stagger: 0.1 });
    tl.from(q(root, 'today'), { opacity: 0, duration: 0.3 });
    return revealCallouts(tl, root);
  },
};

/* -------------------------------------------------------------- exercise */

function ExercisePlate() {
  return (
    <>
      {/* Treadmill with a harness, as on station: the bungees hold the runner to the deck. */}
      <Anatomy view={anatomy.body} transform="translate(150 26) scale(0.62)" scale={0.62} />
      <g data-art="harness">
        <path className="l" d="M188 148L122 292M200 148L286 292" />
        <rect className="b" x="176" y="140" width="34" height="12" rx="3" />
      </g>
      <rect className="b" x="104" y="292" width="200" height="12" rx="4" />
      <path className="cue" data-art="belt" d="M112 292H296" strokeDasharray="10 8" />
      <g data-art="log">
        <rect className="b" x="338" y="96" width="122" height="112" rx="4" />
        <text className="lbl" x="350" y="122">TODAY</text>
        <text className="lbl" x="350" y="152">RESISTANCE</text>
        <rect className="l" x="350" y="160" width="40" height="14" rx="2" />
        <text className="lbl" x="396" y="171">MIN</text>
        <text className="lbl" x="350" y="192">AEROBIC</text>
        <rect className="l" x="414" y="181" width="34" height="14" rx="2" />
      </g>
      <Callout x={338} y={150} tx={292} ty={70} label="LOG TODAY'S MINUTES" />
    </>
  );
}

const exerciseMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'harness'), { opacity: 0, duration: 0.5 });
    tl.fromTo(q(root, 'belt'), { strokeDashoffset: 0 }, { strokeDashoffset: 72, duration: 2, ease: 'none' }, 0);
    tl.from(q(root, 'log'), { opacity: 0, x: 16, duration: 0.5, ease: 'power2.out' }, 0.8);
    return revealCallouts(tl, root);
  },
};

/* -------------------------------------------------------- blood chemistry */

/** A cartridge analyzer: fingertip sample, then three blank result rows. Values are never drawn. */
function BloodChemistryPlate({ step }: { step: number }) {
  return (
    <>
      {step === 0 && (
        <>
          <Anatomy view={anatomy.dorsal_l} transform="translate(0 268) rotate(-90)" />
          <circle className="cue-fill" data-art="drop" cx={TIP.x + 7} cy={TIP.y - 6} r="4.5" />
          <g data-art="cartridge">
            <g transform={`translate(${TIP.x + 12} ${TIP.y - 30}) rotate(-12)`}>
              <rect className="b" x="0" y="0" width="70" height="28" rx="4" />
              <path className="t" d="M8 14H44" />
              <circle className="l" cx="56" cy="14" r="5" />
            </g>
          </g>
          <Callout x={TIP.x + 7} y={TIP.y - 6} tx={300} ty={296} label="SAMPLE AS INSTRUCTED" anchor="end" />
        </>
      )}
      {step === 1 && (
        <>
          <g data-art="analyzer">
            <rect className="b" x="120" y="54" width="240" height="214" rx="12" />
            <rect className="l" x="138" y="72" width="204" height="126" rx="3" />
            {['CA', 'NA', 'K'].map((label, i) => (
              <g key={label} data-art="row">
                <text className="lbl" x="154" y={106 + i * 34}>{label}</text>
                <rect className="l" x="200" y={92 + i * 34} width="90" height="20" rx="2" />
                <text className="lbl" x="300" y={106 + i * 34}>{label === 'CA' ? 'MG/DL' : 'MMOL/L'}</text>
              </g>
            ))}
            <rect className="l" x="138" y="214" width="70" height="36" rx="4" />
            <circle className="l" cx="320" cy="232" r="12" />
          </g>
          <Callout x={240} y={198} tx={120} ty={300} label="RECORD EACH WITH ITS TIME" />
        </>
      )}
    </>
  );
}

const bloodChemistryMotion: Record<number, ArtMotion> = {
  0: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'drop'), { scale: 0, transformOrigin: '50% 100%', duration: 0.5, ease: 'back.out(2)' });
    tl.from(q(root, 'cartridge'), { x: 60, opacity: 0, duration: 0.9, ease: 'power2.out' });
    return revealCallouts(tl, root);
  },
  1: (root) => {
    const tl = gsap.timeline();
    tl.from(q(root, 'analyzer'), { opacity: 0, y: 14, duration: 0.6, ease: 'power2.out' });
    tl.from(q(root, 'row'), { opacity: 0, x: -8, duration: 0.3, stagger: 0.25 });
    return revealCallouts(tl, root);
  },
};

/* ------------------------------------------------------------------ entry */

const routinePlates: Record<RoutinePlateId, { title: string; Plate: (props: { step: number }) => React.JSX.Element; motion: Record<number, ArtMotion> }> = {
  bloodPressure: { title: 'Upper-arm blood pressure', Plate: BloodPressurePlate, motion: bloodPressureMotion },
  respiration: { title: 'Counting breaths', Plate: RespirationPlate, motion: respirationMotion },
  glucose: { title: 'Fingertip glucose test', Plate: GlucosePlate, motion: glucoseMotion },
  consciousness: { title: 'Alertness scale (ACVPU)', Plate: ConsciousnessPlate, motion: consciousnessMotion },
  sleep: { title: 'Sleep log', Plate: SleepPlate, motion: sleepMotion },
  mood: { title: 'Mood self-rating', Plate: MoodPlate, motion: moodMotion },
  oxygen: { title: 'Cabin air or supplemental oxygen', Plate: OxygenPlate, motion: oxygenMotion },
  reaction: { title: 'Reaction-time task', Plate: ReactionPlate, motion: reactionMotion },
  exercise: { title: 'Exercise log', Plate: ExercisePlate, motion: exerciseMotion },
  bloodChemistry: { title: 'Blood chemistry panel', Plate: BloodChemistryPlate, motion: bloodChemistryMotion },
};

export function RoutineArt({ guide, step, description, count }: { guide: RoutinePlateId; step: number; description: string; count: number }) {
  const { title, Plate, motion } = routinePlates[guide];
  return (
    <ArtFrame title={title} description={description} kicker={`Fig. ${step + 1} / ${count}`} motion={motion[step]} poseKey={`${guide}-${step}`}>
      <Plate step={step} />
    </ArtFrame>
  );
}
