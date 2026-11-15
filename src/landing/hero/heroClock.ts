import { create } from 'zustand';

export type Phase = 'normal' | 'watch' | 'alert';
export const PHASES: Phase[] = ['normal', 'watch', 'alert'];

/** Aura stops per state, light corner to deep corner (the console's tokens, as sRGB triples). */
const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number];
export const PALETTES: Record<Phase, [number, number, number][]> = {
  normal: ['#f7c99c', '#8fcf5c', '#26893a'].map(hex),
  watch: ['#ffe27a', '#f99a35', '#e2552a'].map(hex),
  alert: ['#ffb6c6', '#f2526c', '#b8173a'].map(hex),
};

/** Seconds each state holds before the next impact, and how fast the liquid flows in it. */
const HOLD: Record<Phase, number> = { normal: 7, watch: 6, alert: 6 };
const FLOW: Record<Phase, number> = { normal: 0.12, watch: 0.16, alert: 0.21 };
const IMPACT = 3;

/**
 * The hero's shared clock, written in place every frame (no React renders): the liquid, the
 * body and the readings all read it, so they change state together. The state cycles normal →
 * watch → alert → normal; each change lands as an impact: a burst of speed and a ripple from
 * the heart while the colours turn. Slow on purpose: a swell, never a jolt.
 */
export const heroClock = {
  flow: 0,
  phase: 0,
  /** 0 → 1 across an impact: how far the colours have turned towards the next state. */
  mix: 0,
  /** The impact's envelope: a sharp attack and a long decay. */
  impact: 0,
  /** Seconds since the current impact began (drives the ripple radius). */
  ripple: 10,
  held: 0,
  /** Pointer in normalised device coordinates. */
  pointer: { x: 0, y: 0 },
  /** The heart on screen (0–1, from the bottom left), where an impact's ripple starts. */
  heart: { x: 0.66, y: 0.42 },
  /** A state the page holds the liquid in (the features section's step), or null to cycle. */
  lock: null as Phase | null,
};

export const useHeroPhase = create<{ phase: Phase }>(() => ({ phase: 'normal' }));

const smooth = (t: number) => t * t * (3 - 2 * t);

export function tickHero(dt: number, reduced: boolean) {
  const c = heroClock;
  const current = PHASES[c.phase];
  const next = PHASES[(c.phase + 1) % PHASES.length];
  c.held += dt;
  // Held: stay in the locked state, or move on to it at once.
  const hold = c.lock ? (current === c.lock ? Infinity : 0) : HOLD[current];
  if (c.held < hold) {
    c.mix = 0;
    c.impact = Math.max(0, c.impact - dt * 1.5);
  } else {
    const t = Math.min(1, (c.held - hold) / IMPACT);
    c.ripple = c.held - hold;
    c.mix = reduced ? 1 : smooth(t);
    const age = c.held - hold;
    // A swell rather than a hit: it rises over 0.6 s and ebbs slowly.
    c.impact = age < 0.6 ? smooth(age / 0.6) : Math.exp(-(age - 0.6) * 1.3);
    if (c.mix >= 0.5 && useHeroPhase.getState().phase !== next) useHeroPhase.setState({ phase: next });
    if (t >= 1) {
      c.phase = (c.phase + 1) % PHASES.length;
      c.held = 0;
      c.mix = 0;
    }
  }
  if (!reduced) c.flow += dt * (FLOW[current] + (FLOW[next] - FLOW[current]) * c.mix + c.impact * 0.7);
}

/** The colour between the current state and the next, for anything tinted by the hero's state. */
export function heroColour(stop: 0 | 1 | 2, out: [number, number, number]) {
  const a = PALETTES[PHASES[heroClock.phase]][stop];
  const b = PALETTES[PHASES[(heroClock.phase + 1) % PHASES.length]][stop];
  for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * heroClock.mix;
  return out;
}
