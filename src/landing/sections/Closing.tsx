import { ArrowRight, ArrowUpRight, Code } from 'lucide-react';
import { LAB_PATH } from '../../routes';
import { ISS_KIT_SOURCE } from '../../data/guides';

const TEAM = ['José González', 'Fabián Quintero', 'Santiago Quintero', 'Eduardo Negrín', 'Daniel Herrera', 'Isabella Arrieta'];

/** The sources the engine and the twin cite, by what each one gives. */
const SOURCES: [string, [string, string][]][] = [
  ['Early warning score', [['Royal College of Physicians, NEWS2', 'https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/']]],
  ['Blood pressure and heart rate', [
    ['American Heart Association · Blood pressure', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings'],
    ['American Heart Association · Heart rate', 'https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse'],
  ]],
  ['Oxygen saturation', [
    ['American Thoracic Society', 'https://www.thoracic.org/patients/patient-resources/resources/pulse-oximetry.pdf'],
    ['British Thoracic Society', 'https://bmjopenrespres.bmj.com/content/4/1/e000170'],
  ]],
  ['Glucose', [['American Diabetes Association', 'https://diabetes.org/about-diabetes/diagnosis']]],
  ['Sleep', [['National Heart, Lung, and Blood Institute', 'https://www.nhlbi.nih.gov/health/sleep/how-much-sleep']]],
  ['Spaceflight hazards', [['NASA Human Research Program', 'https://www.nasa.gov/hrp/hazards/']]],
  ['Solar particle events', [['NASA DONKI (CCMC, NASA Goddard)', 'https://ccmc.gsfc.nasa.gov/tools/DONKI/']]],
  ['Radiation dose comparisons', [['NASA-STD-3001, Volume 1', 'https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1']]],
  ['Radiation, partner agency', [['Canadian Space Agency', 'https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp']]],
  ['Measurement instruments', [['NASA ISS medical kit checklist (2015)', ISS_KIT_SOURCE.url]]],
  ['Observed astronaut chemistry bands', [['NASA OSDR, OSD-575 / Inspiration4', 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575']]],
  ['Anatomy', [
    ['Open Anatomy 3D · MervinR07', 'https://github.com/MervinR07/open-anatomy-3d'],
    ['BodyParts3D, HuBMAP, MakeHuman · Credits', 'https://github.com/MervinR07/open-anatomy-3d/blob/main/ATTRIBUTION.md'],
  ]],
];

/** The close and the footer, one screen: the way in, then who built it and what it stands on. */
export function Closing() {
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
            <h3>Every limit has a source</h3>
            <ul>{SOURCES.map(([what, links]) => <li key={what}><span>{what}</span><div className="closing-source-links">{links.map(([label, url]) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={12} aria-hidden="true" /></a>)}</div></li>)}</ul>
          </div>
        </div>
        <div className="closing-foot">
          <span>A mission simulation prototype. Not medical advice. Readings on this page are illustrative.</span>
          <a className="closing-repo" href="https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026" target="_blank" rel="noopener noreferrer"><Code size={14} aria-hidden="true" /> Source code on GitHub <ArrowUpRight size={12} aria-hidden="true" /></a>
          <span>NEWS2 © Royal College of Physicians 2017, used unmodified.</span>
        </div>
      </div>
    </footer>
  );
}
