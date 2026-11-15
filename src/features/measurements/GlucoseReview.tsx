import { ADA_DIAGNOSIS_SOURCE, ADA_MONITORING_SOURCE, reviewGlucose, type GlucoseContext, type GlucoseReview as Review } from '../../engine';
import { glucoseContextLabel } from '../../engine/glucoseContext';

/** Monitoring and laboratory criteria remain distinct on every surface. */
export function GlucoseReview({ value, context, review }: { value: number; context?: GlucoseContext; review?: Review }) {
  const result = review ?? reviewGlucose(value, context);
  return <section className="block glucose-review" aria-label="Contextual glucose review">
    <p className="dialog-fine">Sample context: {glucoseContextLabel(context)}.</p>
    <span className="micro">Monitoring · separate from diagnostic criteria</span>
    <p className="dialog-fine">{result.monitoring.message}</p>
    <span className="micro">Laboratory criteria · clinician interpretation</span>
    <p className="dialog-fine">{result.laboratory.message}</p>
    {result.trend && <p className="dialog-fine">Observed trend: {result.trend.direction}, {result.trend.first} → {result.trend.last} mg/dL across {result.trend.count} comparable readings. Descriptive arithmetic, not a diagnostic test or a prediction.</p>}
    <p className="dialog-fine"><a href={ADA_DIAGNOSIS_SOURCE} target="_blank" rel="noreferrer">ADA 2026 · laboratory criteria</a>{' · '}<a href={ADA_MONITORING_SOURCE} target="_blank" rel="noreferrer">ADA 2026 · monitoring</a></p>
  </section>;
}
