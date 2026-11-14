import type { Escalation } from '../../engine/consoleNews2';
import { formatDelay } from '../../data/mission';

/** The "who to tell" ladder, driven by the NEWS2 triggers and the Earth delay. */
export function ladder(delayMin: number): { id: Escalation; range: string; who: string; detail: string }[] {
  const roundTrip = delayMin < 0.05 ? 'seconds' : formatDelay(delayMin * 2);
  return [
    { id: 'self', range: '0–4', who: 'You.', detail: 'Measure again every 4 to 6 hours.' },
    { id: 'cmo', range: '5–6 or a 3', who: 'Crew Medical Officer,', detail: 'urgently. Measure every hour.' },
    { id: 'surgeon', range: '7+', who: 'CMO and flight surgeon.', detail: `Act on board first: an answer from Earth takes ${roundTrip}.` },
  ];
}
