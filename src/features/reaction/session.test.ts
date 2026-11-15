import { describe, expect, it } from 'vitest';
import { LAPSE_MS, MAX_DELAY_MS, MIN_DELAY_MS, nextDelay, summarize } from './session';

describe('reaction test session (RF-05)', () => {
  it('averages valid responses only and counts every kind of failure', () => {
    const s = summarize([
      { kind: 'response', ms: 250 },
      { kind: 'response', ms: 350 },
      { kind: 'falseStart' },
      { kind: 'lapse' },
      { kind: 'response', ms: 60 },
    ]);
    expect(s.meanMs).toBe(300);
    expect(s.validTrials).toBe(2);
    expect(s.failures).toBe(3);
    expect(s).toMatchObject({ falseStarts: 1, lapses: 1, tooFast: 1, trials: 5 });
  });

  it('has no mean when nothing valid was recorded', () => {
    expect(summarize([{ kind: 'lapse' }]).meanMs).toBeNull();
    expect(summarize([]).meanMs).toBeNull();
  });

  it('keeps every wait inside the random window', () => {
    expect(nextDelay(0)).toBe(MIN_DELAY_MS);
    expect(nextDelay(1)).toBe(MAX_DELAY_MS);
    expect(nextDelay(2)).toBe(MAX_DELAY_MS);
  });

  it('treats an answer at the lapse limit as valid and beyond it as a lapse', () => {
    expect(summarize([{ kind: 'response', ms: LAPSE_MS }]).validTrials).toBe(1);
    expect(summarize([{ kind: 'lapse' }]).validTrials).toBe(0);
  });
});
