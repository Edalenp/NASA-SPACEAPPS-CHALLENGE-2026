import type { NumericIndicator } from '../../data/indicators';
import type { Baseline, GlucoseContext } from '../../engine';
import { referenceFor, comparisonSegments, newsReferenceUrl, plausibleBaseline } from './references';

/** The same range box and needle as PersonalRange, backed by a native keyboard/touch slider. */
export function RangeInput({ indicator, value, onChange, disabled, invalid, baseline, min, max, step, ctx }: { indicator: NumericIndicator; value: string; onChange: (value: string) => void; disabled: boolean; invalid: boolean; baseline?: Baseline; min: number; max: number; step: number; ctx?: GlucoseContext }) {
  const number = value.trim() === '' ? null : Number(value);
  const reference = referenceFor(indicator.id, ctx);
  const band = plausibleBaseline(baseline, min, max) ? [baseline.lower, baseline.upper] : null;
  const comparison = comparisonSegments(indicator.id, min, max, step, baseline, ctx);
  const newsBands = comparison.segments;
  const pct = (n: number) => Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));
  return (
    <div className="range-entry">
      <div className="range-entry-figure">
        <input id="value" name="value" type="number" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} min={min} max={max} step={step} disabled={disabled} aria-invalid={invalid} aria-describedby="value-help record-error draft-preview" />
        <span>{indicator.unit}</span>
      </div>
      <div className="range-entry-track">
        <span className="range-entry-line" aria-hidden="true" />
        {newsBands.map((entry, index) => <span key={index} className="range-news-band" data-score={entry.score} data-tone={entry.tone} data-active={number !== null && number >= entry.lower && number <= entry.upper ? '' : undefined} aria-hidden="true" style={{ left: `${pct(entry.lower)}%`, width: `${pct(entry.upper) - pct(entry.lower)}%` }} />)}
        {reference?.applicable !== false && reference?.lower !== undefined && reference.upper !== undefined && <span className="range-reference-band" aria-hidden="true" style={{ left: `${pct(reference.lower)}%`, width: `${pct(reference.upper) - pct(reference.lower)}%` }} />}
        {reference?.marker !== undefined && <span className="range-reference-marker" aria-hidden="true" style={{ left: `${pct(reference.marker)}%` }} />}
        {band && <span className="range-entry-band range-personal-band" aria-hidden="true" style={{ left: `${pct(band[0])}%`, width: `${Math.max(0, pct(band[1]) - pct(band[0]))}%` }} />}
        {number !== null && Number.isFinite(number) && <span className="range-entry-needle" aria-hidden="true" style={{ left: `${pct(number)}%` }} />}
        <input type="range" aria-label={`Adjust ${indicator.name}`} min={min} max={max} step={step} disabled={disabled} value={number !== null && Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min} onChange={(event) => onChange(event.target.value)} />
      </div>
      <div className="range-entry-scale"><span>{min}</span><span>{max} {indicator.unit}</span></div>
      {reference && <div className="range-reference-label"><span>{reference.label}</span>{reference.applicable !== false && reference.lower !== undefined && reference.upper !== undefined && <strong>{reference.lower}–{reference.upper} <small>{indicator.unit}</small></strong>}</div>}
      {newsBands.length > 0 && <div className="range-news-legend" aria-label="What the colours mean">
        <span><i style={{ background: indicator.id === 'glucose' && comparison.kind !== 'personal' ? 'var(--vt-ink-3)' : 'var(--vt-normal)' }} />{indicator.id === 'glucose' ? comparison.kind === 'personal' ? 'Observed history' : 'No threshold flag' : 'Normal'}</span><span><i style={{ background: 'var(--vt-watch)' }} />Watch</span><span><i style={{ background: 'var(--vt-alert)' }} />Alert</span>
        <span className="range-news-basis">{[comparison.kind === 'news2' ? 'NEWS2 points' : comparison.kind === 'personal' ? 'personal range' : comparison.kind === 'reference' ? 'resting reference' : null, comparison.clinical ? indicator.id === 'glucose' ? 'contextual monitoring' : 'clinical limits' : null].filter(Boolean).join(' + ')}</span>
      </div>}
      {reference && <details className="range-reference-source"><summary>Range context & sources</summary>
        {band && <p>Dashed box · personal history: {band[0].toFixed(1)}–{band[1].toFixed(1)} {indicator.unit} · {baseline?.sampleCount} prior readings.</p>}
        <p>{reference.context}</p><a href={reference.url} target="_blank" rel="noreferrer">{reference.source} ↗</a>
        {comparison.kind === 'news2' && <p>The outlined box is the published population reference. Colours combine the engine’s NEWS2 points with its absolute clinical limits (for example AHA severe hypertension above 180 mmHg), whichever is worse. <a href={newsReferenceUrl} target="_blank" rel="noreferrer">RCP · NEWS2 (2017) ↗</a></p>}
      </details>}
    </div>
  );
}
