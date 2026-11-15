import { describe, expect, it } from 'vitest';
import type { GlucoseContext } from '../../engine';
import { rangeReferences, referenceFor, referenceScoreBands, comparisonSegments, plausibleBaseline } from './references';
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

describe('personal range plausibility', () => {
  it('draws a personal range only inside the physical input limits', () => {
    expect(plausibleBaseline({ mean: 72, sd: 6, lower: 60, upper: 84, sampleCount: 8 }, 20, 300)).toBe(true);
    expect(plausibleBaseline({ mean: 136, sd: 74, lower: -10.8, upper: 283.6, sampleCount: 8 }, 20, 300)).toBe(false);
    expect(plausibleBaseline(undefined, 20, 300)).toBe(false);
  });
});

describe('slider colours agree with the assessment', () => {
  it('paints systolic above the AHA severe limit red even where NEWS2 gives 0 points', () => {
    const { segments } = comparisonSegments('systolic', 40, 300, 1);
    const at = (v: number) => segments.find((s) => v >= s.lower && v <= s.upper)?.tone;
    expect(at(120)).toBe('normal');
    expect(at(200)).toBe('alert');
    expect(previewReading([], '2026-11-15T01:00:00Z', 'transit', 'systolic', 200)?.deviation.status).toBe('alert');
  });
});

describe('glucose references respect the draw context', () => {
  const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma' };
  const toneAt = (segments: ReturnType<typeof comparisonSegments>['segments'], value: number) =>
    segments.find((segment) => value >= segment.lower && value <= segment.upper)?.tone;

  it('does not paint the fasting screening watch for an unknown context', () => {
    const unknown = comparisonSegments('glucose', 20, 600, 1);
    const fasting = comparisonSegments('glucose', 20, 600, 1, undefined, fastingVenous);
    expect(toneAt(unknown.segments, 130)).toBe('normal');
    expect(toneAt(fasting.segments, 130)).toBe('watch');
    expect(toneAt(unknown.segments, 201)).toBe('alert');
    expect(toneAt(fasting.segments, 40)).toBe('alert');
  });

  it('keeps the fasting laboratory reference only as information when it does not apply', () => {
    expect(rangeReferences.glucose?.lower).toBe(70);
    expect(rangeReferences.glucose?.upper).toBe(99);
    expect(referenceFor('glucose', fastingVenous)?.label).toBe('Fasting laboratory population reference');
    const unknown = referenceFor('glucose', { timing: 'unknown', specimen: 'unknown' });
    expect(unknown?.label).toContain('not applicable to this context');
    expect(unknown?.context).toContain('population reference only');
  });
});
