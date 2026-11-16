import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { LAB_PATH } from '../../routes';
import { ISS_KIT_SOURCE } from '../../data/guides';

const SourceBrowser = lazy(() => import('../../features/dashboard/SharedReferenceSources'));

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
  ['Glucose and monitoring', [
    ['ADA Standards of Care 2026 · section 2', 'https://doi.org/10.2337/dc26-S002'],
    ['ADA Standards of Care 2026 · section 6', 'https://doi.org/10.2337/dc26-S006'],
  ]],
  ['Sleep and fatigue context', [
    ['NASA V1 6001 · Medical Operations', 'https://www.nasa.gov/reference/6-0-medical-operations/'],
    ['National Heart, Lung, and Blood Institute', 'https://www.nhlbi.nih.gov/health/sleep/how-much-sleep'],
    ['AASM / Sleep Research Society', 'https://aasm.org/resources/pdf/adultsleepdurationconsensus.pdf'],
  ]],
  ['Clinical ranges and techniques', [
    ['MedlinePlus · Vital signs and laboratory references', 'https://medlineplus.gov/ency/article/002341.htm'],
    ['FDA · Pulse oximeter use', 'https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics'],
    ['CDC · Blood sugar monitoring', 'https://www.cdc.gov/diabetes/diabetes-testing/monitoring-blood-sugar.html'],
    ['Cleveland Clinic · Fever', 'https://my.clevelandclinic.org/health/diseases/10880-fever'],
    ['AMBOSS · Fever', 'https://library.amboss.com/us/knowledge/fever'],
    ['StatPearls · Vital Sign Assessment', 'https://www.ncbi.nlm.nih.gov/books/NBK553213/'],
  ]],
  ['Well-being context', [
    ['NIMH · Caring for your mental health', 'https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health'],
    ['WHO-5 context · instrument not implemented', 'https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01'],
  ]],
  ['Emergency guidance', [
    ['American Red Cross · Unresponsive person', 'https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person'],
    ['American Red Cross · Heart attack', 'https://www.redcross.org/take-a-class/resources/learn-first-aid/heart-attack'],
    ['NASA NTRS · CPR research (1992)', 'https://ntrs.nasa.gov/citations/19950010359'],
  ]],
  ['Reaction-time context', [['Basner et al. · PVT research (Sleep, 2021)', 'https://pubmed.ncbi.nlm.nih.gov/32556295/']]],
  ['Spaceflight hazards', [['NASA Human Research Program', 'https://www.nasa.gov/hrp/hazards/']]],
  ['Radiation dose comparisons', [['NASA-STD-3001, Volume 1', 'https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1']]],
  ['Radiation, partner agency', [['Canadian Space Agency', 'https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp']]],
  ['Measurement instruments', [['NASA ISS medical kit checklist (2015)', ISS_KIT_SOURCE.url]]],
  ['Observed astronaut chemistry bands', [['NASA OSDR, OSD-575 / Inspiration4', 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575']]],
  ['Anatomy and derived line art', [
    ['Open Anatomy 3D · MervinR07', 'https://github.com/MervinR07/open-anatomy-3d'],
    ['BodyParts3D, HuBMAP, MakeHuman · Credits', 'https://github.com/MervinR07/open-anatomy-3d/blob/main/ATTRIBUTION.md'],
  ]],
  ['Earth imagery', [['NASA/GSFC SVS · Reto Stockli · Earth Observatory', 'https://svs.gsfc.nasa.gov/2915/']]],
  ['Interface and typography', [
    ['React Bits / David Haz · Ghost Fibers', 'https://reactbits.dev/backgrounds/ghost-fibers'],
    ['IBM Plex / Fontsource', 'https://github.com/IBM/plex'],
  ]],
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
            <ul>{SOURCES.map(([what, links]) => <li key={what}><span>{what}</span><div className="closing-source-links">{links.map(([label, url]) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={12} aria-hidden="true" /></a>)}</div></li>)}</ul>
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
