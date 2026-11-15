import { Lockup } from './Logo';
import './loaderPlate.css';

const LOADER_STEPS = ['Anatomical model & habitat', 'Materials & lighting', 'Body twin ready'] as const;

/**
 * The loading plate itself, with no logic: the figure, its bar, the three steps and the file in
 * hand. Root shows it at zero while the console's code downloads; SceneLoader then drives it.
 */
export function LoaderPlate({ shown = 0, step = 0, item = 'Starting the console', leaving = false }: { shown?: number; step?: number; item?: string; leaving?: boolean }) {
  return (
    <div className={`scene-loader ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite" aria-label={`Preparing the body twin, ${shown} percent`}>
      <div className="scene-loader-plate">
        <Lockup />
        <span className="scene-loader-scan" aria-hidden="true" />
        <div className="scene-loader-figure">
          <strong>{String(shown).padStart(2, '0')}</strong>
          <span>%</span>
        </div>
        <span className="scene-loader-track" aria-hidden="true"><i style={{ width: `${shown}%` }} /></span>
        <ol className="scene-loader-steps">
          {LOADER_STEPS.map((label, index) => (
            <li key={label} className={index < step ? 'is-done' : index === step ? 'is-current' : ''}>
              <span className="micro">{String(index + 1).padStart(2, '0')}</span>
              {label}
            </li>
          ))}
        </ol>
        <span className="scene-loader-item">{item || ' '}</span>
      </div>
    </div>
  );
}
