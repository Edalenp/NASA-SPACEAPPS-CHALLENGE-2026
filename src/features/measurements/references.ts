import { normalizeGlucoseContext, type Baseline, type GlucoseContext } from '../../engine';
import type { IndicatorId } from '../../data/indicators';
import newsTable from '../../engine/news2-scoring.json';
import { CLINICAL_LIMITS, clinicalSeverity } from '../../engine/clinicalLimits';
import { indicatorTypes } from '../../data/indicator-contract';

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
  glucose: { label: 'Fasting laboratory population reference', lower: 70, upper: 99, context: 'Only for fasting blood glucose after at least 8 hours without food. Not a general after-meal or sensor interval.', source: 'MedlinePlus · Blood sugar test', url: 'https://medlineplus.gov/ency/article/003482.htm' },
  sleep: { label: 'Adult sleep recommendation ≥7 h', marker: 7, context: 'AASM/SRS recommends at least 7 hours regularly for adults 18–60. It does not define a universal upper limit.', source: 'AASM/SRS · Adult sleep duration consensus (2015)', url: 'https://aasm.org/resources/pdf/adultsleepdurationconsensus.pdf' },
  reaction: { label: 'Test-specific reference required', context: 'Reaction time depends on the task, device and outcome. The cited research concerns the 10-minute PVT; this generic input has no specified protocol, so no universal normal interval is drawn.', source: 'Sleep · Response speed measurements on the psychomotor vigilance test (2021)', url: 'https://pubmed.ncbi.nlm.nih.gov/32556295/' },
  exercise: { label: 'ISS example: about 120 min/day', marker: 120, context: 'NASA reports an ISS daily exercise average, not a clinical normal interval. Use your mission-prescribed schedule.', source: 'NASA · Astronaut exercise (2024)', url: 'https://www.nasa.gov/general/astronaut-exercise/' },
  calcium: { label: 'Adult laboratory reference', lower: 8.8, upper: 10.3, context: 'Total blood calcium. Ranges vary slightly between laboratories. The Inspiration4 band on the trend chart is a crew observation, not this interval.', source: 'MedlinePlus · Calcium blood test', url: 'https://medlineplus.gov/ency/article/003477.htm' },
  sodium: { label: 'Adult laboratory reference', lower: 135, upper: 145, context: 'Blood sodium, mmol/L (equal to mEq/L). Ranges vary slightly between laboratories.', source: 'MedlinePlus · Sodium blood test', url: 'https://medlineplus.gov/ency/article/003481.htm' },
  potassium: { label: 'Adult laboratory reference', lower: 3.7, upper: 5.2, context: 'Blood potassium, mmol/L (equal to mEq/L). Ranges vary slightly between laboratories.', source: 'MedlinePlus · Potassium test', url: 'https://medlineplus.gov/ency/article/003484.htm' },
  mood: { label: 'Self-report scale · no clinical cutoff', context: 'This app records a single 1–5 self-report. It is not a validated multi-item mood instrument and has no academic normal band.', source: 'WHO · WHO-5 instrument context', url: 'https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01' },
};

/** A glucose fasting reference only applies to fasting venous plasma; other draws keep it as information. */
export function referenceFor(id: IndicatorId, context?: GlucoseContext) {
  const reference = rangeReferences[id];
  if (!reference || id !== 'glucose') return reference;
  const normalized = normalizeGlucoseContext(context);
  if (normalized.timing === 'fasting' && normalized.specimen === 'venousPlasma') return reference;
  return {
    ...reference,
    label: `${reference.label} · not applicable to this context`,
    context: `${reference.context} Not applicable to the selected glucose draw context; population reference only.`,
  };
}
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

/** A personal range is drawn only while it fits the input's physical limits (mean ± 2 SD can spill past them). */
export function plausibleBaseline(baseline: Baseline | undefined, min: number, max: number): baseline is Baseline {
  return !!baseline && baseline.lower >= min && baseline.upper <= max && baseline.upper >= baseline.lower;
}

type Tone = 'normal' | 'watch' | 'alert';
interface Segment { lower: number; upper: number; tone: Tone; score: number }
const toneRank: Record<Tone, number> = { normal: 0, watch: 1, alert: 2 };

/** The engine's absolute clinical limits for a reading, as values where the colour may change. */
function clinicalEdges(id: IndicatorId) {
  const type = indicatorTypes[id];
  const rules = type ? CLINICAL_LIMITS[type]?.rules : undefined;
  return { type, edges: rules ? Object.values(rules).filter((value): value is number => typeof value === 'number') : [] };
}

/**
 * Re-cut segments at the clinical limits and give every piece the worse of its own tone and the
 * engine's clinical severity, so the slider never shows green where the assessment says alert.
 */
function withClinical(segments: Segment[], id: IndicatorId, min: number, max: number, context?: GlucoseContext): Segment[] {
  const { type, edges } = clinicalEdges(id);
  if (!type || !edges.length) return segments;
  const base = segments.length ? segments : [{ lower: min, upper: max, tone: 'normal' as Tone, score: 0 }];
  const cuts = [...new Set([...base.flatMap((s) => [s.lower, s.upper]), ...edges.filter((e) => e > min && e < max)])].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 1; i < cuts.length; i++) {
    const lower = cuts[i - 1];
    const upper = cuts[i];
    const mid = (lower + upper) / 2;
    const own = base.find((s) => mid >= s.lower && mid <= s.upper);
    if (!own) continue;
    const severity = clinicalSeverity(type, mid, context);
    const tone = severity && toneRank[severity] > toneRank[own.tone] ? severity : own.tone;
    const last = out.at(-1);
    if (last && last.tone === tone && last.upper === lower) last.upper = upper;
    else out.push({ lower, upper, tone, score: own.score });
  }
  return out;
}

/**
 * The slider's colours: NEWS2 points where NEWS2 scores the reading, otherwise the personal range
 * or the resting reference, and in every case the engine's absolute clinical limits on top.
 */
export function comparisonSegments(id: IndicatorId, min: number, max: number, step: number, baseline?: Baseline, context?: GlucoseContext) {
  const clinical = clinicalEdges(id).edges.length > 0;
  const news = referenceScoreBands(id, min, max, step);
  if (news.length) {
    const segments = news.map((band) => ({ ...band, tone: (band.score === 0 ? 'normal' : band.score === 3 ? 'alert' : 'watch') as Tone }));
    return { kind: 'news2', clinical, segments: withClinical(segments, id, min, max, context) };
  }
  const validPersonal = plausibleBaseline(baseline, min, max);
  const ref = rangeReferences[id];
  const bounds = validPersonal ? [baseline.lower, baseline.upper] : id === 'diastolic' && ref?.lower !== undefined && ref.upper !== undefined ? [ref.lower, ref.upper] : null;
  const segments: Segment[] = bounds ? [
    { lower: min, upper: bounds[0], tone: 'watch' as Tone, score: 1 },
    { lower: bounds[0], upper: bounds[1], tone: 'normal' as Tone, score: 0 },
    { lower: bounds[1], upper: max, tone: 'watch' as Tone, score: 1 },
  ].filter((band) => band.upper > band.lower) : [];
  if (!bounds && !clinical) return { kind: 'none', clinical, segments: [] };
  return { kind: bounds ? (validPersonal ? 'personal' : 'reference') : 'clinical', clinical, segments: withClinical(segments, id, min, max, context) };
}
