import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { indicators, formatValue, type IndicatorId } from '../../data/indicators';
import { paramScore, type News2Param } from '../../engine/news2';
import table from '../../engine/news2-scoring.json';
import type { Baseline } from '../../engine';
import { DAY_MS, type RecordEntry } from '../measurements/adapter';
import type { CrewBand } from './osd575';
import './trend-charts.css';

/* Shared plot frame: a 640 × 360 view, the plot across the full width (x 40 to 634), y 20 to 300. */
const LEFT = 40, RIGHT = 634, TOP = 20, BOTTOM = 300;
const value = (entry: RecordEntry) => entry.value as number;
const time = (entry: RecordEntry) => Date.parse(entry.timestamp);
const date = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const day = (iso: string) => iso.slice(5, 10).replace('-', '/');
const inBand = (n: number, band?: Baseline) => !band || (n >= band.lower && n <= band.upper);

/** A smooth path through the points that never overshoots them (monotone cubic). */
function smoothPath(xy: [number, number][]) {
  if (xy.length < 3) return xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const slopes = xy.slice(1).map(([x, y], i) => (y - xy[i][1]) / Math.max(x - xy[i][0], 1e-6));
  const tangents = xy.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === xy.length - 1) return slopes[slopes.length - 1];
    const a = slopes[i - 1], b = slopes[i];
    return a * b <= 0 ? 0 : (a + b) / 2;
  });
  let d = `M${xy[0][0]} ${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const [x0, y0] = xy[i], [x1, y1] = xy[i + 1];
    const h = (x1 - x0) / 3;
    d += ` C${x0 + h} ${y0 + tangents[i] * h} ${x1 - h} ${y1 - tangents[i + 1] * h} ${x1} ${y1}`;
  }
  return d;
}

/** The three figures over the chart: the latest reading on the state's aura (where the eye goes
 *  first), the change across the window, and how much of it sat inside the personal range. */
export function TrendKpis({ points, baseline, id }: { points: RecordEntry[]; baseline?: Baseline; id: IndicatorId }) {
  if (!points.length) return null;
  const unit = indicators[id].unit;
  const last = points[points.length - 1], first = points[0];
  const change = value(last) - value(first);
  const share = baseline ? Math.round((points.filter((p) => inBand(value(p), baseline)).length / points.length) * 100) : null;
  const Trend = Math.abs(change) < 1e-9 ? ArrowRight : change > 0 ? ArrowUpRight : ArrowDownRight;
  const outside = !inBand(value(last), baseline);
  return (
    <dl className="trend-kpis">
      <div className={`aura ${outside ? 'is-watch' : 'is-good'} trend-kpi-lead`}>
        <dt>Latest · {outside ? 'outside range' : baseline ? 'inside range' : 'range pending'}</dt>
        <dd><strong>{formatValue(id, last.value)}</strong> <small>{unit}</small></dd>
        <dd className="trend-kpi-note">{last.timestamp.slice(0, 16).replace('T', ' ')} UTC</dd>
      </div>
      <div>
        <dt>Change in window</dt>
        <dd><strong><Trend size={18} aria-hidden="true" /> {change > 0 ? '+' : ''}{Number(change.toFixed(1))}</strong> <small>{unit}</small></dd>
        <dd className="trend-kpi-note">from {formatValue(id, first.value)} on {day(first.timestamp)}</dd>
      </div>
      <div>
        <dt>Inside personal range</dt>
        <dd><strong>{share === null ? '—' : `${share}`}</strong> <small>{share === null ? 'pending' : '%'}</small></dd>
        <dd className="trend-kpi-note">{share === null ? 'Needs 7 prior readings' : `${points.length} readings`}</dd>
        {share !== null && <dd className="trend-kpi-meter" aria-hidden="true"><i style={{ width: `${share}%` }} /></dd>}
      </div>
    </dl>
  );
}

interface Day { start: number; mean: number; min: number; max: number; count: number }
const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

/**
 * The trend, one point a day: the day's mean as a glowing line over a soft area, and the day's
 * lowest to highest reading as a band around it, so many readings read as one shape instead of a
 * cloud of dots. Only today and the days whose mean left the personal range are marked. The scale
 * follows the bulk of the readings; a rare extreme is pinned to the edge, not allowed to flatten
 * the rest. A crosshair follows the pointer or the arrow keys, day by day.
 */
export function TrendChart({ points, baseline, id, from, to, crew }: {
  points: RecordEntry[]; baseline?: Baseline; id: IndicatorId; from: number; to: number; crew?: CrewBand | null;
}) {
  const uid = useId().replace(/:/g, '');
  const [active, setActive] = useState<number | null>(null);
  const days = useMemo<Day[]>(() => {
    const groups = new Map<number, number[]>();
    for (const p of points) {
      const start = Date.parse(p.timestamp.slice(0, 10));
      if (!groups.has(start)) groups.set(start, []);
      groups.get(start)!.push(value(p));
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([start, list]) => ({
      start, mean: list.reduce((sum, n) => sum + n, 0) / list.length, min: Math.min(...list), max: Math.max(...list), count: list.length,
    }));
  }, [points]);
  // The bulk of the readings sets the scale: a reading beyond 1.5 interquartile ranges of the
  // middle half is pinned to the edge rather than allowed to flatten every other day.
  const sorted = points.map(value).sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75), iqr = Math.max(q3 - q1, Math.abs(q3) * 0.01, 0.5);
  const dataLow = Math.max(sorted[0], q1 - 1.5 * iqr), dataHigh = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);
  const reachOut = Math.max(dataHigh - dataLow, Math.abs(dataHigh) * 0.05, 1);
  const near = (n: number | undefined) => n !== undefined && n >= dataLow - reachOut && n <= dataHigh + reachOut;
  const low = Math.min(dataLow, ...[baseline?.lower, crew?.min].filter((n): n is number => near(n)));
  const high = Math.max(dataHigh, ...[baseline?.upper, crew?.max].filter((n): n is number => near(n)));
  const padding = Math.max((high - low) * 0.18, Math.abs(high) * 0.02, 0.5);
  const y = (n: number) => Math.min(BOTTOM, Math.max(TOP, BOTTOM - ((n - low + padding) / (high - low + 2 * padding)) * (BOTTOM - TOP)));
  // Time starts at the first day with readings when the window reaches back before them.
  const start = Math.max(from, (days[0]?.start ?? from) - DAY_MS);
  const x = (ms: number) => LEFT + ((ms + DAY_MS / 2 - start) / Math.max(to - start, 1)) * (RIGHT - LEFT);
  const mean = days.map((d) => [x(d.start), y(d.mean)] as [number, number]);
  const line = smoothPath(mean);
  const area = mean.length ? `${line} L${mean[mean.length - 1][0]} ${BOTTOM} L${mean[0][0]} ${BOTTOM} Z` : '';
  const spread = days.length > 1
    ? `${smoothPath(days.map((d) => [x(d.start), y(d.max)]))} L${[...days].reverse().map((d) => `${x(d.start)} ${y(d.min)}`).join(' L')} Z`
    : '';
  const ticks = [0, 1, 2, 3].map((i) => low - padding + ((high - low + 2 * padding) * (i + 0.5)) / 4);
  const unit = indicators[id].unit;
  const lastIndex = days.length - 1;

  const nearest = (clientX: number, box: DOMRect) => {
    const at = ((clientX - box.left) / box.width) * 640;
    let best = 0;
    mean.forEach(([px], i) => { if (Math.abs(px - at) < Math.abs(mean[best][0] - at)) best = i; });
    return best;
  };
  const move = (event: PointerEvent<SVGSVGElement>) => setActive(nearest(event.clientX, event.currentTarget.getBoundingClientRect()));
  const keys = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setActive((current) => Math.max(0, Math.min(lastIndex, (current ?? lastIndex) + (event.key === 'ArrowLeft' ? -1 : 1))));
  };
  const hit = active === null ? null : days[active];

  return (
    <div className="trend-chart">
      <svg
        key={`${id}-${from}`}
        className="history-chart trend-plot"
        viewBox="0 0 640 360"
        role="img"
        tabIndex={0}
        aria-label={`${indicators[id].name}: daily mean over ${days.length} days, with each day's lowest and highest reading as a band. ${baseline ? 'Personal range shown as a shaded band.' : 'Insufficient prior data for a personal range.'}${crew ? ` Inspiration4 crew range ${crew.min} to ${crew.max} ${unit} shown as a hatched band.` : ''} Use the arrow keys to read each day; exact values are in the history.`}
        onPointerMove={move}
        onPointerLeave={() => setActive(null)}
        onKeyDown={keys}
        onBlur={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`area-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--vt-normal)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--vt-normal)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`grid-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--vt-ink)" stopOpacity="0.28" />
            <stop offset="0.6" stopColor="var(--vt-ink)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--vt-ink)" stopOpacity="0.02" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="5" /></filter>
          <pattern id={`crew-hatch-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="trend-crew-hatch" />
          </pattern>
        </defs>
        {/* Soft gridlines that fade towards the right, each with a short tick and its value. */}
        {ticks.map((t) => (
          <g key={t} className="trend-grid">
            <line x1={LEFT} x2={RIGHT} y1={y(t)} y2={y(t)} stroke={`url(#grid-${uid})`} />
            <line className="trend-tick" x1={LEFT - 4} x2={LEFT + 6} y1={y(t)} y2={y(t)} />
            <text x={LEFT - 8} y={y(t) + 4} textAnchor="end">{Number(t.toFixed(t >= 100 ? 0 : 1))}</text>
          </g>
        ))}
        {crew && (
          <rect className="trend-crew-band" x={LEFT} width={RIGHT - LEFT} y={y(crew.max)} height={Math.max(1, y(crew.min) - y(crew.max))} fill={`url(#crew-hatch-${uid})`} />
        )}
        {baseline && (
          <g className="trend-personal">
            <rect x={LEFT} width={RIGHT - LEFT} y={y(baseline.upper)} height={Math.max(1, y(baseline.lower) - y(baseline.upper))} />
            <text x={RIGHT - 6} y={Math.max(TOP + 10, y(baseline.upper) - 6)} textAnchor="end">Personal range · {Number(baseline.lower.toFixed(1))}–{Number(baseline.upper.toFixed(1))}</text>
          </g>
        )}
        <path className="trend-area" d={area} fill={`url(#area-${uid})`} />
        {spread && <path className="trend-spread" d={spread} />}
        <path className="trend-glow" d={line} filter={`url(#glow-${uid})`} />
        <path className="trend-line trend-draw" d={line} pathLength={1} />
        {days.map((d, i) => (!inBand(d.mean, baseline) ? <circle key={d.start} className="trend-dot is-out" cx={mean[i][0]} cy={mean[i][1]} r="4.5" /> : null))}
        {lastIndex >= 0 && (
          <g className="trend-now">
            <circle className="trend-now-pulse" cx={mean[lastIndex][0]} cy={mean[lastIndex][1]} r="6" />
            <circle className="trend-now-dot" cx={mean[lastIndex][0]} cy={mean[lastIndex][1]} r="5" />
          </g>
        )}
        {crew && (
          <text x={LEFT + 6} y={y(crew.max) - 6} className="trend-crew-label">
            Inspiration4 crew · {crew.phase === 'all' ? 'pre + post' : `${crew.phase}-flight`}
          </text>
        )}
        {hit && active !== null && (
          <g className="trend-cross" aria-hidden="true">
            <line x1={mean[active][0]} x2={mean[active][0]} y1={TOP} y2={BOTTOM} />
            <circle cx={mean[active][0]} cy={mean[active][1]} r="7" />
          </g>
        )}
        <g className="trend-axis">
          <text x={LEFT} y="326">{date(start)}</text>
          <text x={RIGHT} y="326" textAnchor="end">{date(to)}</text>
          <text x={LEFT} y="346">UTC · daily mean, {unit}</text>
          <g className="trend-key">
            <line x1="476" x2="492" y1="342" y2="342" className="trend-key-line" />
            <text x="496" y="346">Daily mean</text>
            <rect x="566" y="337" width="14" height="9" className="trend-key-spread" />
            <text x="584" y="346">Low–high</text>
          </g>
        </g>
      </svg>
      {hit && active !== null && (
        <div
          className={`trend-tip ${mean[active][0] > 420 ? 'is-left' : ''}`}
          style={{ left: `${(mean[active][0] / 640) * 100}%`, top: `${(mean[active][1] / 360) * 100}%` }}
          role="status"
        >
          <strong>{Number(hit.mean.toFixed(1))} <small>{unit} mean</small></strong>
          <span>{date(hit.start)} · {hit.count} {hit.count === 1 ? 'reading' : 'readings'}</span>
          <span>{Number(hit.min.toFixed(1))} to {Number(hit.max.toFixed(1))} {unit}{baseline ? (inBand(hit.mean, baseline) ? ' · inside range' : ' · outside range') : ''}</span>
        </div>
      )}
    </div>
  );
}

