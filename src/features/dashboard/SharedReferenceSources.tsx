import { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getReferenceCatalog } from '../../data/nasa/reference';
import './shared-references.css';

/**
 * The data team's catalog, loaded on demand through its public, validated getter. A list beside
 * one open entry keeps the dialog horizontal: choosing an entry swaps the detail, nothing expands.
 */
export default function SharedReferenceSources() {
  const catalog = useMemo(() => getReferenceCatalog(), []);
  const [active, setActive] = useState(catalog.entries[0]?.id);
  const entry = catalog.entries.find((item) => item.id === active) ?? catalog.entries[0];
  return (
    <section className="shared-reference-sources" aria-label="Shared NASA reference catalog">
      <header>
        <span className="micro">Shared reference catalog · {catalog.entries.length} families</span>
        <p>Source metadata checked {catalog.verificationDate}. Each entry states its purpose and limits.</p>
      </header>
      <div className="shared-reference-browser">
        <ul className="shared-reference-list">
          {catalog.entries.map((item) => (
            <li key={item.id}>
              <button type="button" title={item.title} aria-pressed={item.id === entry?.id} onClick={() => setActive(item.id)}>
                {item.title}
              </button>
            </li>
          ))}
        </ul>
        {entry && (
          <article className="shared-reference-entry" aria-live="polite">
            <span className="micro">{entry.publisher} · {entry.dataNature}</span>
            <h4>{entry.title}</h4>
            <p>{entry.purpose}</p>
            <p>{entry.notes}</p>
            <small>{entry.edition} · checked {entry.verificationDate}</small>
            {entry.urls[0] && (
              <a href={entry.urls[0]} target="_blank" rel="noreferrer">
                Open source <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            )}
          </article>
        )}
      </div>
    </section>
  );
}
