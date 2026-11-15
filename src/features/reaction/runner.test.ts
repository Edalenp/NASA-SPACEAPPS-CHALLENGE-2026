import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionRunner } from './runner';
import { LAPSE_MS, MIN_DELAY_MS, TEST_MS, type Trial } from './session';

describe('ReactionRunner (RF-05)', () => {
  let trials: Trial[];
  let signal: boolean;
  let ended: boolean;
  let runner: ReactionRunner;
  beforeEach(() => {
    vi.useFakeTimers();
    trials = [];
    signal = false;
    ended = false;
    // random() = 0 gives the shortest wait; now() follows the fake clock.
    runner = new ReactionRunner(
      { onSignal: (on) => { signal = on; }, onTrial: (t) => trials.push(t), onEnd: () => { ended = true; } },
      () => 0,
      () => Date.now(),
    );
  });
  afterEach(() => vi.useRealTimers());

  it('times a press from the moment the signal appears', () => {
    runner.start();
    vi.advanceTimersByTime(MIN_DELAY_MS);
    expect(signal).toBe(true);
    vi.advanceTimersByTime(312);
    runner.press();
    expect(trials).toEqual([{ kind: 'response', ms: 312 }]);
    expect(signal).toBe(false);
  });

  it('counts a press before the signal as a false start and keeps waiting', () => {
    runner.start();
    runner.press();
    expect(trials).toEqual([{ kind: 'falseStart' }]);
    vi.advanceTimersByTime(MIN_DELAY_MS);
    expect(signal).toBe(true);
  });

  it('records a lapse when nobody presses within the limit', () => {
    runner.start();
    vi.advanceTimersByTime(MIN_DELAY_MS + LAPSE_MS);
    expect(trials).toEqual([{ kind: 'lapse' }]);
  });

  it('ends after 60 seconds and ignores later presses', () => {
    runner.start();
    vi.advanceTimersByTime(TEST_MS);
    expect(ended).toBe(true);
    const count = trials.length;
    runner.press();
    expect(trials).toHaveLength(count);
  });
});
