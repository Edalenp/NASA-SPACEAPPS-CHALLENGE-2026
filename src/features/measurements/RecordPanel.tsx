import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { indicators, type IndicatorId, type ReadingValue } from '../../data/indicators';
import { guides } from '../../data/guides';
import { validateBloodPressurePair } from '../../data/ranges';
import { useMission } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import { inputRules, validateReading } from './adapter';
import { previewReading } from './preview';
import { ReadingPicker } from './ReadingPicker';
import { RangeInput } from './RangeInput';
import { InlineGuide } from '../guides/InlineGuide';
import './record.css';

export function RecordPanel({ initialId, onSaved, guided = false }: { initialId?: IndicatorId; onSaved?: () => void; guided?: boolean }) {
  const recordFor = useMission((s) => s.recordFor);
  const entries = useMission((s) => s.entries);
  const now = useMission((s) => s.now);
  const environment = useMission((s) => s.environment);
  const { readings, baselines } = useAssessment();
  const record = useMission((s) => s.record);
  const open = useMission((s) => s.open);
  const busy = useMission((s) => s.busy);
  const hydrated = useMission((s) => s.hydrated);
  const storageError = useMission((s) => s.storageError);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (guided) form.current?.querySelector<HTMLInputElement>('#value')?.focus({ preventScroll: true }); }, [guided]);
  const [id, setId] = useState<IndicatorId>(initialId ?? recordFor);
  const [raw, setRaw] = useState(String(readings[initialId ?? recordFor] ?? ''));
  const [error, setError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const ind = indicators[id];
  const rules = inputRules(id);
  const value = ind.kind === 'number' ? Number(raw) : raw as ReadingValue;
  let validation = raw.trim() === '' ? '' : validateReading(id, value) ?? '';
  if (!validation && raw !== '' && (id === 'systolic' || id === 'diastolic')) {
    const systolic = id === 'systolic' ? value : readings.systolic;
    const diastolic = id === 'diastolic' ? value : readings.diastolic;
    if (typeof systolic === 'number' && typeof diastolic === 'number') {
      const pair = validateBloodPressurePair(systolic, diastolic);
      if (!pair.ok) validation = pair.message;
    }
  }
  const preview = useMemo(() => raw.trim() && !validation ? previewReading(entries, now, environment, id, value) : null, [entries, now, environment, id, value, raw, validation]);
  const assessed = preview && (preview.baseline || preview.score !== undefined && preview.score !== null);
  const tone = validation ? 'alert' : assessed ? preview.deviation.status : 'missing';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (raw.trim() === '') { setError('Enter a reading before saving.'); return; }
    if (validation) { setError(validation); return; }
    setError('');
    try {
      await record(id, value);
      if (onSaved) onSaved(); else open(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save. Please retry.');
    }
  }
  return (
    <form ref={form} className={`form record-form ${guided ? "is-guided" : ""} is-${tone}`} onSubmit={submit} noValidate>
      {!guided && <div className="record-reading-picker">
        <p className="dialog-copy">Choose a reading. Drag or type, preview, then save.</p>
        <span className="micro">Reading</span>
        <ReadingPicker value={id} disabled={busy} onChange={(next) => { setId(next); setRaw(String(readings[next] ?? '')); setError(''); setGuideOpen(false); }} />
      </div>}
      <div className="record-entry-body">
      <label htmlFor="value" className="micro">{ind.name}{ind.unit && ` / ${ind.unit}`}</label>
      {ind.kind === 'number' ? (
        <RangeInput indicator={ind} value={raw} onChange={(next) => { setRaw(next); setError(''); }} disabled={busy} invalid={!!validation || !!error} baseline={preview?.baseline ?? baselines[id]} min={rules?.min ?? ind.min} max={rules?.max ?? ind.max} step={rules?.step ?? ind.step} />
      ) : (
        <select id="value" name="value" value={raw} disabled={busy} onChange={(event) => { setRaw(event.target.value); setError(''); }} aria-invalid={!!error} aria-describedby="value-help record-error draft-preview">
          <option value="" disabled>Choose an observation</option>
          {ind.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      )}
      <div className={`draft-preview is-${tone}`} id="draft-preview" role="status">
        <div className="draft-preview-heading"><span className="micro">{validation ? 'Check value' : 'Preview · not saved'}</span>
          {preview?.score !== undefined && preview.score !== null && <span className="draft-news-points">This observation · {preview.score} {preview.score === 1 ? 'point' : 'points'}</span>}
        </div>
        <strong className="draft-preview-value">{validation || (preview ? assessed ? preview.deviation.status === 'normal' ? 'Normal' : preview.deviation.status === 'watch' ? 'Watch' : 'Alert' : 'Personal range pending' : 'Enter your measured value')}</strong>
        <span className="draft-preview-explanation">{preview ? preview.deviation.text : 'Drag the marker or type an exact number above.'}</span>
      </div>
      <details className="record-input-notes"><summary>Input limits & units</summary>
        <p id="value-help">{ind.kind === 'number' ? `Input limits ${rules?.min ?? ind.min}–${rules?.max ?? ind.max} ${ind.unit}. These are storage limits, not a normal range.` : 'Choose what you observe now.'}</p>
      </details>
      <p id="record-error" role="alert" className="form-error">{error || storageError}</p>
      <div className="form-actions">
        <button type="submit" className="btn btn-solid btn-lg" disabled={busy || !hydrated || !!validation}>{busy ? 'Saving…' : guided ? 'Save & continue' : 'Save reading'} <ArrowRight size={16} aria-hidden="true" /></button>
        {guides[id] && !guided && <button type="button" className="btn btn-ghost" aria-expanded={guideOpen} onClick={() => setGuideOpen((current) => !current)}>{guideOpen ? 'Hide measurement guide' : 'How to measure'}</button>}
      </div>
      {guideOpen && <InlineGuide key={id} id={id} />}
      </div>
    </form>
  );
}
