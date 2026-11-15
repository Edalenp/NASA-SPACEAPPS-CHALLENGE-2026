import type { BustDrive } from './Bust';
import { heroClock, heroColour, PHASES, type Phase } from './heroClock';

/** The heart and breathing rates behind each state, the same the readings show. */
const RATES: Record<Phase, { bpm: number; rpm: number }> = {
  normal: { bpm: 72, rpm: 14 },
  watch: { bpm: 108, rpm: 23 },
  alert: { bpm: 134, rpm: 27 },
};

/** Kept free of three's runtime so the hero's first chunk stays light; the bust loads it lazily. */
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const scratch: [number, number, number] = [0, 0, 0];
const rates = { bpm: 72, rpm: 14 };

/**
 * The hero's drive: the whole body in the state the hero's clock is in (the liquid's colours),
 * the head following the pointer, framed chest up on the bottom edge. The bottom edge crosses the
 * chest just below the heart (so its beat shows) and the crown sits about half way down, clear of
 * the call to action above it. It writes where the head and heart are
 * on screen for the readings.
 */
export function heroDrive(): BustDrive & { attach(node: HTMLElement | null): void } {
  let target: HTMLElement | null = null;
  return {
    attach(node) { target = node; },
    tick: () => undefined,
    rates() {
      const phase = PHASES[heroClock.phase];
      const next = PHASES[(heroClock.phase + 1) % PHASES.length];
      rates.bpm = RATES[phase].bpm + (RATES[next].bpm - RATES[phase].bpm) * heroClock.mix;
      rates.rpm = RATES[phase].rpm + (RATES[next].rpm - RATES[phase].rpm) * heroClock.mix;
      return rates;
    },
    skin(out) { heroColour(0, scratch); out.setRGB(scratch[0], scratch[1], scratch[2]); },
    paint(_system, light, deep) {
      heroColour(2, scratch); deep.setRGB(scratch[0], scratch[1], scratch[2]);
      heroColour(1, scratch); light.setRGB(scratch[0], scratch[1], scratch[2]);
      return 1;
    },
    gaze(head) {
      // Positive screen Y is up; an upward gaze is a negative rotation about local X.
      return [
        clamp((heroClock.pointer.x - head.x) * 1.1, -0.7, 0.7),
        clamp((head.y - heroClock.pointer.y) * 0.75, -0.45, 0.35),
      ];
    },
    view(aspect) {
      const [bottom, span] = aspect >= 1 ? [1.22, 1.02] : [1.18, Math.max(1.08, 0.62 / aspect)];
      return { x: 0, y: bottom + span / 2, span };
    },
    frame({ head, heart }) {
      heroClock.heart.x = heart.x;
      heroClock.heart.y = heart.y;
      // The readings sit around the head and heart, through CSS variables on the hero.
      if (!target) return;
      target.style.setProperty('--head-x', `${head.x * 100}%`);
      target.style.setProperty('--head-y', `${(1 - head.y) * 100}%`);
      target.style.setProperty('--heart-x', `${heart.x * 100}%`);
      target.style.setProperty('--heart-y', `${(1 - heart.y) * 100}%`);
    },
  };
}
