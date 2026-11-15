import { describe, expect, it } from 'vitest';
import { ORIGINAL_CREW_ID } from '../../store/crew';
import { addDose, doseTotals, EMPTY_DOSE_LOG, setPriorCareer, startEvent } from './doseLog';
import { doseStorageKey, LEGACY_DOSE_STORAGE_KEY, readCrewDoseLog, writeCrewDoseLog } from './doseStorage';

function device() {
  const rows = new Map<string, string>();
  return { rows, getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => { rows.set(key, value); } };
}
const at = '2026-11-15T10:00:00.000Z';
const historical = addDose(startEvent(setPriorCareer(EMPTY_DOSE_LOG, 100), 'old-event'), 250, at, 'old-dose', true);

describe('radiation history ownership', () => {
  it('restores untagged history only for the original astronaut and keeps the old record intact', () => {
    const storage = device();
    const original = JSON.stringify(historical);
    storage.setItem(LEGACY_DOSE_STORAGE_KEY, original);
    expect(readCrewDoseLog(storage, ORIGINAL_CREW_ID)).toEqual(historical);
    expect(readCrewDoseLog(storage, 'other')).toEqual(EMPTY_DOSE_LOG);
    expect(storage.getItem(LEGACY_DOSE_STORAGE_KEY)).toBe(original);
  });
  it('persists separate events and totals across reloads without copying or overwriting another crew member', () => {
    const storage = device();
    storage.setItem(LEGACY_DOSE_STORAGE_KEY, JSON.stringify(historical));
    const other = addDose(startEvent(EMPTY_DOSE_LOG, 'other-event'), 5, at, 'other-dose', true);
    writeCrewDoseLog(storage, 'other', other);
    expect(doseTotals(readCrewDoseLog(storage, 'other'))).toMatchObject({ careerMsv: 5, eventMsv: 5 });
    expect(doseTotals(readCrewDoseLog(storage, ORIGINAL_CREW_ID))).toMatchObject({ careerMsv: 350, eventMsv: 250 });
    const updated = addDose(readCrewDoseLog(storage, ORIGINAL_CREW_ID), 1, at, 'new-dose', false);
    writeCrewDoseLog(storage, ORIGINAL_CREW_ID, updated);
    expect(readCrewDoseLog(storage, ORIGINAL_CREW_ID)).toEqual(updated);
    expect(readCrewDoseLog(storage, 'other')).toEqual(other);
    expect(storage.getItem(LEGACY_DOSE_STORAGE_KEY)).toBe(JSON.stringify(historical));
  });
  it('prefers a saved empty scoped record to historical data', () => {
    const storage = device();
    storage.setItem(LEGACY_DOSE_STORAGE_KEY, JSON.stringify(historical));
    writeCrewDoseLog(storage, ORIGINAL_CREW_ID, EMPTY_DOSE_LOG);
    expect(storage.getItem(doseStorageKey(ORIGINAL_CREW_ID))).not.toBeNull();
    expect(readCrewDoseLog(storage, ORIGINAL_CREW_ID)).toEqual(EMPTY_DOSE_LOG);
  });
  it('reports unreadable or unavailable storage without deleting its existing contents', () => {
    const storage = device();
    storage.setItem(doseStorageKey(ORIGINAL_CREW_ID), '{bad-json');
    expect(() => readCrewDoseLog(storage, ORIGINAL_CREW_ID)).toThrow();
    expect(storage.getItem(doseStorageKey(ORIGINAL_CREW_ID))).toBe('{bad-json');
    expect(() => writeCrewDoseLog({ setItem: () => { throw new Error('quota'); } }, ORIGINAL_CREW_ID, historical)).toThrow('quota');
  });
});
