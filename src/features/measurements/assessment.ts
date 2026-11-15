import {
  isOutsideBaseline,
  planEscalation,
  type Baseline,
  type ConsciousnessLevel,
  type Environment,
  type EnvironmentKind,
  type IndicatorType,
  type Measurement,
} from "../../engine";
import {
  isKnownGlucoseContext,
  normalizeGlucoseContext,
  sameGlucoseContext,
} from "../../engine";
import { indicators, type IndicatorId } from "../../data/indicators";
import {
  crew,
  environments,
  type EnvironmentId,
  type SystemId,
} from "../../data/mission";
import { PHYSICAL_RANGES } from "../../data/ranges";
import type { Deviation, Status } from "../../engine/status";
import { clinicalMessage, clinicalSeverity } from "../../engine/clinicalLimits";
import { buildAlert } from "../../store/alertBuilder";
import {
  indicatorTypes,
  newsParameters,
  readingsAt,
  systemZones,
  validateReading,
  type RecordEntry,
} from "./adapter";

const environmentKinds: Record<EnvironmentId, EnvironmentKind> = {
  transit: "spacecraft",
  station: "spaceStation",
  rover: "rover",
  base: "planetaryBase",
};

function engineMeasurement(
  id: IndicatorId,
  entry: RecordEntry,
): Measurement | null {
  const type = indicatorTypes[id];
  if (!type || typeof entry.value !== "number") return null;
  return {
    id: entry.recordId,
    crewMemberId: crew.code,
    type,
    value: entry.value,
    unit: PHYSICAL_RANGES[type].unit,
    measuredAt: entry.timestamp,
    // Legacy console rows were manual observations.
    source: entry.source === "legacy" ? "manual" : entry.source,
    ...(entry.reaction ? { reaction: entry.reaction } : {}),
    ...(id === "glucose" && entry.ctx
      ? { glucoseContext: normalizeGlucoseContext(entry.ctx) }
      : {}),
  };
}

