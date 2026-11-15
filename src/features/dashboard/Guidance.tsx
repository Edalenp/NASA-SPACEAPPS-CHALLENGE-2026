import type { Assessment } from "../../store/healthStore";
import { systems } from "../../data/mission";
import { systemZones } from "../measurements/adapter";
import { ZoneActions } from "../emergency/ZoneActions";
import { AssessmentPlan } from "./AssessmentPlan";

export type GuidanceSnapshot = Pick<Assessment, "zones" | "plan" | "score">;

/**
 * The engine's proposed guidance for one existing assessment snapshot. It reuses the
 * zone actions and contact plan verbatim; it never classifies or invents thresholds.
 */
export function Guidance({ assessment }: { assessment: GuidanceSnapshot }) {
  const zones = Object.values(assessment.zones).filter(
    (zone) => zone.state !== "normal" && zone.actions.length > 0,
  );
  if (!zones.length && !assessment.plan.steps.length) return null;
  return (
    <section className="guidance-section" aria-label="Engine guidance, proposed for medical review">
      <span className="micro">Engine guidance · proposed for review, not confirmed care</span>
      {zones.map((zone) => {
        const system = systems.find((item) => systemZones[item.id] === zone.zoneId);
        return (
          <div key={zone.zoneId} className="block">
            <h4>{system?.name ?? zone.zoneId}</h4>
            <ZoneActions zone={zone} />
          </div>
        );
      })}
      {assessment.plan.steps.length > 0 && (
        <AssessmentPlan assessment={{ plan: assessment.plan, score: assessment.score }} />
      )}
    </section>
  );
}
