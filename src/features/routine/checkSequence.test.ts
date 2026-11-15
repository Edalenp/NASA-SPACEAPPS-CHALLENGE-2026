import { describe, it, expect } from 'vitest';
import { checkProgress, requiredCheck, optionalCheck } from './checkSequence';
import { dailyCheck } from '../../data/indicators';

describe('daily check progress counts observations, not risk points', () => {
  it('does not confuse the old eight daily readings with a completed NEWS2', () => {
    const latest = Object.fromEntries(dailyCheck.map((id) => [id, { source: 'manual' }]));
    expect(checkProgress(latest)).toEqual({ required: 5, optional: 3, simulated: 0, simulatedOptional: 0 });
    expect(checkProgress({ ...latest, oxygen: { source: 'manual' }, consciousness: { source: 'manual' } })).toEqual({ required: 7, optional: 3, simulated: 0, simulatedOptional: 0 });
  });
  it('counts simulated readings like the assessment does, and says how many they are', () => {
    const seeded = Object.fromEntries(requiredCheck.map((id) => [id, { source: 'simulator' }]));
    expect(checkProgress(seeded)).toEqual({ required: 7, optional: 0, simulated: 7, simulatedOptional: 0 });
    expect(checkProgress({ ...seeded, pulse: { source: 'manual' }, sleep: { source: 'simulator' } })).toMatchObject({ simulated: 6, simulatedOptional: 1 });
    expect(optionalCheck).toHaveLength(3);
  });
});
