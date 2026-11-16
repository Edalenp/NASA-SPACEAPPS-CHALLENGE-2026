import { ArrowRight } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { LAB_PATH } from '../../routes';

const SourceBrowser = lazy(() => import('../../features/dashboard/SharedReferenceSources'));

const TEAM = ['José González', 'Fabián Quintero', 'Santiago Quintero', 'Eduardo Negrín', 'Daniel Herrera', 'Isabella Arrieta'];

/** The sources the engine and the twin cite, by what each one gives. */
const SOURCES: [string, string][] = [
  ['Early warning score', 'Royal College of Physicians, NEWS2'],
  ['Blood pressure and heart rate', 'American Heart Association'],
  ['Oxygen saturation', 'American Thoracic Society, British Thoracic Society'],
  ['Glucose and monitoring', 'ADA Standards of Care 2026 · sections 2 and 6'],
  ['Sleep and fatigue context', 'NASA V1 6001, NHLBI, AASM/SRS'],
  ['Clinical ranges and measurement guides', 'MedlinePlus, FDA, CDC, Cleveland Clinic, AMBOSS, StatPearls'],
  ['Health and well-being context', 'NIMH, WHO-5 context (instrument not implemented)'],
  ['Emergency guidance', 'American Red Cross · NASA NTRS (1992 research)'],
  ['Reaction-time context', 'Basner et al. · PVT research (Sleep, 2021)'],
  ['Spaceflight hazards', 'NASA Human Research Program'],
  ['Radiation dose comparisons', 'NASA-STD-3001, Volume 1'],
  ['Radiation, partner agency', 'Canadian Space Agency'],
  ['Measurement instruments', 'NASA ISS medical kit checklist (2015)'],
  ['Observed astronaut chemistry bands', 'NASA OSDR, OSD-575 / Inspiration4'],
  ['Anatomy and derived line art', 'DBCLS / BodyParts3D, HuBMAP / HRA, MakeHuman, open-anatomy-3d'],
  ['Earth imagery', 'NASA/GSFC SVS · Reto Stockli · NASA Earth Observatory'],
  ['Interface and typography', 'React Bits / David Haz · IBM Plex / Fontsource'],
];

/** The close and the footer, one screen: the way in, then who built it and what it stands on. */
export function Closing() {
  const [showSources, setShowSources] = useState(false);
  return (
    <footer className="closing" aria-labelledby="closing-title">
      <div className="wrap closing-wrap">
        <div className="closing-cta">
          <div><h2 id="closing-title">See the twin respond to real readings.</h2><p className="closing-impact">Built for Mars. Useful anywhere a doctor is far away.</p></div>
          <a className="landing-cta is-primary" href={LAB_PATH}>Open the lab <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
        <div className="closing-grid">
          <div className="closing-team">
            <h3>Tonoteam Ultimate</h3>
            <p>Built in two days for the NASA Space Apps Challenge 2026.</p>
            <ul>{TEAM.map((name) => <li key={name}>{name}</li>)}</ul>
          </div>
          <div className="closing-sources">
            <h3>Sources, resources and credits</h3>
            <ul>{SOURCES.map(([what, who]) => <li key={what}><span>{what}</span><b>{who}</b></li>)}</ul>
            <a className="closing-source-link" href="#resources" onClick={() => setShowSources(true)}>Browse original sources, uses and licences <ArrowRight size={14} aria-hidden="true" /></a>
          </div>
        </div>
        <details className="closing-resources" id="resources" open={showSources} onToggle={event => setShowSources(event.currentTarget.open)}>
          <summary>Browse all sources and credits</summary>
          <p>These references support specific parts of the prototype. Personal baselines, mission delays and fatigue model parameters include project assumptions; technical tests do not establish clinical validation.</p>
          {showSources && <Suspense fallback={<p>Loading source inventory…</p>}><SourceBrowser /></Suspense>}
        </details>
        <div className="closing-foot">
          <span>A mission simulation prototype. Not medical advice. Readings on this page are illustrative.</span>
          <span>NEWS2 © Royal College of Physicians 2017, used unmodified.</span>
        </div>
      </div>
    </footer>
  );
}
