import type { SystemId } from '../../data/mission';
import { systems } from '../../data/mission';
import type { BustDrive } from '../hero/Bust';
import { PALETTES } from '../hero/heroClock';

export type StepId = 'measure' | 'read' | 'tell' | 'act';
type Look = 'none' | 'normal' | 'watch' | 'alert';

/** A note on the body: the organ it points at, the reading, and what the step asks of the crew. */
export interface TwinNote { system: SystemId; label: string; value: string; todo: string; look: Look }

/** Where the camera goes: the whole body, the chest, one lung or the heart, and how much it sees
 *  (metres of height) as the step opens and after its slow push in. */
type Focus = 'body' | 'chest' | 'lung' | 'heart';
interface Shot { focus: Focus; span: [number, number] }

interface Stage {
  shot: Shot;
  /** Each system's state; any system not listed takes `rest`. */
  look: Partial<Record<SystemId, Look>>;
  rest: Look;
  /** Opacity of the systems not in focus. */
  dim: number;
  bpm: number;
  rpm: number;
  notes: TwinNote[];
}

/**
 * What the twin shows at each step, with the lab's own rules: grey without data, green when well,
 * amber or red when something needs a look. Figures follow NEWS2 (RCP 2017): respiration 21 to 24
 * scores 2, a pulse of 91 to 110 scores 1, a pulse of 131 or more scores 3.
 */
export const STAGES: Record<StepId, Stage> = {
  measure: {
    shot: { focus: 'chest', span: [0.62, 0.5] },
    look: { heart: 'normal', lungs: 'normal' }, rest: 'none', dim: 0.45, bpm: 72, rpm: 14,
    notes: [
      { system: 'heart', label: 'Pulse', value: '72 bpm', todo: 'Two fingers at the wrist, count 60 s', look: 'normal' },
      { system: 'lungs', label: 'Respiration', value: '14 /min', todo: 'Count breaths at rest for 60 s', look: 'normal' },
    ],
  },
  read: {
    shot: { focus: 'body', span: [1.08, 0.96] },
    look: { lungs: 'watch' }, rest: 'normal', dim: 1, bpm: 84, rpm: 23,
    notes: [
      { system: 'lungs', label: 'Lungs · respiration 23', value: 'Watch', todo: 'Rest, then measure again', look: 'watch' },
      { system: 'head', label: 'Head · alert', value: 'Normal', todo: 'Nothing to do today', look: 'normal' },
    ],
  },
  tell: {
    shot: { focus: 'lung', span: [0.46, 0.36] },
    look: { lungs: 'watch', heart: 'watch' }, rest: 'none', dim: 0.35, bpm: 108, rpm: 23,
    notes: [
      { system: 'lungs', label: 'Respiration 23', value: '+2 points', todo: 'Named as the cause of the alert', look: 'watch' },
      { system: 'heart', label: 'Pulse 108', value: '+1 point', todo: 'NEWS2 3: observe every 4 to 6 h', look: 'watch' },
    ],
  },
  act: {
    shot: { focus: 'heart', span: [0.32, 0.24] },
    look: { heart: 'alert' }, rest: 'none', dim: 0.3, bpm: 134, rpm: 27,
    notes: [{ system: 'heart', label: 'Pulse 134 · +3 points', value: 'Act now', todo: 'Start the guided protocol on board', look: 'alert' }],
  },
};

const GREY: [number, number, number][] = [[0.86, 0.87, 0.82], [0.62, 0.64, 0.58], [0.3, 0.32, 0.28]];
const stops = (look: Look) => (look === 'none' ? GREY : PALETTES[look]);
const PIN = new Map(systems.map((system) => [system.id, system.pin]));
/** The organ each system's note points at, when the model gives it. */
const ORGAN: Partial<Record<SystemId, string>> = { heart: 'heart', lungs: 'lung', head: 'brain', immune: 'liver' };

interface Paint { light: number[]; deep: number[]; opacity: number }
const ease = (from: number, to: number, k: number) => from + (to - from) * k;
const smooth = (t: number) => t * t * (3 - 2 * t);
const WIDEST = 1.08, CLOSEST = 0.24;
/** A note's line length to its card and the card's margin from the frame's edge, px (sections.css). */
const LEAD = 84, EDGE = 16;

/**
 * The features section's drive. Each step sets a target look per system and a shot, and the twin
 * eases towards both: the body changes state while the camera travels, from the whole body out
 * to a few centimetres over the lung or the heart behind an alert, then pushes in slowly while
 * the step holds. The head follows the pointer; notes on the body follow the organs they name.
 */
