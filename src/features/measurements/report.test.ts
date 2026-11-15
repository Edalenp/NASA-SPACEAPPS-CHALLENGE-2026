import { describe, expect, it } from "vitest";
import { indicators, type IndicatorId } from "../../data/indicators";
import { crew, environments, formatDelay } from "../../data/mission";
import { missionDay, type RecordEntry } from "./adapter";
import { assess } from "./assessment";
import { buildReport, type ReportAction } from "./report";
import reportSource from "./report.ts?raw";

const now = "2026-11-14T15:00:00.000Z";
const later = "2026-11-14T16:00:00.000Z";
const missionStart = "2026-10-04T00:00:00.000Z";
const context: Parameters<typeof buildReport>[1] = {
  now,
  missionStart,
  environment: "transit",
};
const entry = (
  indicator: RecordEntry["indicator"],
  value: RecordEntry["value"],
  timestamp = now,
  source: RecordEntry["source"] = "manual",
): RecordEntry => ({
  indicator,
  value,
  timestamp,
  source,
  recordId: `${indicator}-${timestamp}-${source}`,
});
const normal = [
  entry("pulse", 70),
  entry("systolic", 120),
  entry("respiration", 16),
  entry("spo2", 98),
  entry("temperature", 37),
  entry("consciousness", "alert"),
  entry("oxygen", "air"),
];
const allIndicators = [
  ...normal,
  entry("diastolic", 80),
  entry("glucose", 90),
  entry("sleep", 7),
  entry("mood", 3),
  entry("reaction", 300),
  entry("exercise", 30),
];

function build(
  entries: RecordEntry[],
  actions: ReportAction[] = [],
  ctx: Parameters<typeof buildReport>[1] = context,
) {
  const assessment = assess(entries, ctx.now, ctx.environment);
  return { assessment, text: buildReport(assessment, ctx, actions) };
}

