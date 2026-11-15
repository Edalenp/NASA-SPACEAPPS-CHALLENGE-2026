import { ArrowUpRight } from 'lucide-react';
import table from '../../engine/news2-scoring.json';
import './news2-limits.css';

const NEWS2_LIMITS: readonly string[] = table.limits;
const RCP_URL = 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/';
const RCP_GUIDANCE = 'https://www.rcp.ac.uk/media/umzn4ntq/news2_additional-guidance-002-_0.pdf';

/**
 * Who NEWS2 does not apply to and how far to trust it, straight from the engine's scoring table
 * (RCP 2017). Store-independent, so the NEWS2 panel, the sources panel and emergency can share it.
 */
export function News2Limits({ open = false }: { open?: boolean }) {
  return (
    <details className="news2-limits" open={open}>
      <summary>
        <span className="micro">NEWS2 exclusions and limits · {NEWS2_LIMITS.length}</span>
      </summary>
      <ul>
        {NEWS2_LIMITS.map((limit) => <li key={limit}>{limit}</li>)}
      </ul>
      <p>
        Paraphrased from the RCP report and chart; scoring bands are unaltered. SpO₂ uses Scale 1:
        Scale 2 needs a clinician-set target of 88–92 %.{' '}
        <a href={RCP_URL} target="_blank" rel="noreferrer">RCP · NEWS2 <ArrowUpRight size={10} aria-hidden="true" /></a>{' '}
        <a href={RCP_GUIDANCE} target="_blank" rel="noreferrer">Additional guidance <ArrowUpRight size={10} aria-hidden="true" /></a>
      </p>
    </details>
  );
}
