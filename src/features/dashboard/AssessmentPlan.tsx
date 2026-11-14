import { useAssessment } from "../../store/derived";
import { useMission } from "../../store/mission";
import { environments, formatDelay } from "../../data/mission";

const roles = {
  crewPartner: "Crew partner",
  medicalOfficer: "Crew Medical Officer",
  missionControl: "Mission control / flight surgeon",
};
export function AssessmentPlan() {
  const { plan, score } = useAssessment();
  const env = environments[useMission((s) => s.environment)];
  return (
    <div className="escalation-summary">
      <span className="micro">Who to tell / mission engine</span>
      {!score.complete && (
        <p>
          Complete the missing observations. An incomplete score cannot
          establish a risk level.
        </p>
      )}
      {plan.steps.length ? (
        <ol className="engine-plan">
          {plan.steps.map((step, i) => (
            <li key={`${step.contactRole}-${i}`}>
              <b>{roles[step.contactRole]}</b>
              <br />
              <time dateTime={step.dueAt}>
                {step.dueAt.slice(0, 16).replace("T", " ")} UTC
              </time>
            </li>
          ))}
        </ol>
      ) : (
        score.complete && <p>No scheduled contacts returned for this result.</p>
      )}
      <p className="dialog-fine">
        Earth round trip: {formatDelay(env.delayMin * 2)}. Times reflect the
        current engine’s schedule. Concern about a crewmate overrides the score.
      </p>
    </div>
  );
}
