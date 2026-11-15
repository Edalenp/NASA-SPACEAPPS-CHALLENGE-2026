import { useState, type FormEvent } from "react";
import { Clock } from "lucide-react";
import { formatValue, indicators } from "../../data/indicators";
import {
  recommendSleep,
  type ActivityKind,
  type SleepRecommendation,
} from "../../engine";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { dayKey, missionDay } from "../measurements/adapter";
import { statusLabel } from "../../engine/status";
import { checkSequence } from "./checkSequence";
import { GuidedDailyCheck } from "./GuidedDailyCheck";
import "./guided-check.css";
import { StateMark } from "../../ui/StateMark";

export function RoutinePanel() {
  const now = useMission((s) => s.now);
  const start = useMission((s) => s.missionStart);
  return (
    <div className="measurement-panel">
      <p className="dialog-copy">
        Mission day {missionDay(now, start)} · {dayKey(now)} UTC
      </p>
      <GuidedDailyCheck readings={<DailyReadings />} rest={<RestPlanner />} />
    </div>
  );
}

/** Every daily reading with its latest value, in two columns so the list fits beside the check. */
function DailyReadings() {
  const { readings, latest, deviations } = useAssessment();
  const open = useMission((s) => s.open);
  // The counts live in the check column beside this list, so the list carries values only.
  return (
    <ul className="checklist">
      {checkSequence.map((id) => (
        <li key={id}>
          <button
            type="button"
            onClick={() => open("record", { recordFor: id })}
          >
            <StateMark status={deviations[id].status} label={false} />
            <b title={indicators[id].name}>
              {indicators[id].name}
              <small>{statusLabel[deviations[id].status]}</small>
            </b>
            <span>
              {readings[id] === null
                ? "Pending"
                : `${formatValue(id, readings[id])} ${indicators[id].unit}`}
              <small>
                {latest[id]?.source === "simulator"
                  ? `Simulation · ${latest[id]!.timestamp.slice(11, 16)} UTC`
                  : latest[id]
                    ? `${latest[id]!.timestamp.slice(11, 16)} UTC`
                    : "Due today"}
              </small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RestPlanner() {
  const { readings } = useAssessment();
  const [sleep, setSleep] = useState(String(readings.sleep ?? ""));
  const [minutes, setMinutes] = useState("");
  const [activity, setActivity] = useState<ActivityKind>("rest");
  const [result, setResult] = useState<SleepRecommendation | null>(null);
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const h = Number(sleep),
      m = Number(minutes);
    if (
      sleep.trim() === "" ||
      minutes.trim() === "" ||
      !Number.isFinite(h) ||
      h < 0 ||
      h > 24 ||
      !Number.isFinite(m) ||
      m < 0 ||
      m > 1440
    ) {
      setError(
        "Enter 0–24 hours of sleep and 0–1440 minutes until your next task.",
      );
      setResult(null);
      return;
    }
    setError("");
    setResult(recommendSleep(h, m, activity));
  }
  return (
    <section className="sleep-planner" aria-labelledby="sleep-heading">
      <span className="micro">Routine / rest window</span>
      <h3 id="sleep-heading">Plan your next rest.</h3>
      <p>Enter sleep across the last 24 hours and your next task window.</p>
      <form
        onSubmit={submit}
        className="form"
        noValidate
        onChange={() => {
          setResult(null);
          setError("");
        }}
      >
        <div className="rest-fields">
          <label htmlFor="sleep-hours">
            Sleep, last 24 h / h
            <input
              id="sleep-hours"
              type="number"
              min="0"
              max="24"
              step="0.1"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
            />
          </label>
          <label htmlFor="next-task">
            Until next task / min
            <input
              id="next-task"
              type="number"
              min="0"
              max="1440"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label htmlFor="activity">
            Current activity
            <select
              id="activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityKind)}
            >
              {(["sleep", "rest", "work", "exercise", "eva"] as const).map(
                (a) => (
                  <option key={a} value={a}>
                    {a === "eva" ? "EVA" : a}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-outline">
          <Clock size={14} aria-hidden="true" /> Check rest window
        </button>
      </form>
      <div role="status">
        {result && (
          <p className="rest-result" data-reason={result.kind === "none" ? result.reason ?? "" : undefined}>
            {result.kind === "fullSleep"
              ? `Full sleep window · target ${result.targetHours} h total in 24 h, not ${result.targetHours} h additional.`
              : result.kind === "nap"
                ? `Nap recommendation · ${result.minutes} min.`
                : result.reason === "insufficient-window"
                  ? "No rest recommendation: insufficient window for a 90-minute nap. This does not mean you are well rested."
                  : result.reason === "goal-met"
                    ? "No additional rest recommendation: the 7 h daily target is already met."
                    : result.reason === "already-sleeping"
                      ? "No additional rest recommendation while a sleep period is in progress."
                      : "No rest recommendation for these inputs."}
          </p>
        )}
      </div>
      <p className="dialog-fine">
        Prototype planning suggestion from the mission engine. The 7 h target is
        total sleep in 24 h, not 7 h in addition to sleep already taken. Follow
        approved onboard procedures. These planning inputs do not save a sleep
        measurement.
      </p>
    </section>
  );
}
