import {
  indicators,
  formatValue,
  type IndicatorId,
  type ReadingValue,
} from "../../data/indicators";
import { normalizeGlucoseContext } from "../../engine";
import { crew, environments, formatDelay } from "../../data/mission";
import { missionDay } from "./adapter";
import type { assess } from "./assessment";
import { clinicalBreaches, news2Note } from "../dashboard/cause";

// Y can supply persisted protocol actions without changing the measurement schema.
export interface ReportAction {
  timestamp: string;
  text: string;
  source?: string;
  caseId?: string;
  caseTitle?: string;
  caseStatus?: string;
}
export function buildReport(
  assessment: ReturnType<typeof assess>,
  context: {
    now: string;
    missionStart: string;
    environment: keyof typeof environments;
    actionRecordNote?: string;
  },
  actions: ReportAction[] = [],
) {
  const env = environments[context.environment];
  const { score, readings, latest, baselines } = assessment;
  return [
    "VITRUVIO / MISSION BRIEF",
    `Generated (UTC): ${context.now}`,
    `Crew member: ${crew.name} (${crew.code})`,
    `Mission day: ${missionDay(context.now, context.missionStart)} / 180`,
    `Environment: ${env.name} · ${env.context}`,
    `Earth delay: ${formatDelay(env.delayMin)} one way; ${formatDelay(env.delayMin * 2)} round trip (scenario).`,
    `NEWS2: ${score.complete ? `${score.total} / 20 · ${score.risk}` : `Incomplete · ${score.measured}/7 observations; partial total ${score.total} (not a complete risk assessment)`}`,
    // NEWS2 does not score every breach (a systolic of 200 mmHg scores 0), so the brief names them.
    ...clinicalLines(readings, latest),
    "",
    "CURRENT DAY READINGS",
    ...(Object.keys(indicators) as IndicatorId[]).map((id) => {
      const e = latest[id],
        base = baselines[id];
      const context = id === "glucose"
        ? ` | glucose context: ${glucoseContextLabel(e?.ctx)}`
        : "";
      return `${indicators[id].name}: ${formatValue(id, readings[id], "label")} ${readings[id] === null ? "" : indicators[id].unit} | measured: ${e?.timestamp ?? "not measured today"} | source: ${e?.source ?? "none"} | baseline: ${base ? `${base.lower.toFixed(1)}–${base.upper.toFixed(1)} (${base.sampleCount} prior readings)` : "insufficient data / not applicable"}${context}`;
    }),
    "",
    "ENGINE GUIDANCE (PROPOSED FOR MEDICAL REVIEW — NOT RECORDED CARE)",
    ...zoneGuidance(assessment),
    "",
    "ENGINE CONTACT PLAN (PROPOSED — NOT RECORDED CARE)",
    ...(assessment.plan.steps.length
      ? assessment.plan.steps.map(
          (s) =>
            `${s.contactRole}: ${s.dueAt} UTC (engine schedule)${s.channel ? ` · ${s.channel === "earth" ? "Earth link" : "aboard, no Earth delay"}` : ""}${s.earliestReplyAt ? ` · earliest reply ${s.earliestReplyAt} UTC` : ""}${s.reason ? ` · ${s.reason}` : ""}`,
        )
      : ["No scheduled contacts returned by the engine for this assessment."]),
    "",
    "RECORDED ACTIONS",
    `Scope: confirmations for ${crew.code} on ${context.now.slice(0, 10)} UTC. Unassigned and other-patient cases are excluded.`,
    ...(context.actionRecordNote ? [context.actionRecordNote] : []),
    ...(actions.length
      ? actions.map(
          (a) =>
            `${a.timestamp}${a.caseId ? ` | Case ${a.caseId}: ${a.caseTitle ?? ""} (${a.caseStatus ?? "unknown"})` : ""} | ${a.text}${a.source ? ` | ${a.source}` : ""}`,
        )
      : [
          "No confirmed actions available in this scope. This does not mean no action was taken.",
        ]),
    "",
    "Prototype, not medical advice. Sources are labelled per reading. Simulated readings are illustrative, not NASA observations.",
    "NEWS2 © Royal College of Physicians 2017. Validated on Earth, not for spaceflight.",
  ].join("\n");
}

function clinicalLines(readings: Record<IndicatorId, ReadingValue | null>, latest: ReturnType<typeof assess>["latest"]) {
  const breaches = clinicalBreaches(readings, latest);
  if (!breaches.length) return ["Clinical limits: none breached."];
  return [
    "CLINICAL LIMITS (cited absolute limits, separate from NEWS2; breaches add a CMO review to the plan)",
    ...breaches.map((b) => `${b.severity.toUpperCase()} · ${indicators[b.id].name} ${formatValue(b.id, readings[b.id], "label")} ${indicators[b.id].unit} · ${b.message} · ${news2Note(b)} · ${b.source}`),
  ];
}

function glucoseContextLabel(ctx: unknown) {
  const context = normalizeGlucoseContext(ctx);
  return context.timing === "unknown" || context.specimen === "unknown"
    ? "unknown"
    : `${context.timing} / ${context.specimen}`;
}

function zoneGuidance(assessment: ReturnType<typeof assess>) {
  const lines = Object.values(assessment.zones).flatMap((zone) =>
    zone.actions.map((action) =>
      `${zone.zoneId} · ${action.state ?? "attention"} · ${action.trigger ?? "clinical"} · ${action.indicator ?? "zone"} · ${action.text} · ${action.sourceTitle} — ${action.sourceUrl}`,
    ),
  );
  return lines.length ? lines : ["No engine zone actions returned for this snapshot."];
}
