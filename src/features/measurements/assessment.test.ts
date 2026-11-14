import { describe, expect, it } from "vitest";
import { assess } from "./assessment";
import {
  dayKey,
  legacyMeasurement,
  readingsAt,
  timeline,
  validateReading,
  type RecordEntry,
} from "./adapter";
import { buildReport } from "./report";
const now = "2026-11-14T15:00:00.000Z";
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
describe("monitoring integration", () => {
  it("uses the backend respiration bands and keeps oxygen separate", () => {
    const a = assess(normal, now, "transit");
    expect(a.score.total).toBe(0);
    expect(a.score.complete).toBe(true);
    const b = assess(
      normal.map((e) =>
        e.indicator === "oxygen" ? { ...e, value: "oxygen" } : e,
      ),
      now,
      "transit",
    );
    expect(b.score.scores.spo2).toBe(0);
    expect(b.score.scores.oxygen).toBe(2);
    expect(b.score.total).toBe(2);
  });
  it("does not infer cabin air or report low risk when oxygen was not recorded", () => {
    const a = assess(
      normal.filter((e) => e.indicator !== "oxygen"),
      now,
      "transit",
    );
    expect(a.score.complete).toBe(false);
    expect(a.score.classification).toBeNull();
    expect(a.score.risk).toBe("Incomplete");
    expect(a.plan.steps).toEqual([]);
  });
  it("keeps escalation deadlines fixed while the display clock advances", () => {
    const severe = normal.map((e) =>
      e.indicator === "respiration"
        ? { ...e, value: 30 }
        : e.indicator === "pulse"
          ? { ...e, value: 140 }
          : e.indicator === "systolic"
            ? { ...e, value: 85 }
            : e,
    );
    const first = assess(severe, now, "transit");
    const later = assess(severe, "2026-11-14T16:00:00.000Z", "transit");
    expect(first.plan.steps).toHaveLength(2);
    expect(later.plan).toEqual(first.plan);
  });
  it("requires seven prior readings and excludes the evaluated reading", () => {
    const history = Array.from({ length: 7 }, (_, i) =>
      entry(
        "pulse",
        70,
        `2026-11-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`,
      ),
    );
    expect(
      assess([...history.slice(0, 6), entry("pulse", 80)], now, "transit")
        .baselines.pulse,
    ).toBeUndefined();
    const a = assess([...history, entry("pulse", 80)], now, "transit");
    expect(a.baselines.pulse).toMatchObject({ mean: 70, sampleCount: 7 });
    expect(a.states.heart).toBe("watch");
  });
  it("does not mix simulation into the manual baseline", () => {
    const history = Array.from({ length: 7 }, (_, i) =>
      entry(
        "pulse",
        70,
        `2026-11-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`,
        "simulator",
      ),
    );
    expect(
      assess([...history, entry("pulse", 90)], now, "transit").sampleCounts
        .pulse,
    ).toBe(0);
  });
  it("ignores previous days and future simulation and prefers manual data today", () => {
    const a = readingsAt(
      [
        entry("pulse", 75, "2026-11-13T15:00:00.000Z"),
        entry("pulse", 80, now),
        entry("pulse", 90, now, "simulator"),
        entry("glucose", 90, "2026-11-15T15:00:00.000Z", "simulator"),
      ],
      now,
    );
    expect(a.readings.pulse).toBe(80);
    expect(a.readings.glucose).toBeNull();
    expect(
      readingsAt([entry("pulse", 70)], "2026-11-15T00:00:00.000Z").readings
        .pulse,
    ).toBeNull();
  });
  it("maps backend zone states without declaring unmeasured zones normal", () => {
    const a = assess([entry("respiration", 26)], now, "base");
    expect(a.states.lungs).toBe("alert");
    expect(a.states.head).toBe("missing");
    expect(a.states.sleep).toBe("missing");
  });
  it("adopts backend validation including the new mood scale and precision", () => {
    expect(validateReading("mood", 5)).toBeNull();
    expect(validateReading("mood", 6)).toBeTruthy();
    expect(validateReading("pulse", 70.5)).toBeTruthy();
    expect(validateReading("sleep", 7.25)).toBeTruthy();
    expect(validateReading("consciousness", "air")).toBeTruthy();
  });
  it("imports original console mood on the latest backend scale", () => {
    const old = { id: 1, indicator: "mood" as const, value: 4, timestamp: now };
    expect(legacyMeasurement(old)).toMatchObject({ value: 4, type: "mood" });
    const rows = timeline([], [], [old]);
    expect(rows[0]).toMatchObject({ value: 4 });
    expect(readingsAt(rows, now).readings.mood).toBe(4);
  });
  it("deduplicates imported console rows by stable ID", () => {
    const old = {
      id: 2,
      indicator: "pulse" as const,
      value: 70,
      timestamp: now,
    };
    expect(timeline([legacyMeasurement(old)!], [], [old])).toHaveLength(1);
  });
  it("reports timestamps, source, incompleteness, mission context and supplied actions", () => {
    const text = buildReport(
      assess([entry("pulse", 70)], now, "base"),
      { now, missionStart: "2026-10-04T00:00:00.000Z", environment: "base" },
      [{ timestamp: now, text: "Contacted CMO" }],
    );
    expect(text).toContain("Incomplete");
    expect(text).toContain("Planetary base");
    expect(text).toContain(now);
    expect(text).toContain("source: manual");
    expect(text).toContain("Contacted CMO");
    expect(dayKey(now)).toBe("2026-11-14");
  });
});
