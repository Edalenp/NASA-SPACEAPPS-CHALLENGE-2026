import { dailyCheck, type IndicatorId } from '../../data/indicators';
import { newsParameters } from '../measurements/adapter';

/** UI sequence: seven NEWS2 inputs, followed by optional routine readings. Never risk points. */
export const requiredCheck: readonly IndicatorId[] = [
  ...dailyCheck.filter((id) => (newsParameters as readonly IndicatorId[]).includes(id)),
  ...newsParameters.filter((id) => !dailyCheck.includes(id)),
];
export const optionalCheck = dailyCheck.filter((id) => !requiredCheck.includes(id));
export const checkSequence = [...requiredCheck, ...optionalCheck];
export const checkInfo: Partial<Record<IndicatorId, { name: string; hint: string }>> = {
  pulse: { name: 'Heart rate', hint: 'Heartbeats per minute, from your pulse or monitor.' },
  systolic: { name: 'Blood pressure', hint: 'Systolic: the upper number on your blood pressure monitor.' },
  respiration: { name: 'Breathing rate', hint: 'The number of breaths in one minute.' },
  spo2: { name: 'Blood oxygen', hint: 'SpO₂: the oxygen saturation percentage from your oximeter.' },
  temperature: { name: 'Temperature', hint: 'Body temperature measured in degrees Celsius.' },
  oxygen: { name: 'Oxygen support', hint: 'Are you breathing cabin air or receiving supplemental oxygen?' },
  consciousness: { name: 'Alertness', hint: 'Choose the level of alertness and response you observe.' },
  glucose: { name: 'Glucose', hint: 'Optional routine reading. The reference interval applies only to a fasting laboratory test.' },
  sleep: { name: 'Sleep', hint: 'Optional routine reading: hours slept across the last 24 hours.' },
  mood: { name: 'Mood', hint: 'Optional routine reading: your own 1–5 mood rating.' },
};
/**
 * Today's progress. Every reading the assessment uses counts, the mission simulation included,
 * so the counters always agree with NEWS2; `simulated` says how many of them are simulation.
 */
export function checkProgress(latest: Partial<Record<IndicatorId, { source: string } | null | undefined>>) {
  const recorded = (id: IndicatorId) => !!latest[id];
  const sim = (id: IndicatorId) => latest[id]?.source === 'simulator';
  return {
    required: requiredCheck.filter(recorded).length,
    optional: optionalCheck.filter(recorded).length,
    /** Of the seven NEWS2 observations counted, how many come from the simulation. */
    simulated: requiredCheck.filter(sim).length,
    simulatedOptional: optionalCheck.filter(sim).length,
  };
}
