import {
  calculateBaseline,
  calculateNews2,
  evaluateZones,
  isOutsideBaseline,
  planEscalation,
  type Baseline,
  type ConsciousnessLevel,
  type Environment,
  type IndicatorType,
} from "../../engine";
import { indicators, type IndicatorId } from "../../data/indicators";
import {
  crew,
  environments,
  type EnvironmentId,
  type SystemId,
} from "../../data/mission";
import type { Deviation, Status } from "../../engine/status";
import {
  indicatorTypes,
  newsParameters,
  readingsAt,
  systemZones,
  validateReading,
  type RecordEntry,
} from "./adapter";

export function assess(
  entries: RecordEntry[],
  now: string,
  environment: EnvironmentId,
) {
  const { readings, latest } = readingsAt(entries, now);
  const number = (id: IndicatorId) =>
    typeof readings[id] === "number" ? (readings[id] as number) : null;
  const result = calculateNews2({
    respiratoryRate: number("respiration"),
    oxygenSaturation: number("spo2"),
    onSupplementalOxygen: readings.oxygen === "oxygen",
    systolicBloodPressure: number("systolic"),
    heartRate: number("pulse"),
    temperature: number("temperature"),
    consciousness: readings.consciousness as ConsciousnessLevel | null,
  });
  const scores = {
    respiration: result.scores.respiratoryRate,
    spo2: result.scores.oxygenSaturation,
    oxygen: readings.oxygen === null ? null : result.scores.supplementalOxygen,
    systolic: result.scores.systolicBloodPressure,
    pulse: result.scores.heartRate,
    consciousness: result.scores.consciousness,
    temperature: result.scores.temperature,
  };
  // The engine requires a boolean oxygen flag. Missing observation must remain incomplete in the UI.
  const complete = result.isComplete && readings.oxygen !== null;
  const classification = complete ? result.classification : null;
  const risk = classification
    ? (
        {
          low: "Low",
          singleRed: "Low–medium",
          medium: "Medium",
          high: "High",
        } as const
      )[classification]
    : "Incomplete";
  const score = {
    total: result.total,
    scores,
    measured: newsParameters.filter((id) => readings[id] !== null).length,
    complete,
    classification,
    risk,
    singleRed: Object.values(result.scores).includes(3),
    // Retain the console result fields without inventing an interval absent from backend.
    monitoring: "Follow approved onboard monitoring procedures.",
    escalation: (classification === "high"
      ? "surgeon"
      : classification === "medium" || classification === "singleRed"
        ? "cmo"
        : "self") as "self" | "cmo" | "surgeon",
  };
  const baselines: Partial<Record<IndicatorId, Baseline>> = {};
  const sampleCounts: Partial<Record<IndicatorId, number>> = {};
  const backendBaselines: Partial<Record<IndicatorType, Baseline>> = {};
  const currentValues: Partial<Record<IndicatorType, number>> = {};
  for (const id of Object.keys(indicatorTypes) as IndicatorId[]) {
    const type = indicatorTypes[id]!;
    const cutoff = latest[id]?.timestamp ?? now;
    const prior = entries.filter(
      (e) =>
        e.indicator === id &&
        e.timestamp < cutoff &&
        !e.legacyScale &&
        typeof e.value === "number" &&
        !validateReading(id, e.value),
    );
    // Do not use future simulation points or mix demo history into a manual personal baseline.
    const history = prior.filter((e) =>
      latest[id]?.source === "simulator"
        ? e.source === "simulator"
        : e.source !== "simulator",
    );
    sampleCounts[id] = history.length;
    const baseline = calculateBaseline(history.map((e) => e.value as number));
    if (baseline) {
      baselines[id] = baseline;
      backendBaselines[type] = baseline;
    }
    if (number(id) !== null) currentValues[type] = number(id)!;
  }
  const zones = evaluateZones({
    news2: result,
    baselines: backendBaselines,
    currentValues,
  });
  const states = {} as Record<SystemId, Status>;
  for (const id of Object.keys(systemZones) as SystemId[]) {
    const zone = zones[systemZones[id]];
    const measured =
      id === "head"
        ? readings.consciousness !== null
        : zone.indicators.some((type) => currentValues[type] !== undefined);
    states[id] = !measured
      ? "missing"
      : zone.state === "attention"
        ? "watch"
        : zone.state;
  }
  const deviations = {} as Record<IndicatorId, Deviation>;
  for (const id of Object.keys(indicators) as IndicatorId[]) {
    const value = readings[id];
    const baseline = baselines[id];
    const paramScore = id in scores ? scores[id as keyof typeof scores] : null;
    const outside =
      typeof value === "number" &&
      baseline &&
      isOutsideBaseline(value, baseline);
    const delta =
      outside && baseline
        ? (value as number) < baseline.lower
          ? (value as number) - baseline.lower
          : (value as number) - baseline.upper
        : 0;
    const status: Status =
      value === null
        ? "missing"
        : paramScore === 3
          ? "alert"
          : outside || (paramScore ?? 0) > 0
            ? "watch"
            : "normal";
    const text =
      value === null
        ? "Not measured today"
        : outside
          ? `${Math.abs(delta).toFixed(1)} ${indicators[id].unit} ${delta > 0 ? "above" : "below"} personal range`
          : baseline
            ? "Within your personal range"
            : indicatorTypes[id]
              ? `Insufficient data · ${sampleCounts[id] ?? 0}/7 prior readings`
              : "Recorded today";
    deviations[id] = { status, delta, text };
  }
  const counts = { normal: 0, watch: 0, alert: 0, missing: 0 };
  Object.values(states).forEach((state) => counts[state]++);
  const env = environments[environment];
  const backendEnvironment: Environment = {
    id: environment,
    kind: (
      {
        transit: "spacecraft",
        station: "spaceStation",
        rover: "rover",
        base: "planetaryBase",
      } as const
    )[environment],
    name: env.name,
    communicationDelayMinutes: env.delayMin,
  };
  // Anchor deadlines to the observations, not the ticking display clock.
  const assessmentTime =
    newsParameters.reduce(
      (timestamp, id) =>
        latest[id] && latest[id]!.timestamp > timestamp
          ? latest[id]!.timestamp
          : timestamp,
      "",
    ) || now;
  const plan = planEscalation(
    {
      id: `assessment-${assessmentTime}`,
      crewMemberId: crew.code,
      createdAt: assessmentTime,
      news2Score: complete ? result.total : null,
      isComplete: complete,
      level: classification,
      consciousness: (readings.consciousness ?? "alert") as ConsciousnessLevel,
      zones,
    },
    backendEnvironment,
    assessmentTime,
  );
  return {
    score,
    states,
    counts,
    readings,
    latest,
    baselines,
    sampleCounts,
    deviations,
    zones,
    plan,
  };
}
