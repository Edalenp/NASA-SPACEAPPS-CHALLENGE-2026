import { indicators, type IndicatorId } from '../data/indicators';
import { deviation } from '../engine/status';

/**
 * Time as a ruler: one tick per sol, a longer one every five. The grey band is
 * the personal usual range; days outside it get a triangle.
 */
export function TrendRuler({ id, values, lastDay, height = 160 }: { id: IndicatorId; values: number[]; lastDay: number; height?: number }) {
  const ind = indicators[id];
  if (ind.kind !== 'number' || !ind.usual) return null;
  const W = 640, H = height, padL = 36, padR = 56, padT = 12, padB = 26;
  const lo = Math.min(...values, ind.usual[0]) - 6;
  const hi = Math.max(...values, ind.usual[1]) + 6;
  const x = (i: number) => padL + (i / (values.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const first = lastDay - values.length + 1;
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${ind.name}, last ${values.length} sols. Usual ${ind.usual[0]} to ${ind.usual[1]} ${ind.unit}. Today ${last} ${ind.unit}.`}>
      <rect className="trend-band" x={padL} width={W - padL - padR} y={y(ind.usual[1])} height={y(ind.usual[0]) - y(ind.usual[1])} />
      <text className="trend-axis" x={padL - 6} y={y(ind.usual[1]) + 4} textAnchor="end">{ind.usual[1]}</text>
      <text className="trend-axis" x={padL - 6} y={y(ind.usual[0]) + 4} textAnchor="end">{ind.usual[0]}</text>
      <path className="trend-line" d={path} />
      {values.map((v, i) => {
        const day = first + i;
        const off = deviation(id, v).status !== 'normal';
        const tx = x(i);
        return (
          <g key={day}>
            <line className="trend-tick" x1={tx} x2={tx} y1={H - padB + 4} y2={H - padB + (day % 5 === 0 ? 11 : 7)} />
            {day % 5 === 0 && <text className="trend-axis" x={tx} y={H - 2} textAnchor="middle">{String(day).padStart(3, '0')}</text>}
            {off && <path className="trend-flag" d={`M${tx} ${y(v) - 5} l4.5 8 h-9 z`} />}
          </g>
        );
      })}
      <text className="trend-last" x={x(values.length - 1) + 10} y={y(last) + 4}>{last}</text>
      <text className="trend-axis" x={x(values.length - 1) + 10} y={y(last) + 16}>{ind.unit}</text>
    </svg>
  );
}