describe("mission brief report (RF25)", () => {
  it("renders all 16 current indicator IDs with canonical values and units", () => {
    const { text } = build(allIndicators);
    expect(Object.keys(indicators)).toHaveLength(16);
    for (const id of Object.keys(indicators) as IndicatorId[]) {
      expect(text, id).toContain(`${indicators[id].name}:`);
    }
    expect(text).toContain("Heart rate: 70 bpm");
    expect(text).toContain("Systolic pressure: 120 mmHg");
    expect(text).toContain("Diastolic pressure: 80 mmHg");
    expect(text).toContain("Respiratory rate: 16 breaths/min");
    expect(text).toContain("Oxygen saturation: 98 %");
    expect(text).toContain("Air or oxygen: Breathing cabin air");
    expect(text).toContain("Consciousness: Alert");
    expect(text).toContain("Temperature: 37.0 °C");
    expect(text).toContain("Glucose: 90 mg/dL");
    expect(text).toContain("Sleep: 7 h");
    expect(text).toContain("Mood: 3 score");
    expect(text).toContain("Reaction time: 300 ms");
    expect(text).toContain("Exercise completed: 30 min");
  });

  it("renders a complete NEWS2 zero as 0 / 20, not blank", () => {
    const { assessment, text } = build(normal);
    expect(assessment.score.complete).toBe(true);
    expect(assessment.score.total).toBe(0);
    expect(text).toContain("NEWS2: 0 / 20 · Low");
    expect(text).toContain("Heart rate: 70 bpm | measured:");
    expect(text).toContain("source: manual");
  });

  it("does not impute cabin air when oxygen is missing", () => {
    const { assessment, text } = build(normal.filter((item) => item.indicator !== "oxygen"));
    expect(assessment.score.complete).toBe(false);
    expect(assessment.score.measured).toBe(6);
    expect(assessment.score.total).toBe(0);
    expect(text).toContain("NEWS2: Incomplete · 6/7 observations; partial total 0 (not a complete risk assessment)");
    expect(text).toContain("Air or oxygen: —");
    expect(text).not.toContain("Air or oxygen: Breathing cabin air");
    expect(text).not.toContain("NEWS2: 0 / 20 · Low");
  });

  it("renders an empty day as incomplete, with no units assigned to missing values", () => {
    const { assessment, text } = build([]);
    expect(assessment.score.complete).toBe(false);
    expect(assessment.score.measured).toBe(0);
    expect(text).toContain("NEWS2: Incomplete · 0/7 observations; partial total 0 (not a complete risk assessment)");
    expect(text).toContain("Heart rate: —");
    expect(text).toContain("measured: not measured today | source: none");
    expect(text).not.toContain("Heart rate: — bpm");
    expect(text).not.toContain("NEWS2: 0 / 20 · Low");
  });

  it("keeps legitimate zero values and discards an invalid mood zero", () => {
    const { assessment, text } = build([entry("sleep", 0), entry("exercise", 0), entry("mood", 0)]);
    expect(assessment.readings.sleep).toBe(0);
    expect(assessment.readings.exercise).toBe(0);
    expect(assessment.readings.mood).toBeNull();
    expect(text).toContain("Sleep: 0 h");
    expect(text).toContain("Exercise completed: 0 min");
    expect(text).toContain("Mood: —");
    expect(text).not.toContain("Mood: 0 score");
  });

  it("uses generated now, per-reading timestamps and mission context", () => {
    const pulseAt = "2026-11-14T14:00:00.000Z";
    const temperatureAt = "2026-11-14T14:05:00.000Z";
    const entries = [
      ...normal.filter((item) => item.indicator !== "pulse" && item.indicator !== "temperature"),
      entry("pulse", 70, pulseAt),
      entry("temperature", 37, temperatureAt),
    ];
    const { text } = build(entries);
    expect(text).toContain(`Generated (UTC): ${now}`);
    expect(text).toContain(`Heart rate: 70 bpm | measured: ${pulseAt}`);
    expect(text).toContain(`Temperature: 37.0 °C | measured: ${temperatureAt}`);
    expect(text).toContain(`Mission day: ${missionDay(now, missionStart)} / 180`);
    expect(text).toContain(`Environment: ${environments.transit.name} · ${environments.transit.context}`);
    expect(text).toContain(`Earth delay: ${formatDelay(environments.transit.delayMin)} one way; ${formatDelay(environments.transit.delayMin * 2)} round trip (scenario).`);
  });

  it("prints the assess plan recipients and keeps deadlines anchored across display clocks", () => {
    const severe = normal.map((item) =>
      item.indicator === "respiration"
        ? { ...item, value: 30 }
        : item.indicator === "pulse"
          ? { ...item, value: 140 }
          : item.indicator === "systolic"
            ? { ...item, value: 85 }
            : item,
    );
    const early = assess(severe, now, "transit");
    const late = assess(severe, later, "transit");
    expect(late.plan).toEqual(early.plan);
    const earlyText = buildReport(early, context);
    const lateText = buildReport(late, { ...context, now: later });
    for (const step of early.plan.steps) {
      expect(earlyText).toContain(`${step.contactRole}: ${step.dueAt} UTC (engine schedule)`);
      expect(lateText).toContain(`${step.contactRole}: ${step.dueAt} UTC (engine schedule)`);
    }
  });

  it("renders caller actions in order with full and minimal fields without mutating input", () => {
    const actions: ReportAction[] = [
      { timestamp: "2026-11-14T15:01:00.000Z", text: "Synthetic applied action: record only, not physical care", source: "Source B" },
      { timestamp: "2026-11-14T15:02:00.000Z", text: "Synthetic applied action with case", caseId: "case-1", caseTitle: "Chest pain", caseStatus: "completed", source: "Source A" },
      { timestamp: "2026-11-14T15:03:00.000Z", text: "Minimal action" },
    ];
    const before = JSON.stringify(actions);
    const { text } = build(normal, actions);
    expect(text).toContain("2026-11-14T15:01:00.000Z | Synthetic applied action: record only, not physical care | Source B");
    expect(text).toContain("2026-11-14T15:02:00.000Z | Case case-1: Chest pain (completed) | Synthetic applied action with case | Source A");
    expect(text).toContain("2026-11-14T15:03:00.000Z | Minimal action");
    expect(text.indexOf("Synthetic applied action: record only")).toBeLessThan(text.indexOf("Synthetic applied action with case"));
    expect(text.indexOf("Synthetic applied action with case")).toBeLessThan(text.indexOf("Minimal action"));
    expect(JSON.stringify(actions)).toBe(before);
  });

  it("uses the conservative no-actions fallback and includes the caller note", () => {
    const { text } = build(normal, [], { ...context, actionRecordNote: "Emergency confirmations are session-only." });
    expect(text).toContain(`Scope: confirmations for ${crew.code} on 2026-11-14 UTC. Unassigned and other-patient cases are excluded.`);
    expect(text).toContain("Emergency confirmations are session-only.");
    expect(text).toContain("No confirmed actions available in this scope. This does not mean no action was taken.");
  });

  it("defaults actions to empty, returns deterministic text and leaves the assessment unchanged", () => {
    const assessment = assess(normal, now, "transit");
    const before = JSON.stringify(assessment);
    const first = buildReport(assessment, context);
    const second = buildReport(assessment, context);
    expect(typeof first).toBe("string");
    expect(second).toBe(first);
    expect(first).not.toContain("undefined");
    expect(JSON.stringify(assessment)).toBe(before);
  });

  it("uses the assess NEWS2 classification for a single abnormal pulse", () => {
    const abnormal = normal.map((item) => (item.indicator === "pulse" ? { ...item, value: 140 } : item));
    const { assessment, text } = build(abnormal);
    expect(assessment.score.complete).toBe(true);
    expect(assessment.score.singleRed).toBe(true);
    expect(text).toContain(`NEWS2: ${assessment.score.total} / 20 · ${assessment.score.risk}`);
  });

  it("has no network or broker hooks in the report source", () => {
    expect(reportSource).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/);
    expect(reportSource).not.toMatch(/callChrome|downloadBlob|navigator\./);
  });
});
