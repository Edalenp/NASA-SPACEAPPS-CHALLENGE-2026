import { ArrowUpRight } from "lucide-react";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { StateChip } from "../../ui/StateMark";
import { LiveFigure } from "../../ui/LiveFigure";

export function ScoreBlock() {
  const { score, counts, baselines, deviations } = useAssessment();
  const open = useMission((s) => s.open);
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
  const tone = !score.complete
    ? "calm"
    : level === "alert" || counts.alert
      ? "alert"
      : level === "watch" || counts.watch
        ? "watch"
        : "good";
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
            <span>of 20</span>
            <span className={`state-chip is-${level}`}>
              {score.complete ? `${score.risk} risk` : "Incomplete"}
            </span>
          </span>
        </span>
      </button>
      {(!score.complete || score.escalation !== "self") && (
        <p className="score-sentence">{sentence}</p>
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
