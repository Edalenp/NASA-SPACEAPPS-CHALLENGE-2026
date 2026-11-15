import type { NumericIndicator } from '../../data/indicators';
import type { Baseline } from '../../engine';
import { rangeReferences, referenceScoreBands, newsReferenceUrl } from './references';

/** The same range box and needle as PersonalRange, backed by a native keyboard/touch slider. */
export function RangeInput({ indicator, value, onChange, disabled, invalid, baseline, min, max, step }: { indicator: NumericIndicator; value: string; onChange: (value: string) => void; disabled: boolean; invalid: boolean; baseline?: Baseline; min: number; max: number; step: number }) {
  const number = value.trim() === '' ? null : Number(value);
  const reference = rangeReferences[indicator.id];
  const band = baseline ? [baseline.lower, baseline.upper] : null;
  const newsBands = referenceScoreBands(indicator.id, min, max, step);
  const pct = (n: number) => Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));
  return (
    <div className="range-entry">
      <div className="range-entry-figure">
        <input id="value" name="value" type="number" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} min={min} max={max} step={step} disabled={disabled} aria-invalid={invalid} aria-describedby="value-help record-error draft-preview" />
        <span>{indicator.unit}</span>
      </div>
      <div className="range-entry-track">
        <span className="range-entry-line" aria-hidden="true" />
        {newsBands.map((entry, index) => <span key={index} className="range-news-band" data-score={entry.score} aria-hidden="true" style={{ left: `${pct(entry.lower)}%`, width: `${pct(entry.upper) - pct(entry.lower)}%` }} />)}
        {reference?.lower !== undefined && reference.upper !== undefined && <span className="range-reference-band" aria-hidden="true" style={{ left: `${pct(reference.lower)}%`, width: `${pct(reference.upper) - pct(reference.lower)}%` }} />}
        {reference?.marker !== undefined && <span className="range-reference-marker" aria-hidden="true" style={{ left: `${pct(reference.marker)}%` }} />}
        {band && <span className="range-entry-band range-personal-band" aria-hidden="true" style={{ left: `${pct(band[0])}%`, width: `${Math.max(0, pct(band[1]) - pct(band[0]))}%` }} />}
        {number !== null && Number.isFinite(number) && <span className="range-entry-needle" aria-hidden="true" style={{ left: `${pct(number)}%` }} />}
        <input type="range" aria-label={`Adjust ${indicator.name}`} min={min} max={max} step={step} disabled={disabled} value={number !== null && Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min} onChange={(event) => onChange(event.target.value)} />
      </div>
      <div className="range-entry-scale"><span>{min}</span><span>{max} {indicator.unit}</span></div>
      {reference && <div className="range-reference-label"><span>{reference.label}</span>{reference.lower !== undefined && reference.upper !== undefined && <strong>{reference.lower}–{reference.upper} <small>{indicator.unit}</small></strong>}</div>}
      {newsBands.length > 0 && <div className="range-news-legend" aria-label="NEWS2 point bands">
        <span><i style={{ background: 'var(--vt-normal)' }} />NEWS2 0</span><span><i style={{ background: 'var(--vt-watch)' }} />NEWS2 1–2</span><span><i style={{ background: 'var(--vt-alert)' }} />NEWS2 3</span>
      </div>}
      {reference && <details className="range-reference-source"><summary>Range context & sources</summary>
        {band && <p>Dashed box · personal history: {band[0].toFixed(1)}–{band[1].toFixed(1)} {indicator.unit} · {baseline?.sampleCount} prior readings.</p>}
        <p>{reference.context}</p><a href={reference.url} target="_blank" rel="noreferrer">{reference.source} ↗</a>
        {newsBands.length > 0 && <p>The outlined box is the published population reference. Colours show the engine’s NEWS2 points, which use different boundaries. <a href={newsReferenceUrl} target="_blank" rel="noreferrer">RCP · NEWS2 (2017) ↗</a></p>}
      </details>}
    </div>
  );
}
