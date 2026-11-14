import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { systems, environments } from "../../data/mission";
import { indicators, formatValue } from "../../data/indicators";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { StateChip } from "../../ui/StateMark";
import { PersonalRange } from "../measurements/PersonalRange";
import { AssessmentPlan } from "./AssessmentPlan";

/** One system and one view at a time; the parent keys this by selected system. */
export function Inspector() {
  const { states, readings, deviations, latest } = useAssessment();
  const selected = useMission((s) => s.selected);
  const open = useMission((s) => s.open);
  const env = environments[useMission((s) => s.environment)];
  const sys = systems.find((s) => s.id === selected)!;
  const state = states[selected];
  const order = { alert: 3, watch: 2, normal: 1, missing: 0 } as const;
  const worst = sys.readings.reduce(
    (best, r) =>
      order[deviations[r].status] > order[deviations[best].status] ? r : best,
    sys.readings[0],
  );
  const [focus, setFocus] = useState(worst);
  const [view, setView] = useState<"readings" | "actions" | "context">(
    "readings",
  );
  const ind = indicators[focus];
  const dev = deviations[focus];
  const lastEntry = latest[focus];
  const measured = lastEntry
    ? `${lastEntry.timestamp.slice(0, 16).replace("T", " ")} UTC · ${lastEntry.source === "simulator" ? "simulation" : "recorded"}`
    : "Not measured today";
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
                {sys.readings.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={focus === r}
                    onClick={() => setFocus(r)}
                  >
                    {indicators[r].name}
                    <span className={`is-${deviations[r].status}`}>
                      {formatValue(r, readings[r])}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div
              className={`readout is-${dev.status}`}
              key={focus}
              aria-live="polite"
            >
              <span className="micro">{ind.name}</span>
              <div className="readout-figure">
                <strong
                  className={ind.kind === "number" ? undefined : "is-word"}
                  key={String(readings[focus])}
                >
                  {formatValue(focus, readings[focus])}
                </strong>
                {ind.kind === "number" && readings[focus] !== null && (
                  <span>{ind.unit}</span>
                )}
              </div>
              <span className="readout-delta">
                {dev.text.startsWith("Insufficient")
                  ? "Personal range pending"
                  : dev.text}
              </span>
              {ind.kind === "number" && (
                <div className="readout-baseline">
                  <PersonalRange id={focus} />
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
                Review assessment and contact plan.{" "}
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            )}
          </>
        )}
        {view === "actions" && (
          <>
            <AssessmentPlan />
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
