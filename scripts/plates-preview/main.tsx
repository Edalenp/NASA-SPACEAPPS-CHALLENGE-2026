/**
 * Dev tool: every guide plate in every pose, final frame. Open /scripts/plates-preview/ on the dev
 * server (add ?only=bloodPressure to show one plate). Not part of the app build.
 */
import { createRoot } from 'react-dom/client';
import '../../src/styles/tokens.css';
import { MeasurementArt } from '../../src/features/guides/art/measurement';
import type { PlateId } from '../../src/features/guides/art/plate-steps';

const plates: [PlateId, number][] = [
  ['pulse', 3], ['temperature', 3], ['spo2', 3],
  ['bloodPressure', 3], ['respiration', 3], ['glucose', 4], ['consciousness', 2], ['sleep', 2], ['mood', 2],
];
const only = new URLSearchParams(location.search).get('only');
createRoot(document.getElementById('root')!).render(
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 360px)', gap: 12, padding: 12, background: 'var(--vt-ground)', fontFamily: 'sans-serif' }}>
    {plates.filter(([id]) => !only || id === only).flatMap(([id, n]) =>
      Array.from({ length: n }, (_, pose) => (
        <div key={`${id}-${pose}`}>
          <MeasurementArt guide={id} step={pose} count={n} description={`${id} ${pose}`} />
        </div>
      )),
    )}
  </div>,
);
