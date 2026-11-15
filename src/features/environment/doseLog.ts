import { aggregateDose, doseStatus, type DoseStatus } from '../../engine/dose';

/** One dosimeter reading in mSv (NASA effective dose). `eventId` ties it to a solar particle event. */
export interface DoseEntry {
  id: string;
  msv: number;
  at: string;
  eventId: string | null;
}

export interface DoseLog {
  /** Career effective dose before this mission, entered once. */
  priorCareerMsv: number;
  entries: DoseEntry[];
  /** The solar particle event being logged, if one is open. */
  activeEventId: string | null;
}

export interface DoseTotals {
  careerMsv: number;
  missionMsv: number;
  eventMsv: number;
  status: DoseStatus;
}

export const EMPTY_DOSE_LOG: DoseLog = { priorCareerMsv: 0, entries: [], activeEventId: null };
export const MAX_SINGLE_ENTRY_MSV = 1000;

/**
 * Two separate accumulations (RF-32): every reading counts toward the career total, and only
 * readings tagged with the open event count toward that event. Closing an event never
 * removes its dose from the career.
 */
export function doseTotals(log: DoseLog): DoseTotals {
  const missionMsv = aggregateDose(log.entries.map((entry) => entry.msv));
  const eventMsv = log.activeEventId
    ? aggregateDose(log.entries.filter((entry) => entry.eventId === log.activeEventId).map((entry) => entry.msv))
    : 0;
  const careerMsv = log.priorCareerMsv + missionMsv;
  return { careerMsv, missionMsv, eventMsv, status: doseStatus(careerMsv, eventMsv) };
}

export function validDose(msv: number): boolean {
  return Number.isFinite(msv) && msv >= 0 && msv <= MAX_SINGLE_ENTRY_MSV;
}

export function addDose(log: DoseLog, msv: number, at: string, id: string, inEvent: boolean): DoseLog {
  if (!validDose(msv)) return log;
  const eventId = inEvent ? log.activeEventId : null;
  return { ...log, entries: [...log.entries, { id, msv, at, eventId }] };
}

export function startEvent(log: DoseLog, id: string): DoseLog {
  return log.activeEventId ? log : { ...log, activeEventId: id };
}

export function endEvent(log: DoseLog): DoseLog {
  return { ...log, activeEventId: null };
}

export function setPriorCareer(log: DoseLog, msv: number): DoseLog {
  return validDose(msv) ? { ...log, priorCareerMsv: msv } : log;
}

/** Accepts only a well-formed log; anything else falls back to an empty one. */
export function parseDoseLog(raw: unknown): DoseLog {
  if (!raw || typeof raw !== 'object') return EMPTY_DOSE_LOG;
  const log = raw as DoseLog;
  if (!validDose(log.priorCareerMsv) || !Array.isArray(log.entries)) return EMPTY_DOSE_LOG;
  if (log.activeEventId !== null && typeof log.activeEventId !== 'string') return EMPTY_DOSE_LOG;
  const entries = log.entries.filter(
    (e) => e && typeof e.id === 'string' && validDose(e.msv) && Number.isFinite(Date.parse(e.at)) && (e.eventId === null || typeof e.eventId === 'string'),
  );
  return { priorCareerMsv: log.priorCareerMsv, entries, activeEventId: log.activeEventId };
}
