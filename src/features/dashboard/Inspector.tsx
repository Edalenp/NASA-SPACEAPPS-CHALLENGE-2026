import { useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { systems, environments } from "../../data/mission";
import { indicators, formatValue } from "../../data/indicators";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { stateShape } from "../../engine/status";
import { StateChip } from "../../ui/StateMark";
import { BaselineTrack } from "../../ui/BaselineTrack";
import { ReadingGlyph } from "../../ui/ReadingGlyph";
import { LiveFigure } from "../../ui/LiveFigure";
import { InlineGuide } from "../guides/InlineGuide";
import { AssessmentPlan } from "./AssessmentPlan";

/** One system and one view at a time; the parent keys this by selected system. */
export function Inspector() {
  const { states, readings, deviations, latest, baselines, sampleCounts } = useAssessment();
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
  const [measuring, setMeasuring] = useState(false);
  const ind = indicators[focus];
  const dev = deviations[focus];
  const lastEntry = latest[focus];
  const measured = lastEntry
    ? `${lastEntry.timestamp.slice(0, 16).replace("T", " ")} UTC · ${lastEntry.source === "simulator" ? "simulation" : "recorded"}`
    : "Not measured today";
  const attention = state === "watch" || state === "alert";

  return (
    <section className={`inspector ${measuring ? "is-measuring" : ""}`} data-guide-status={state} aria-label={`${sys.name} details`}>
      <div className="inspector-top">
        <span className="micro">System {sys.code}</span>
        <StateChip status={state} />
        {measuring && <button type="button" className="btn btn-outline guide-close" aria-label="Close guide" title="Back to readings" onClick={() => setMeasuring(false)}><ArrowLeft size={14} aria-hidden="true" /> Readings</button>}
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
        {measuring ? (
          <InlineGuide key={focus} id={focus} />
        ) : <>
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
                  const status = deviations[r].status;
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
              <span className="readout-delta">
                {dev.text.startsWith("Insufficient")
                  ? "Personal range pending"
                  : dev.text}
              </span>
              {ind.kind === "number" && ind.usual && (
                <div className="readout-baseline">
                  <BaselineTrack id={focus} value={readings[focus]} />
                  {/* The crew member's own range once there are enough readings; the usual one until then. */}
                  {baselines[focus] ? (
                    <span>
                      Personal range{" "}
                      <b>
                        {baselines[focus].lower.toFixed(1)}–{baselines[focus].upper.toFixed(1)} {ind.unit}
                      </b>
                    </span>
                  ) : (
                    <span>
                      Usual range{" "}
                      <b>
                        {ind.usual[0]}–{ind.usual[1]} {ind.unit}
                      </b>{" "}
                      · personal at {sampleCounts[focus] ?? 0}/7
                    </span>
                  )}
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
        </>}
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
          aria-expanded={measuring}
          onClick={() => setMeasuring((value) => !value)}
        >
          {measuring ? "Back to readings" : "How to measure"}
        </button>
      </div>
    </section>
  );
}
