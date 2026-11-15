import type { GlucoseContext } from '../../engine';
import { normalizeGlucoseContext } from '../../engine';
import { assess } from './assessment';
import { validateReading, type RecordEntry } from './adapter';
import type { IndicatorId, ReadingValue } from '../../data/indicators';
import type { EnvironmentId } from '../../data/mission';

/** A hypothetical assessment only. Never refreshes the store or writes a measurement. */
export function previewReading(
  entries: RecordEntry[],
  now: string,
  environment: EnvironmentId,
  id: IndicatorId,
  value: ReadingValue,
  ctx?: GlucoseContext,
) {
  if (validateReading(id, value)) return null;
  const draft: RecordEntry = {
    recordId: 'unsaved-preview',
    indicator: id,
    value,
    timestamp: now,
    source: 'manual',
    ...(id === 'glucose' ? { ctx: normalizeGlucoseContext(ctx) } : {}),
  };
  const assessment = assess([...entries, draft], now, environment);
  return {
    deviation: assessment.deviations[id],
    baseline: assessment.baselines[id],
    score: assessment.score.scores[id as keyof typeof assessment.score.scores],
    assessment,
  };
}
