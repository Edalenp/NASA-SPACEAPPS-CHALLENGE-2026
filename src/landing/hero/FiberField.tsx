import { lazy, Suspense, useState } from 'react';
import GhostFibers, { type FiberFrame } from './GhostFibers';
import { heroClock, heroColour, PHASES, tickHero, type Phase } from './heroClock';
import { markLoaded } from '../loadState';

/** Mean seconds between contractions in each state; each wait varies around it. */
const CONTRACTION: Record<Phase, number> = { normal: 5, watch: 3.4, alert: 2.3 };
/** The page ground's current contraction, which the plate's fibres follow. */
const shared = { tension: 0 };
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
const between = (low: number, high: number) => low + Math.random() * (high - low);

/**
 * A muscle's contractions, never twice the same: after a varied rest it pulls in over most of a
 * second to a varied strength, holds with a faint tremor, and lets go slowly; under it the bundle
 * breathes a little all the time. The result passes through a soft spring, so every change eases.
 */
function contractions() {
  let stage: 'rest' | 'pull' | 'hold' | 'release' = 'rest';
  let clock = 0, length = between(1, 2.5), strength = 0, value = 0, time = 0;
  return (dt: number, mean: number, impact: number) => {
    time += dt;
    clock += dt;
    let target = 0;
    if (stage === 'rest') {
      if (clock >= length) { stage = 'pull'; clock = 0; length = between(0.6, 1.2); strength = between(0.45, 1); }
    } else if (stage === 'pull') {
      target = strength * sine(clock / length);
      if (clock >= length) { stage = 'hold'; clock = 0; length = between(0.15, 0.7); }
    } else if (stage === 'hold') {
      target = strength * (1 + 0.04 * Math.sin(time * 31) * Math.sin(time * 7));
      if (clock >= length) { stage = 'release'; clock = 0; length = between(1.3, 2.6); }
    } else {
      target = strength * (1 - sine(clock / length));
      if (clock >= length) { stage = 'rest'; clock = 0; length = mean * between(0.55, 1.45); }
    }
    const breath = 0.08 * (0.5 + 0.5 * Math.sin(time * 0.9));
    const goal = Math.min(1, Math.max(target, impact * 0.85) + breath);
    value += (goal - value) * (1 - Math.exp(-dt / 0.16));
    return value;
  };
}

const LiquidField = lazy(() => import('./LiquidField'));

const supportsWebGL2 = () => {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};

/**
 * The page's ground: bundles of muscle fibre in the state's colours, striated (short dashes along
 * each fibre), twisting slowly. It runs the hero's shared clock, so it turns with the body and the
 * readings: a state change sends a pulse of light along the fibres and they quicken for a moment.
 * Without WebGL2 the liquid takes its place.
 */
export default function FiberField({ reduced, running }: { reduced: boolean; running: boolean }) {
  const [fibres] = useState(supportsWebGL2);
  const [drive] = useState(() => {
    let lastRipple = heroClock.ripple;
    const muscle = contractions();
    return (dt: number, out: FiberFrame) => {
      markLoaded('fibres');
      tickHero(dt, reduced);
      heroColour(1, out.glow);
      heroColour(2, out.secondary);
      heroColour(0, out.line);
      out.speed = 1 + heroClock.impact * 2.2;
      out.pulse = heroClock.ripple < lastRipple;
      lastRipple = heroClock.ripple;
      // The muscle contracts now and then, more often as the state worsens; a state change adds
      // its own contraction.
      out.tension = reduced ? 0 : muscle(dt, CONTRACTION[PHASES[heroClock.phase]], heroClock.impact);
      shared.tension = out.tension;
    };
  });
  if (!fibres) { markLoaded('fibres'); return <Suspense fallback={null}><LiquidField reduced={reduced} running={running} /></Suspense>; }
  return (
    <>
    {/* The liquid fills the ground beneath the fibres, dimmed so the muscle stays in front; the
        fibres run the clock, so the two turn state together. */}
    <Suspense fallback={null}><LiquidField reduced={reduced} running={running} clock={false} className="liquid-field liquid-under" /></Suspense>
    <GhostFibers
      className="fiber-field"
      drive={drive}
      paused={!running}
      dpr={1}
      layers={3}
      threads={340}
      density={1.4}
      thickness={1.15}
      fiberStyle="dashes"
      fascicles={9}
      pinch={0.7}
      twist={0.16}
      waves={0.38}
      volume={2}
      spread={2.9}
      scale={1.5}
      rotation={-14}
      perspective={0.36}
      speed={0.28}
      flow={0.14}
      rollSpeed={0.05}
      gradient="across"
      foldGlow={1.5}
      depthOfField={0.28}
      particles={0.2}
      sparkle={0.35}
      glow={1.15}
      brightness={2.9}
      vignette={0.22}
      grain={0.05}
      hoverEffect="part"
      mouseStrength={0.12}
      intro={!reduced}
    />
    </>
  );
}

/**
 * The same fibres seen closer, for a framed plate (the steps' twin): larger, calmer, no pointer.
 * It only reads the hero clock's colours (the page's ground ticks the clock), so both turn together.
 */
export function PlateFibers({ running, className }: { running: boolean; className?: string }) {
  const [fibres] = useState(supportsWebGL2);
  const [drive] = useState(() => (_dt: number, out: FiberFrame) => {
    heroColour(1, out.glow);
    heroColour(2, out.secondary);
    heroColour(0, out.line);
    out.speed = 1 + heroClock.impact * 1.5;
    out.pulse = false;
    out.tension = shared.tension;
  });
  if (!fibres) return null;
  return (
    <GhostFibers
      className={className}
      drive={drive}
      paused={!running}
      dpr={1}
      layers={2}
      threads={140}
      fascicles={6}
      pinch={0.65}
      density={1.3}
      thickness={1.1}
      fiberStyle="dashes"
      twist={0.35}
      waves={0.7}
      volume={1.2}
      spread={1.6}
      scale={1.7}
      rotation={-28}
      perspective={0.4}
      speed={0.25}
      flow={0.18}
      rollSpeed={0.05}
      gradient="across"
      foldGlow={1.1}
      depthOfField={0.9}
      particles={0.25}
      sparkle={0.25}
      glow={0.8}
      brightness={2.1}
      vignette={0.25}
      grain={0.05}
      mouseInteraction={false}
      hoverEffect="none"
      intro={false}
    />
  );
}
