import type { ReactNode } from 'react';
import { Lockup } from './Logo';
import './loaderPlate.css';

const LOADER_STEPS = ['Anatomical model & habitat', 'Materials & lighting', 'Body twin ready'] as const;

/**
 * The loading plate itself, with no logic: the figure, its bar, the three steps and the file in
 * hand. Root shows it at zero while a page's code downloads; SceneLoader (the console) and
 * LandingLoader (the landing) then drive it.
 */
export function LoaderPlate({ shown = 0, step = 0, item = 'Starting the console', leaving = false, steps = LOADER_STEPS, label = 'Preparing the body twin', extra }: {
  shown?: number; step?: number; item?: string; leaving?: boolean; steps?: readonly string[]; label?: string; extra?: ReactNode;
}) {
  return (
    <div className={`scene-loader ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite" aria-label={`${label}, ${shown} percent`}>
      <div className="scene-loader-plate">
        <Lockup />
        <span className="scene-loader-scan" aria-hidden="true" />
        <div className="scene-loader-figure">
          <strong>{String(shown).padStart(2, '0')}</strong>
          <span>%</span>
        </div>
        <span className="scene-loader-track" aria-hidden="true"><i style={{ width: `${shown}%` }} /></span>
        <ol className="scene-loader-steps">
          {steps.map((name, index) => (
            <li key={name} className={index < step ? 'is-done' : index === step ? 'is-current' : ''}>
              <span className="micro">{String(index + 1).padStart(2, '0')}</span>
              {name}
            </li>
          ))}
        </ol>
        <span className="scene-loader-item">{item || ' '}</span>
        {extra}
      </div>
    </div>
  );
}
