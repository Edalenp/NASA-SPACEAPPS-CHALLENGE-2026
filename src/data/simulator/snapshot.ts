import type { ConsciousnessObservation, Measurement } from '../../engine';
import { generateMission, MISSION_DAYS, type SimulatorOptions } from './simulator';

const DAY_MS = 86_400_000;
const utcDay = (date: Date) => Date.parse(date.toISOString().slice(0, 10));

export interface SimulatedOxygenReading {
  id: string;
  crewMemberId: string;
  value: 'air';
  observedAt: string;
  source: 'simulator';
}

export interface MissionSnapshot {
  measurements: Measurement[];
  observations: ConsciousnessObservation[];
  oxygenSupport: SimulatedOxygenReading[];
}

/** A deterministic lab snapshot. The full 180-day generator remains available for exploration. */
export function generateMissionSnapshot(options: SimulatorOptions & { asOf: Date }): MissionSnapshot {
  const start = utcDay(options.startDate);
  const today = utcDay(options.asOf);
  const cutoff = options.asOf.getTime();
  const days = Math.max(0, Math.min(options.days ?? MISSION_DAYS, MISSION_DAYS, Math.floor((today - start) / DAY_MS) + 1));
  // Early UTC visits must have today's demo observations, including at midnight. Never borrow
  // yesterday's date or move a sample into the future to make the daily assessment complete.
  const observedTime = (timestamp: string) => {
    const time = Date.parse(timestamp);
    if (time <= cutoff) return timestamp;
    const offset = 120_000 + (Math.floor((time - today) / 60_000) % 31) * 1000;
    return new Date(Math.max(today, cutoff - offset)).toISOString();
  };
  const measurements = generateMission({ ...options, startDate: new Date(start), days })
    .map(reading => ({ ...reading, measuredAt: observedTime(reading.measuredAt) }));
  const observations: ConsciousnessObservation[] = [];
  const oxygenSupport: SimulatedOxygenReading[] = [];
  for (let day = 1; day <= days; day++) {
    const observedAt = observedTime(new Date(start + (day - 1) * DAY_MS + 8 * 3_600_000).toISOString());
    observations.push({ id: `sim-${options.crewMemberId}-consciousness-d${day}`, crewMemberId: options.crewMemberId, level: 'alert', observedAt, source: 'simulator' });
    oxygenSupport.push({ id: `sim-${options.crewMemberId}-oxygen-d${day}`, crewMemberId: options.crewMemberId, value: 'air', observedAt, source: 'simulator' });
  }
  return { measurements, observations, oxygenSupport };
}
