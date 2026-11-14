/** Header, mission line, action bar, telemetry strip and footer. Layout from demo-vitruvio. */
import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, Moon, Plus, RotateCcw, Sun } from 'lucide-react';
import { crew, environments, formatDelay, MISSION_DAY, MISSION_LENGTH } from '../../data/mission';
import { dailyCheck, formatValue, indicators, type IndicatorId } from '../../data/indicators';
import { useMission, type Layer, type Panel } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import { deviation, stateShape } from '../../engine/status';
import { Lockup } from '../../ui/Logo';

const nav: { id: Panel; label: string }[] = [
  { id: null, label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'guides', label: 'Guides' },
  { id: 'routine', label: 'Routine' },
];

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

export function Header() {
  const panel = useMission((s) => s.panel);
  const open = useMission((s) => s.open);
  const night = useMission((s) => s.night);
  const toggleNight = useMission((s) => s.toggleNight);
  const env = environments[useMission((s) => s.environment)];
  const online = useOnline();
  return (
    <>
      <header className="app-header">
        <a className="home" href="#overview" onClick={(e) => { e.preventDefault(); open(null); }} aria-label="VITRUVIO, overview">
          <Lockup />
        </a>
        <div className="mission-tag">
          <span className="micro">{env.code}</span>
          <span className="mission-day">
            Day <strong>{String(MISSION_DAY).padStart(3, '0')}</strong> <span className="micro">of {MISSION_LENGTH} · 08:30 MET</span>
          </span>
        </div>
        <nav className="main-nav" aria-label="Main">
          {nav.map((n) => (
            <button key={n.label} type="button" className={panel === n.id ? 'is-on' : ''} aria-current={panel === n.id ? 'page' : undefined} onClick={() => open(n.id)}>
              {n.label}
            </button>
          ))}
          <button type="button" className="icon-button theme" onClick={toggleNight} aria-label={night ? 'Switch to day lighting' : 'Switch to night lighting'}>
            {night ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </nav>
      </header>
      <div className="mission-line micro">
        <span><i className={`link-dot ${online ? '' : 'is-off'}`} /> Local-first / {online ? 'network available' : 'offline, data on this device'}</span>
        <button type="button" onClick={() => open('mission')}>
          Earth link <b>{formatDelay(env.delayMin)}</b> one way <ArrowUpRight size={11} aria-hidden="true" />
        </button>
        <span className="mission-subject">Subject / {crew.code}</span>
      </div>
    </>
  );
}

export function CameraControls({ wide, setWide }: { wide: boolean; setWide: (w: boolean) => void }) {
  const layer = useMission((s) => s.layer);
  const setLayer = useMission((s) => s.setLayer);
  const rotate = useMission((s) => s.rotate);
  const resetView = useMission((s) => s.resetView);
  return (
    <div className="camera">
      <button type="button" className="icon-button" onClick={() => rotate(-Math.PI / 6)} aria-label="Rotate body left"><ChevronLeft size={17} /></button>
      <span className="camera-layers" role="group" aria-label="Display layer">
        {(['anatomy', 'skeleton', 'surface'] as Layer[]).map((l) => (
          <button key={l} type="button" aria-pressed={layer === l} className={layer === l ? 'is-on' : ''} onClick={() => setLayer(l)}>{l}</button>
        ))}
      </span>
      <button type="button" className="icon-button" onClick={() => rotate(Math.PI / 6)} aria-label="Rotate body right"><ChevronRight size={17} /></button>
      <i aria-hidden="true" />
      <button type="button" className="icon-button" onClick={resetView} aria-label="Reset view"><RotateCcw size={14} /></button>
      <button type="button" className="icon-button" onClick={() => setWide(!wide)} aria-label={wide ? 'Show panels' : 'Hide panels'}>
        {wide ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    </div>
  );
}

export function ActionBar() {
  const open = useMission((s) => s.open);
  const setEmergency = useMission((s) => s.setEmergency);
  const env = environments[useMission((s) => s.environment)];
  const { readings } = useAssessment();
  const done = dailyCheck.filter((id) => readings[id] !== null).length;
  const nextMissing = dailyCheck.find((id) => readings[id] === null);
  return (
    <div className="action-bar">
      <div className="crew">
        <span className="avatar" aria-hidden="true">{crew.initials}</span>
        <span>
          <b>{crew.name}</b>
          <small className="micro">{crew.role} / active</small>
        </span>
      </div>
      <button type="button" className="env" onClick={() => open('mission')}>
        <span className="micro">Environment</span>
        <b>{env.name} <ArrowUpRight size={12} aria-hidden="true" /></b>
      </button>
      <button type="button" className="checkin" onClick={() => open('routine')}>
        <span className="checkin-head micro"><span>Daily check-in</span><b>{String(done).padStart(2, '0')} / {String(dailyCheck.length).padStart(2, '0')}</b></span>
        <span className="checkin-track" aria-hidden="true"><i style={{ width: `${(done / dailyCheck.length) * 100}%` }} /></span>
        <span className="micro">{dailyCheck.length - done ? `${dailyCheck.length - done} readings pending` : 'Complete for today'}</span>
      </button>
      <button type="button" className="btn btn-solid record" onClick={() => open('record', nextMissing ? { recordFor: nextMissing } : undefined)}>
        <Plus size={15} aria-hidden="true" /> Record measurement
      </button>
      <button type="button" className="emergency-door" onClick={() => setEmergency(true)}>
        <Plus size={18} aria-hidden="true" /> Emergency
      </button>
    </div>
  );
}

const strip: { id: IndicatorId; label: string; pair?: IndicatorId }[] = [
  { id: 'pulse', label: 'Pulse' },
  { id: 'spo2', label: 'Oxygen' },
  { id: 'systolic', label: 'Blood pressure', pair: 'diastolic' },
  { id: 'temperature', label: 'Temperature' },
];

export function Telemetry() {
  const { readings, score } = useAssessment();
  const select = useMission((s) => s.select);
  const notify = useMission((s) => s.notify);
  const env = environments[useMission((s) => s.environment)];

  function exportBrief() {
    const lines = [
      'VITRUVIO / MISSION BRIEF',
      `Crew member: ${crew.name} (${crew.code})`,
      `Mission day ${String(MISSION_DAY).padStart(3, '0')} of ${MISSION_LENGTH}, ${env.name}`,
      `NEWS2: ${score.complete ? score.total : 'incomplete'} (${score.risk} risk, ${score.measured}/7 parameters)`,
      '',
      ...(Object.keys(indicators) as IndicatorId[]).map((id) => {
        const d = deviation(id, readings[id]);
        const ind = indicators[id];
        return `${ind.name}: ${formatValue(id, readings[id])}${readings[id] !== null && ind.kind === 'number' ? ` ${ind.unit}` : ''} (${d.text})`;
      }),
      '',
      `Earth delay: ${formatDelay(env.delayMin)} one way (scenario setting).`,
      'Prototype with simulated data. Not for medical use. NEWS2 © Royal College of Physicians 2017.',
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `vitruvio-brief-day-${String(MISSION_DAY).padStart(3, '0')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Mission brief saved as a text file.');
  }

  return (
    <section className="telemetry" aria-label="Latest readings">
      <div className="telemetry-title">
        <span className="micro">Latest readings</span>
        <b>Mission telemetry</b>
      </div>
      {strip.map((m) => {
        const d = deviation(m.id, readings[m.id]);
        const st = m.pair ? (d.status === 'normal' ? deviation(m.pair, readings[m.pair]).status : d.status) : d.status;
        return (
          <button type="button" key={m.id} className={`tele is-${st}`} onClick={() => select(m.id === 'spo2' ? 'lungs' : m.id === 'temperature' ? 'immune' : 'heart')}>
            <span className="tele-label micro">
              {m.label}
              {st !== 'normal' && <span aria-hidden="true">{stateShape[st]}</span>}
            </span>
            <span className="tele-value">
              <strong>{formatValue(m.id, readings[m.id])}{m.pair && `/${formatValue(m.pair, readings[m.pair])}`}</strong>
              <small>{indicators[m.id].unit}</small>
            </span>
            <small className="tele-note">{d.text}</small>
          </button>
        );
      })}
      <div className="brief">
        <span className="micro">Keep Earth informed</span>
        <button type="button" className="btn btn-ghost" onClick={exportBrief}>Mission brief <Download size={14} aria-hidden="true" /></button>
      </div>
    </section>
  );
}

export function Footer() {
  const open = useMission((s) => s.open);
  return (
    <footer className="app-footer micro">
      <span>Prototype · simulated data · not medical advice</span>
      <span className="footer-mid">NEWS2 © Royal College of Physicians 2017 · Anatomy: Open Anatomy 3D, CC BY 4.0</span>
      <button type="button" onClick={() => open('sources')}>Sources and credits <ArrowUpRight size={10} aria-hidden="true" /></button>
    </footer>
  );
}
