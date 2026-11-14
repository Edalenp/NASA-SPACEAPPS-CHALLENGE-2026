import { useId, useState } from 'react';
import { visualGuides, type VisualGuideId } from '../../data/guides';
import { MeasurementArt } from './art/measurement';
import './visual-guides.css';

/** Standalone, store-independent component for X's Guides panel or any measurement form. */
export function VisualMeasurementGuide({ guide, onRecord }: { guide: VisualGuideId; onRecord?: (guide: VisualGuideId) => void }) {
  const data = visualGuides[guide];
  const [step, setStep] = useState(0);
  const titleId = useId();
  const selected = data.steps[step];
  return <section className="visual-measurement-guide" aria-labelledby={titleId}>
    <header className="visual-guide-heading"><h3 id={titleId}>{data.title}</h3><p>{data.instrument}</p></header>
    <p className="visual-guide-preparation">{data.preparation}</p>
    <div className="visual-guide-layout">
      <div className="visual-guide-figure"><MeasurementArt guide={guide} step={step} description={selected.description} /></div>
      <div className="visual-guide-instruction">
        <div className="visual-guide-step-selector" role="group" aria-label="Measurement steps">
          {data.steps.map((item, index) => <button key={item.title} type="button" aria-pressed={step === index} aria-label={`Step ${index + 1}: ${item.title}`} onClick={() => setStep(index)}>{index + 1}</button>)}
        </div>
        <p className="visual-guide-step-count">Step {step + 1} of {data.steps.length}</p>
        <h4>{selected.title}</h4><p>{selected.detail}</p>
        <div className="visual-guide-navigation">
          <button type="button" disabled={step === 0} onClick={() => setStep(index => index - 1)}>Previous step</button>
          <button type="button" disabled={step === data.steps.length - 1} onClick={() => setStep(index => index + 1)}>Next step</button>
        </div>
      </div>
    </div>
    <p className="visual-guide-note">{data.note}</p>
    <details className="visual-guide-source"><summary>Source: {data.source.title}</summary>
      <p>Reference checked {data.source.checkedAt}. This technique summary stays available offline. Follow the onboard kit’s instructions; pack-specific review is pending.</p>
      <a href={data.source.url} target="_blank" rel="noreferrer">Open original source ↗</a>
    </details>
    {onRecord && <button type="button" className="visual-guide-record" onClick={() => onRecord(guide)}>Record this measurement</button>}
  </section>;
}
