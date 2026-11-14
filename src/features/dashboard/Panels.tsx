import { useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import { environments, formatDelay, history, MISSION_DAY, systems, type EnvironmentId } from '../../data/mission';
import { dailyCheck, formatValue, indicators, type IndicatorId, type ReadingValue } from '../../data/indicators';
import { guides } from '../../data/guides';
import { useMission, type Panel } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import { news2Params } from '../../engine/consoleNews2';
import { deviation } from '../../engine/status';
import { Dialog } from '../../ui/Dialog';
import { StateMark } from '../../ui/StateMark';
import { TrendRuler } from '../../ui/TrendRuler';
import { ladder } from './escalation';

const titles: Record<Exclude<Panel, null>, string> = {
  system: '', record: 'Record a measurement.', trends: 'A view across the mission.', guides: 'Measure with confidence.',
  routine: 'Your daily check-in.', mission: 'Mission environment.', news: 'Early warning score.', sources: 'Built on open knowledge.',
};

export function Panels() {
  const panel = useMission((s) => s.panel);
  const open = useMission((s) => s.open);
  const selected = useMission((s) => s.selected);
  const sys = systems.find((s) => s.id === selected)!;
  return (
    <Dialog
      open={panel !== null}
      onOpenChange={(o) => { if (!o) open(null); }}
      kicker={`VITRUVIO / ${panel ?? ''}`}
      title={panel === 'system' ? sys.name : panel ? titles[panel] : ''}
    >
      {panel === 'system' && <SystemPanel />}
      {panel === 'record' && <RecordPanel />}
      {panel === 'trends' && <TrendsPanel />}
      {panel === 'guides' && <GuidesPanel />}
      {panel === 'routine' && <RoutinePanel />}
      {panel === 'mission' && <MissionPanel />}
      {panel === 'news' && <NewsPanel />}
      {panel === 'sources' && <SourcesPanel />}
    </Dialog>
  );
}

const HRP = 'https://www.nasa.gov/hrp/';

function SystemPanel() {
  const selected = useMission((s) => s.selected);
  const env = environments[useMission((s) => s.environment)];
  const sys = systems.find((s) => s.id === selected)!;
  return (
    <>
      <p className="dialog-copy">{sys.description}</p>
      <div className="block">
        <span className="micro">Spaceflight hazards that weigh here</span>
        <ul className="tags">{sys.hazards.map((h) => <li key={h}>{h}</li>)}</ul>
      </div>
      <div className="block">
        <span className="micro">NASA Human Research Program risk</span>
        <p className="dialog-copy">{sys.hrpRisk}. Your environment adds: {env.context.toLowerCase()}.</p>
      </div>
      <a className="btn btn-outline" href={HRP} target="_blank" rel="noreferrer">NASA Human Research Program <ArrowUpRight size={14} aria-hidden="true" /></a>
      <p className="dialog-fine">Risk names are paraphrased from the HRP risk list. NASA does not endorse this prototype.</p>
    </>
  );
}

function RecordPanel() {
  const recordFor = useMission((s) => s.recordFor);
  const readings = useMission((s) => s.readings);
  const record = useMission((s) => s.record);
  const open = useMission((s) => s.open);
  const [id, setId] = useState<IndicatorId>(recordFor);
  const [error, setError] = useState('');
  const ind = indicators[id];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget).get('value');
    let value: ReadingValue;
    if (ind.kind === 'number') {
      const n = Number(raw);
      if (raw === '' || !Number.isFinite(n) || n < ind.min || n > ind.max) {
        setError(`Enter a value from ${ind.min} to ${ind.max} ${ind.unit}.`);
        return;
      }
      value = n;
    } else {
      value = raw as ReadingValue;
    }
    await record(id, value);
    open(null);
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <p className="dialog-copy">Saved on this device. The score and the twin update at once.</p>
      <label htmlFor="indicator" className="micro">Reading</label>
      <select id="indicator" value={id} onChange={(e) => { setId(e.target.value as IndicatorId); setError(''); }}>
        {(Object.keys(indicators) as IndicatorId[]).map((k) => (
          <option key={k} value={k}>{indicators[k].name}{indicators[k].unit && ` / ${indicators[k].unit}`}</option>
        ))}
      </select>
      <label htmlFor="value" className="micro">Value{ind.kind === 'number' && ` / ${ind.unit}`}</label>
      {ind.kind === 'number' ? (
        <input
          key={id}
          id="value"
          name="value"
          type="number"
          inputMode="decimal"
          step={ind.step}
          min={ind.min}
          max={ind.max}
          defaultValue={readings[id] === null ? '' : String(readings[id])}
          aria-invalid={!!error}
          aria-describedby="value-help"
          autoFocus
        />
      ) : (
        <select key={id} id="value" name="value" defaultValue={String(readings[id] ?? ind.usual)}>
          {ind.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <small id="value-help" className={error ? 'form-error' : 'micro'}>
        {error || (ind.kind === 'number' ? `Accepted ${ind.min}–${ind.max} ${ind.unit}${ind.usual ? ` · your usual ${ind.usual[0]}–${ind.usual[1]}` : ''}` : 'Choose what you observe now.')}
      </small>
      <div className="form-actions">
        <button type="submit" className="btn btn-solid btn-lg">Save reading <ArrowRight size={16} aria-hidden="true" /></button>
        {guides[id] && <button type="button" className="btn btn-ghost" onClick={() => open('guides', { guide: id })}>How to measure</button>}
      </div>
    </form>
  );
}

function TrendsPanel() {
  const [id, setId] = useState<'pulse' | 'systolic'>('systolic');
  const readings = useMission((s) => s.readings);
  const values = [...history[id].slice(0, -1), (readings[id] as number | null) ?? history[id][history[id].length - 1]];
  const ind = indicators[id];
  return (
    <>
      <div className="segmented" role="group" aria-label="Reading">
        {(['systolic', 'pulse'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={id === k} className={id === k ? 'is-on' : ''} onClick={() => setId(k)}>{indicators[k].name}</button>
        ))}
      </div>
      <p className="dialog-copy">
        {ind.name}, last 30 sols. The grey band is your usual range{ind.kind === 'number' && ind.usual ? `, ${ind.usual[0]}–${ind.usual[1]} ${ind.unit}` : ''}.
      </p>
      <TrendRuler id={id} values={values} lastDay={MISSION_DAY} height={220} />
      <p className="dialog-fine">Simulated mission data, not NASA measurements. Your baseline and NEWS2 are separate signals.</p>
    </>
  );
}

function GuidesPanel() {
  const guide = useMission((s) => s.guide);
  const open = useMission((s) => s.open);
  const ids = (Object.keys(guides) as IndicatorId[]);
  const current = guides[guide] ? guide : 'pulse';
  const g = guides[current]!;
  return (
    <>
      <div className="guide-tabs" role="tablist" aria-label="Readings">
        {ids.map((k) => (
          <button key={k} role="tab" type="button" aria-selected={current === k} className={current === k ? 'is-on' : ''} onClick={() => open('guides', { guide: k })}>
            {indicators[k].name}
          </button>
        ))}
      </div>
      <div className="block">
        <span className="micro">Field guide / {String(ids.indexOf(current) + 1).padStart(2, '0')} · {g.instrument}</span>
        <h3 className="dialog-h3">{indicators[current].name}</h3>
        <p className="dialog-copy">{g.why}</p>
      </div>
      <ol className="steps">
        {g.steps.map((s, i) => (
          <li key={s}><span className="micro">{String(i + 1).padStart(2, '0')}</span><p>{s}</p></li>
        ))}
      </ol>
      <button type="button" className="btn btn-solid" onClick={() => open('record', { recordFor: current })}>Record this reading <ArrowRight size={14} aria-hidden="true" /></button>
      <p className="dialog-fine">Draft guide, pending review against the onboard medical kit procedures.</p>
    </>
  );
}

function RoutinePanel() {
  const readings = useMission((s) => s.readings);
  const entries = useMission((s) => s.entries);
  const open = useMission((s) => s.open);
  const done = dailyCheck.filter((id) => readings[id] !== null).length;
  return (
    <>
      <p className="dialog-copy">Day {String(MISSION_DAY).padStart(3, '0')}: {done} of {dailyCheck.length} readings complete.</p>
      <ul className="checklist">
        {dailyCheck.map((id) => {
          const v = readings[id];
          return (
            <li key={id}>
              <button type="button" onClick={() => open('record', { recordFor: id })}>
                <StateMark status={deviation(id, v).status} label={false} />
                <b>{indicators[id].name}</b>
                <span className="micro">{v === null ? 'Pending' : `${formatValue(id, v)} ${indicators[id].kind === 'number' ? indicators[id].unit : ''}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <h3 className="dialog-h3">Saved on this device</h3>
      {entries.length ? (
        <ul className="entries">
          {entries.slice(-5).reverse().map((e) => (
            <li key={e.timestamp}>
              <b>{indicators[e.indicator].name}</b>
              <span>{formatValue(e.indicator, e.value)} {indicators[e.indicator].kind === 'number' ? indicators[e.indicator].unit : ''}</span>
              <time className="micro">{new Date(e.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dialog-fine">No readings saved yet. Your first one appears here.</p>
      )}
      <button type="button" className="btn btn-solid" onClick={() => open('record', { recordFor: dailyCheck.find((id) => readings[id] === null) })}><Plus size={15} aria-hidden="true" /> Record measurement</button>
    </>
  );
}

function MissionPanel() {
  const environment = useMission((s) => s.environment);
  const setEnvironment = useMission((s) => s.setEnvironment);
  return (
    <>
      <p className="dialog-copy">The environment sets the context and how long Earth takes to answer.</p>
      <div className="options">
        {(Object.keys(environments) as EnvironmentId[]).map((k) => {
          const e = environments[k];
          return (
            <button key={k} type="button" aria-pressed={environment === k} className={environment === k ? 'is-on' : ''} onClick={() => setEnvironment(k)}>
              <span className="micro">{e.code}</span>
              <b>{e.name}</b>
              <span className="micro">{formatDelay(e.delayMin)} one way · {e.context}</span>
            </button>
          );
        })}
      </div>
      <p className="dialog-fine">Delays are scenario settings. No link to a real mission is made.</p>
    </>
  );
}

function NewsPanel() {
  const { score, readings } = useAssessment();
  const env = environments[useMission((s) => s.environment)];
  const open = useMission((s) => s.open);
  return (
    <>
      <div className="news-total">
        <strong>{score.complete ? score.total : '—'}</strong>
        <span>of 20 · {score.risk} risk · {score.measured} of 7 measured</span>
      </div>
      <table className="news-table">
        <caption className="sr-only">NEWS2 parameters and scores</caption>
        <tbody>
          {news2Params.map((p) => (
            <tr key={p} className={score.scores[p] ? 'is-scored' : ''}>
              <th scope="row">{indicators[p].name}</th>
              <td>{formatValue(p, readings[p])} <small>{indicators[p].kind === 'number' && readings[p] !== null ? indicators[p].unit : ''}</small></td>
              <td><span className={`score-box s${score.scores[p] ?? 'x'}`}>{score.scores[p] ?? '—'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="dialog-h3">Who to tell</h3>
      <ol className="ladder">
        {ladder(env.delayMin).map((l) => (
          <li key={l.id} className={score.escalation === l.id ? 'is-on' : ''}>
            <span className="micro">{l.range}</span>
            <p><b>{l.who}</b> {l.detail}</p>
          </li>
        ))}
      </ol>
      <p className="dialog-fine">
        NEWS2, unmodified, © Royal College of Physicians 2017. Validated for care on Earth, not for spaceflight. Concern about a crewmate overrides the score. SpO₂ uses Scale 1.
      </p>
      {!score.complete && <button type="button" className="btn btn-outline" onClick={() => open('record')}>Record a missing reading <ArrowRight size={14} aria-hidden="true" /></button>}
    </>
  );
}

function SourcesPanel() {
  return (
    <div className="sources">
      <article>
        <span className="micro">Early warning / NEWS2</span>
        <h3>Royal College of Physicians, 2017</h3>
        <p>Scoring bands and thresholds unaltered. Transcribed with AI assistance; human check pending.</p>
      </article>
      <article>
        <span className="micro">Spaceflight context</span>
        <h3>NASA Human Research Program</h3>
        <p>The five hazards of human spaceflight and the related HRP risks, paraphrased per body system. Links give context, not endorsement.</p>
        <a href={HRP} target="_blank" rel="noreferrer">nasa.gov/hrp <ArrowUpRight size={12} aria-hidden="true" /></a>
      </article>
      <article>
        <span className="micro">Anatomical model / CC BY 4.0</span>
        <h3>Open Anatomy 3D</h3>
        <p>BodyParts3D © DBCLS (CC BY 4.0); HuBMAP Human Reference Atlas (CC BY 4.0); MakeHuman (CC0). Materials changed for this scene.</p>
        <a href="https://github.com/MervinR07/open-anatomy-3d" target="_blank" rel="noreferrer">Model, attribution and licence <ArrowUpRight size={12} aria-hidden="true" /></a>
      </article>
      <article>
        <span className="micro">Built by Tonoteam Ultimate</span>
        <p>React, TypeScript, React Three Fiber, Zustand, Dexie, Radix, Vite PWA. Code written with AI assistance (OpenAI Codex, Anthropic Claude). All health data is simulated.</p>
      </article>
    </div>
  );
}