/**
 * How each week's readings spread, as ridges stacked from the first week (back) to the latest
 * (front): a narrow tall ridge is a steady week, a wide flat one a variable week, and a ridge that
 * drifts sideways shows the indicator moving over the mission. One hue, deepening towards today.
 */
export function WeeklyRidges({ points, baseline, id, from, to }: { points: RecordEntry[]; baseline?: Baseline; id: IndicatorId; from: number; to: number }) {
  const [active, setActive] = useState<number | null>(null);
  const weeks = useMemo(() => {
    const first = Math.max(from, Math.min(...points.map(time)));
    const count = Math.max(1, Math.ceil((to - first) / (7 * DAY_MS)));
    return Array.from({ length: count }, (_, w) => {
      const start = first + w * 7 * DAY_MS;
      const items = points.filter((p) => time(p) >= start && time(p) < start + 7 * DAY_MS).map(value).sort((a, b) => a - b);
      return { start, items };
    }).filter((week) => week.items.length > 0);
  }, [points, from, to]);
  const all = points.map(value).sort((a, b) => a - b);
  const r1 = quantile(all, 0.25), r3 = quantile(all, 0.75), spreadIqr = Math.max(r3 - r1, Math.abs(r3) * 0.01, 0.5);
  const low = Math.max(all[0], r1 - 1.5 * spreadIqr), high = Math.min(all[all.length - 1], r3 + 1.5 * spreadIqr);
  const span = Math.max(high - low, 1e-6);
  const lo = low - span * 0.12, hi = high + span * 0.12;
  const x = (n: number) => LEFT + ((n - lo) / (hi - lo)) * (RIGHT - LEFT);
  const clampX = (n: number) => Math.min(RIGHT, Math.max(LEFT, n));
  const width = Math.max(span / 9, 1e-3);
  const samples = Array.from({ length: 72 }, (_, i) => lo + ((hi - lo) * i) / 71);
  const densities = weeks.map((week) => samples.map((s) => week.items.reduce((sum, v) => sum + Math.exp(-0.5 * ((s - v) / width) ** 2), 0) / week.items.length));
  const peak = Math.max(...densities.flat(), 1e-6);
  const rows = weeks.length;
  const lift = rows > 1 ? Math.min(90, 40 + 220 / rows) : 120;
  const step = rows > 1 ? (BOTTOM - TOP - lift) / (rows - 1) : 0;
  const unit = indicators[id].unit;
  if (!rows) return null;
  return (
    <div className="trend-chart">
      <svg className="history-chart trend-ridges" viewBox="0 0 640 360" role="img" aria-label={`${indicators[id].name}: how readings spread in each of ${rows} weeks, first week at the back. Hover a ridge for its figures.`} onPointerLeave={() => setActive(null)}>
        {baseline && (
          <g className="trend-personal">
            <rect x={clampX(x(baseline.lower))} width={Math.max(1, clampX(x(baseline.upper)) - clampX(x(baseline.lower)))} y={TOP} height={BOTTOM - TOP} />
            <text x={clampX(x(baseline.lower)) + 6} y={TOP + 10}>Personal range</text>
          </g>
        )}
        {weeks.map((week, w) => {
          const base = TOP + lift + w * step;
          const d = densities[w];
          const crest = samples.map((s, i) => [x(s), base - (d[i] / peak) * lift] as [number, number]);
          const path = `${smoothPath(crest)} L${RIGHT} ${base} L${LEFT} ${base} Z`;
          const depth = rows > 1 ? w / (rows - 1) : 1;
          const median = week.items[Math.floor(week.items.length / 2)];
          return (
            <g key={week.start} className={`trend-ridge ${active === w ? 'is-on' : ''}`} style={{ '--depth': depth } as React.CSSProperties}
              onPointerEnter={() => setActive(w)} onFocus={() => setActive(w)} tabIndex={0}
              aria-label={`Week of ${date(week.start)}: ${week.items.length} readings, median ${Number(median.toFixed(1))} ${unit}`}>
              <path d={path} />
              <line className="trend-ridge-median" x1={x(median)} x2={x(median)} y1={base} y2={base - (d[Math.round(((median - lo) / (hi - lo)) * 71)] / peak) * lift} />
              {(w === 0 || w === rows - 1 || w % 3 === 0) && <text x={LEFT - 8} y={base} textAnchor="end">{day(date(week.start))}</text>}
            </g>
          );
        })}
        <g className="trend-axis">
          {[lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1].map((t) => (
            <text key={t} x={x(t)} y="326" textAnchor="middle">{Number(t.toFixed(1))}</text>
          ))}
          <text x={LEFT} y="346">Week starting (UTC) · {unit}</text>
        </g>
      </svg>
      {active !== null && weeks[active] && (
        <div className="trend-tip is-fixed" role="status">
          <strong>{Number(weeks[active].items[Math.floor(weeks[active].items.length / 2)].toFixed(1))} <small>{unit} median</small></strong>
          <span>Week of {date(weeks[active].start)} · {weeks[active].items.length} readings</span>
          <span>{Number(weeks[active].items[0].toFixed(1))} to {Number(weeks[active].items[weeks[active].items.length - 1].toFixed(1))} {unit}</span>
        </div>
      )}
    </div>
  );
}

