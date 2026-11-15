import type { Baseline } from '../../engine';
import type { IndicatorId } from '../../data/indicators';
import newsTable from '../../engine/news2-scoring.json';

export interface RangeReference {
  label: string;
  lower?: number;
  upper?: number;
  /** A one-sided recommendation or an example target, not a closed healthy interval. */
  marker?: number;
  context: string;
  source: string;
  url: string;
}
const vitalUrl = 'https://medlineplus.gov/ency/article/002341.htm';
const resting = { context: 'Healthy adults at rest on Earth. Not an astronaut-specific interval.', source: 'MedlinePlus · Vital signs (reviewed 2025)', url: vitalUrl };
/** Display references only. These never replace NEWS2 or the engine's personal assessment. Checked 2026-11-14. */
export const rangeReferences: Partial<Record<IndicatorId, RangeReference>> = {
  pulse: { ...resting, label: 'Resting adult reference', lower: 60, upper: 100 },
  systolic: { ...resting, label: 'Resting adult reference', lower: 90, upper: 120 },
  diastolic: { ...resting, label: 'Resting adult reference', lower: 60, upper: 80 },
  respiration: { ...resting, label: 'Resting adult reference', lower: 12, upper: 18 },
  temperature: { ...resting, label: 'Resting adult reference', lower: 36.5, upper: 37.3 },
  spo2: { label: 'General adult reference', lower: 95, upper: 100, context: 'General reference; lung disease and altitude can change expected values. NEWS2 uses Scale 1.', source: 'MedlinePlus · Pulse oximetry', url: 'https://medlineplus.gov/lab-tests/pulse-oximetry/' },
  glucose: { label: 'Fasting laboratory reference', lower: 70, upper: 99, context: 'Only for fasting blood glucose after at least 8 hours without food. Not a general after-meal or sensor interval.', source: 'MedlinePlus · Blood sugar test', url: 'https://medlineplus.gov/ency/article/003482.htm' },
  sleep: { label: 'Adult sleep recommendation ≥7 h', marker: 7, context: 'AASM/SRS recommends at least 7 hours regularly for adults 18–60. It does not define a universal upper limit.', source: 'AASM/SRS · Adult sleep duration consensus (2015)', url: 'https://aasm.org/resources/pdf/adultsleepdurationconsensus.pdf' },
  reaction: { label: 'Test-specific reference required', context: 'Reaction time depends on the task, device and outcome. The cited research concerns the 10-minute PVT; this generic input has no specified protocol, so no universal normal interval is drawn.', source: 'Sleep · Response speed measurements on the psychomotor vigilance test (2021)', url: 'https://pubmed.ncbi.nlm.nih.gov/32556295/' },
  exercise: { label: 'ISS example: about 120 min/day', marker: 120, context: 'NASA reports an ISS daily exercise average, not a clinical normal interval. Use your mission-prescribed schedule.', source: 'NASA · Astronaut exercise (2024)', url: 'https://www.nasa.gov/general/astronaut-exercise/' },
  mood: { label: 'Self-report scale · no clinical cutoff', context: 'This app records a single 1–5 self-report. It is not a validated multi-item mood instrument and has no academic normal band.', source: 'WHO · WHO-5 instrument context', url: 'https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01' },
};
export const newsReferenceUrl = 'https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/';
interface ScoreBand { min?: number; max?: number; score: number }
const scoreBands: Partial<Record<IndicatorId, readonly ScoreBand[]>> = {
  pulse: newsTable.parameters.pulse,
  systolic: newsTable.parameters.systolicBloodPressure,
  respiration: newsTable.parameters.respirationRate,
  spo2: newsTable.parameters.spo2Scale1,
  temperature: newsTable.parameters.temperature,
};
/** Draw the engine's own published NEWS2 bands. Half a valid input step joins adjacent intervals visually. */
export function referenceScoreBands(id: IndicatorId, min: number, max: number, step: number) {
  return (scoreBands[id] ?? []).map((band) => ({
    lower: Math.max(min, band.min === undefined ? min : band.min - step / 2),
    upper: Math.min(max, band.max === undefined ? max : band.max + step / 2),
    score: band.score,
  })).filter((band) => band.upper > band.lower);
}

/** Green/amber comparisons are descriptive; red appears only where the clinical engine defines it. */
export function comparisonSegments(id: IndicatorId, min: number, max: number, step: number, baseline?: Baseline) {
  const news = referenceScoreBands(id, min, max, step);
  if (news.length) return { kind: 'news2', segments: news.map((band) => ({ ...band, tone: band.score === 0 ? 'normal' : band.score === 3 ? 'alert' : 'watch' })) };
  const validPersonal = baseline && baseline.lower >= min && baseline.upper <= max && baseline.upper >= baseline.lower;
  const ref = rangeReferences[id];
  const bounds = validPersonal ? [baseline.lower, baseline.upper] : id === 'diastolic' && ref?.lower !== undefined && ref.upper !== undefined ? [ref.lower, ref.upper] : null;
  if (!bounds) return { kind: 'none', segments: [] };
  return { kind: validPersonal ? 'personal' : 'reference', segments: [
    { lower: min, upper: bounds[0], tone: 'watch', score: 1 },
    { lower: bounds[0], upper: bounds[1], tone: 'normal', score: 0 },
    { lower: bounds[1], upper: max, tone: 'watch', score: 1 },
  ].filter((band) => band.upper > band.lower) };
}
