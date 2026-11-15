import { ArrowRight } from 'lucide-react';
import { LAB_PATH } from '../../routes';

const TEAM = ['José González', 'Fabián Quintero', 'Santiago Quintero', 'Eduardo Negrín', 'Daniel Herrera', 'Isabella Arrieta'];

/** The sources the engine and the twin cite, by what each one gives. */
const SOURCES: [string, string][] = [
  ['Early warning score', 'Royal College of Physicians, NEWS2'],
  ['Blood pressure and heart rate', 'American Heart Association'],
  ['Oxygen saturation', 'American Thoracic Society, British Thoracic Society'],
  ['Glucose', 'American Diabetes Association'],
  ['Sleep', 'National Heart, Lung, and Blood Institute'],
  ['Spaceflight hazards', 'NASA Human Research Program'],
  ['Radiation dose comparisons', 'NASA-STD-3001, Volume 1'],
  ['Observed astronaut chemistry bands', 'NASA OSDR, OSD-575 / Inspiration4'],
  ['Anatomy', 'BodyParts3D, HuBMAP, MakeHuman'],
];

/** The close and the footer, one screen: the way in, then who built it and what it stands on. */
export function Closing() {
  return (
    <footer className="closing" aria-labelledby="closing-title">
      <div className="wrap closing-wrap">
        <div className="closing-cta">
          <h2 id="closing-title">See the twin respond to real readings.</h2>
          <a className="landing-cta is-primary" href={LAB_PATH}>Open the lab <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
        <div className="closing-grid">
          <div className="closing-team">
            <h3>Tonoteam Ultimate</h3>
            <p>Built in two days for the NASA Space Apps Challenge 2026.</p>
            <ul>{TEAM.map((name) => <li key={name}>{name}</li>)}</ul>
          </div>
          <div className="closing-sources">
            <h3>Every limit has a source</h3>
            <ul>{SOURCES.map(([what, who]) => <li key={what}><span>{what}</span><b>{who}</b></li>)}</ul>
          </div>
        </div>
        <div className="closing-foot">
          <span>A mission simulation prototype. Not medical advice. Readings on this page are illustrative.</span>
          <span>NEWS2 © Royal College of Physicians 2017, used unmodified.</span>
        </div>
      </div>
    </footer>
  );
}
