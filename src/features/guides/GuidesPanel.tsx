import { guides } from '../../data/guides';
import { type IndicatorId } from '../../data/indicators';
import { InlineGuide } from './InlineGuide';
import { ReadingPicker } from '../measurements/ReadingPicker';
import '../measurements/record.css';
import './guides-panel.css';

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
    <div className="guides-layout">
      <nav className="guides-selector" aria-label="Measurement guide selector">
        <span className="micro">Choose a measurement</span>
        <p>Select an icon to see its instrument, animated steps and reference source.</p>
        <ReadingPicker value={current} ids={ids} onChange={onSelectGuide} />
      </nav>
      <div className="guides-active">
        <InlineGuide key={current} id={current} />
        {onRecord && <button type="button" className="btn btn-solid" onClick={() => onRecord(current)}>Record this reading</button>}
      </div>
    </div>
  );
}

export default GuidesPanel;
