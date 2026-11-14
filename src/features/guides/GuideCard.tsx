import { lazy, Suspense, useId, useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { guides, ISS_KIT_SOURCE, visualGuides, type GuideValidation, type VisualGuideId } from '../../data/guides';
import { indicators, type IndicatorId } from '../../data/indicators';
import { getHazardById } from '../../data/nasa';
import './guide-card.css';

const MeasurementArt = lazy(() => import('./art/measurement').then((m) => ({ default: m.MeasurementArt })));

const status: Record<GuideValidation, { label: string; note: string }> = {
  cited: {
    label: 'Source checked',
    note: 'Technique paraphrased from the source below. Onboard procedure and clinical review are pending.',
  },
  'self-report': {
    label: 'Self-report',
    note: 'Your own record. There is no measurement technique to cite.',
  },
  draft: {
    label: 'Draft',
    note: 'Steps are withheld until a source is reviewed.',
  },
};

const isVisual = (id: IndicatorId): id is VisualGuideId => id in visualGuides;

/**
 * One measurement guide: instrument, ISS kit pack, related spaceflight hazards, steps and sources.
 * What it shows depends on the guide's validation: draft steps are never displayed.
 */
export function GuideCard({ id, index, onRecord }: { id: IndicatorId; index?: number; onRecord?: (id: IndicatorId) => void }) {
  const guide = guides[id];
  const titleId = useId();
  const [active, setActive] = useState(0);
  if (!guide) return null;
  const visual = isVisual(id);
  const state = status[guide.validation];
  const steps = guide.validation === 'draft' ? [] : guide.steps;
  /** Steps start with the preparation line, then follow the illustration's three poses. */
  const pose = Math.min(2, Math.max(0, active - 1));

  return (
    <article className="guide-card" aria-labelledby={titleId}>
      <header className="guide-card-head">
        <span className="micro">
          Field guide{index !== undefined ? ` / ${String(index + 1).padStart(2, '0')}` : ''}
        </span>
        <span className={`guide-status is-${guide.validation}`}>{state.label}</span>
        <h3 id={titleId} className="dialog-h3">{indicators[id].name}</h3>
      </header>

      <dl className="guide-facts">
        <div>
          <dt className="micro">Instrument</dt>
          <dd>{guide.instrument}</dd>
        </div>
        <div>
          <dt className="micro">ISS medical kit</dt>
          {guide.kit ? (
            <dd>
              {guide.kit.item}
              <span>{guide.kit.pack} ({guide.kit.colour}) · {guide.kit.slot}</span>
            </dd>
          ) : (
            <dd className="is-muted">{guide.kitNote}</dd>
          )}
        </div>
        <div className="guide-facts-wide">
          <dt className="micro">Spaceflight hazards</dt>
          <dd className="guide-hazards">
            {guide.hazards.map((hid) => {
              const hazard = getHazardById(hid);
              return hazard ? (
                <a key={hid} href={hazard.nasaUrl} target="_blank" rel="noreferrer">
                  {hazard.name}
                </a>
              ) : null;
            })}
          </dd>
        </div>
      </dl>

      <p className="dialog-copy guide-why">{guide.why}</p>

      <div className={`guide-body ${visual ? 'has-art' : ''}`}>
        {steps.length > 0 ? (
          <ol className="steps guide-steps">
            {steps.map((text, i) => (
              <li key={text}>
                <span className="micro">{String(i + 1).padStart(2, '0')}</span>
                {visual ? (
                  <button type="button" aria-pressed={active === i} onClick={() => setActive(i)}>
                    {text}
                  </button>
                ) : (
                  <p>{text}</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="guide-withheld">{state.note}</p>
        )}
        {visual && steps.length > 0 && (
          <div className="guide-art">
            <Suspense fallback={<div className="guide-art-loading" />}>
              <MeasurementArt guide={id} step={pose} description={visualGuides[id].steps[pose].description} />
            </Suspense>
          </div>
        )}
      </div>

      <footer className="guide-card-foot">
        <p className="dialog-fine">{state.note}</p>
        <ul className="guide-sources">
          {guide.source && (
            <li>
              <a href={guide.source.url} target="_blank" rel="noreferrer">
                {guide.source.title} <ArrowUpRight size={12} aria-hidden="true" />
              </a>
              <span>checked {guide.source.checkedAt}</span>
            </li>
          )}
          {guide.kit && (
            <li>
              <a href={ISS_KIT_SOURCE.url} target="_blank" rel="noreferrer">
                {ISS_KIT_SOURCE.title} <ArrowUpRight size={12} aria-hidden="true" />
              </a>
              <span>checked {ISS_KIT_SOURCE.checkedAt}</span>
            </li>
          )}
        </ul>
        {onRecord && (
          <button type="button" className="btn btn-solid" onClick={() => onRecord(id)}>
            Record this reading <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </footer>
    </article>
  );
}