/* The seven NEWS2 observations around the radar, in the chart's own order. */
const AXES: { id: News2Param & IndicatorId; label: string }[] = [
  { id: 'respiration', label: 'Respiration' },
  { id: 'spo2', label: 'SpO₂' },
  { id: 'oxygen', label: 'Air / O₂' },
  { id: 'systolic', label: 'Systolic' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'consciousness', label: 'ACVPU' },
  { id: 'temperature', label: 'Temperature' },
];
const params = table.parameters as unknown as Record<string, { min?: number; max?: number; score: number }[]>;
const ZERO_BAND: Partial<Record<IndicatorId, string>> = { respiration: 'respirationRate', spo2: 'spo2Scale1', systolic: 'systolicBloodPressure', pulse: 'pulse', temperature: 'temperature' };

/** How far a reading sits from normal, on the radar's scale: inside its NEWS2 zero band it moves
 *  between 0.12 and 0.4 by its distance from the band's middle; each NEWS2 point adds a ring. */
function reach(id: IndicatorId, reading: RecordEntry | undefined) {
  if (!reading) return null;
  const score = paramScore(id as News2Param, reading.value) ?? 0;
  if (score > 0) return { r: 0.4 + score * 0.2, score };
  const key = ZERO_BAND[id];
  const zero = key ? params[key].find((b) => b.score === 0) : undefined;
  if (!zero || typeof reading.value !== 'number') return { r: 0.18, score };
  const lower = zero.min ?? reading.value, upper = zero.max ?? Math.max(reading.value, lower + 1);
  const middle = (lower + upper) / 2, half = Math.max((upper - lower) / 2, 1e-6);
  return { r: 0.12 + 0.28 * Math.min(1, Math.abs(reading.value - middle) / half), score };
}

