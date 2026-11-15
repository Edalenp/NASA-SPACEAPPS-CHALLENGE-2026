import { useState, type FormEvent } from "react";
import { Clock } from "lucide-react";
import { formatValue, indicators } from "../../data/indicators";
import {
  assessFatigue, DEFAULT_FATIGUE_PARAMETERS, FATIGUE_SOURCE, ADULT_SLEEP_SOURCE,
  NASA_SLEEP_OPPORTUNITY_HOURS, NASA_PRE_SLEEP_HOURS, NASA_POST_SLEEP_HOURS,
  type ActivityKind, type FatigueAssessment, type FatigueSimulationParameters,
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
  const [sleep48, setSleep48] = useState("");
  const [awake, setAwake] = useState("");
  const [workload, setWorkload] = useState("");
  const [clock, setClock] = useState("");
  const [alignment, setAlignment] = useState<'unknown' | 'aligned' | 'shifted'>('unknown');
  const [minutes, setMinutes] = useState("");
  const [activity, setActivity] = useState<ActivityKind>("rest");
  const [parameters, setParameters] = useState<FatigueSimulationParameters>({ ...DEFAULT_FATIGUE_PARAMETERS });
  const [result, setResult] = useState<FatigueAssessment | null>(null);
  const [error, setError] = useState("");
  const optional = (value: string) => value.trim() === '' ? undefined : Number(value);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!sleep.trim() || !minutes.trim()) { setError('Enter sleep over 24 hours and the time until the next task.'); return; }
    const next = assessFatigue({ sleepLast24hHours: Number(sleep), sleepLast48hHours: optional(sleep48), awakeHours: optional(awake), workloadHoursLast24h: optional(workload), bodyClockHour: optional(clock), circadianAlignment: alignment, minutesUntilNextTask: Number(minutes), activity }, parameters);
    setResult(next);
    setError(next.error ?? '');
  }
  const fields = [
    ['sleep-hours', 'Sleep, last 24 h / h', sleep, setSleep, 24],
    ['sleep-48-hours', 'Sleep, last 48 h / h', sleep48, setSleep48, 48],
    ['awake-hours', 'Continuous time awake / h', awake, setAwake, 72],
    ['workload-hours', 'Workload, last 24 h / h', workload, setWorkload, 24],
    ['body-clock', 'Next task biological clock hour / 0–23', clock, setClock, 23.99],
    ['next-task', 'Until next task / min', minutes, setMinutes, 1440],
  ] as const;
  return <section className="sleep-planner" aria-labelledby="sleep-heading">
    <span className="micro">Routine / fatigue factors</span>
    <h3 id="sleep-heading">Review fatigue and the next task.</h3>
    <p>Use the astronaut’s actual sleep and work history. Enter biological clock time at the next task relative to their habitual sleep schedule, rather than mission UTC. Unknown values may remain blank.</p>
    <form onSubmit={submit} className="form" noValidate onChange={() => { setResult(null); setError(''); }}>
      <div className="rest-fields">
        {fields.map(([id, label, value, change, max]) => <label key={id} htmlFor={id}>{label}<input id={id} type="number" min="0" max={max} step="0.1" value={value} onChange={event => change(event.target.value)} /></label>)}
        <label htmlFor="circadian-alignment">Circadian alignment<select id="circadian-alignment" value={alignment} onChange={event => setAlignment(event.target.value as typeof alignment)}><option value="unknown">Unknown</option><option value="aligned">Aligned with habitual schedule</option><option value="shifted">Shifted / misaligned</option></select></label>
        <label htmlFor="activity">Current activity<select id="activity" value={activity} onChange={event => setActivity(event.target.value as ActivityKind)}>{(['sleep', 'rest', 'work', 'exercise', 'eva'] as const).map(value => <option key={value} value={value}>{value === 'eva' ? 'EVA' : value}</option>)}</select></label>
      </div>
      <details><summary>Simulation assumptions · configurable, not clinical thresholds</summary>
        <p className="dialog-fine">These engineering parameters expose the model’s assumptions. NASA does not prescribe these review markers or a recovery formula. The 90/240-minute defaults describe a nap scenario and reassessment horizon only.</p>
        <div className="rest-fields">{([
          ['sleepNeedHoursPerDay', 'Assumed sleep need / h per day', 24],
          ['awakeReviewHours', 'Wake review marker / h', 72],
          ['workloadReviewHours', 'Workload review marker / h', 24],
          ['napScenarioMinutes', 'Nap scenario duration / min', 1440],
          ['reassessmentMinutes', 'Reassessment horizon / min', 1440],
        ] as const).map(([key, label, max]) => <label key={key}>{label}<input type="number" min="0.1" max={max} step="0.1" value={parameters[key]} onChange={event => setParameters(previous => ({ ...previous, [key]: Number(event.target.value) }))} /></label>)}</div>
      </details>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="submit" className="btn btn-outline"><Clock size={14} aria-hidden="true" /> Review fatigue factors</button>
    </form>
    {result && result.status !== 'invalid' && <div className="rest-result" role="status" data-reason={result.status}>
      <b>{result.status === 'review' ? 'Fatigue factors need review.' : result.status === 'incomplete' ? 'Incomplete fatigue context.' : 'No configured model marker reached.'}</b>
      {result.signals.length > 0 && <ul>{result.signals.map(signal => <li key={signal.id}>{signal.text} <small>({signal.basis})</small></li>)}</ul>}
      {result.missing.length > 0 && <p>Unknown: {result.missing.join(', ')}.</p>}
      <p>Next task in {result.nextTaskMinutes} min. No recovery duration is inferred, and this result does not mean you are well rested or fit for duty. Coordinate the schedule with the onboard medical and operations team under approved procedures.</p>
    </div>}
    <p className="dialog-fine">NASA V1 6001 addresses circadian alignment, work/rest schedules and task load. Its rationale describes a {NASA_SLEEP_OPPORTUNITY_HOURS} h sleep opportunity plus {NASA_PRE_SLEEP_HOURS} h before and {NASA_POST_SLEEP_HOURS} h after sleep; this is scheduling context, not measured sleep or guaranteed recovery. <a href={FATIGUE_SOURCE} target="_blank" rel="noreferrer">NASA V1 6001</a>{' · '}<a href={ADULT_SLEEP_SOURCE} target="_blank" rel="noreferrer">NHLBI adult sleep reference</a></p>
    <p className="dialog-fine">This transparent factor model has no validated fatigue score or spaceflight fitness clearance. Inputs are exploratory and do not save a sleep measurement.</p>
  </section>;
}
