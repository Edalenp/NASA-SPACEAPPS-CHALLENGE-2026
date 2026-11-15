import { useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Orbit, Plus } from "lucide-react";
import { systems, environments, formatDelay } from "../../data/mission";
import { indicators, formatValue, type IndicatorId } from "../../data/indicators";
import { causeOf, needsLook } from "./cause";
import { stateShape } from "../../engine/status";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { StateChip } from "../../ui/StateMark";
import { BaselineTrack } from "../../ui/BaselineTrack";
import { ReadingGlyph } from "../../ui/ReadingGlyph";
import { LiveFigure } from "../../ui/LiveFigure";
import { ReadingPicker } from "../measurements/ReadingPicker";
import "../measurements/record.css";
import { InlineGuide } from "../guides/InlineGuide";
import { AssessmentPlan } from "./AssessmentPlan";
import { ClinicalAlerts } from "./ClinicalAlerts";
import { ZoneActions } from "../emergency/ZoneActions";
import { EnvironmentRisks } from "../environment/EnvironmentRisks";
import { systemZones } from "../measurements/adapter";

/** One system and one view at a time; the parent keys this by selected system. */
export function Inspector() {
  const { states, readings, deviations, latest, baselines, sampleCounts, zones } = useAssessment();
  const selected = useMission((s) => s.selected);
  const open = useMission((s) => s.open);
  const environmentId = useMission((s) => s.environment);
  const env = environments[environmentId];
  const sys = systems.find((s) => s.id === selected)!;
  const state = states[selected];
  // The inspector follows the reading behind the system's state until the crew member picks one.
  const cause = causeOf(sys.readings, deviations);
  const [picked, setPicked] = useState<IndicatorId | null>(null);
  const focus = picked ?? cause;
  const setFocus = setPicked;
  const [view, setView] = useState<"readings" | "actions" | "context">(
    "readings",
  );
  const [measuring, setMeasuring] = useState(false);
  const ind = indicators[focus];
  const dev = deviations[focus];
  const lastEntry = latest[focus];
  const glucoseContext = focus === "glucose" ? lastEntry?.ctx : undefined;
  const contextNote = focus === "glucose"
    ? ` · glucose context ${glucoseContext?.timing ?? "unknown"}/${glucoseContext?.specimen ?? "unknown"}`
    : "";
  const measured = (lastEntry
    ? `${lastEntry.timestamp.slice(0, 16).replace("T", " ")} UTC · ${lastEntry.source === "simulator" ? "simulation" : lastEntry.reaction ? `60-s test · ${lastEntry.reaction.validTrials} valid, ${lastEntry.reaction.failures} failures` : "recorded"}`
    : "Not measured today") + contextNote;
  const attention = state === "watch" || state === "alert";

  return (
    <section className={`inspector ${measuring ? "is-measuring" : ""}`} data-guide-status={state} aria-label={`${sys.name} details`}>
      <div className="inspector-top">
        <span className="micro">System {sys.code}</span>
        <StateChip status={state} />
        {measuring && <button type="button" className="btn btn-outline guide-close" aria-label="Close guide" title="Back to readings" onClick={() => setMeasuring(false)}><ArrowLeft size={14} aria-hidden="true" /> Readings</button>}
      </div>
      <h2 className="inspector-title">{sys.name}</h2>
      {needsLook(state) && (
        <button type="button" className={`inspector-cause is-${deviations[cause].status}`} key={`${cause}-${String(readings[cause])}`} onClick={() => { setPicked(cause); setView("readings"); }}>
          <span aria-hidden="true">{stateShape[deviations[cause].status]}</span>
          <b>{indicators[cause].name} {formatValue(cause, readings[cause])}{indicators[cause].kind === "number" ? ` ${indicators[cause].unit}` : ""}</b>
          <small>{deviations[cause].text}</small>
        </button>
      )}
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
            {sys.readings.length > 1 && <ReadingPicker value={focus} ids={sys.readings} statuses={Object.fromEntries(sys.readings.map((r) => [r, deviations[r].status]))} onChange={setFocus} />}
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
                {dev.text}
              </span>
              {ind.kind === "number" && (
                <div className="readout-baseline">
                  <BaselineTrack id={focus} value={readings[focus]} />
                  {baselines[focus] ? (
                    <span>
                      Personal observed range{" "}
                      <b>
                        {baselines[focus].lower.toFixed(1)}–{baselines[focus].upper.toFixed(1)} {ind.unit}
                      </b>
                    </span>
                  ) : (
                    <span>
                      Illustrative reference{" "}
                      <b>
                        {ind.usual ? `${ind.usual[0]}–${ind.usual[1]} ${ind.unit}` : "not available"}
                      </b>{" "}
                      · {sampleCounts[focus] ?? 0}/7 prior readings
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
            <ZoneActions zone={zones[systemZones[selected]]} />
            <ClinicalAlerts />
            <AssessmentPlan />
          </>
        )}
        {view === "context" && (
          <div className="system-description">
            <div className="context-about aura">
              <span className="micro">What it does</span>
              <p>{sys.description}</p>
            </div>
            <div className="context-block">
              <EnvironmentRisks environment={environmentId} zoneId={systemZones[selected]} />
            </div>
            <div className="context-environment">
              <Orbit size={16} aria-hidden="true" />
              <span>
                <b>{env.name}</b>
                <small>{env.context} · Earth {formatDelay(env.delayMin)} away</small>
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline system-context"
              onClick={() => open("system")}
            >
              <BookOpen size={14} aria-hidden="true" /> Explore system & sources
              <ArrowUpRight size={14} aria-hidden="true" />
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
          <Plus size={14} aria-hidden="true" />{" "}
          {readings[focus] === null ? "Measure" : "Measure again"}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          aria-expanded={measuring}
          onClick={() => setMeasuring((value) => !value)}
        >
          {measuring ? <ArrowLeft size={14} aria-hidden="true" /> : <BookOpen size={14} aria-hidden="true" />}{" "}
          {measuring ? "Back to readings" : "How to measure"}
        </button>
      </div>
    </section>
  );
}
