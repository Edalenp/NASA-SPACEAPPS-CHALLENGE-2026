import { ORIGINAL_CREW_ID } from '../../store/crew';
import { EMPTY_DOSE_LOG, parseDoseLog, type DoseLog } from './doseLog';

export const LEGACY_DOSE_STORAGE_KEY = 'vt-dose-log-v1';
export const doseStorageKey = (crewId: string) => `${LEGACY_DOSE_STORAGE_KEY}:${crewId}`;

/** Untagged historical doses belong only to the original astronaut, like legacy measurements. */
export function readCrewDoseLog(storage: Pick<Storage, 'getItem'>, crewId: string): DoseLog {
  const scoped = storage.getItem(doseStorageKey(crewId));
  const raw = scoped ?? (crewId === ORIGINAL_CREW_ID ? storage.getItem(LEGACY_DOSE_STORAGE_KEY) : null);
  if (raw === null) return EMPTY_DOSE_LOG;
  const log = parseDoseLog(JSON.parse(raw));
  if (log === EMPTY_DOSE_LOG) throw new Error('Stored dose history has an invalid shape.');
  return log;
}

/** Never overwrite the legacy key or another astronaut's record. Storage errors reach the caller. */
export function writeCrewDoseLog(storage: Pick<Storage, 'setItem'>, crewId: string, log: DoseLog): void {
  storage.setItem(doseStorageKey(crewId), JSON.stringify(log));
}
