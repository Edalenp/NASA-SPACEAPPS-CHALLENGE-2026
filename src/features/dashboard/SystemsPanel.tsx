import { ArrowUpRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { systems } from "../../data/mission";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { StateChip, StateMark } from "../../ui/StateMark";

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
            ? `${outside} ${outside === 1 ? "system" : "systems"} outside usual range`
            : "No systems outside usual range"}
        </span>
        {outside > 0 && <StateChip status={counts.alert ? "alert" : "watch"} />}
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
