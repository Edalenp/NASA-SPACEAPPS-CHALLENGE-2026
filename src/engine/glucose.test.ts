import { describe, expect, it } from 'vitest';
import { glucoseTrend, reviewGlucose } from './glucose';
import { normalizeGlucoseContext, sameGlucoseContext } from './glucoseContext';
import type { GlucoseContext } from './types';

const fasting: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma', fastingHours: 8, symptoms: 'none' };
describe('ADA 2026 contextual glucose review', () => {
  it.each([125, 126, 199, 200, 300])('requires a documented fasting interval for laboratory criteria at %s', value => {
    expect(reviewGlucose(value, { ...fasting, fastingHours: undefined }).laboratory.criterion).toBe('none');
    expect(reviewGlucose(value, { ...fasting, fastingHours: 7.9 }).laboratory.criterion).toBe('none');
    expect(reviewGlucose(value, fasting).laboratory.criterion).toBe(value >= 126 ? 'fasting-plasma' : 'none');
    expect(reviewGlucose(value, fasting).monitoring.severity).toBe('watch');
  });
  it('distinguishes a standardized laboratory OGTT from an ordinary meal', () => {
    expect(reviewGlucose(200, { timing: 'ogtt2h', specimen: 'venousPlasma' }).laboratory.criterion).toBe('ogtt2h-plasma');
    expect(reviewGlucose(200, { timing: 'afterMeal', specimen: 'venousPlasma' }).laboratory.criterion).toBe('none');
  });
  it('requires symptoms and a laboratory plasma sample for the random-plasma criterion', () => {
    expect(reviewGlucose(200, { timing: 'random', specimen: 'venousPlasma', symptoms: 'classic' }).laboratory.criterion).toBe('random-plasma-with-symptoms');
    for (const symptoms of ['unknown', 'none'] as const) expect(reviewGlucose(200, { timing: 'random', specimen: 'venousPlasma', symptoms }).laboratory.criterion).toBe('none');
    expect(reviewGlucose(199, { timing: 'random', specimen: 'venousPlasma', symptoms: 'classic' }).laboratory.criterion).toBe('none');
  });
  it.each(['unknown', 'capillary', 'interstitial'] as const)('never treats %s as an independent laboratory diagnostic test', specimen => {
    const result = reviewGlucose(300, { timing: 'fasting', specimen, fastingHours: 8 });
    expect(result.laboratory.criterion).toBe('none');
    expect(result.monitoring.severity).toBeNull();
    if (specimen === 'interstitial') expect(result.laboratory.message).toContain('CGM');
  });
  it.each([[53, 'alert'], [54, 'watch'], [69, 'watch'], [70, null]] as const)('keeps low-glucose monitoring distinct at %s', (value, severity) => {
    const result = reviewGlucose(value, { timing: 'random', specimen: 'interstitial' });
    expect(result.monitoring.severity).toBe(severity);
    expect(result.laboratory.criterion).toBe('none');
  });
  it('preserves symptom/duration metadata and does not upgrade a historical fasting label', () => {
    expect(normalizeGlucoseContext(fasting)).toEqual(fasting);
    expect(normalizeGlucoseContext({ timing: 'fasting', specimen: 'venousPlasma' })).not.toHaveProperty('fastingHours');
    expect(sameGlucoseContext(fasting, { ...fasting, fastingHours: undefined })).toBe(false);
  });
  it('describes a trend only among comparable draws, with no diagnostic inference', () => {
    const result = glucoseTrend([
      { value: 100, ctx: fasting, timestamp: '2026-11-14T08:00:00Z' },
      { value: 500, ctx: { timing: 'random', specimen: 'interstitial' }, timestamp: '2026-11-14T09:00:00Z' },
      { value: 130, ctx: fasting, timestamp: '2026-11-15T08:00:00Z' },
    ], fasting);
    expect(result).toMatchObject({ count: 2, first: 100, last: 130, change: 30, direction: 'rising' });
    expect(result).not.toHaveProperty('diagnosis');
  });
});
