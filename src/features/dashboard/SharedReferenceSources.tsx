import { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getProjectSources } from '../sources/catalog';
import './shared-references.css';

/**
 * One source browser for the console and the landing. Clinical citations are read from their
 * consumers; the NASA catalog still goes through its validated public getter.
 */
export default function SharedReferenceSources() {
  const entries = useMemo(() => getProjectSources(), []);
  const [active, setActive] = useState(entries[0]?.id);
  const entry = entries.find((item) => item.id === active) ?? entries[0];
  return (
    <section className="shared-reference-sources" aria-label="Project sources and resources">
      <header>
        <span className="micro">Sources and resources · {entries.length} groups</span>
        <p>Clinical references, research, assets and software used by VITRUVIO. DONKI, NOAA and NASA 3D Resources are catalog entries for future work; no live clients or assets from that catalog are used. External originals need a connection.</p>
      </header>
      <div className="shared-reference-browser">
        <ul className="shared-reference-list">
          {entries.map((item) => (
            <li key={item.id}>
              <button type="button" title={item.title} aria-pressed={item.id === entry?.id} onClick={() => setActive(item.id)}>
                {item.title}
              </button>
            </li>
          ))}
        </ul>
        {entry && (
          <article className="shared-reference-entry" aria-live="polite">
            <span className="micro">{entry.kind}</span>
            <h4>{entry.title}</h4>
            <p>{entry.purpose}</p>
            <p>{entry.note}</p>
            <ul className="shared-reference-links">{entry.links.map(source => <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={12} aria-hidden="true" /></a>
            </li>)}</ul>
          </article>
        )}
      </div>
    </section>
  );
}
