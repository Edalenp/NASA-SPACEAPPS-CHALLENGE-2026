export const EVIDENCE_IDS = ['hrp', 'radiation', 'osd575', 'iss-kit'] as const;
export type EvidenceId = typeof EVIDENCE_IDS[number];
export function evidenceFromSearch(search: string): EvidenceId | null {
  const value = new URLSearchParams(search).get('evidence');
  return EVIDENCE_IDS.find(id => id === value) ?? null;
}
