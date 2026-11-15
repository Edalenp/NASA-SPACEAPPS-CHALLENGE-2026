import { describe, expect, it } from 'vitest';
import { addDose, doseTotals, EMPTY_DOSE_LOG, endEvent, parseDoseLog, setPriorCareer, startEvent } from './doseLog';

const AT = '2026-11-15T10:00:00.000Z';

describe('dose log (RF-32)', () => {
  it('keeps career and event accumulations separate', () => {
    let log = setPriorCareer(EMPTY_DOSE_LOG, 100);
    log = addDose(log, 2, AT, 'a', false);
    log = startEvent(log, 'spe-1');
    log = addDose(log, 40, AT, 'b', true);
    log = addDose(log, 1, AT, 'c', false);
    expect(doseTotals(log)).toMatchObject({ careerMsv: 143, missionMsv: 43, eventMsv: 40 });
  });

  it('keeps an event dose in the career after the event closes', () => {
    let log = startEvent(EMPTY_DOSE_LOG, 'spe-1');
    log = addDose(log, 260, AT, 'a', true);
    expect(doseTotals(log).status.solarEventExceeded).toBe(true);
    log = endEvent(log);
    expect(doseTotals(log)).toMatchObject({ careerMsv: 260, eventMsv: 0 });
    expect(doseTotals(log).status.solarEventExceeded).toBe(false);
  });

  it('flags the career limit at 600 mSv', () => {
    const log = addDose(setPriorCareer(EMPTY_DOSE_LOG, 590), 10, AT, 'a', false);
    expect(doseTotals(log).status.careerExceeded).toBe(true);
  });

  it('rejects negative, non-finite and implausible readings', () => {
    for (const msv of [-1, Number.NaN, Infinity, 5000]) {
      expect(addDose(EMPTY_DOSE_LOG, msv, AT, 'a', false)).toBe(EMPTY_DOSE_LOG);
    }
  });

  it('restores only a well-formed stored log', () => {
    expect(parseDoseLog(null)).toEqual(EMPTY_DOSE_LOG);
    expect(parseDoseLog({ priorCareerMsv: -3, entries: [] })).toEqual(EMPTY_DOSE_LOG);
    const kept = parseDoseLog({ priorCareerMsv: 5, activeEventId: null, entries: [{ id: 'a', msv: 1, at: AT, eventId: null }, { id: 'b', msv: 'x', at: AT, eventId: null }] });
    expect(kept.entries).toHaveLength(1);
  });
});
