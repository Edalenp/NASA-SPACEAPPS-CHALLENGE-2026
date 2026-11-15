import { ArrowUpRight } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion, useTyping } from '../typing';
import { EvidenceLightbox, EvidenceView } from './NasaEvidence';
import type { EvidenceId } from '../../features/evidence/entry';
import { ISS_KIT_SOURCE } from '../../data/guides';
import './nasa-story.css';

const contributions = [
  { source: 'Human Research Program', title: 'Spaceflight risks give the readings context.', body: 'VITRUVIO maps 11 selected HRP risks to body systems and highlights risks for each mission environment. Measurement guides connect each reading to the relevant spaceflight hazards.', evidence: '11 selected risks · 5 spaceflight hazards', url: 'https://www.nasa.gov/hrp/hazards/' },
  { source: 'NASA-STD-3001', title: 'Radiation comparisons keep their context.', body: 'Recorded dosimeter readings add up to two totals. The career total is checked against NASA’s 600 mSv career limit. The single-event total is compared with 250 mSv: the design requirement for protection against the reference solar particle event, based on the sum of the October 1989 events. This comparison is not a personal per-event exposure limit or a validation of spacecraft shielding. The Canadian Space Agency’s radiation guidance explains exposure to the crew.', evidence: '600 mSv career limit · 250 mSv solar-event design requirement · CSA', url: 'https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1', partnerUrl: 'https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp' },
  { source: 'OSDR · OSD-575', title: 'Real crew data adds a point of comparison.', body: 'Inspiration4 metabolic-panel data supplies observed pre- and post-flight bands for glucose, calcium, sodium and potassium. Trends place the crew member’s readings alongside those bands.', evidence: '4 crew members · 28 samples · 4 blood chemistry indicators', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575' },
  { source: 'ISS medical kit · 2015', title: 'Guides name the instrument flown on board.', body: 'Each measurement guide names its instrument and, where NASA’s 2015 ISS medical kit checklist lists it, the pack and slot: blood pressure cuff, thermometer, blood oximeter. Where the checklist has no such item, the guide says so.', evidence: 'MED CL 3.001 · Medical Diagnostic Pack (Blue) · historical list', url: ISS_KIT_SOURCE.url },
];
const ids: EvidenceId[] = ['hrp', 'radiation', 'osd575', 'iss-kit'];
gsap.registerPlugin(ScrollTrigger);

export function NasaStory() {
  const [active, setActive] = useState<EvidenceId>('osd575');
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  useTyping(headline, { speed: .018, reduced, onView: true });
  useLayoutEffect(() => {
    if (reduced || !root.current) return;
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.nasa-contributions > li').forEach(row => {
        gsap.from(row, { y: 24, opacity: 0, duration: .7, ease: 'power2.out', scrollTrigger: { trigger: row, start: 'top 90%', once: true } });
      });
      media.add('(min-width: 1101px)', () => {
        gsap.fromTo('.evidence-drift', { y: 12 }, { y: -12, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 1 } });
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, [reduced]);
  useLayoutEffect(() => { if (!reduced) ScrollTrigger.refresh(); }, [active, reduced]);
  return <section ref={root} className="nasa-story" aria-labelledby="nasa-title">
    <div className="wrap">
      <header className="nasa-story-head">
        <div><span className="hero-eyebrow">How NASA data made it possible</span><h2 ref={headline} id="nasa-title">NASA research, working on board.</h2><p className="nasa-subtitle">How using NASA's free and open data and Space Agency Partner data made your proposed solution possible.</p></div>
        <p>NASA research shapes how VITRUVIO supports the crew: HRP risks connect monitoring to spaceflight hazards, NASA-STD-3001 informs radiation-dose comparisons, OSD-575 brings observed astronaut data into the trends, and NASA’s ISS medical kit checklist grounds measurement guides in equipment listed for use on board.</p>
      </header>
      <div className="nasa-evidence-layout">
      <ol className="nasa-contributions">{contributions.map((item, index) => <li key={item.source} className={active === ids[index] ? 'is-active' : ''}>
        <span className="nasa-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <div className="nasa-source"><span className="hero-eyebrow">{item.source}</span><a href={item.url} target="_blank" rel="noreferrer">Explore source <ArrowUpRight size={13} aria-hidden="true" /><span className="nasa-sr">: {item.source}</span></a>{item.partnerUrl && <a href={item.partnerUrl} target="_blank" rel="noreferrer">CSA radiation guidance <ArrowUpRight size={13} aria-hidden="true" /></a>}</div>
        <div className="nasa-application"><h3>{item.title}</h3><p>{item.body}</p><span className="nasa-evidence">{item.evidence}</span><button type="button" className="nasa-show" aria-pressed={active === ids[index]} onClick={() => setActive(ids[index])}>{active === ids[index] ? 'Viewing lab evidence' : 'View lab evidence'}<ArrowUpRight size={13} aria-hidden="true" /><span className="nasa-sr">: {item.source}</span></button></div>
        {active === ids[index] && <div className="evidence-inline"><EvidenceView id={active} enlarge={() => setExpanded(true)} /></div>}
      </li>)}</ol>
      <div className="evidence-desktop"><div className="evidence-drift"><EvidenceView id={active} enlarge={() => setExpanded(true)} /></div></div>
      </div>
      <p className="nasa-context">The 11 risks are VITRUVIO’s selected HRP subset. OSD-575 bands describe a small cohort’s observed values; they are not clinical limits or a personal baseline. The kit list is the 2015 checklist, not today’s inventory.</p>
    </div>
    {expanded && <EvidenceLightbox id={active} close={() => setExpanded(false)} />}
  </section>;
}
