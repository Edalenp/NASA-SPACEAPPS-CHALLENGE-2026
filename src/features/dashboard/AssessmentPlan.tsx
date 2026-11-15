import { useAssessment } from "../../store/derived";
import { useMission } from "../../store/mission";
import { environments, formatDelay } from "../../data/mission";
import type { EscalationPlan, EscalationReason } from "../../engine/escalation";
import type { Assessment } from "../../store/healthStore";

const roles = {
  crewPartner: "Crew partner",
  medicalOfficer: "Crew Medical Officer",
  missionControl: "Mission control / flight surgeon",
};
const reasons: Record<EscalationReason, string> = {
  news2High: "NEWS2 high",
  news2Medium: "NEWS2 medium",
  singleRed: "One NEWS2 parameter scored 3",
  zoneAlert: "Clinical alert outside the NEWS2 total",
  zoneAttention: "Watch: clinical limit or personal range",
};
const clock = (iso: string) => `${iso.slice(0, 16).replace("T", " ")} UTC`;

export function AssessmentPlan({ assessment, plan }: {
  assessment?: Pick<Assessment, "plan" | "score">;
  plan?: EscalationPlan;
} = {}) {
  const stored = useAssessment();
  const snapshot = assessment ?? stored;
  const resolvedPlan = plan ?? snapshot.plan;
  const score = snapshot.score;
  const env = environments[useMission((s) => s.environment)];
  return (
    <div className="escalation-summary">
      <span className="micro">Who to tell / mission engine</span>
      {!score.complete && (
        <p>
          {resolvedPlan.steps.length
            ? "NEWS2 is incomplete, so this plan follows the readings already recorded. Complete the missing observations for a risk level."
            : "Complete the missing observations. An incomplete score cannot establish a risk level."}
        </p>
      )}
      {resolvedPlan.steps.length ? (
        <ol className="engine-plan">
          {resolvedPlan.steps.map((step, i) => (
            <li key={`${step.contactRole}-${i}`}>
              <b>{roles[step.contactRole]}</b>
              {step.channel && <> · {step.channel === "earth" ? "Earth link" : "aboard"}</>}
              <br />
              <time dateTime={step.dueAt}>{clock(step.dueAt)}</time>
              {step.earliestReplyAt && (
                <>
                  {" "}· earliest reply <time dateTime={step.earliestReplyAt}>{clock(step.earliestReplyAt)}</time>
                </>
              )}
              {step.reason && (
                <>
                  <br />
                  <small>{reasons[step.reason]}</small>
                </>
              )}
            </li>
          ))}
        </ol>
      ) : (
        score.complete && <p>Nothing to escalate: NEWS2 is low and every system is within its limits.</p>
      )}
      <p className="dialog-fine">
        Help aboard is never held for Earth: crew and the Crew Medical Officer
        are contacted on these times whatever the link. Earth round trip:{" "}
        {formatDelay(env.delayMin * 2)}. Concern about a crewmate overrides the score.
      </p>
    </div>
  );
}
