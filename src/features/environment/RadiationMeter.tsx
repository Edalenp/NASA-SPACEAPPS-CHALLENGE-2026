import { useEffect, useId, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, CircleStop, Plus, Sun } from 'lucide-react';
import { DOSE_LIMITS_MSV, DOSE_SOURCES } from '../../engine/dose';
import {
  addDose, doseTotals, EMPTY_DOSE_LOG, endEvent, parseDoseLog, setPriorCareer, startEvent, validDose, type DoseLog,
} from './doseLog';
import { SpaceWeatherCard } from '../space-weather/SpaceWeather';
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

function Gauge({ label, value, limit, exceeded, note, preview = 0 }: { label: string; value: number; limit: number; exceeded: boolean; note: string; preview?: number }) {
  const share = Math.min(1, value / limit);
  const shown = value.toFixed(1);
  // A reading being tried on the slider: a lighter band past the recorded dose, and the total it
  // would make, before anything is saved.
  const ahead = Math.min(1, (value + preview) / limit);
  const over = value + preview >= limit;
  return (
    <div className={`dose-gauge ${exceeded ? 'is-alert' : ''} ${preview > 0 ? 'is-preview' : ''} ${over && !exceeded ? 'is-over' : ''}`}>
      <div className="dose-gauge-head">
        <span className="micro">{label}</span>
        <b>
          {preview > 0 && <em className="dose-after">→ {(value + preview).toFixed(1)}</em>}
          <span className="dose-figure">{shown}</span> <small>/ {limit} mSv</small>
        </b>
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
        {preview > 0 && <span className="dose-gauge-ahead" style={{ transform: `scaleX(${ahead})` }} />}
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
  const [tab, setTab] = useState<'solar' | 'dosimeter' | 'career'>('solar');
  const [saved, setSaved] = useState('');
  // The reading being tried: the gauges show where it would take the totals, live.
  const trial = Number(dose.replace(',', '.'));
  const preview = dose.trim() !== '' && validDose(trial) ? trial : 0;
  const toEvent = inEvent && log.activeEventId !== null;

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
    setSaved(`${msv.toFixed(1)} mSv added${toEvent ? ' to the open event and the career' : ' to the career'}.`);
  }
  function savePrior() {
    const msv = Number(prior.replace(',', '.'));
    if (prior.trim() !== '' && validDose(msv)) change(setPriorCareer(log, msv));
  }
  const priorTrial = Number(prior.replace(',', '.'));
  const priorPreview = prior.trim() !== '' && validDose(priorTrial) ? priorTrial - (log.priorCareerMsv ?? 0) : 0;
  const tabs = [
    { id: 'solar', label: 'Solar events', hint: log.activeEventId ? 'Event open' : 'NASA DONKI' },
    { id: 'dosimeter', label: 'Dosimeter', hint: `${log.entries.length} ${log.entries.length === 1 ? 'reading' : 'readings'}` },
    { id: 'career', label: 'Career dose', hint: `${totals.careerMsv.toFixed(1)} / ${DOSE_LIMITS_MSV.careerMsv} mSv` },
  ] as const;

  return (
    <section className="radiation-meter" aria-labelledby={`${uid}-h`}>
      <header>
        <span className="micro" id={`${uid}-h`}>Radiation dose · NASA effective dose</span>
        <p>
          {log.entries.length} {log.entries.length === 1 ? 'reading' : 'readings'} this mission ·{' '}
          {totals.missionMsv.toFixed(1)} mSv
        </p>
      </header>
      {/* Three jobs, one at a time: what space weather says, the reading in hand, the career. */}
      <div className="dose-tabs" role="tablist" aria-label="Radiation">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`${uid}-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`${uid}-pane`} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
            <b>{t.label}</b><small>{t.hint}</small>
          </button>
        ))}
      </div>
      <div className="dose-pane" role="tabpanel" id={`${uid}-pane`} aria-labelledby={`${uid}-tab-${tab}`}>
      {tab === 'solar' && <>
        {/* NASA DONKI's particle events decide when the crew should open a solar event here. */}
        <SpaceWeatherCard log={log} onChange={change} />
        {/* The solar event: its gauge while open, and the one control that opens or closes it. */}
        <div className={`dose-event ${log.activeEventId ? 'is-open' : ''}`}>
          {log.activeEventId ? (
            <Gauge
              label={log.activeEventId.startsWith('donki:') ? 'Solar particle event · NASA DONKI' : 'Solar particle event · open'}
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
      </>}
      {tab === 'dosimeter' && <div className="dose-columns">
        <form className="dose-form" onSubmit={submit} noValidate>
          <label className="dose-field">
            <span>Dosimeter reading</span>
            <span className="dose-slide">
              {/* Drag to try a value: the gauges beside show the totals it would make. */}
              <input type="range" min={0} max={50} step={0.1} value={preview} aria-label="Dosimeter reading, mSv" onChange={(e) => { setDose(e.target.value); setSaved(''); }} />
              <span className="dose-input">
                <input
                  inputMode="decimal"
                  value={dose}
                  onChange={(e) => { setDose(e.target.value); setSaved(''); }}
                  aria-invalid={!!error}
                  aria-describedby={error ? `${uid}-e` : undefined}
                  placeholder="0.0"
                />
                <small>mSv</small>
              </span>
            </span>
          </label>
          {log.activeEventId && (
            <button type="button" className={`dose-toggle ${inEvent ? 'is-on' : ''}`} aria-pressed={inEvent} onClick={() => setInEvent(!inEvent)}>
              <span className="dose-toggle-box" aria-hidden="true">{inEvent && <Check size={12} />}</span>
              Received during the open solar event
            </button>
          )}
          <button type="submit" className="btn btn-solid" disabled={preview <= 0}><Plus size={14} aria-hidden="true" /> Add reading</button>
          {error && <p className="dose-error" id={`${uid}-e`} role="alert">{error}</p>}
          <p className="dose-saved" role="status">{saved && <><Check size={13} aria-hidden="true" /> {saved}</>}</p>
        </form>
        <div className="dose-gauges">
          <Gauge
            label="Career"
            value={totals.careerMsv}
            limit={DOSE_LIMITS_MSV.careerMsv}
            exceeded={totals.status.careerExceeded}
            preview={preview}
            note="NASA limit: below 600 mSv, all ages and sexes."
          />
          {log.activeEventId && (
            <Gauge
              label="Open solar event"
              value={totals.eventMsv}
              limit={DOSE_LIMITS_MSV.solarEventMsv}
              exceeded={totals.status.solarEventExceeded}
              preview={toEvent ? preview : 0}
              note="Design reference for the solar event, not a personal limit."
            />
          )}
        </div>
      </div>}
      {tab === 'career' && <div className="dose-columns">
        <div className="dose-entry">
          <label className="dose-field">
            <span>Career dose before this mission</span>
            <span className="dose-slide">
              <input type="range" min={0} max={600} step={1} value={prior.trim() === '' ? 0 : Math.min(600, Math.max(0, priorTrial || 0))} aria-label="Career dose before this mission, mSv" onChange={(e) => setPrior(e.target.value)} onPointerUp={savePrior} onKeyUp={savePrior} onBlur={savePrior} />
              <span className="dose-input">
                <input inputMode="decimal" value={prior} onChange={(e) => setPrior(e.target.value)} onBlur={savePrior} placeholder="0" />
                <small>mSv</small>
              </span>
            </span>
          </label>
          <p className="dose-help">From earlier missions and other occupational exposure. It is added to every reading of this mission.</p>
        </div>
        <div className="dose-gauges">
          <Gauge
            label="Career"
            value={totals.careerMsv}
            limit={DOSE_LIMITS_MSV.careerMsv}
            exceeded={totals.status.careerExceeded}
            preview={Math.max(0, priorPreview)}
            note="Includes the dose before this mission. NASA limit: below 600 mSv, all ages and sexes."
          />
        </div>
      </div>}
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
