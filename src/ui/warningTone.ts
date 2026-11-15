/**
 * The tone of the early warning card and of the NEWS2 panel: the NEWS2 level, nothing else, so the
 * card and the panel it opens always agree (low–medium is amber in both). A system outside its
 * limits shows its own state on the cause line inside the card; while one is off, a low NEWS2
 * stays neutral instead of green so the card never reads as "all clear".
 */
export type WarningTone = 'calm' | 'good' | 'watch' | 'alert';

export function warningTone(score: { complete: boolean; escalation: string }, counts: { alert: number; watch: number }): WarningTone {
  if (!score.complete) return 'calm';
  if (score.escalation === 'surgeon') return 'alert';
  if (score.escalation === 'cmo') return 'watch';
  return counts.alert || counts.watch ? 'calm' : 'good';
}
