import { LAPSE_MS, nextDelay, TEST_MS, type Trial } from './session';

export interface RunnerEvents {
  onSignal: (on: boolean) => void;
  onTrial: (trial: Trial) => void;
  onEnd: () => void;
}

/**
 * Timers for one 60-second run, kept outside React so each signal schedules the next without
 * re-rendering in between. Times come from performance.now(), not from the frame clock.
 */
export class ReactionRunner {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private startedAt = 0;
  private shownAt = 0;
  private showing = false;
  private running = false;
  private readonly events: RunnerEvents;
  private readonly random: () => number;
  private readonly now: () => number;

  constructor(events: RunnerEvents, random: () => number = Math.random, now: () => number = () => performance.now()) {
    this.events = events;
    this.random = random;
    this.now = now;
  }

  start() {
    this.stop();
    this.running = true;
    this.startedAt = this.now();
    this.later(() => this.end(), TEST_MS);
    this.schedule();
  }

  /** A press: a reaction if the signal is on, a false start if it is not. */
  press() {
    if (!this.running) return;
    if (!this.showing) {
      this.events.onTrial({ kind: 'falseStart' });
      return;
    }
    this.clearSignalTimers();
    this.events.onTrial({ kind: 'response', ms: Math.round(this.now() - this.shownAt) });
    this.schedule();
  }

  elapsed() {
    return this.running ? this.now() - this.startedAt : 0;
  }

  stop() {
    this.running = false;
    this.showing = false;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  private end() {
    this.stop();
    this.events.onSignal(false);
    this.events.onEnd();
  }

  private schedule() {
    this.showing = false;
    this.events.onSignal(false);
    this.later(() => {
      if (!this.running || this.now() - this.startedAt >= TEST_MS) return;
      this.shownAt = this.now();
      this.showing = true;
      this.events.onSignal(true);
      this.later(() => {
        this.events.onTrial({ kind: 'lapse' });
        this.schedule();
      }, LAPSE_MS, true);
    }, nextDelay(this.random()), true);
  }

  /** Signal timers are the wait and the lapse; the end-of-test timer is kept apart. */
  private signalTimers: ReturnType<typeof setTimeout>[] = [];
  private clearSignalTimers() {
    this.signalTimers.forEach((t) => clearTimeout(t));
    this.timers = this.timers.filter((t) => !this.signalTimers.includes(t));
    this.signalTimers = [];
  }

  private later(fn: () => void, ms: number, signal = false) {
    const id = setTimeout(fn, ms);
    this.timers.push(id);
    if (signal) this.signalTimers.push(id);
  }
}
