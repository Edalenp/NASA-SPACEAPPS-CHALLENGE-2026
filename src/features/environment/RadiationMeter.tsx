import { useId, useState, type FormEvent } from 'react';
import { ArrowUpRight, CircleStop, Plus, Sun } from 'lucide-react';
import { DOSE_LIMITS_MSV, DOSE_SOURCES } from '../../engine/dose';
import { getRadiationReference } from '../../data/nasa/reference';
import { activeCrew, useCrew } from '../../store/crew';
import { readCrewDoseLog, writeCrewDoseLog } from './doseStorage';
import {
  addDose, doseTotals, EMPTY_DOSE_LOG, endEvent, setPriorCareer, startEvent, validDose, type DoseLog,
} from './doseLog';
import './radiation-meter.css';

const radiationReferences = getRadiationReference();

/**
 * Interim persistence on this device until the shared IndexedDB contract has a dose table.
 * Swap it by passing `log` and `onChange` to RadiationMeter; the component never needs it then.
 */
function useLocalDoseLog(crewId: string): [DoseLog, (next: DoseLog) => void, string, boolean] {
  const [saved, setSaved] = useState<{ log: DoseLog; error: string; loaded: boolean }>(() => {
    try {
      return { log: readCrewDoseLog(localStorage, crewId), error: '', loaded: true };
    } catch {
      return { log: EMPTY_DOSE_LOG, error: 'Could not load this astronaut’s dose history. Reload before entering new readings.', loaded: false };
    }
  });
  function change(log: DoseLog) {
    if (!saved.loaded) return;
    try {
      writeCrewDoseLog(localStorage, crewId, log);
      setSaved({ log, error: '', loaded: true });
    } catch {
      setSaved({ log, error: 'Dose changes are session-only: device storage could not confirm the save.', loaded: true });
    }
  }
  return [saved.log, change, saved.error, saved.loaded];
}

function Gauge({ label, value, limit, exceeded, note, reference = false }: { label: string; value: number; limit: number; exceeded: boolean; note: string; reference?: boolean }) {
  const share = Math.min(1, value / limit);
  const shown = value.toFixed(1);
  return (
    <div className={`dose-gauge ${exceeded ? reference ? 'is-reference-reached' : 'is-alert' : ''}`}>
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
        aria-valuenow={Math.min(limit, Number(shown))}
        aria-valuetext={`${shown} mSv; ${reference ? 'design reference' : 'career limit'} ${limit} mSv${exceeded ? reference ? ', reference reached or exceeded' : ', limit reached' : ''}`}
      >
        <span style={{ transform: `scaleX(${share})` }} />
      </div>
      <small className="dose-gauge-note">
        {exceeded
          ? reference
            ? 'Design reference reached or exceeded. This comparison is not a personal exposure limit or a shielding assessment.'
            : '◆ Career limit reached. Review recorded exposure with the Crew Medical Officer and mission control.'
          : note}
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
  const crewId = useCrew(s => s.activeId);
  // CrewLab remounts the lab when the stable crew identity changes.
  const [localLog, setLocalLog, storageError, loaded] = useLocalDoseLog(crewId);
  const disabled = !hostLog && !loaded;
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
          {activeCrew().displayName} · {log.entries.length} {log.entries.length === 1 ? 'reading' : 'readings'} this mission ·{' '}
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
            reference
            note="Comparison with the 250 mSv design-reference SPE requirement; not a personal exposure limit. Event readings also count toward the career."
          />
        ) : (
          <p className="dose-event-closed">No solar particle event open. Start one to count its dose on its own.</p>
        )}
        {log.activeEventId ? (
          <button type="button" className="btn btn-outline" disabled={disabled} onClick={() => change(endEvent(log))}><CircleStop size={14} aria-hidden="true" /> End solar event</button>
        ) : (
          <button type="button" className="btn btn-outline" disabled={disabled} onClick={() => change(startEvent(log, crypto.randomUUID()))}><Sun size={14} aria-hidden="true" /> Start solar event</button>
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
              disabled={disabled}
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
        <button type="submit" className="btn btn-solid" disabled={disabled}><Plus size={14} aria-hidden="true" /> Add reading</button>
        {error && <p className="dose-error" id={`${uid}-e`} role="alert">{error}</p>}
      </form>
      <div className="dose-row">
        <label className="dose-prior">
          <span>Career dose before this mission</span>
          <span className="dose-input">
            <input inputMode="decimal" disabled={disabled} value={prior} onChange={(e) => setPrior(e.target.value)} onBlur={savePrior} placeholder="0" />
            <small>mSv</small>
          </span>
        </label>
      </div>
      </div>
      </div>
      {!hostLog && storageError && <p className="dose-error" role="alert">{storageError}</p>}
      <p className="dose-fine">
        NASA-STD-3001 Vol. 1 Rev. C: V1 4030 specifies the career limit; V1 4031 specifies
        protection against the design-reference solar particle event (sum of the October 1989 events).
        The 250 mSv comparison is not a personal per-event limit or a shielding assessment.
        Readings are typed in by the crew; this app measures nothing.{' '}
        {DOSE_SOURCES.map((s) => (
          <a key={s.sourceUrl} href={s.sourceUrl} target="_blank" rel="noreferrer">
            {s.sourceTitle.split(' — ')[0]} <ArrowUpRight size={10} aria-hidden="true" />
          </a>
        ))}
      </p>
      <details className="dose-sources">
        <summary>Radiation sources and scope</summary>
        <ul>
          <li><a href={radiationReferences.sources.standard.url} target="_blank" rel="noreferrer">NASA-STD-3001 Vol. 1 Rev. C · V1 4030, p. 40; V1 4031, p. 42</a> — Source of the career requirement and SPE design reference.</li>
          <li><a href={radiationReferences.sources.brief.url} target="_blank" rel="noreferrer">OCHMO-TB-020 Rev G · pp. 4 and 6</a> — Supporting technical brief; does not supersede the standard.</li>
          <li><a href={DOSE_SOURCES[1].sourceUrl} target="_blank" rel="noreferrer">Canadian Space Agency · Radiation in space</a> — Exposure context; its Canadian/organ-dose limits are not used as NASA effective-dose requirements.</li>
        </ul>
        <p>Environment delays and these manually entered totals are simulation context. No live solar-event feed, shielding calculation or measured exposure is inferred.</p>
      </details>
    </section>
  );
}
