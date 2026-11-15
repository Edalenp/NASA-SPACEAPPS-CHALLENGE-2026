import { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getReferenceCatalog } from '../../data/nasa/reference';
import './shared-references.css';

/** The data team's catalog is loaded on demand through its public, validated getter. */
export default function SharedReferenceSources() {
  const catalog = useMemo(() => getReferenceCatalog(), []);
  return (
    <section className="shared-reference-sources" aria-label="Shared NASA reference catalog">
      <header><span className="micro">Shared reference catalog</span><h3>{catalog.entries.length} reference families</h3><p>Source metadata checked {catalog.verificationDate}. Each entry states its purpose and limits.</p></header>
      {catalog.entries.map((entry) => <details key={entry.id} className="shared-reference-entry">
        <summary>{entry.title}<span>{entry.publisher} · {entry.dataNature}</span></summary>
        <p>{entry.purpose}</p><p>{entry.notes}</p>
        <small>{entry.edition} · checked {entry.verificationDate}</small>
        <a href={entry.urls[0]} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={12} aria-hidden="true" /></a>
      </details>)}
    </section>
  );
}
