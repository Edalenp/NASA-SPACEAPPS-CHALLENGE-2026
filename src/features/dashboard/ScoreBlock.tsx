import { ArrowUpRight } from "lucide-react";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { StateChip } from "../../ui/StateMark";
import { LiveFigure } from "../../ui/LiveFigure";
import { warningTone } from "../../ui/warningTone";
import { causeOf, clinicalBreaches, needsLook, news2Note } from "./cause";
import { formatValue, indicators, type IndicatorId } from "../../data/indicators";
import { systems } from "../../data/mission";
import { stateShape } from "../../engine/status";

export function ScoreBlock() {
  const { score, counts, baselines, deviations, readings, latest } = useAssessment();
  const open = useMission((s) => s.open);
  const select = useMission((s) => s.select);
  const cause = causeOf(Object.keys(indicators) as IndicatorId[], deviations);
  const breaches = clinicalBreaches(readings, latest);
  const causeSystem = systems.find((sys) => sys.readings.includes(cause)) ?? systems[0];
  // Personal baselines come from the crew member's own history (main's assessment engine).
  const ready = Object.keys(baselines).length;
  const outside = Object.values(deviations).filter((d) => d.delta !== 0).length;
  const level =
    score.escalation === "self"
      ? "plain"
      : score.escalation === "cmo"
        ? "watch"
        : "alert";
  const sentence = !score.complete
    ? `Incomplete: ${score.measured} of 7 observations. Your daily check guides you through the missing readings.`
    : `${score.risk} risk. Open the assessment for the engine's contact plan.`;
  // The card glows in the worst news it carries: the NEWS2 level or a system outside its usual range.
  const tone = warningTone(score, counts);
  return (
    <section className={`score aura is-${tone}`} aria-label="Early warning score">
      <button type="button" className="score-ready" onClick={() => open("news")}>
        <strong>{score.measured}/7</strong> observations ready
      </button>
      <button type="button" className="score-open" onClick={() => open("news")}>
        <span className="score-heading">
          <span className="micro">NEWS2 · Early warning</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
        <span className="score-figure">
          <strong key={`${score.complete}-${score.total}`}>
            <LiveFigure value={score.complete ? String(score.total) : "—"} />
          </strong>
          <span className="score-caption">
            <span>NEWS2 points / 20</span>
            <span className={`state-chip is-${level}`}>
              {score.complete ? `NEWS2 ${score.risk.toLowerCase()}` : "Incomplete"}
            </span>
          </span>
        </span>
      </button>
      {(!score.complete || score.escalation !== "self") && (
        <p className="score-sentence">{sentence}</p>
      )}
      {/* The card can glow for a system out of range while NEWS2 stays low: say which reading. */}
      {needsLook(deviations[cause].status) && (
        <button type="button" className="score-cause" key={`${cause}-${String(readings[cause])}`} onClick={() => select(causeSystem.id)}>
          <span aria-hidden="true">{stateShape[deviations[cause].status]}</span>
          <b>{indicators[cause].name} {formatValue(cause, readings[cause])}{indicators[cause].kind === "number" ? ` ${indicators[cause].unit}` : ""}</b>
          <small>{(() => { const b = breaches.find((x) => x.id === cause); return b ? `${b.severity === "alert" ? "Clinical alert" : "Clinical watch"} · ${news2Note(b)}` : causeSystem.name; })()}</small>
        </button>
      )}
      {!score.complete && <button type="button" className="btn btn-outline score-check-prompt" onClick={() => open("routine")}>
        {score.measured === 0 ? "Start daily check" : "Continue daily check"} <ArrowUpRight size={14} aria-hidden="true" />
      </button>}
      <div className="score-baseline">
        <span className="micro">Personal baseline</span>
        <span>
          {outside
            ? `${outside} ${outside === 1 ? "indicator" : "indicators"} outside personal range`
            : ready
              ? `${ready} ${ready === 1 ? "indicator" : "indicators"} with a personal range`
              : "Insufficient data for personal ranges"}
        </span>
        {outside > 0 && <StateChip status={counts.alert ? "alert" : "watch"} />}
      </div>
    </section>
  );
}
