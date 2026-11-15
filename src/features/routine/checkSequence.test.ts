import { describe, it, expect } from 'vitest';
import { checkProgress, requiredCheck, optionalCheck } from './checkSequence';
import { dailyCheck } from '../../data/indicators';

describe('daily check progress counts observations, not risk points', () => {
  it('does not confuse the old eight daily readings with a completed NEWS2', () => {
    const latest = Object.fromEntries(dailyCheck.map((id) => [id, { source: 'manual' }]));
    expect(checkProgress(latest)).toEqual({ required: 5, optional: 3 });
    expect(checkProgress({ ...latest, oxygen: { source: 'manual' }, consciousness: { source: 'manual' } })).toEqual({ required: 7, optional: 3 });
  });
  it('keeps simulation separate from measurements recorded by the crew', () => {
    expect(checkProgress(Object.fromEntries(requiredCheck.map((id) => [id, { source: 'simulator' }]))).required).toBe(0);
    expect(optionalCheck).toHaveLength(3);
  });
});
