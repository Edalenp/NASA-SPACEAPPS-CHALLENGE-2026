/**
 * The tone the early warning card glows in: the worst news it carries, either the NEWS2 level or
 * a system outside its usual range. Shared so the crew portrait glows with the same state.
 */
export type WarningTone = 'calm' | 'good' | 'watch' | 'alert';

export function warningTone(score: { complete: boolean; escalation: string }, counts: { alert: number; watch: number }): WarningTone {
  if (!score.complete) return 'calm';
  if (score.escalation !== 'self' && score.escalation !== 'cmo') return 'alert';
  if (counts.alert) return 'alert';
  if (score.escalation === 'cmo' || counts.watch) return 'watch';
  return 'good';
}
