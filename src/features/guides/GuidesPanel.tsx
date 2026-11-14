import { guides } from '../../data/guides';
import { indicators, type IndicatorId } from '../../data/indicators';
import { GuideCard } from './GuideCard';

/**
 * The Guides dialog body: one tab per reading, then that reading's guide card.
 * Store-independent: the host passes the selected guide and the two actions.
 *
 * Integration (owner of Panels.tsx):
 *   <GuidesPanel
 *     guide={guide}
 *     onSelectGuide={(id) => open('guides', { guide: id })}
 *     onRecord={(id) => open('record', { recordFor: id })}
 *   />
 */
export function GuidesPanel({
  guide,
  onSelectGuide,
  onRecord,
}: {
  guide: IndicatorId;
  onSelectGuide: (id: IndicatorId) => void;
  onRecord?: (id: IndicatorId) => void;
}) {
  const ids = Object.keys(guides) as IndicatorId[];
  const current = guides[guide] ? guide : 'pulse';
  return (
    <>
      <div className="guide-tabs" role="tablist" aria-label="Readings">
        {ids.map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={current === id}
            className={current === id ? 'is-on' : ''}
            onClick={() => onSelectGuide(id)}
          >
            {indicators[id].name}
          </button>
        ))}
      </div>
      <GuideCard key={current} id={current} index={ids.indexOf(current)} onRecord={onRecord} />
    </>
  );
}

export default GuidesPanel;