export function twinDrive() {
  let stage = STAGES.measure;
  let k = 0;
  let held = 0;
  let time = 0;
  const paints = new Map<SystemId, Paint>();
  const rates = { bpm: stage.bpm, rpm: stage.rpm };
  const organs: Record<string, [number, number, number]> = { heart: [0.02, 1.36, 0.03], lung: [-0.09, 1.38, 0.0], brain: [0, 1.66, 0], liver: [-0.06, 1.12, 0.04] };
  const camera = { x: 0, y: 1.3, z: 0, log: Math.log(0.62) };
  const view = { x: 0, y: 1.3, z: 0, span: 0.62 };
  let overlay: HTMLElement | null = null;
  let field: HTMLElement | null = null;
  let shown = '';

  const target = (focus: Focus): [number, number, number] => {
    const { heart, lung } = organs;
    if (focus === 'heart') return heart;
    if (focus === 'lung') return lung;
    if (focus === 'chest') return [(heart[0] + lung[0]) / 2, heart[1] + 0.03, heart[2]];
    return [0, 1.36, 0];
  };

  const drive: BustDrive & { pointer: { x: number; y: number }; show(step: StepId): void; attach(node: HTMLElement | null): void } = {
    airways: true,
    pointer: { x: 0, y: 0 },
    show(step) { if (STAGES[step] !== stage) { stage = STAGES[step]; held = 0; } },
    attach(node) { overlay = node; field = node?.parentElement?.querySelector('.twin-hud-field') ?? null; },
    setup(anchors) {
      if (anchors.heart) organs.heart = anchors.heart;
      if (anchors.brain) organs.brain = anchors.brain;
      if (anchors.liver) organs.liver = anchors.liver;
      // The lung on the viewer's left, so its note and the heart's sit on opposite sides.
      const lungs = [anchors.lung_l, anchors.lung_r].filter(Boolean).sort((a, b) => a[0] - b[0]);
      if (lungs[0]) organs.lung = lungs[0];
    },
    tick(delta) {
      k = 1 - Math.exp(-delta * 3);
      held += delta;
      time += delta;
      rates.bpm = ease(rates.bpm, stage.bpm, k);
      rates.rpm = ease(rates.rpm, stage.rpm, k);
    },
    rates: () => rates,
    skin(out) { out.setRGB(0.78, 0.82, 0.74); },
    paint(system, light, deep) {
      const look = stage.look[system] ?? stage.rest;
      const goal = stops(look);
      const opacity = stage.look[system] ? 1 : stage.dim;
      let paint = paints.get(system);
      if (!paint) { paint = { light: [...goal[1]], deep: [...goal[2]], opacity }; paints.set(system, paint); }
      for (let i = 0; i < 3; i++) {
        paint.light[i] = ease(paint.light[i], goal[1][i], k);
        paint.deep[i] = ease(paint.deep[i], goal[2][i], k);
      }
      paint.opacity = ease(paint.opacity, opacity, k);
      // Close up, the gel's layers stack in depth; thin them so the organ keeps its form.
      const close = Math.min(1, Math.max(0, Math.log(WIDEST / view.span) / Math.log(WIDEST / CLOSEST)));
      light.setRGB(paint.light[0], paint.light[1], paint.light[2]);
      deep.setRGB(paint.deep[0], paint.deep[1], paint.deep[2]);
      return paint.opacity * (1 - close * 0.45);
    },
    gaze(head) {
      const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
      return [clamp((drive.pointer.x - head.x) * 1.1, -0.7, 0.7), clamp((head.y - drive.pointer.y) * 0.75, -0.45, 0.35)];
    },
    view(aspect, delta) {
      // The travel eases in log space, so a zoom from the whole body to the heart feels even.
      const [open, close] = stage.shot.span;
      const narrow = aspect < 0.8 ? 0.8 / aspect : 1;
      const span = (open + (close - open) * smooth(Math.min(1, held / 9))) * narrow;
      const [x, y, z] = target(stage.shot.focus);
      const travel = 1 - Math.exp(-delta * 1.7);
      camera.x = ease(camera.x, x, travel);
      camera.y = ease(camera.y, y, travel);
      camera.z = ease(camera.z, z, travel);
      camera.log = ease(camera.log, Math.log(span), travel);
      view.span = Math.exp(camera.log);
      // A hand-held drift, proportional to what is in view.
      view.x = camera.x + Math.sin(time * 0.37) * view.span * 0.025;
      view.y = camera.y + Math.sin(time * 0.26 + 1) * view.span * 0.02;
      view.z = camera.z;
      return view;
    },
    frame({ project }) {
      if (!overlay) return;
      const zoom = Math.log(WIDEST / view.span) / Math.log(WIDEST / CLOSEST);
      overlay.parentElement?.style.setProperty('--zoom', zoom.toFixed(3));
      const label = `${Math.round(view.span * 100)} cm`;
      if (field && label !== shown) { field.textContent = label; shown = label; }
      const frameWidth = overlay.clientWidth;
      overlay.querySelectorAll<HTMLElement>('[data-system]').forEach((note) => {
        const system = note.dataset.system as SystemId;
        const organ = ORGAN[system];
        const at3 = (organ && organs[organ]) ?? PIN.get(system);
        if (!at3) return;
        const at = project(at3[0], at3[1], at3[2]);
        note.style.setProperty('--x', `${at.x * 100}%`);
        note.style.setProperty('--y', `${(1 - at.y) * 100}%`);
        // Labels open towards the inside of the frame near its edges, else away from the body's centre.
        const side = at.x > 0.62 ? 'left' : at.x < 0.38 ? 'right' : at3[0] < 0 ? 'left' : 'right';
        if (note.dataset.side !== side) note.dataset.side = side;
        // Slide the card along its line so it never leaves the frame (widths measured once).
        const card = note.firstElementChild as HTMLElement | null;
        if (!card) return;
        const width = Number(card.dataset.width) || (card.dataset.width = String(card.offsetWidth), card.offsetWidth);
        const anchor = at.x * frameWidth;
        const left = side === 'right' ? anchor + LEAD : anchor - LEAD - width;
        const shift = Math.min(0, frameWidth - EDGE - (left + width)) + Math.max(0, EDGE - left);
        note.style.setProperty('--shift', `${Math.round(shift)}px`);
      });
    },
  };
  return drive;
}
