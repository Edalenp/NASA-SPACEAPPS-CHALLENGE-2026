import { useCallback, useMemo, type RefObject } from 'react';
import { useAssessment } from '../../../store/derived';
import { useHealthStore } from '../../../store/healthStore';
import { useMission } from '../../../store/mission';
import { environments, formatDelay, MISSION_LENGTH } from '../../../data/mission';
import { indicators } from '../../../data/indicators';
import type { Status } from '../../../engine/status';
import { missionDay } from '../../measurements/adapter';
import { checkProgress, requiredCheck } from '../../routine/checkSequence';
import { habitats } from './config';
import DataPanel from './DataPanel';
import { panelFrame } from './panelFrame';
import { dayOffset, holoSeries } from './holoData';

/** The interface's own status colours: green confirms, amber watches, red alerts. */
const INK: Record<Status, string> = { normal: '#7fd68c', watch: '#ffac66', alert: '#ff8597', missing: '#6f8f89' };
const LABEL = 'rgba(159, 243, 230, 0.7)';
const WINDOW_DAYS = 30;
const PROVENANCE = { recorded: 'RECORDED', simulation: 'SIMULATION', mixed: 'INCL. SIMULATION', none: 'NO READINGS' } as const;

/**
 * The cabin's displays show the app's own data, never invented figures. The two trend screens
 * draw the stored readings of the last 30 days (one point per day, gaps left empty) and print
 * where they came from; the mission screen shows the real mission day and NEWS2 check-in.
 * Each redraws only when its data changes.
 */
export default function HoloReadouts({ time }: { time: RefObject<number> }) {
  const { latest, deviations } = useAssessment();
  const entries = useHealthStore((s) => s.inputs.entries);
  const now = useMission((s) => s.now);
  const start = useMission((s) => s.missionStart);
  const environment = useMission((s) => s.environment);
  const env = environments[environment];
  const c = habitats[environment];
  // Day granularity is enough for the displays; the ticking clock must not redraw them.
  const today = now.slice(0, 10);

  const pulse = useMemo(() => holoSeries(entries, 'pulse', `${today}T23:59:59.999Z`, WINDOW_DAYS), [entries, today]);
  const systolic = useMemo(() => holoSeries(entries, 'systolic', `${today}T23:59:59.999Z`, WINDOW_DAYS), [entries, today]);

  const trend = useCallback((id: 'pulse' | 'systolic', series: typeof pulse) => (g: CanvasRenderingContext2D, w: number, h: number) => {
    const ind = indicators[id];
    if (ind.kind !== 'number') return;
    panelFrame(g, w, h, `${ind.name.toUpperCase()} · ${WINDOW_DAYS} DAYS · ${PROVENANCE[series.provenance]}`, false);
    const [lo, hi] = ind.scale;
    const y = (v: number) => 84 + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (h - 120);
    const x = (day: string) => 30 + dayOffset(day, `${today}T12:00:00.000Z`, series.days) * (w - 60);
    if (ind.usual) {
      g.fillStyle = 'rgba(159, 243, 230, 0.12)';
      g.fillRect(30, y(ind.usual[1]), w - 60, y(ind.usual[0]) - y(ind.usual[1]));
    }
    if (!series.points.length) {
      g.fillStyle = LABEL;
      g.font = '400 22px "IBM Plex Mono", monospace';
      g.fillText('NO READINGS IN THIS WINDOW', 30, h / 2 + 10);
      return;
    }
    g.strokeStyle = '#9ff3e6';
    g.lineWidth = 3;
    // A gap of more than a day breaks the line: missing days are never interpolated.
    g.beginPath();
    series.points.forEach((p, i) => {
      const prev = series.points[i - 1];
      const joined = prev && Date.parse(p.day) - Date.parse(prev.day) <= 86_400_000;
      if (joined) g.lineTo(x(p.day), y(p.value));
      else g.moveTo(x(p.day), y(p.value));
    });
    g.stroke();
    series.points.forEach((p) => {
      g.fillStyle = p.simulated ? 'rgba(159, 243, 230, 0.45)' : '#9ff3e6';
      g.fillRect(x(p.day) - 3, y(p.value) - 3, 6, 6);
    });
    const last = series.points[series.points.length - 1];
    const isToday = last.day === today;
    // Today's mark takes the assessment's own status; an older point stays neutral.
    g.fillStyle = isToday ? INK[deviations[id].status] : INK.missing;
    g.beginPath();
    g.arc(x(last.day), y(last.value), 7, 0, Math.PI * 2);
    g.fill();
    g.font = '300 30px "IBM Plex Sans", sans-serif';
    g.fillText(`${last.value} ${ind.unit}`, w - 190, 44);
    g.fillStyle = LABEL;
    g.font = '400 16px "IBM Plex Mono", monospace';
    g.fillText(isToday ? 'TODAY' : `LAST ${last.day}`, w - 190, 66);
  }, [deviations, today]);
  const pulseTrend = useMemo(() => trend('pulse', pulse), [trend, pulse]);
  const systolicTrend = useMemo(() => trend('systolic', systolic), [trend, systolic]);

  const day = missionDay(`${today}T12:00:00.000Z`, start);
  const { required, simulated } = checkProgress(latest);
  const mission = useCallback((g: CanvasRenderingContext2D, w: number, h: number) => {
    panelFrame(g, w, h, 'MISSION', false);
    const lines: [string, string][] = [
      ['DAY', `${String(day).padStart(3, '0')} OF ${MISSION_LENGTH}`],
      ['VEHICLE', env.name.toUpperCase()],
      ['EARTH LINK', `${formatDelay(env.delayMin)} one way`.toUpperCase()],
      ['NEWS2 CHECK', `${required}/${requiredCheck.length}${simulated ? ' INCL. SIM' : ''}`],
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
    g.fillRect(30, h - 40, (w - 60) * Math.min(1, Math.max(0, day / MISSION_LENGTH)), 8);
  }, [day, required, simulated, env]);

  const beside = (c.windowWidth / 2 + c.width / 2) / 2;
  const screenY = c.sill + c.windowHeight * 0.55;
  return (
    <group name="cabin-displays">
      <DataPanel pixels={[640, 384]} size={[1.5, 0.9]} position={[-beside, screenY, c.rear + 0.4]} draw={pulseTrend} time={time} />
      <DataPanel pixels={[640, 384]} size={[1.5, 0.9]} position={[beside, screenY, c.rear + 0.4]} draw={systolicTrend} time={time} />
      <DataPanel pixels={[640, 320]} size={[2.2, 1.1]} position={[-(c.width / 2 - 0.08), 1.7, c.rear * 0.45]} rotation={[0, Math.PI / 2, 0]} draw={mission} time={time} />
    </group>
  );
}
