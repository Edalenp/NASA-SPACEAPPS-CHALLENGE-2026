import { ArrowUpRight } from "lucide-react";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { StateChip } from "../../ui/StateMark";
import { LiveFigure } from "../../ui/LiveFigure";

export function ScoreBlock() {
  const { score, counts } = useAssessment();
  const open = useMission((s) => s.open);
  const outside = counts.watch + counts.alert;
  const level =
    score.escalation === "self"
      ? "plain"
      : score.escalation === "cmo"
        ? "watch"
        : "alert";
  const sentence = !score.complete
    ? `Incomplete: ${score.measured} of 7 readings. Measure the rest to finish the score.`
    : score.escalation === "self"
      ? outside
        ? `The score is low, but ${outside} ${outside === 1 ? "system is" : "systems are"} outside your usual range.`
        : "The score is low and every system is within your usual range."
      : score.escalation === "cmo"
        ? "Tell the Crew Medical Officer now."
        : "Tell the Crew Medical Officer and the flight surgeon now.";
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
      <div className="score-baseline">
        <span className="micro">Personal baseline</span>
        <span>
          {outside
            ? `${outside} ${outside === 1 ? "system" : "systems"} outside usual range`
            : "No systems outside usual range"}
        </span>
        {outside > 0 && <StateChip status={counts.alert ? "alert" : "watch"} />}
      </div>
    </section>
  );
}
