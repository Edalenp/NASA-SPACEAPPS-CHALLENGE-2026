import { ORIGINAL_CREW_ID } from '../../store/crew';
import {
  indicators,
  type IndicatorId,
  type ReadingValue,
} from "../../data/indicators";
import { MISSION_DAY, type SystemId } from "../../data/mission";
import { PHYSICAL_RANGES, validateValue } from "../../data/ranges";
import type {
  ConsciousnessObservation,
  Measurement,
  MeasurementSource,
  ReactionSummary,
  ZoneId,
} from "../../engine";
import { normalizeGlucoseContext } from "../../engine";
import type { ConsoleEntry } from "../../store/db";

import { indicatorTypes } from "../../data/indicator-contract";
export { indicatorTypes } from "../../data/indicator-contract";
export const systemZones: Record<SystemId, ZoneId> = {
  head: "head",
  heart: "heartCirculation",
  lungs: "lungs",
  bones: "musculoskeletal",
  immune: "immuneMetabolic",
  sleep: "sleepMood",
};
export const newsParameters = [
  "respiration",
  "spo2",
  "oxygen",
  "systolic",
  "pulse",
  "consciousness",
  "temperature",
] as const;
export type RecordEntry = ConsoleEntry & {
  recordId: string;
  source: MeasurementSource | "legacy";
  /** Present for readings saved by the 60-second reaction test (RF-05). */
  reaction?: ReactionSummary;
  legacyScale?: boolean;
};
export const DAY_MS = 86400000;
export const dayKey = (timestamp: string) => timestamp.slice(0, 10);
export function missionDay(timestamp: string, start: string): number {
  return (
    Math.floor(
      (Date.parse(dayKey(timestamp)) - Date.parse(dayKey(start))) / DAY_MS,
    ) + 1
  );
}
export function defaultMissionStart(now: string): string {
  return new Date(
    Date.parse(dayKey(now)) - (MISSION_DAY - 1) * DAY_MS,
  ).toISOString();
}
export function emptyReadings(): Record<IndicatorId, ReadingValue | null> {
  return Object.fromEntries(
    Object.keys(indicators).map((id) => [id, null]),
  ) as Record<IndicatorId, ReadingValue | null>;
}
export function inputRules(id: IndicatorId) {
  const type = indicatorTypes[id];
  return type
    ? { ...PHYSICAL_RANGES[type], step: 10 ** -PHYSICAL_RANGES[type].decimals }
    : null;
}
export function validateReading(
  id: IndicatorId,
  value: ReadingValue,
): string | null {
  const ind = indicators[id];
  if (!ind) return "Unknown indicator.";
  if (ind.kind === "choice")
    return ind.options.some((o) => o.value === value)
      ? null
      : "Choose one of the listed observations.";
  if (typeof value !== "number") return "Enter a number.";
  const type = indicatorTypes[id];
  if (type) {
    const result = validateValue(type, value);
    return result.ok ? null : result.message;
  }
  return Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= ind.min &&
    value <= ind.max
    ? null
    : `Enter a whole number from ${ind.min} to ${ind.max} ${ind.unit}.`;
}
export function measurementEntry(m: Measurement): RecordEntry {
  const indicator = (Object.keys(indicatorTypes) as IndicatorId[]).find(
    (id) => indicatorTypes[id] === m.type,
  )!;
  return {
    indicator,
    value: m.value,
    timestamp: m.measuredAt,
    recordId: m.id,
    source: m.source,
    legacyScale: m.type === "mood" && m.value > PHYSICAL_RANGES.mood.max,
    ...(m.reaction ? { reaction: m.reaction } : {}),
    ...(m.type === "glucose" && m.glucoseContext
      ? { ctx: normalizeGlucoseContext(m.glucoseContext) }
      : {}),
  };
}
export function observationEntry(o: ConsciousnessObservation): RecordEntry {
  return {
    indicator: "consciousness",
    value: o.level,
    timestamp: o.observedAt,
    recordId: o.id,
    source: o.source,
  };
}
export function legacyId(e: ConsoleEntry): string {
  return `console-${e.id ?? `${e.indicator}-${e.timestamp}`}`;
}
export function legacyMeasurement(e: ConsoleEntry): Measurement | null {
  const type = indicatorTypes[e.indicator];
  // Main and the original console both use 1–5; import only valid original values.
  if (
    !type ||
    typeof e.value !== "number" ||
    validateReading(e.indicator, e.value)
  )
    return null;
  return {
    id: legacyId(e),
    crewMemberId: e.crewMemberId ?? ORIGINAL_CREW_ID,
    type,
    value: e.value,
    unit: PHYSICAL_RANGES[type].unit,
    measuredAt: e.timestamp,
    source: "manual",
    ...(type === "glucose" && e.ctx
      ? { glucoseContext: normalizeGlucoseContext(e.ctx) }
      : {}),
  };
}
export function timeline(
  measurements: Measurement[],
  observations: ConsciousnessObservation[],
  legacy: ConsoleEntry[],
): RecordEntry[] {
  const canonical = [
    ...measurements.map(measurementEntry),
    ...observations.map(observationEntry),
  ];
  const ids = new Set(canonical.map((e) => e.recordId));
  return [
    ...canonical,
    ...legacy
      .filter((e) => !ids.has(legacyId(e)))
      .map((e) => ({
        ...e,
        ...(e.indicator === "glucose" && e.ctx
          ? { ctx: normalizeGlucoseContext(e.ctx) }
          : {}),
        recordId: legacyId(e),
        source: "manual" as const,
      })),
  ].sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) ||
      a.recordId.localeCompare(b.recordId),
  );
}
export function readingsAt(entries: RecordEntry[], now: string) {
  const readings = emptyReadings();
  const latest: Partial<Record<IndicatorId, RecordEntry>> = {};
  for (const e of entries) {
    if (
      e.timestamp > now ||
      dayKey(e.timestamp) !== dayKey(now) ||
      e.legacyScale ||
      validateReading(e.indicator, e.value)
    )
      continue;
    // A manual measurement takes precedence over demo data on the same mission day.
    if (
      latest[e.indicator]?.source !== "simulator" &&
      e.source === "simulator" &&
      latest[e.indicator]
    )
      continue;
    readings[e.indicator] = e.value;
    latest[e.indicator] = e;
  }
  return { readings, latest };
}
