import { describe, expect, it } from 'vitest';
import { rangeReferences, referenceScoreBands } from './references';
import { previewReading } from './preview';

describe('reference bands do not replace clinical assessment', () => {
  it('draws contiguous NEWS2 score bands using the engine table', () => {
    const bands = referenceScoreBands('pulse', 20, 300, 1);
    expect(bands[0].lower).toBe(20);
    expect(bands.at(-1)?.upper).toBe(300);
    for (let i = 1; i < bands.length; i++) expect(bands[i].lower).toBe(bands[i - 1].upper);
    for (const value of [20, 45, 72, 100, 120, 150, 300]) {
      const band = bands.find((item) => value >= item.lower && value <= item.upper);
      expect(band?.score).toBe(previewReading([], '2026-11-15T01:00:00Z', 'transit', 'pulse', value)?.score);
    }
  });
  it('does not invent universal clinical bands for generic reaction or mood inputs', () => {
    expect(rangeReferences.reaction?.lower).toBeUndefined();
    expect(rangeReferences.mood?.lower).toBeUndefined();
    expect(referenceScoreBands('reaction', 100, 5000, 1)).toEqual([]);
  });
  it('keeps one-sided recommendations distinct from closed reference intervals', () => {
    expect(rangeReferences.sleep?.marker).toBe(7);
    expect(rangeReferences.sleep?.upper).toBeUndefined();
    expect(rangeReferences.glucose?.context).toMatch(/fasting/);
  });
});
