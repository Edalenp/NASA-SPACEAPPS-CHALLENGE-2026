import { useEffect, useId, useState, type FormEvent } from 'react';
import { ArrowUpRight, CircleStop, Plus, Sun } from 'lucide-react';
import { DOSE_LIMITS_MSV, DOSE_SOURCES } from '../../engine/dose';
import {
  addDose, doseTotals, EMPTY_DOSE_LOG, endEvent, parseDoseLog, setPriorCareer, startEvent, validDose, type DoseLog,
} from './doseLog';
import './radiation-meter.css';

const STORAGE_KEY = 'vt-dose-log-v1';

/**
 * Interim persistence on this device until the shared IndexedDB contract has a dose table.
 * Swap it by passing `log` and `onChange` to RadiationMeter; the component never needs it then.
 */
function useLocalDoseLog(): [DoseLog, (next: DoseLog) => void] {
  const [log, setLog] = useState<DoseLog>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? parseDoseLog(JSON.parse(raw)) : EMPTY_DOSE_LOG;
    } catch {
      return EMPTY_DOSE_LOG;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch {
      /* private mode or full storage: the meter still works for this session */
    }
  }, [log]);
  return [log, setLog];
}

function Gauge({ label, value, limit, exceeded, note }: { label: string; value: number; limit: number; exceeded: boolean; note: string }) {
  const share = Math.min(1, value / limit);
  const shown = value.toFixed(1);
  return (
    <div className={`dose-gauge ${exceeded ? 'is-alert' : ''}`}>
      <div className="dose-gauge-head">
        <span className="micro">{label}</span>
        <b><span className="dose-figure">{shown}</span> <small>/ {limit} mSv</small></b>
      </div>
      <div
        className="dose-gauge-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Number(shown)}
        aria-valuetext={`${shown} of ${limit} mSv${exceeded ? ', limit reached' : ''}`}
      >
        <span style={{ transform: `scaleX(${share})` }} />
      </div>
      <small className="dose-gauge-note">
        {exceeded ? '◆ Limit reached. Tell the Crew Medical Officer and mission control.' : note}
      </small>
    </div>
  );
}

/**
 * RF-32: career and solar-event dose against NASA-STD-3001, with dosimeter entry. Store-
 * independent when the host passes `log` and `onChange`; otherwise it keeps the log on this device.
 */
export function RadiationMeter({ log: hostLog, onChange: hostChange, now = () => new Date().toISOString() }: {
  log?: DoseLog;
  onChange?: (next: DoseLog) => void;
  now?: () => string;
}) {
  const [localLog, setLocalLog] = useLocalDoseLog();
  const log = hostLog ?? localLog;
  const change = hostChange ?? setLocalLog;
  const totals = doseTotals(log);
  const uid = useId();
  const [dose, setDose] = useState('');
  const [prior, setPrior] = useState(log.priorCareerMsv ? String(log.priorCareerMsv) : '');
  const [inEvent, setInEvent] = useState(true);
  const [error, setError] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const msv = Number(dose.replace(',', '.'));
    if (dose.trim() === '' || !validDose(msv)) {
      setError('Enter the dosimeter reading in mSv, from 0 to 1000.');
      return;
    }
    setError('');
    change(addDose(log, msv, now(), crypto.randomUUID(), inEvent && log.activeEventId !== null));
    setDose('');
  }
  function savePrior() {
    const msv = Number(prior.replace(',', '.'));
    if (prior.trim() !== '' && validDose(msv)) change(setPriorCareer(log, msv));
  }

  return (
    <section className="radiation-meter" aria-labelledby={`${uid}-h`}>
      <header>
        <span className="micro" id={`${uid}-h`}>Radiation dose · NASA effective dose</span>
        <p>
          {log.entries.length} {log.entries.length === 1 ? 'reading' : 'readings'} this mission ·{' '}
          {totals.missionMsv.toFixed(1)} mSv
        </p>
      </header>
      <div className="dose-columns">
      <div className="dose-gauges">
      <Gauge
        label="Career"
        value={totals.careerMsv}
        limit={DOSE_LIMITS_MSV.careerMsv}
        exceeded={totals.status.careerExceeded}
        note="Includes the dose before this mission. NASA limit: below 600 mSv, all ages and sexes."
      />
      {/* The solar event: its gauge while open, and the one control that opens or closes it. */}
      <div className={`dose-event ${log.activeEventId ? 'is-open' : ''}`}>
        {log.activeEventId ? (
          <Gauge
            label="Solar particle event · open"
            value={totals.eventMsv}
            limit={DOSE_LIMITS_MSV.solarEventMsv}
            exceeded={totals.status.solarEventExceeded}
            note="Event readings also count toward the career."
          />
        ) : (
          <p className="dose-event-closed">No solar particle event open. Start one to count its dose on its own.</p>
        )}
        {log.activeEventId ? (
          <button type="button" className="btn btn-outline" onClick={() => change(endEvent(log))}><CircleStop size={14} aria-hidden="true" /> End solar event</button>
        ) : (
          <button type="button" className="btn btn-outline" onClick={() => change(startEvent(log, crypto.randomUUID()))}><Sun size={14} aria-hidden="true" /> Start solar event</button>
        )}
      </div>
      </div>
      <div className="dose-entry">
      <form className="dose-form" onSubmit={submit} noValidate>
        <label>
          <span>Dosimeter reading</span>
          <span className="dose-input">
            <input
              inputMode="decimal"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? `${uid}-e` : undefined}
              placeholder="0.0"
            />
            <small>mSv</small>
          </span>
        </label>
        {log.activeEventId && (
          <label className="dose-check">
            <input type="checkbox" checked={inEvent} onChange={(e) => setInEvent(e.target.checked)} /> Received during the open event
          </label>
        )}
        <button type="submit" className="btn btn-solid"><Plus size={14} aria-hidden="true" /> Add reading</button>
        {error && <p className="dose-error" id={`${uid}-e`} role="alert">{error}</p>}
      </form>
      <div className="dose-row">
        <label className="dose-prior">
          <span>Career dose before this mission</span>
          <span className="dose-input">
            <input inputMode="decimal" value={prior} onChange={(e) => setPrior(e.target.value)} onBlur={savePrior} placeholder="0" />
            <small>mSv</small>
          </span>
        </label>
      </div>
      </div>
      </div>
      <p className="dose-fine">
        Limits from NASA-STD-3001 Vol. 1 Rev. C. The 250 mSv figure is a design requirement for the
        reference solar event, used here as a per-event reference, not a personal dose limit.
        Readings are typed in by the crew; this app measures nothing.{' '}
        {DOSE_SOURCES.map((s) => (
          <a key={s.sourceUrl} href={s.sourceUrl} target="_blank" rel="noreferrer">
            {s.sourceTitle.split(' — ')[0]} <ArrowUpRight size={10} aria-hidden="true" />
          </a>
        ))}
      </p>
    </section>
  );
}
