import {
  indicators,
  formatValue,
  type IndicatorId,
} from "../../data/indicators";
import { crew, environments, formatDelay } from "../../data/mission";
import { missionDay } from "./adapter";
import type { assess } from "./assessment";

// Y can supply persisted protocol actions without changing the measurement schema.
export interface ReportAction {
  timestamp: string;
  text: string;
  source?: string;
}
export function buildReport(
  assessment: ReturnType<typeof assess>,
  context: {
    now: string;
    missionStart: string;
    environment: keyof typeof environments;
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
    "",
    "CURRENT DAY READINGS",
    ...(Object.keys(indicators) as IndicatorId[]).map((id) => {
      const e = latest[id],
        base = baselines[id];
      return `${indicators[id].name}: ${formatValue(id, readings[id])} ${readings[id] === null ? "" : indicators[id].unit} | measured: ${e?.timestamp ?? "not measured today"} | source: ${e?.source ?? "none"} | baseline: ${base ? `${base.lower.toFixed(1)}–${base.upper.toFixed(1)} (${base.sampleCount} prior readings)` : "insufficient data / not applicable"}`;
    }),
    "",
    "ESCALATION PLAN",
    ...(assessment.plan.steps.length
      ? assessment.plan.steps.map(
          (s) => `${s.contactRole}: ${s.dueAt} UTC (engine schedule)`,
        )
      : ["No scheduled contacts returned by the engine for this assessment."]),
    "",
    "RECORDED ACTIONS",
    ...(actions.length
      ? actions.map(
          (a) =>
            `${a.timestamp} | ${a.text}${a.source ? ` | ${a.source}` : ""}`,
        )
      : [
          "No protocol actions supplied. This does not mean no action was taken.",
        ]),
    "",
    "Prototype, not medical advice. Sources are labelled per reading. Simulated readings are illustrative, not NASA observations.",
    "NEWS2 © Royal College of Physicians 2017. Validated on Earth, not for spaceflight.",
  ].join("\n");
}
