import type { ActivityKind } from './types';

export const FATIGUE_SOURCE = 'https://www.nasa.gov/reference/6-0-medical-operations/';
export const ADULT_SLEEP_SOURCE = 'https://www.nhlbi.nih.gov/health/sleep/how-much-sleep';
/** V1 6001 rationale: scheduled opportunity, not measured sleep or guaranteed recovery. */
export const NASA_SLEEP_OPPORTUNITY_HOURS = 8.5;
export const NASA_PRE_SLEEP_HOURS = 2;
export const NASA_POST_SLEEP_HOURS = 1.5;

export interface FatigueInputs {
  sleepLast24hHours: number;
  sleepLast48hHours?: number;
  awakeHours?: number;
  workloadHoursLast24h?: number;
  /** Relative to habitual sleep, never inferred from mission UTC. */
  bodyClockHour?: number;
  circadianAlignment?: 'aligned' | 'shifted' | 'unknown';
  minutesUntilNextTask: number;
  activity: ActivityKind;
}
export interface FatigueSimulationParameters {
  sleepNeedHoursPerDay: number;
  awakeReviewHours: number;
  workloadReviewHours: number;
  reassessmentMinutes: number;
  napScenarioMinutes: number;
}
/** Engineering defaults; not thresholds prescribed by NASA or a validated fatigue model. */
export const DEFAULT_FATIGUE_PARAMETERS: FatigueSimulationParameters = {
  sleepNeedHoursPerDay: 8, awakeReviewHours: 16, workloadReviewHours: 10,
  reassessmentMinutes: 240, napScenarioMinutes: 90,
};
export interface FatigueAssessment {
  status: 'review' | 'incomplete' | 'no-model-flag' | 'invalid';
  missing: string[];
  signals: { id: string; text: string; basis: 'NASA context' | 'simulation parameter' }[];
  modeledSleepShortfall24h?: number;
  modeledSleepShortfall48h?: number;
  nextTaskMinutes: number;
  parameters: FatigueSimulationParameters;
  error?: string;
}

/** Factor review inspired by V1 6001: no recovery formula, composite score or fitness clearance. */
export function assessFatigue(input: FatigueInputs, parameters: FatigueSimulationParameters = DEFAULT_FATIGUE_PARAMETERS): FatigueAssessment {
  const result: FatigueAssessment = { status: 'incomplete', missing: [], signals: [], nextTaskMinutes: input.minutesUntilNextTask, parameters: { ...parameters } };
  const inRange = (value: number, max: number) => Number.isFinite(value) && value >= 0 && value <= max;
  if (!inRange(input.sleepLast24hHours, 24) || !inRange(input.minutesUntilNextTask, 1440) ||
    (input.sleepLast48hHours !== undefined && (!inRange(input.sleepLast48hHours, 48) || input.sleepLast48hHours < input.sleepLast24hHours || input.sleepLast48hHours - input.sleepLast24hHours > 24)) ||
    (input.awakeHours !== undefined && (!inRange(input.awakeHours, 72) || input.sleepLast24hHours > Math.max(0, 24 - input.awakeHours) || (input.sleepLast48hHours !== undefined && input.sleepLast48hHours > Math.max(0, 48 - input.awakeHours)))) ||
    (input.workloadHoursLast24h !== undefined && (!inRange(input.workloadHoursLast24h, 24) || input.workloadHoursLast24h + input.sleepLast24hHours > 24)) ||
    (input.bodyClockHour !== undefined && (!inRange(input.bodyClockHour, 24) || input.bodyClockHour === 24)) ||
    !inRange(parameters.sleepNeedHoursPerDay, 24) || parameters.sleepNeedHoursPerDay === 0 ||
    !inRange(parameters.awakeReviewHours, 72) || parameters.awakeReviewHours === 0 ||
    !inRange(parameters.workloadReviewHours, 24) || parameters.workloadReviewHours === 0 ||
    !inRange(parameters.reassessmentMinutes, 1440) || parameters.reassessmentMinutes === 0 ||
    !inRange(parameters.napScenarioMinutes, 1440) || parameters.napScenarioMinutes === 0) {
    return { ...result, status: 'invalid', error: 'Enter finite, consistent sleep, wake, workload and clock values. Unknown values may remain blank.' };
  }
  result.modeledSleepShortfall24h = Math.max(0, parameters.sleepNeedHoursPerDay - input.sleepLast24hHours);
  if (input.sleepLast48hHours !== undefined) result.modeledSleepShortfall48h = Math.max(0, 2 * parameters.sleepNeedHoursPerDay - input.sleepLast48hHours);
  else result.missing.push('sleep over 48 hours');
  if (input.awakeHours === undefined) result.missing.push('continuous time awake');
  if (input.workloadHoursLast24h === undefined) result.missing.push('workload over 24 hours');
  if (input.bodyClockHour === undefined) result.missing.push('biological clock time');
  if (!input.circadianAlignment || input.circadianAlignment === 'unknown') result.missing.push('circadian alignment');
  if (result.modeledSleepShortfall24h > 0) result.signals.push({ id: 'sleep24', basis: 'simulation parameter', text: `24-hour sleep shortfall versus the configured ${parameters.sleepNeedHoursPerDay} h/day assumption: ${result.modeledSleepShortfall24h.toFixed(1)} h.` });
  if ((result.modeledSleepShortfall48h ?? 0) > 0) result.signals.push({ id: 'sleep48', basis: 'simulation parameter', text: `48-hour cumulative sleep shortfall versus the same assumption: ${result.modeledSleepShortfall48h!.toFixed(1)} h. Arithmetic, not a physiological sleep-debt estimate.` });
  if (input.awakeHours !== undefined && input.awakeHours >= parameters.awakeReviewHours) result.signals.push({ id: 'awake', basis: 'simulation parameter', text: `Continuous wakefulness ${input.awakeHours} h reaches the configured ${parameters.awakeReviewHours} h review marker.` });
  if (input.workloadHoursLast24h !== undefined && input.workloadHoursLast24h >= parameters.workloadReviewHours) result.signals.push({ id: 'workload', basis: 'simulation parameter', text: `Workload ${input.workloadHoursLast24h} h reaches the configured ${parameters.workloadReviewHours} h review marker.` });
  if (input.bodyClockHour !== undefined && input.bodyClockHour >= 1 && input.bodyClockHour < 7) result.signals.push({ id: 'circadian', basis: 'NASA context', text: 'Task window is in the typical biological night described in V1 6001 (about 01:00–07:00 relative to the habitual schedule). Review critical task scheduling.' });
  if (input.circadianAlignment === 'shifted') result.signals.push({ id: 'alignment', basis: 'NASA context', text: 'Circadian misalignment reported. V1 6001 calls for schedule and countermeasure assessment; this model does not calculate entrainment or prescribe a countermeasure.' });
  result.status = result.signals.length ? 'review' : result.missing.length ? 'incomplete' : 'no-model-flag';
  return result;
}
