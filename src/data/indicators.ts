import { PHYSICAL_RANGES } from "./ranges";
import { indicatorTypes } from "./indicator-contract";
/**
 * Indicators the crew member records, with input limits and the personal
 * baseline (usual range). Baselines are illustrative for the demo crew member.
 */

export type IndicatorId =
  | "pulse"
  | "systolic"
  | "diastolic"
  | "respiration"
  | "spo2"
  | "oxygen"
  | "consciousness"
  | "temperature"
  | "glucose"
  | "sleep"
  | "mood"
  | "exercise"
  | "reaction";

export type Consciousness =
  "alert" | "newConfusion" | "voice" | "pain" | "unresponsive";
export type OxygenSupport = "air" | "oxygen";
export type ReadingValue = number | Consciousness | OxygenSupport;

interface BaseIndicator {
  id: IndicatorId;
  name: string;
  short: string;
  unit: string;
}

export interface NumericIndicator extends BaseIndicator {
  kind: "number";
  min: number;
  max: number;
  step: number;
  /** Personal usual range. Values outside it are Watch. */
  usual?: [number, number];
  /** Scale shown on the baseline ruler. */
  scale: [number, number];
}

export interface ChoiceIndicator extends BaseIndicator {
  kind: "choice";
  /** `short` is how the value reads in a figure (a tile, a card); `label` in a sentence or a form. */
  options: { value: Consciousness | OxygenSupport; label: string; short: string }[];
  usual?: Consciousness | OxygenSupport;
}

export type Indicator = NumericIndicator | ChoiceIndicator;

const definitions: Record<IndicatorId, Indicator> = {
  pulse: {
    id: "pulse",
    kind: "number",
    name: "Heart rate",
    short: "Pulse",
    unit: "bpm",
    min: 20,
    max: 250,
    step: 1,
    usual: [68, 80],
    scale: [40, 130],
  },
  systolic: {
    id: "systolic",
    kind: "number",
    name: "Systolic pressure",
    short: "Systolic",
    unit: "mmHg",
    min: 50,
    max: 260,
    step: 1,
    usual: [114, 126],
    scale: [80, 160],
  },
  diastolic: {
    id: "diastolic",
    kind: "number",
    name: "Diastolic pressure",
    short: "Diastolic",
    unit: "mmHg",
    min: 30,
    max: 180,
    step: 1,
    usual: [70, 82],
    scale: [40, 110],
  },
  respiration: {
    id: "respiration",
    kind: "number",
    name: "Respiratory rate",
    short: "Respiration",
    unit: "/min",
    min: 4,
    max: 60,
    step: 1,
    usual: [12, 16],
    scale: [6, 30],
  },
  spo2: {
    id: "spo2",
    kind: "number",
    name: "Oxygen saturation",
    short: "SpO₂",
    unit: "%",
    min: 50,
    max: 100,
    step: 1,
    usual: [96, 99],
    scale: [85, 100],
  },
  oxygen: {
    id: "oxygen",
    kind: "choice",
    name: "Air or oxygen",
    short: "Air / O₂",
    unit: "",
    options: [
      { value: "air", label: "Breathing cabin air", short: "Air" },
      { value: "oxygen", label: "On supplemental oxygen", short: "Oxygen" },
    ],
    usual: "air",
  },
  consciousness: {
    id: "consciousness",
    kind: "choice",
    name: "Consciousness",
    short: "ACVPU",
    unit: "",
    options: [
      { value: "alert", label: "Alert", short: "Alert" },
      { value: "newConfusion", label: "New confusion", short: "Confused" },
      { value: "voice", label: "Responds to voice", short: "Voice" },
      { value: "pain", label: "Responds to pain", short: "Pain" },
      { value: "unresponsive", label: "Unresponsive", short: "Unresponsive" },
    ],
    usual: "alert",
  },
  temperature: {
    id: "temperature",
    kind: "number",
    name: "Temperature",
    short: "Temp",
    unit: "°C",
    min: 30,
    max: 45,
    step: 0.1,
    usual: [36.3, 37.1],
    scale: [34, 40],
  },
  glucose: {
    id: "glucose",
    kind: "number",
    name: "Glucose",
    short: "Glucose",
    unit: "mg/dL",
    min: 20,
    max: 600,
    step: 1,
    usual: [72, 108],
    scale: [40, 200],
  },
  sleep: {
    id: "sleep",
    kind: "number",
    name: "Sleep",
    short: "Sleep",
    unit: "h",
    min: 0,
    max: 24,
    step: 0.25,
    usual: [6.5, 8.5],
    scale: [0, 12],
  },
  mood: {
    id: "mood",
    kind: "number",
    name: "Mood",
    short: "Mood",
    unit: "score",
    min: 1,
    max: 5,
    step: 1,
    scale: [1, 5],
  },
  reaction: {
    id: "reaction",
    kind: "number",
    name: "Reaction time",
    short: "Reaction",
    unit: "ms",
    min: 100,
    max: 5000,
    step: 1,
    scale: [100, 1000],
  },
  exercise: {
    id: "exercise",
    kind: "number",
    name: "Exercise completed",
    short: "Exercise",
    unit: "min",
    min: 0,
    max: 300,
    step: 5,
    usual: [60, 150],
    scale: [0, 180],
  },
};

/** How busy the nervous system looks at each ACVPU level, 1 when alert: new confusion is
 *  agitated, each lower level quieter. The 3D brain and the consciousness glyph both follow it. */
export const consciousnessActivity: Record<string, number> = {
  alert: 1,
  newConfusion: 1.9,
  voice: 0.55,
  pain: 0.35,
  unresponsive: 0.08,
};

/** The backend owns numeric units, limits and precision. Legacy usual bands remain for the old 3D mission ring only. */
export const indicators = Object.fromEntries(
  (Object.entries(definitions) as [IndicatorId, Indicator][]).map(
    ([id, definition]) => {
      const type = indicatorTypes[id];
      if (definition.kind !== "number" || !type) return [id, definition];
      const range = PHYSICAL_RANGES[type];
      return [
        id,
        {
          ...definition,
          min: range.min,
          max: range.max,
          unit: range.unit,
          step: 10 ** -range.decimals,
        },
      ];
    },
  ),
) as Record<IndicatorId, Indicator>;

/** The eight readings of the daily check-in, in the order the routine asks for them. */
export const dailyCheck: IndicatorId[] = [
  "pulse",
  "systolic",
  "respiration",
  "spo2",
  "temperature",
  "glucose",
  "sleep",
  "mood",
];

/** A reading as text: `short` for figures (Voice, Air), `label` for sentences (Responds to voice). */
export function formatValue(
  id: IndicatorId,
  v: ReadingValue | null | undefined,
  form: "short" | "label" = "short",
): string {
  if (v === null || v === undefined) return "—";
  const ind = indicators[id];
  if (ind.kind === "choice") {
    const option = ind.options.find((o) => o.value === v);
    return (form === "label" ? option?.label : option?.short) ?? String(v);
  }
  return id === "temperature" ? (v as number).toFixed(1) : String(v);
}