/**
 * The balance of the seven NEWS2 observations: each spoke is one observation, and the shape grows
 * outwards wherever a reading leaves its normal band (the rings are NEWS2 points). Today's shape
 * is drawn over the shape of a week before, so a change in balance reads at a glance.
 */
export function BalanceRadar({ entries, now }: { entries: RecordEntry[]; now: string }) {
  const [active, setActive] = useState<number | null>(null);
  const latestBefore = (id: IndicatorId, limit: number) => {
    let best: RecordEntry | undefined;
    for (const e of entries) if (e.indicator === id && time(e) <= limit && (!best || time(e) > time(best))) best = e;
    return best;
  };
  const nowMs = Date.parse(now);
  const current = AXES.map((axis) => latestBefore(axis.id, nowMs));
  const before = AXES.map((axis) => latestBefore(axis.id, nowMs - 7 * DAY_MS));
  const cx = 320, cy = 178, R = 132;
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / AXES.length) * Math.PI * 2;
    return [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r] as [number, number];
  };
  const shape = (readings: (RecordEntry | undefined)[]) => {
    const pts = readings.map((reading, i) => point(i, reach(AXES[i].id, reading)?.r ?? 0.12));
    return `${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} Z`;
  };
  const total = current.reduce((sum, reading, i) => sum + (reach(AXES[i].id, reading)?.score ?? 0), 0);
  const hasBefore = before.some(Boolean);
  return (
    <div className="trend-chart">
      <svg className="history-chart trend-radar" viewBox="0 0 640 360" role="img" aria-label={`Balance of the seven NEWS2 observations, total ${total} points. ${AXES.map((axis, i) => `${axis.label} ${current[i] ? formatValue(axis.id, current[i]!.value) : 'not measured'}`).join(', ')}.`} onPointerLeave={() => setActive(null)}>
        <defs>
          <filter id="radar-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        {[0.4, 0.6, 0.8, 1].map((ring, k) => (
          <g key={ring} className={`trend-radar-ring ${k === 0 ? 'is-zero' : ''}`}>
            <path d={`${AXES.map((_, i) => point(i, ring)).map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')} Z`} />
            <text x={cx + 4} y={cy - R * ring + 11}>{k === 0 ? 'normal' : `+${k}`}</text>
          </g>
        ))}
        {AXES.map((_, i) => { const [x, y] = point(i, 1); return <line key={i} className="trend-radar-spoke" x1={cx} y1={cy} x2={x} y2={y} />; })}
        {hasBefore && <path className="trend-radar-before" d={shape(before)} />}
        <path className="trend-radar-glow" d={shape(current)} filter="url(#radar-glow)" />
        <path className="trend-radar-now trend-draw" d={shape(current)} pathLength={1} />
        {AXES.map((axis, i) => {
          const reading = current[i];
          const found = reach(axis.id, reading);
          const [x, y] = point(i, found?.r ?? 0.12);
          const [lx, ly] = point(i, 1.18);
          const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
          const score = found?.score ?? 0;
          return (
            <g key={axis.id} className={`trend-radar-axis ${active === i ? 'is-on' : ''}`} tabIndex={0} onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)}
              aria-label={`${axis.label}: ${reading ? `${formatValue(axis.id, reading.value)} ${indicators[axis.id].unit}, ${score} NEWS2 points` : 'not measured'}`}>
              <circle className="trend-radar-hit" cx={x} cy={y} r="14" />
              <circle className={`trend-radar-vertex ${score >= 3 ? 'is-alert' : score > 0 ? 'is-watch' : ''}`} cx={x} cy={y} r={score > 0 ? 5 : 3.5} />
              <text className="trend-radar-label" x={lx} y={ly - 4} textAnchor={anchor}>{axis.label}</text>
              <text className="trend-radar-value" x={lx} y={ly + 11} textAnchor={anchor}>
                {reading ? `${formatValue(axis.id, reading.value)}${indicators[axis.id].unit ? ` ${indicators[axis.id].unit}` : ''}` : '—'}{score > 0 ? ` · +${score}` : ''}
              </text>
            </g>
          );
        })}
        <text className={`trend-radar-total ${total >= 7 ? 'is-alert' : total >= 5 ? 'is-watch' : ''}`} x="620" y="318" textAnchor="end">{total}</text>
        <text className="trend-radar-caption" x="620" y="340" textAnchor="end">NEWS2 POINTS, LATEST</text>
        <g className="trend-radar-legend">
          <line x1="20" x2="38" y1="336" y2="336" className="trend-radar-now" />
          <text x="44" y="340">Latest readings</text>
          {hasBefore && <><line x1="160" x2="178" y1="336" y2="336" className="trend-radar-before" /><text x="184" y="340">A week before</text></>}
        </g>
      </svg>
    </div>
  );
}
