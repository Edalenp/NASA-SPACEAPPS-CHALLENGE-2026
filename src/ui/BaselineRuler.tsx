import { indicators, formatValue, type IndicatorId, type ReadingValue } from '../data/indicators';
import { deviation, stateShape } from '../engine/status';

/** One reading against the personal usual range: a grey band and a needle. */
export function BaselineRuler({ id, value, onClick }: { id: IndicatorId; value: ReadingValue | null; onClick?: () => void }) {
  const ind = indicators[id];
  const dev = deviation(id, value);
  const numeric = ind.kind === 'number';
  const pct = (n: number) => (numeric ? Math.min(100, Math.max(0, ((n - ind.scale[0]) / (ind.scale[1] - ind.scale[0])) * 100)) : 0);
  return (
    <button type="button" className={`ruler is-${dev.status}`} onClick={onClick}>
      <span className="ruler-head">
        <span className="ruler-name">
          {dev.status !== 'normal' && <span aria-hidden="true">{stateShape[dev.status]} </span>}
          {ind.name}
        </span>
        <span className="ruler-value">
          {formatValue(id, value)}
          {numeric && value !== null && <small>{ind.unit}</small>}
        </span>
      </span>
      {numeric && ind.usual ? (
        <span className="ruler-row">
          <span className="ruler-usual">usual {ind.usual[0]}–{ind.usual[1]}</span>
          <span className="ruler-track" aria-hidden="true">
            <i className="ruler-band" style={{ left: `${pct(ind.usual[0])}%`, width: `${pct(ind.usual[1]) - pct(ind.usual[0])}%` }} />
            {value !== null && <i className="ruler-needle" style={{ left: `${pct(value as number)}%` }} />}
          </span>
          <span className="ruler-delta">{dev.text.replace('Within your usual range', 'within range')}</span>
        </span>
      ) : (
        <span className="ruler-row"><span className="ruler-usual">{dev.text}</span></span>
      )}
    </button>
  );
}
