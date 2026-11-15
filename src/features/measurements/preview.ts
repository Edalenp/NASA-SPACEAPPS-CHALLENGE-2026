import { assess } from './assessment';
import { validateReading, type RecordEntry } from './adapter';
import type { IndicatorId, ReadingValue } from '../../data/indicators';
import type { EnvironmentId } from '../../data/mission';

/** A hypothetical assessment only. Never refreshes the store or writes a measurement. */
export function previewReading(entries: RecordEntry[], now: string, environment: EnvironmentId, id: IndicatorId, value: ReadingValue) {
  if (validateReading(id, value)) return null;
  const draft: RecordEntry = { recordId: 'unsaved-preview', indicator: id, value, timestamp: now, source: 'manual' };
  const result = assess([...entries, draft], now, environment);
  return { deviation: result.deviations[id], baseline: result.baselines[id], score: result.score.scores[id as keyof typeof result.score.scores] };
}
