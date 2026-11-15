import { describe, expect, it } from 'vitest';
import { rangeReferences, referenceScoreBands, comparisonSegments } from './references';
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

describe('non-NEWS2 reference comparisons', () => {
  it('compares a valid personal baseline without inventing red clinical thresholds', () => {
    const result = comparisonSegments('reaction', 100, 5000, 1, { mean: 250, sd: 25, lower: 200, upper: 300, sampleCount: 8 });
    expect(result.kind).toBe('personal');
    expect(result.segments.map((band) => band.tone)).toEqual(['watch', 'normal', 'watch']);
  });
  it('does not render an impossible baseline as a healthy clinical zone', () => {
    expect(comparisonSegments('reaction', 100, 5000, 1, { mean: 100, sd: 100, lower: -100, upper: 300, sampleCount: 8 }).kind).toBe('none');
  });
});
