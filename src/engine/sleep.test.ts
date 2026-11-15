import { describe, expect, it } from 'vitest';
import { assessFatigue, DEFAULT_FATIGUE_PARAMETERS, type FatigueInputs } from './sleep';

const rested: FatigueInputs = { sleepLast24hHours: 8, sleepLast48hHours: 16, awakeHours: 8, workloadHoursLast24h: 6, bodyClockHour: 14, circadianAlignment: 'aligned', minutesUntilNextTask: 10, activity: 'work' };
describe('transparent fatigue factor model', () => {
  it('retains known factors while explicitly identifying incomplete history', () => {
    const result = assessFatigue({ sleepLast24hHours: 6, minutesUntilNextTask: 10, activity: 'work' });
    expect(result.status).toBe('review');
    expect(result.missing).toContain('continuous time awake');
    expect(result.signals.map(s => s.id)).toContain('sleep24');
    expect(result).not.toHaveProperty('nap');
    expect(result).not.toHaveProperty('recoveryMinutes');
  });
  it('accounts for cumulative sleep, wakefulness, workload and biological time independently', () => {
    const result = assessFatigue({ ...rested, sleepLast24hHours: 4, sleepLast48hHours: 8, awakeHours: 20, workloadHoursLast24h: 12, bodyClockHour: 3, circadianAlignment: 'shifted' });
    expect(result.signals.map(s => s.id)).toEqual(['sleep24', 'sleep48', 'awake', 'workload', 'circadian', 'alignment']);
    expect(result.modeledSleepShortfall48h).toBe(8);
    expect(result.signals.find(s => s.id === 'circadian')?.basis).toBe('NASA context');
    expect(result.signals.find(s => s.id === 'awake')?.basis).toBe('simulation parameter');
  });
  it('does not turn a short task window or eight hours of sleep into a recovery recommendation', () => {
    for (const minutesUntilNextTask of [0, 10, 89, 90, 239, 240, 720]) {
      const result = assessFatigue({ ...rested, minutesUntilNextTask });
      expect(result.status).toBe('no-model-flag');
      expect(result).not.toHaveProperty('kind');
      expect(result).not.toHaveProperty('fitForDuty');
    }
  });
  it('does not infer circadian phase from time or compensate for missing observations', () => {
    const result = assessFatigue({ ...rested, bodyClockHour: undefined, circadianAlignment: 'unknown' });
    expect(result.status).toBe('incomplete');
    expect(result.missing).toContain('biological clock time');
    expect(result.signals).toEqual([]);
  });
  it('exposes configurable review markers and keeps 90/240-minute scenarios out of fatigue classification', () => {
    const result = assessFatigue(rested, { ...DEFAULT_FATIGUE_PARAMETERS, awakeReviewHours: 7, napScenarioMinutes: 20, reassessmentMinutes: 30 });
    expect(result.signals.map(s => s.id)).toEqual(['awake']);
    expect(result.parameters.napScenarioMinutes).toBe(20);
    expect(assessFatigue(rested, { ...DEFAULT_FATIGUE_PARAMETERS, napScenarioMinutes: 20, reassessmentMinutes: 30 }).status).toBe('no-model-flag');
  });
  it.each([
    { sleepLast24hHours: Number.NaN }, { sleepLast48hHours: 2 },
    { awakeHours: 20 }, { workloadHoursLast24h: 20 }, { bodyClockHour: 24 },
    { minutesUntilNextTask: -1 },
  ])('rejects inconsistent history rather than silently fixing it: %j', change => {
    expect(assessFatigue({ ...rested, ...change }).status).toBe('invalid');
  });
});
