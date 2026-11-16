import { create } from 'zustand';

/**
 * The lab's sound, synthesised with Web Audio (no recordings to load, so it works offline):
 * - a pad under the habitat, ethereal and very quiet;
 * - the heart, while circulation is inspected: a lub-dub on every beat of the twin's own heart,
 *   so it follows the crew member's pulse;
 * - the breath, while the lungs are inspected: filtered air that swells with the twin's breathing
 *   and follows the respiratory rate.
 * Both organs pass through a short, close room so they sound near, as through a stethoscope.
 * Browsers only start audio after a gesture, so the engine wakes on the first press in the lab.
 */

const KEY = 'vt-sound';
function stored(): boolean {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

interface SoundState { on: boolean; toggle: () => void }
export const useSound = create<SoundState>((set, get) => ({
  on: stored(),
  toggle: () => {
    const on = !get().on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* Optional preference. */ }
    set({ on });
    if (on) wake(); else engine?.fade(0);
  },
}));

type Focus = 'heart' | 'lungs' | null;

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  fade: (to: number) => void;
  heart: GainNode;
  pad: GainNode;
  voices: OscillatorNode[][];
  texture: AudioBuffer;
  breath: GainNode;
  breathFilter: BiquadFilterNode;
  close: GainNode;
}

let engine: Engine | null = null;
let mounted = false;

/** A decaying noise burst as the room's impulse: a small, soft space. */
function impulse(ctx: AudioContext, seconds: number, decay: number) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Pink-ish noise: softer than white, closer to air.
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
  }
  return buffer;
}

const F = [87.31, 220.0, 261.63, 349.23]; // F2 · A3 C4 F4
const FMAJ7 = [87.31, 220.0, 329.63, 349.23]; // F2 · A3 E4 F4 (E, F, A on top)
const BB = [116.54, 233.08, 293.66, 349.23]; // B♭2 · B♭3 D4 F4
const BBMAJ7 = [116.54, 220.0, 293.66, 349.23]; // B♭2 · A3 D4 F4
const C = [130.81, 196.0, 261.63, 329.63]; // C3 · G3 C4 E4: the first pass resolves here
// The second pass closes the loop higher, the C on top: C3 · E4 G4 C5.
const C_HIGH = [130.81, 329.63, 392.0, 523.25];
/** The pad's progression, voiced close so each change is a small step. A new chord holds two
 *  bars; its major seventh one bar, then back to the chord for one: F, Fmaj7, F; B♭, B♭maj7, B♭;
 *  then C; twice, the first time to C, the second to a higher C. Bass and three voices, in Hz, with their length in bars. */
const CHORDS: number[][] = [F, FMAJ7, F, BB, BBMAJ7, BB, C, F, FMAJ7, F, BB, BBMAJ7, BB, C_HIGH];
const BARS = [2, 1, 1, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 2];
/** One bar of the pad, in seconds (4/4 at about 96 bpm). */
const BAR_SECONDS = 2.5;
let chordIndex = 0;
let nextChord = 0;

