import { useEffect, useRef } from 'react';
import { ArrowUpRight, Maximize2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { EvidenceId } from '../../features/evidence/entry';

const evidenceShots: Record<EvidenceId, { title: string; image: string; caption: string; note: string }> = {
  hrp: { title: 'HRP → system context', image: '/landing/evidence/hrp.png', caption: 'The musculoskeletal system opens its mapped HRP risk records alongside the mission context.', note: 'Look for “NASA Human Research Program risk” and the linked “HRP risk records”.' },
  radiation: { title: 'NASA-STD-3001 + CSA → radiation log', image: '/landing/evidence/radiation.png', caption: 'The radiation module separates the career total from the event log and links to NASA and CSA sources.', note: 'The 250 mSv figure is a design-reference comparison, not a personal per-event exposure limit.' },
  osd575: { title: 'OSD-575 → glucose trends', image: '/landing/evidence/osd575.png', caption: 'Glucose readings from the mission simulation appear alongside the observed Inspiration4 crew band.', note: 'The hatched NASA cohort band and the personal range are different references. The plotted mission readings are simulated.' },
  'iss-kit': { title: 'ISS checklist → measurement guide', image: '/landing/evidence/iss-kit.png', caption: 'The blood-pressure guide names the cuff and its Medical Diagnostic Pack location from the 2015 checklist.', note: 'Look for the instrument, pack and slot. The historical checklist is not the current inventory.' },
};

export function EvidenceView({ id, enlarge }: { id: EvidenceId; enlarge: () => void }) {
  const shot = evidenceShots[id];
  return <figure className="evidence-view" aria-label={shot.title}>
    <div className="evidence-console">
      <div className="evidence-bar"><span className="lab-dots" aria-hidden="true"><i /><i /><i /></span><span>VITRUVIO / evidence</span><span>Actual lab capture</span></div>
      <div className="evidence-image" key={id}><img src={shot.image} alt={shot.caption} width={1100} height={760} loading="lazy" decoding="async" /></div>
      <div className="evidence-tools"><span>Illustrative session · local lab</span><button type="button" onClick={enlarge} aria-label={`Enlarge ${shot.title} capture`}><Maximize2 size={14} aria-hidden="true" />Expand capture</button></div>
    </div>
    <figcaption key={id}>
      <span className="hero-eyebrow">Source → in the product</span><h3>{shot.title}</h3><p>{shot.caption}</p>
      <div className="evidence-callout">{shot.note}</div>
      <a className="evidence-lab-link" href={`/lab?evidence=${id}`}>See it in the lab <ArrowUpRight size={14} aria-hidden="true" /></a>
    </figcaption>
  </figure>;
}

export function EvidenceLightbox({ id, close }: { id: EvidenceId; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const shot = evidenceShots[id];
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return createPortal(<dialog ref={ref} className="evidence-lightbox" aria-label={`${shot.title} enlarged capture`} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <header><span>{shot.title}</span><button type="button" onClick={close} aria-label="Close enlarged capture" autoFocus><X size={18} /></button></header>
    <img src={shot.image} alt={shot.caption} /><p>{shot.note}</p>
  </dialog>, document.body);
}
