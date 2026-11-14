import { ArrowUpRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { systems } from "../../data/mission";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { StateChip, StateMark } from "../../ui/StateMark";

export function ScoreBlock() {
  const { score, baselines, deviations } = useAssessment();
  const open = useMission((s) => s.open);
  const ready = Object.keys(baselines).length;
  const outside = Object.values(deviations).filter((d) => d.delta !== 0).length;
  const level =
    score.escalation === "self"
      ? "plain"
      : score.escalation === "cmo"
        ? "watch"
        : "alert";
  const sentence = !score.complete
    ? `Incomplete: ${score.measured} of 7 observations. Record the missing readings.`
    : `${score.risk} risk. Open the assessment for the engine's contact plan.`;
  return (
    <section className="score" aria-label="Early warning score">
      <button type="button" className="score-open" onClick={() => open("news")}>
        <span className="score-heading">
          <span className="micro">NEWS2 · Early warning</span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
        <span className="score-figure">
          <strong key={`${score.complete}-${score.total}`}>
            {score.complete ? score.total : "—"}
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
            ? `${outside} ${outside === 1 ? "indicator" : "indicators"} outside personal range`
            : ready
              ? `${ready} indicators with a personal range`
              : "Insufficient data for personal ranges"}
        </span>
        {outside > 0 && <StateChip status="watch" />}
      </div>
    </section>
  );
}

export function SystemsPanel({
  collapsed,
  onToggle,
  onSelect,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const { states } = useAssessment();
  const selected = useMission((s) => s.selected);
  const select = useMission((s) => s.select);
  return (
    <section className="console" aria-label="Body systems">
      <header className="console-head">
        <button
          type="button"
          className="systems-toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls="system-inspection"
          aria-label={
            collapsed ? "Expand systems panel" : "Minimize systems panel"
          }
          title={collapsed ? "Expand systems panel" : "Minimize systems panel"}
        >
          <span>Systems</span>
          {collapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} aria-hidden="true" />
          )}
        </button>
      </header>
      <ul className="console-list">
        {systems.map((sys) => {
          return (
            <li key={sys.id}>
              <button
                type="button"
                className={`console-row is-${states[sys.id]} ${selected === sys.id ? "is-selected" : ""}`}
                aria-pressed={selected === sys.id}
                aria-label={`${sys.name}: ${states[sys.id]}`}
                title={`${sys.name}: ${states[sys.id]}`}
                onClick={() => {
                  select(sys.id);
                  onSelect();
                }}
              >
                <span className="console-code">{sys.code}</span>
                <span className="console-name">
                  <b>{sys.short}</b>
                  <StateMark status={states[sys.id]} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
