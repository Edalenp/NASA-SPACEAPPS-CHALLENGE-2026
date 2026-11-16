import { useState } from 'react';
import type { VisualGuideId } from '../../data/guides';
import { VisualMeasurementGuide } from './VisualMeasurementGuide';

const choices: { id: VisualGuideId; label: string }[] = [
  { id: 'pulse', label: 'Wrist pulse' }, { id: 'temperature', label: 'Temperature' }, { id: 'spo2', label: 'Oximeter' },
];

export function VisualGuidesPanel({ initialGuide = 'pulse', onRecord, workspace = false }: { initialGuide?: VisualGuideId; onRecord?: (id: VisualGuideId) => void; workspace?: boolean }) {
  const [guide, setGuide] = useState(initialGuide);
  return <div className="visual-guides-panel">
    <div className="visual-guide-choices" role="group" aria-label="Visual measurement guide">
      {choices.map(choice => <button key={choice.id} type="button" aria-pressed={guide === choice.id} onClick={() => setGuide(choice.id)}>{choice.label}</button>)}
    </div>
    <VisualMeasurementGuide key={guide} guide={guide} onRecord={onRecord} workspace={workspace} />
  </div>;
}
export default VisualGuidesPanel;
