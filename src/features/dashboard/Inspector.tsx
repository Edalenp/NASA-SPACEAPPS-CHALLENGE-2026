import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { systems, environments } from "../../data/mission";
import { indicators, formatValue } from "../../data/indicators";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { deviation, stateShape } from "../../engine/status";
import { StateChip } from "../../ui/StateMark";
import { BaselineTrack } from "../../ui/BaselineTrack";
import { ReadingGlyph } from "../../ui/ReadingGlyph";
import { ladder } from "./escalation";
import { LiveFigure } from "../../ui/LiveFigure";

/** One system and one view at a time; the parent keys this by selected system. */
export function Inspector() {
  const { states, readings, score } = useAssessment();
  const selected = useMission((s) => s.selected);
  const open = useMission((s) => s.open);
  const entries = useMission((s) => s.entries);
  const env = environments[useMission((s) => s.environment)];
  const sys = systems.find((s) => s.id === selected)!;
  const state = states[selected];
  const order = { alert: 3, watch: 2, normal: 1, missing: 0 } as const;
  const worst = sys.readings.reduce(
    (best, r) =>
      order[deviation(r, readings[r]).status] >
      order[deviation(best, readings[best]).status]
        ? r
        : best,
    sys.readings[0],
  );
  const [focus, setFocus] = useState(worst);
  const [view, setView] = useState<"readings" | "actions" | "context">(
    "readings",
  );
  const ind = indicators[focus];
  const dev = deviation(focus, readings[focus]);
  const lastEntry = [...entries].reverse().find((e) => e.indicator === focus);
  const measured = lastEntry
    ? `Recorded ${new Date(lastEntry.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · this device`
    : readings[focus] === null
      ? "Not measured today"
      : "08:30 · simulated reading";
  const step = ladder(env.delayMin).find((l) => l.id === score.escalation)!;
  const attention = state === "watch" || state === "alert";

  return (
    <section className="inspector" aria-label={`${sys.name} details`}>
      <div className="inspector-top">
        <span className="micro">System {sys.code}</span>
        <StateChip status={state} />
      </div>
      <h2 className="inspector-title">{sys.name}</h2>
      <div
        className="inspection-views"
        role="group"
        aria-label="System detail view"
      >
        {(["readings", "actions", "context"] as const).map((v) => (
          <button
            type="button"
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {v}
            {v === "actions" && attention && (
              <span className={`is-${state}`} aria-label="attention required">
                {" "}
                ●
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="inspection-content" key={view}>
        {view === "readings" && (
          <>
            {sys.readings.length > 1 && (
              <div
                className="reading-selector"
                role="group"
                aria-label="Select measurement"
              >
                {sys.readings.map((r) => {
                  // Names only: the figures live in the card below and in the dock.
                  const status = deviation(r, readings[r]).status;
                  return (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={focus === r}
                      aria-label={`${indicators[r].name}: ${formatValue(r, readings[r])}`}
                      onClick={() => setFocus(r)}
                    >
                      {indicators[r].short}
                      {(status === "watch" || status === "alert") && (
                        <span className={`is-${status}`} aria-hidden="true">
                          {stateShape[status]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div
              className={`readout aura is-${dev.status === "missing" ? "calm" : dev.status}`}
              key={focus}
              aria-live="polite"
            >
              <ReadingGlyph id={focus} readings={readings} />
              <span className="micro">{ind.name}</span>
              <div className="readout-figure">
                <strong
                  className={ind.kind === "number" ? undefined : "is-word"}
                  key={String(readings[focus])}
                >
                  <LiveFigure value={formatValue(focus, readings[focus])} />
                </strong>
                {ind.kind === "number" && readings[focus] !== null && (
                  <span>{ind.unit}</span>
                )}
              </div>
              <span className="readout-delta">{dev.text}</span>
              {ind.kind === "number" && ind.usual && (
                <div className="readout-baseline">
                  <BaselineTrack id={focus} value={readings[focus]} />
                  <span>
                    Personal range{" "}
                    <b>
                      {ind.usual[0]}–{ind.usual[1]} {ind.unit}
                    </b>
                  </span>
                </div>
              )}
              <span className="measurement-time">{measured}</span>
            </div>
            {attention && (
              <button
                type="button"
                className="attention-next"
                onClick={() => setView("actions")}
              >
                Rest seated for 5 minutes, then measure again.{" "}
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            )}
          </>
        )}
        {view === "actions" && (
          <>
            {attention ? (
              <div className="todo">
                <h3>What to do now</h3>
                <ol>
                  <li>Rest seated for 5 minutes, then measure again.</li>
                  <li>
                    {score.escalation === "self"
                      ? "Repeat the full check in 4 hours."
                      : "Repeat the full check every hour."}
                  </li>
                  <li>
                    {score.escalation === "self"
                      ? "If the score reaches 5, or you feel faint, tell the Crew Medical Officer."
                      : "Tell the Crew Medical Officer now."}
                  </li>
                </ol>
              </div>
            ) : (
              <p className="note">
                {state === "missing"
                  ? "No reading yet today. Complete your daily check-in."
                  : "Within your usual range. Nothing to do now."}
              </p>
            )}
            <div className="escalation-summary">
              <span className="micro">Who to tell</span>
              <p>
                <b>{step.who}</b> {step.detail}
              </p>
            </div>
          </>
        )}
        {view === "context" && (
          <div className="system-description">
            <p>{sys.description}</p>
            <span className="micro">Spaceflight context</span>
            <p>{sys.hrpRisk}</p>
            <span className="micro">Current environment</span>
            <p>
              {env.name} · {env.context}
            </p>
            <button
              type="button"
              className="system-context"
              onClick={() => open("system")}
            >
              Explore system & sources{" "}
              <ArrowUpRight size={12} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <div className="inspector-actions">
        <button
          type="button"
          className="btn btn-solid"
          onClick={() => open("record", { recordFor: focus })}
        >
          {readings[focus] === null ? "Measure" : "Measure again"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => open("guides", { guide: focus })}
        >
          How to measure
        </button>
      </div>
    </section>
  );
}
