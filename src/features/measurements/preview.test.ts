import { describe, expect, it } from 'vitest';
import type { GlucoseContext } from '../../engine';
import { previewReading } from './preview';
import type { RecordEntry } from './adapter';
const now = '2026-11-14T18:00:00.000Z';
const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma', fastingHours: 8 };
describe('unsaved reading preview', () => {
  it.each([[72, 'normal', 0], [100, 'watch', 1], [140, 'alert', 3]] as const)('uses the current engine for pulse %s', (value, status, score) => {
    const result = previewReading([], now, 'transit', 'pulse', value);
    expect(result?.deviation.status).toBe(status);
    expect(result?.score).toBe(score);
  });
  it('returns the full assessment so an alert is not gated by NEWS2 or a baseline', () => {
    const result = previewReading([], now, 'transit', 'diastolic', 130);
    expect(result?.deviation.status).toBe('alert');
    expect(result?.assessment.zones.heartCirculation.actions.length).toBeGreaterThan(0);
    expect(result?.assessment.plan.steps.length).toBeGreaterThan(0);
    expect(result?.assessment.score.complete).toBe(false);
    expect(result?.assessment.score.measured).toBe(0);
    const low = previewReading([], now, 'transit', 'glucose', 40);
    expect(low?.deviation.status).toBe('alert');
    expect(low?.assessment.zones.immuneMetabolic.actions.length).toBeGreaterThan(0);
  });
  it('keeps an unknown-context glucose out of healthy and gates the fasting watch', () => {
    const unknown = previewReading([], now, 'transit', 'glucose', 130);
    expect(unknown?.deviation.status).toBe('missing');
    expect(unknown?.deviation.text).toMatch(/Context needed/);
    const fasting = previewReading([], now, 'transit', 'glucose', 130, fastingVenous);
    expect(fasting?.deviation.status).toBe('watch');
    expect(fasting?.assessment.zones.immuneMetabolic.state).toBe('attention');
  });
  it('renders a real zero NEWS2 score while marking the observation set incomplete', () => {
    const result = previewReading([], now, 'transit', 'pulse', 72);
    expect(result?.score).toBe(0);
    expect(result?.assessment.score.complete).toBe(false);
    expect(result?.assessment.score.measured).toBe(1);
  });
  it('does not change the original entries and rejects invalid input', () => {
    const entries: RecordEntry[] = [];
    previewReading(entries, now, 'transit', 'pulse', 72);
    expect(entries).toEqual([]);
    expect(previewReading(entries, now, 'transit', 'pulse', 1000)).toBeNull();
  });
});