function build(): Engine | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  // 'playback' asks for larger buffers: the twin's rendering cannot starve the audio thread.
  const ctx = new Ctor({ latencyHint: 'playback' });
  const master = ctx.createGain();
  master.gain.value = 0;
  // A gentle glue, not a pumping limiter (fast, hard compression was audible as distortion).
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 12;
  limiter.ratio.value = 3;
  limiter.attack.value = 0.01;
  limiter.release.value = 0.3;
  master.connect(limiter).connect(ctx.destination);

  // The pad: an open fifth and a ninth, slightly detuned, under a slow breathing filter, sent
  // mostly to a long, airy room.
  const hall = ctx.createConvolver();
  hall.buffer = impulse(ctx, 4.5, 2.4);
  const hallOut = ctx.createGain();
  hallOut.gain.value = 1.1;
  hall.connect(hallOut).connect(master);
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 1100;
  padFilter.Q.value = 0.4;
  const pad = ctx.createGain();
  pad.gain.value = 0.12;
  padFilter.connect(pad);
  // Far away: a little of the pad is heard directly, most of it through the long room.
  const padDry = ctx.createGain();
  padDry.gain.value = 0.3;
  pad.connect(padDry).connect(master);
  pad.connect(hall);
  // Four voices (a bass and three above it), each two slightly detuned oscillators; they glide
  // from chord to chord (see CHORDS).
  const voices = CHORDS[0].map((freq, i) => [-5, 5].map((cents) => {
    const osc = ctx.createOscillator();
    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    osc.detune.value = cents;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.5 : 0.22;
    osc.connect(g).connect(padFilter);
    osc.start();
    return osc;
  }));
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 260;
  lfo.connect(lfoDepth).connect(padFilter.frequency);
  lfo.start();

  // The organs: dry and close, with a short soft room behind them.
  const room = ctx.createConvolver();
  room.buffer = impulse(ctx, 1.8, 2.6);
  const roomOut = ctx.createGain();
  roomOut.gain.value = 0.7;
  room.connect(roomOut).connect(master);
  const close = ctx.createGain();
  close.gain.value = 1;
  close.connect(master);
  close.connect(room);

  const heart = ctx.createGain();
  heart.gain.value = 0;
  // Heard through the chest wall: everything above the low body of the sound is muffled.
  const chest = ctx.createBiquadFilter();
  chest.type = 'lowpass';
  chest.frequency.value = 420;
  chest.Q.value = 0.5;
  // No sub-bass: below ~55 Hz small headphone drivers rattle and the beat sounds saturated.
  const sub = ctx.createBiquadFilter();
  sub.type = 'highpass';
  sub.frequency.value = 55;
  sub.Q.value = 0.7;
  heart.connect(sub).connect(chest).connect(close);
  const texture = noiseBuffer(ctx, 2);

  const air = ctx.createBufferSource();
  air.buffer = noiseBuffer(ctx, 4);
  air.loop = true;
  const breathFilter = ctx.createBiquadFilter();
  breathFilter.type = 'bandpass';
  breathFilter.frequency.value = 1500;
  breathFilter.Q.value = 1.1;
  const throat = ctx.createBiquadFilter();
  throat.type = 'highpass';
  throat.frequency.value = 380;
  const mouth = ctx.createBiquadFilter();
  mouth.type = 'peaking';
  mouth.frequency.value = 2600;
  mouth.gain.value = 5;
  mouth.Q.value = 1.4;
  const breath = ctx.createGain();
  breath.gain.value = 0;
  air.connect(throat).connect(breathFilter).connect(mouth).connect(breath).connect(close);
  air.start();

  return {
    ctx, master, heart, pad, voices, texture, breath, breathFilter, close,
    fade: (to) => master.gain.setTargetAtTime(to, ctx.currentTime, 0.6),
  };
}

/** Starts (or resumes) the sound, if the crew has it on and the lab is open. */
export function wake() {
  if (!mounted || !useSound.getState().on) return;
  engine ??= build();
  if (!engine) return;
  void engine.ctx.resume();
  engine.fade(1);
}

/** The lab mounts the soundscape; leaving the lab or hiding the page silences it. */
export function mountSoundscape() {
  mounted = true;
  const gesture = () => wake();
  const visibility = () => {
    if (!engine) return;
    if (document.visibilityState === 'hidden') engine.fade(0);
    else wake();
  };
  window.addEventListener('pointerdown', gesture);
  window.addEventListener('keydown', gesture);
  window.addEventListener('touchend', gesture);
  document.addEventListener('visibilitychange', visibility);
  // A press earlier on this page (the landing's "Open the lab", say) already allows sound: start
  // without asking for another click.
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activation?.hasBeenActive) wake();
  window.clearInterval(scheduler);
  scheduler = window.setInterval(schedule, 50);
  return () => {
    mounted = false;
    window.clearInterval(scheduler);
    window.removeEventListener('touchend', gesture);
    window.removeEventListener('pointerdown', gesture);
    window.removeEventListener('keydown', gesture);
    document.removeEventListener('visibilitychange', visibility);
    engine?.fade(0);
  };
}

/** One lub-dub, as heard through a chest: each sound is a soft burst of low noise over a falling
 *  low tone, muffled by the body. Every beat varies a little in timing, strength and pitch, the way
 *  a real heart never repeats itself exactly. */
function beat(e: Engine, interval: number, t: number) {
  const jitter = (spread: number) => 1 + (Math.random() * 2 - 1) * spread;
  const sound = (at: number, pitch: number, length: number, level: number) => {
    // The thud: a low tone that falls as the valve closes.
    const osc = e.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch * 1.5, at);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.8, at + length);
    const tone = e.ctx.createGain();
    tone.gain.setValueAtTime(0.0001, at);
    tone.gain.linearRampToValueAtTime(level * 0.5, at + 0.02);
    tone.gain.setTargetAtTime(0.0001, at + 0.03, length / 3.2);
    osc.connect(tone).connect(e.heart);
    osc.start(at);
    osc.stop(at + length * 1.6);
    // The texture: noise through the body, so it is not a pure electronic tone.
    const noise = e.ctx.createBufferSource();
    noise.buffer = e.texture;
    noise.playbackRate.value = jitter(0.15);
    const shape = e.ctx.createBiquadFilter();
    shape.type = 'lowpass';
    shape.frequency.value = pitch * 3.2;
    shape.Q.value = 1.1;
    const grit = e.ctx.createGain();
    grit.gain.setValueAtTime(0.0001, at);
    grit.gain.linearRampToValueAtTime(level * 1.2, at + 0.012);
    grit.gain.setTargetAtTime(0.0001, at + 0.02, length / 4);
    noise.connect(shape).connect(grit).connect(e.heart);
    noise.start(at, Math.random() * 1.5);
    noise.stop(at + length * 1.6);
  };
  sound(t, 70 * jitter(0.05), 0.15 * jitter(0.1), 0.85 * jitter(0.12));
  // The second sound comes about a third of the way through the beat, earlier as the pulse rises.
  sound(t + Math.min(0.31, interval * 0.33) * jitter(0.04), 92 * jitter(0.05), 0.1 * jitter(0.1), 0.5 * jitter(0.15));
}

