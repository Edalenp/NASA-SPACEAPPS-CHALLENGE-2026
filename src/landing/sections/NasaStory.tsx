import { ArrowUpRight } from 'lucide-react';
import './nasa-story.css';

const contributions = [
  { source: 'Human Research Program', title: 'Spaceflight risks give the readings context.', body: 'VITRUVIO maps 11 selected HRP risks to body systems and highlights risks for each mission environment. Measurement guides connect each reading to the relevant spaceflight hazards.', evidence: '11 selected risks · 5 spaceflight hazards', url: 'https://www.nasa.gov/hrp/hazards/' },
  { source: 'NASA-STD-3001', title: 'Radiation limits are part of the calculation.', body: 'Recorded dosimeter readings accumulate into separate career and solar-event totals. The radiation module compares each total with its corresponding exposure limit and flags when it is reached.', evidence: 'Recorded dose → accumulated exposure → limit comparison', url: 'https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1' },
  { source: 'OSDR · OSD-575', title: 'Real crew data adds a point of comparison.', body: 'Inspiration4 metabolic-panel data supplies observed pre- and post-flight bands for glucose, calcium, sodium and potassium. Trends place the crew member’s readings alongside those bands.', evidence: '4 crew members · 28 samples · 4 blood chemistry indicators', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575' },
];

export function NasaStory() {
  return <section className="nasa-story" aria-labelledby="nasa-title">
    <div className="wrap">
      <header className="nasa-story-head">
        <div><span className="hero-eyebrow">Research into practice</span><h2 id="nasa-title">NASA research, working on board.</h2></div>
        <p>NASA research shapes how VITRUVIO supports the crew: HRP risks connect monitoring to spaceflight hazards, NASA-STD-3001 informs radiation-dose comparisons, and OSD-575 brings observed astronaut data into the trends.</p>
      </header>
      <ol className="nasa-contributions">{contributions.map((item, index) => <li key={item.source}>
        <span className="nasa-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <div className="nasa-source"><span className="hero-eyebrow">{item.source}</span><a href={item.url} target="_blank" rel="noreferrer">Explore source <ArrowUpRight size={13} aria-hidden="true" /><span className="nasa-sr">: {item.source}</span></a></div>
        <div className="nasa-application"><h3>{item.title}</h3><p>{item.body}</p><span className="nasa-evidence">{item.evidence}</span></div>
      </li>)}</ol>
      <p className="nasa-context">The 11 risks are VITRUVIO’s selected HRP subset. OSD-575 bands describe a small cohort’s observed values; they are not clinical limits or a personal baseline.</p>
    </div>
  </section>;
}
