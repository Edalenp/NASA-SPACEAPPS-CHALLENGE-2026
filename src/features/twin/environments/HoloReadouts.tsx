import { useCallback, type RefObject } from 'react';
import { useAssessment } from '../../../store/derived';
import { useMission } from '../../../store/mission';
import { environments, formatDelay, history, MISSION_DAY, MISSION_LENGTH } from '../../../data/mission';
import { dailyCheck, formatValue, indicators, type IndicatorId } from '../../../data/indicators';
import { deviation, type Status } from '../../../engine/status';
import { habitats } from './config';
import DataPanel from './DataPanel';
import { panelFrame } from './panelFrame';

/** The interface's own status colours: green confirms, amber watches, red alerts. */
const INK: Record<Status, string> = { normal: '#7fd68c', watch: '#ffac66', alert: '#ff8597', missing: '#6f8f89' };
const LABEL = 'rgba(159, 243, 230, 0.7)';

/** The cabin's displays show the app's own data, never invented figures: holograms by the crew
 *  member with today's vitals and the early-warning score, wall screens with the 30-sol trends and
 *  the mission's state. Each redraws only when its data changes. */
export default function HoloReadouts({ time }: { time: RefObject<number> }) {
  const { readings, score } = useAssessment();
  const environment = useMission((s) => s.environment);
  const env = environments[environment];
  const c = habitats[environment];

  const vitals = useCallback((g: CanvasRenderingContext2D, w: number, h: number) => {
    panelFrame(g, w, h, 'VITALS · TODAY', true);
    const rows: [string, IndicatorId, IndicatorId?][] = [
      ['PULSE', 'pulse'], ['SpO2', 'spo2'], ['BP', 'systolic', 'diastolic'], ['TEMP', 'temperature'], ['RESP', 'respiration'],
    ];
    rows.forEach(([label, id, pair], i) => {
      const y = 104 + i * 46;
      const worst = [id, pair].filter(Boolean).map((k) => deviation(k as IndicatorId, readings[k as IndicatorId]).status)
        .sort((a, b) => ['missing', 'normal', 'watch', 'alert'].indexOf(b) - ['missing', 'normal', 'watch', 'alert'].indexOf(a))[0];
      g.fillStyle = LABEL;
      g.font = '400 20px "IBM Plex Mono", monospace';
      g.fillText(label, 30, y);
      g.fillStyle = INK[worst];
      g.font = '300 34px "IBM Plex Sans", sans-serif';
      g.fillText(`${formatValue(id, readings[id])}${pair ? `/${formatValue(pair, readings[pair])}` : ''}`, 180, y + 4);
      g.font = '400 18px "IBM Plex Mono", monospace';
      g.fillText(indicators[id].kind === 'number' ? indicators[id].unit : '', 380, y);
    });
  }, [readings]);

  const warning = useCallback((g: CanvasRenderingContext2D, w: number, h: number) => {
    panelFrame(g, w, h, 'NEWS2 · EARLY WARNING', true);
    const status: Status = !score.complete ? 'missing' : score.escalation === 'self' ? 'normal' : score.escalation === 'cmo' ? 'watch' : 'alert';
    g.fillStyle = INK[status];
    g.font = '300 120px "IBM Plex Sans", sans-serif';
    g.fillText(score.complete ? String(score.total) : '—', 28, 200);
    g.font = '500 24px "IBM Plex Mono", monospace';
    g.fillText(`${score.risk.toUpperCase()} RISK`, 170, 150);
    g.fillStyle = LABEL;
    g.font = '400 18px "IBM Plex Mono", monospace';
    g.fillText(`OF 20 · ${score.measured}/7 MEASURED`, 170, 186);
    g.fillText(`EARTH LINK ${formatDelay(env.delayMin).toUpperCase()} ONE WAY`, 28, 262);
  }, [score, env]);

  const trend = useCallback((id: 'pulse' | 'systolic') => (g: CanvasRenderingContext2D, w: number, h: number) => {
    const ind = indicators[id];
    if (ind.kind !== 'number' || !ind.usual) return;
    const values = [...history[id].slice(0, -1), typeof readings[id] === 'number' ? (readings[id] as number) : history[id][history[id].length - 1]];
    panelFrame(g, w, h, `${ind.name.toUpperCase()} · ${values.length} SOLS`, false);
    const [lo, hi] = ind.scale;
    const y = (v: number) => 84 + (1 - (v - lo) / (hi - lo)) * (h - 120);
    const x = (i: number) => 30 + (i / (values.length - 1)) * (w - 60);
    g.fillStyle = 'rgba(159, 243, 230, 0.12)';
    g.fillRect(30, y(ind.usual[1]), w - 60, y(ind.usual[0]) - y(ind.usual[1]));
    g.strokeStyle = '#9ff3e6';
    g.lineWidth = 3;
    g.beginPath();
    values.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
    g.stroke();
    const last = values[values.length - 1];
    g.fillStyle = INK[deviation(id, last).status];
    g.beginPath();
    g.arc(x(values.length - 1), y(last), 7, 0, Math.PI * 2);
    g.fill();
    g.font = '300 30px "IBM Plex Sans", sans-serif';
    g.fillText(`${last} ${ind.unit}`, w - 190, 44);
  }, [readings]);
  const pulseTrend = trend('pulse');
  const systolicTrend = trend('systolic');

  const mission = useCallback((g: CanvasRenderingContext2D, w: number, h: number) => {
    panelFrame(g, w, h, 'MISSION', false);
    const done = dailyCheck.filter((id) => readings[id] !== null).length;
    const lines: [string, string][] = [
      ['DAY', `${String(MISSION_DAY).padStart(3, '0')} OF ${MISSION_LENGTH}`],
      ['VEHICLE', env.name.toUpperCase()],
      ['EARTH LINK', `${formatDelay(env.delayMin)} one way`.toUpperCase()],
      ['CHECK-IN', `${done}/${dailyCheck.length}`],
    ];
    lines.forEach(([label, value], i) => {
      g.fillStyle = LABEL;
      g.font = '400 20px "IBM Plex Mono", monospace';
      g.fillText(label, 30, 108 + i * 52);
      g.fillStyle = '#e9fff6';
      g.font = '400 28px "IBM Plex Sans", sans-serif';
      g.fillText(value, 200, 110 + i * 52);
    });
    g.fillStyle = 'rgba(159, 243, 230, 0.25)';
    g.fillRect(30, h - 40, w - 60, 8);
    g.fillStyle = '#9ff3e6';
    g.fillRect(30, h - 40, (w - 60) * (MISSION_DAY / MISSION_LENGTH), 8);
  }, [readings, env]);

  const beside = (c.windowWidth / 2 + c.width / 2) / 2;
  const screenY = c.sill + c.windowHeight * 0.55;
  return (
    <group name="cabin-displays">
      <DataPanel holo pixels={[512, 320]} size={[0.8, 0.5]} position={[0.95, 1.6, -0.9]} rotation={[0, -0.25, 0]} draw={vitals} time={time} />
      <DataPanel holo pixels={[420, 300]} size={[0.66, 0.47]} position={[0.95, 1.04, -0.9]} rotation={[0, -0.25, 0]} draw={warning} time={time} />
      <DataPanel pixels={[640, 384]} size={[1.5, 0.9]} position={[-beside, screenY, c.rear + 0.4]} draw={pulseTrend} time={time} />
      <DataPanel pixels={[640, 384]} size={[1.5, 0.9]} position={[beside, screenY, c.rear + 0.4]} draw={systolicTrend} time={time} />
      <DataPanel pixels={[640, 320]} size={[2.2, 1.1]} position={[-(c.width / 2 - 0.08), 1.7, c.rear * 0.45]} rotation={[0, Math.PI / 2, 0]} draw={mission} time={time} />
    </group>
  );
}
