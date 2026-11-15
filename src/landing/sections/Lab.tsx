import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { LAB_PATH } from '../../routes';

/** What the console shows, each tied to where it sits on the real screen (percent of the capture). */
const PARTS = [
  { id: 'twin', title: 'The body twin', body: 'Six systems, each coloured by the crew member’s own readings.', at: [49, 44] },
  { id: 'news', title: 'The early warning score', body: 'NEWS2, with the reading behind every point.', at: [88, 16] },
  { id: 'check', title: 'The daily check', body: 'Seven observations, guided one at a time.', at: [12, 82] },
  { id: 'emergency', title: 'Emergency', body: 'One press to a timed, guided protocol.', at: [94, 90] },
] as const;

/**
 * The real console, one screen. The list names what the crew uses most and each item marks its
 * place on the capture, so the screen reads as a tool rather than a picture.
 */
export function Lab() {
  const [active, setActive] = useState<(typeof PARTS)[number]['id']>('twin');
  return (
    <section className="lab" aria-labelledby="lab-title">
      <div className="wrap lab-grid">
        <div className="lab-copy">
          <h2 id="lab-title">The console the crew opens every day.</h2>
          <p>It runs in the browser with no connection and installs as an app on the station’s tablets.</p>
          <ol className="lab-parts">
            {PARTS.map((part, index) => (
              <li key={part.id} className={active === part.id ? 'is-on' : ''} onPointerEnter={() => setActive(part.id)}>
                <button type="button" onClick={() => setActive(part.id)} onFocus={() => setActive(part.id)} aria-pressed={active === part.id}>
                  <span className="lab-num">{String(index + 1).padStart(2, '0')}</span>
                  <span><b>{part.title}</b><small>{part.body}</small></span>
                </button>
              </li>
            ))}
          </ol>
          <a className="landing-cta is-primary" href={LAB_PATH}>Open the lab <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
        <a className="lab-frame" href={LAB_PATH} aria-label="Open the lab">
          <span className="lab-plate">
            <span className="lab-bar" aria-hidden="true"><span>VITRUVIO / Lab</span><span>Offline · on board</span></span>
            <span className="lab-shot">
              <img src="/landing/lab-console.jpg" alt="The VITRUVIO console: the 3D body twin with six body systems, the early warning card and the daily check-in." width={1400} height={840} loading="lazy" decoding="async" />
              {PARTS.map((part, index) => (
                <span key={part.id} className={`lab-mark ${active === part.id ? 'is-on' : ''}`} style={{ left: `${part.at[0]}%`, top: `${part.at[1]}%` }} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
              ))}
            </span>
          </span>
        </a>
      </div>
    </section>
  );
}