export function assess(
  entries: RecordEntry[],
  now: string,
  environment: EnvironmentId,
) {
  const { readings, latest } = readingsAt(entries, now);

  const latestMeasurements: Partial<Record<IndicatorType, Measurement>> = {};
  const history: Partial<Record<IndicatorType, Measurement[]>> = {};
  const sampleCounts: Partial<Record<IndicatorId, number>> = {};
  const currentValues: Partial<Record<IndicatorType, number>> = {};

  for (const id of Object.keys(indicatorTypes) as IndicatorId[]) {
    const type = indicatorTypes[id]!;
    const current = latest[id];
    if (current) {
      const measurement = engineMeasurement(id, current);
      if (measurement) {
        latestMeasurements[type] = measurement;
        currentValues[type] = measurement.value;
      }
    }
    const cutoff = current?.timestamp ?? now;
    const prior = entries.filter(
      (e) =>
        e.indicator === id &&
        e.timestamp < cutoff &&
        (!current || e.recordId !== current.recordId) &&
        !e.legacyScale &&
        typeof e.value === "number" &&
        !validateReading(id, e.value) &&
        // A glucose baseline only compares readings drawn in the same context.
        (id !== "glucose" || sameGlucoseContext(e.ctx, current?.ctx)),
    );
    // Do not use future simulation points or mix demo history into a manual personal baseline.
    const filtered = prior.filter((e) =>
      current?.source === "simulator"
        ? e.source === "simulator"
        : e.source !== "simulator",
    );
    sampleCounts[id] = filtered.length;
    history[type] = filtered
      .map((e) => engineMeasurement(id, e))
      .filter((m): m is Measurement => m !== null);
  }

  // Anchor deadlines to the observations, not the ticking display clock.
  const assessmentTime =
    newsParameters.reduce(
      (timestamp, id) =>
        latest[id] && latest[id]!.timestamp > timestamp
          ? latest[id]!.timestamp
          : timestamp,
      "",
    ) || now;

  // One engine bridge for NEWS2, baselines, zones and the alert record.
  const snapshot = buildAlert({
    crewMemberId: crew.code,
    now: assessmentTime,
    latest: latestMeasurements,
    history,
    consciousness: (readings.consciousness ?? null) as ConsciousnessLevel | null,
    onSupplementalOxygen:
      readings.oxygen === null ? null : readings.oxygen === "oxygen",
  });

  const result = snapshot.news2;
  const zones = snapshot.alert.zones;
  const scores = {
    respiration: result.scores.respiratoryRate,
    spo2: result.scores.oxygenSaturation,
    oxygen: readings.oxygen === null ? null : result.scores.supplementalOxygen,
    systolic: result.scores.systolicBloodPressure,
    pulse: result.scores.heartRate,
    consciousness: result.scores.consciousness,
    temperature: result.scores.temperature,
  };
  const complete = result.isComplete;
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
  for (const id of Object.keys(indicatorTypes) as IndicatorId[]) {
    const type = indicatorTypes[id]!;
    const baseline = snapshot.baselines[type];
    if (baseline) baselines[id] = baseline;
  }
  const deviations = {} as Record<IndicatorId, Deviation>;
  for (const id of Object.keys(indicators) as IndicatorId[]) {
    const entry = latest[id];
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
    // The engine's absolute clinical limits (AHA, ADA, NHLBI…) mark a reading the same way they
    // mark its zone, so a red system always has a red reading behind it.
    const type = indicatorTypes[id];
    const context = id === "glucose" ? entry?.ctx : undefined;
    const clinical =
      typeof value === "number" && type
        ? clinicalSeverity(type, value, context)
        : null;
    const clinicalText =
      clinical && type
        ? clinicalMessage(type, value as number, context)
        : null;
    const contextNeeded =
      id === "glucose" && !isKnownGlucoseContext(context);
    const contextNote =
      id === "glucose" && !isKnownGlucoseContext(context)
        ? " · glucose context unknown"
        : "";
    const status: Status =
      value === null
        ? "missing"
        : paramScore === 3 || clinical === "alert"
          ? "alert"
          : outside || (paramScore ?? 0) > 0 || clinical === "watch"
            ? "watch"
            : baseline || paramScore === 0
              ? "normal"
              : "missing";
    const text =
      value === null
        ? "Not measured today"
        : clinicalText
          ? clinicalText
          : outside
            ? `${Math.abs(delta).toFixed(1)} ${indicators[id].unit} ${delta > 0 ? "above" : "below"} personal observed history${contextNote}`
            : baseline
              ? `Within your personal observed history${contextNote}`
              : paramScore !== null
                ? paramScore === 0
                  ? "Within NEWS2 range"
                  : `NEWS2 scores this reading ${paramScore}`
                : contextNeeded
                  ? "Context needed · glucose timing and specimen"
                  : indicatorTypes[id]
                    ? `Insufficient data · ${sampleCounts[id] ?? 0}/7 prior readings`
                    : "No personal baseline or clinical reference";
    deviations[id] = { status, delta, text };
  }
  const indicatorIdByType = new Map<IndicatorType, IndicatorId>();
  for (const [indicatorId, type] of Object.entries(indicatorTypes)) {
    if (type) indicatorIdByType.set(type, indicatorId as IndicatorId);
  }
  const states = {} as Record<SystemId, Status>;
  for (const id of Object.keys(systemZones) as SystemId[]) {
    const zone = zones[systemZones[id]];
    const evidenceIds: IndicatorId[] =
      id === "head"
        ? ["consciousness"]
        : zone.indicators
            .map((type) => indicatorIdByType.get(type))
            .filter((value): value is IndicatorId => value !== undefined);
    const measured =
      id === "head"
        ? readings.consciousness !== null
        : zone.indicators.some((type) => currentValues[type] !== undefined);
    if (!measured) {
      states[id] = "missing";
    } else if (zone.state === "alert") {
      states[id] = "alert";
    } else if (zone.state === "attention") {
      states[id] = "watch";
    } else {
      // A raw normal zone means no finding, not a health claim. Require a normal
      // NEWS2 or personal-baseline reading before calling the system normal.
      states[id] = evidenceIds.some(
        (indicatorId) => deviations[indicatorId]?.status === "normal",
      )
        ? "normal"
        : "missing";
    }
  }
  const counts = { normal: 0, watch: 0, alert: 0, missing: 0 };
  Object.values(states).forEach((state) => counts[state]++);
  const env = environments[environment];
  const backendEnvironment: Environment = {
    id: environment,
    kind: environmentKinds[environment],
    name: env.name,
    communicationDelayMinutes: env.delayMin,
  };
  const plan = planEscalation(
    snapshot.alert,
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
