import { describe, expect, it } from "vitest";
import { crew } from "../../data/mission";
import {
  beginCase,
  answerCase,
  abortCase,
  attachAssessment,
  confirmContact,
} from "../emergency/workflow";
import {
  assessEmergencyReadings,
  consoleEvidence,
  toEngineEnvironment,
} from "../emergency/assessment";
import { emptyReadings } from "./adapter";
import { assess } from "./assessment";
import { buildReport } from "./report";
import { emergencyActionsForReport } from "./emergencyActions";

const start = "2026-11-14T10:00:00.000Z";
const confirmed = "2026-11-14T10:00:05.000Z";
const now = "2026-11-14T15:00:00.000Z";
const environment = {
  id: "transit",
  name: "Transit vehicle",
  communicationDelayMinutes: 11.7,
};
const caseFor = (id = "case-1", patient = crew.code) =>
  beginCase("chest", patient, environment, start, id);
const answered = (id = "case-1", patient = crew.code) =>
  answerCase(caseFor(id, patient), 0, 0, confirmed);

describe("emergency confirmations in the mission brief", () => {
  it("includes confirmed steps with their patient, case, answer, time and source", () => {
    const actions = emergencyActionsForReport([answered()], crew.code, now);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      caseId: "case-1",
      caseTitle: "Chest pain",
      timestamp: confirmed,
    });
    expect(actions[0].text).toContain("User confirmed:");
    expect(actions[0].text).toContain("Response:");
    expect(actions[0].source).toContain("https://");
  });
  it("does not export a pending instruction or an unassigned/other-patient case", () => {
    expect(
      emergencyActionsForReport(
        [
          caseFor(),
          answered("other", "other-patient"),
          answered("unassigned", "unassigned"),
        ],
        crew.code,
        now,
      ),
    ).toEqual([]);
  });
  it("filters by confirmation date, retaining a case that crosses midnight", () => {
    const previous = beginCase(
      "chest",
      crew.code,
      environment,
      "2026-11-13T23:59:00.000Z",
      "overnight",
    );
    const today = answerCase(previous, 0, 0, confirmed);
    const yesterday = answerCase(previous, 0, 0, "2026-11-13T23:59:10.000Z");
    expect(emergencyActionsForReport([today], crew.code, now)).toHaveLength(1);
    expect(emergencyActionsForReport([yesterday], crew.code, now)).toEqual([]);
    expect(emergencyActionsForReport([today], crew.code, start)).toEqual([]);
  });
  it("preserves confirmations in ended-early cases without marking pending steps done", () => {
    const ended = abortCase(answered(), "2026-11-14T10:00:10.000Z");
    const actions = emergencyActionsForReport([ended], crew.code, now);
    expect(actions).toHaveLength(1);
    expect(actions[0].caseStatus).toBe("aborted");
    expect(ended.execution.steps.at(-1)?.state).toBe("pending");
  });
  it("retains separate cases at the same instant and does not mutate the journal", () => {
    const sessions = [answered("case-2"), answered("case-1")];
    const original = JSON.stringify(sessions);
    expect(
      emergencyActionsForReport(sessions, crew.code, now).map((a) => a.caseId),
    ).toEqual(["case-1", "case-2"]);
    expect(JSON.stringify(sessions)).toBe(original);
  });
  it("includes actual notification confirmations, never scheduled contacts", () => {
    const readings = {
      ...emptyReadings(),
      pulse: 140,
      systolic: 80,
      respiration: 30,
      spo2: 90,
      temperature: 37,
      oxygen: "air" as const,
      consciousness: "alert" as const,
    };
    const latest = Object.fromEntries(
      Object.entries(readings)
        .filter(([, value]) => value !== null)
        .map(([id, value]) => [
          id,
          { value: value!, timestamp: start, source: "manual" as const },
        ]),
    );
    const evaluation = assessEmergencyReadings(
      { id: crew.code, name: crew.name },
      toEngineEnvironment(environment),
      consoleEvidence(readings, latest),
      start,
      "assessment-1",
    );
    const linked = attachAssessment(caseFor(), evaluation);
    expect(evaluation.plan?.steps).toHaveLength(2);
    expect(emergencyActionsForReport([linked], crew.code, now)).toEqual([]);
    const notified = confirmContact(linked, "medicalOfficer", confirmed);
    const actions = emergencyActionsForReport([notified], crew.code, now);
    expect(actions).toHaveLength(1);
    expect(actions[0].text).toContain("Crew Medical Officer");
    expect(actions[0].text).toContain("not a delivery confirmation");
  });
  it("exports the combined report with storage limitations and the current-day scope", () => {
    const text = buildReport(
      assess([], now, "transit"),
      {
        now,
        missionStart: "2026-10-04T00:00:00.000Z",
        environment: "transit",
        actionRecordNote: "Emergency confirmations are session-only.",
      },
      emergencyActionsForReport([answered()], crew.code, now),
    );
    expect(text).toContain("Case case-1: Chest pain");
    expect(text).toContain(confirmed);
    expect(text).toContain("session-only");
    expect(text).toContain("2026-11-14 UTC");
    expect(text).not.toContain("No confirmed actions available");
  });
});