/** What the twin last reported: the scheduler reads it, so beats never wait on a frame. */
const live = { bpm: 72, focus: null as string | null, beatPhase: 0, synced: false };
let nextBeat = 0;
let scheduler = 0;

/** Plays the heart ahead of time on the audio clock (a quarter second of lookahead): a slow or
 *  busy frame from the 3D cannot delay or drop a beat. */
function schedule() {
  const e = engine;
  if (!e || e.ctx.state !== 'running') return;
  // The pad moves to its next chord on the audio clock.
  if (nextChord === 0) nextChord = e.ctx.currentTime + BARS[0] * BAR_SECONDS;
  if (e.ctx.currentTime > nextChord - 0.3) {
    const from = CHORDS[chordIndex];
    chordIndex = (chordIndex + 1) % CHORDS.length;
    // Only the step between a chord and its major seventh glides, to soften it; a change of chord
    // moves at once (a 15 ms settle, so the voices do not click).
    const seventh = from[0] === CHORDS[chordIndex][0];
    CHORDS[chordIndex].forEach((freq, i) => e.voices[i].forEach((osc) => osc.frequency.setTargetAtTime(freq, nextChord, seventh ? 0.25 : 0.015)));
    nextChord += BARS[chordIndex] * BAR_SECONDS;
  }
  const interval = 60 / Math.min(220, Math.max(30, live.bpm));
  const now = e.ctx.currentTime;
  // Start in step with the twin's heart, then keep time on the audio clock.
  if (!live.synced || nextBeat < now - interval) { nextBeat = now + (1 - live.beatPhase) * interval; live.synced = true; }
  while (nextBeat < now + 0.25) {
    if (e.heart.gain.value > 0.01 || heartTarget() > 0) beat(e, interval, nextBeat + Math.random() * 0.01);
    nextBeat += interval;
  }
}

function heartTarget() {
  const f = live.focus;
  return f === 'heart' ? 0.75 : f === 'landing' ? 0.24 : f === null ? 0.24 : 0;
}

/**
 * Called every frame by the twin with its phases (0–1) and rate; `focus` is the system under
 * inspection (null: the full body; 'landing': the landing's bust).
 */
export function soundFrame(beatPhase: number, breathPhase: number, bpm: number, focus: string | null) {
  live.bpm = bpm; live.focus = focus; live.beatPhase = beatPhase;
  const e = engine;
  if (!e || !mounted || !useSound.getState().on || e.ctx.state !== 'running') { live.synced = false; return; }
  const which: Focus = focus === 'heart' ? 'heart' : focus === 'lungs' ? 'lungs' : null;
  const now = e.ctx.currentTime;
  // The full body hears both organs softly, with the habitat's pad in front; inspecting one organ
  // brings it close and lets the pad recede.
  const breathLevel = focus === 'landing' ? 0 : which === 'lungs' ? 0.09 : which === null ? 0.025 : 0;
  e.heart.gain.setTargetAtTime(heartTarget(), now, 0.25);
  e.pad.gain.setTargetAtTime(focus === 'landing' ? 0.073 : which === null ? 0.085 : 0.055, now, 0.8);
  // Breathing: a quicker, brighter breath in; a longer, softer, darker breath out; a short rest.
  // The twin's chest swells over the first half of each breath, so the sound shares its phase.
  const p = breathPhase;
  const inhale = p < 0.45 ? Math.pow(Math.sin((Math.PI * p) / 0.45), 0.7) : 0;
  const exhale = p >= 0.45 && p < 0.92 ? 0.7 * Math.pow(Math.sin((Math.PI * (p - 0.45)) / 0.47), 0.9) : 0;
  e.breath.gain.setTargetAtTime(breathLevel * (inhale * 0.9 + exhale * 0.75), now, 0.05);
  e.breathFilter.frequency.setTargetAtTime(inhale > 0 ? 1500 + inhale * 700 : 900 + exhale * 300, now, 0.08);
}
