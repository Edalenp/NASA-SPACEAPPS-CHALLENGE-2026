/** Header, action bar, system dock and footer. Layout from demo-vitruvio. */
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  CircleHelp,
} from "lucide-react";
import {
  crew,
  environments,
  formatDelay,
  MISSION_LENGTH,
  systems,
  type SystemId,
} from "../../data/mission";
import {
  formatValue,
  indicators,
  type IndicatorId,
} from "../../data/indicators";
import { useMission, type Layer, type Panel } from "../../store/mission";
import { checkProgress, requiredCheck, checkSequence } from "../routine/checkSequence";
import { useAssessment } from "../../store/derived";
import { stateShape, type Status } from "../../engine/status";
import { Lockup } from "../../ui/Logo";
import { useTour } from "../tour/tour";
import { BaselineTrack } from "../../ui/BaselineTrack";
import { ReadingGlyph } from "../../ui/ReadingGlyph";
import { LiveFigure } from "../../ui/LiveFigure";
import { missionDay } from "../measurements/adapter";
import { buildReport } from "../measurements/report";
import { assess } from "../measurements/assessment";
import { emergencyActionsForReport } from "../measurements/emergencyActions";
import { emergencyJournal, readEmergencyRecords } from "../emergency/journal";

const nav: { id: Panel; label: string }[] = [
  { id: null, label: "Overview" },
  { id: "trends", label: "Trends" },
  { id: "guides", label: "Guides" },
  { id: "routine", label: "Routine" },
];

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function Header() {
  const panel = useMission((s) => s.panel);
  const open = useMission((s) => s.open);
  const night = useMission((s) => s.night);
  const toggleNight = useMission((s) => s.toggleNight);
  const env = environments[useMission((s) => s.environment)];
  const online = useOnline();
  const now = useMission((s) => s.now);
  const start = useMission((s) => s.missionStart);
  return (
    <header className="app-header">
      <a
        className="home"
        href="#overview"
        onClick={(e) => {
          e.preventDefault();
          open(null);
        }}
        aria-label="VITRUVIO, overview"
      >
        <Lockup />
      </a>
      <div className="mission-tag">
        <button
          type="button"
          className="mission-context"
          onClick={() => open("mission")}
        >
          <b>{crew.name}</b>
          <span>·</span>
          {env.name}
          <ArrowUpRight size={12} aria-hidden="true" />
        </button>
        <span className="mission-day">
          Day <strong>{String(missionDay(now, start)).padStart(3, "0")}</strong>{" "}
          <span className="micro">of {MISSION_LENGTH} · {now.slice(11, 16)} UTC</span>
        </span>
      </div>
      {/* The link to Earth: this device's connection and the one-way signal delay. */}
      <div className="link-tag">
        <details className="connection">
          <summary>
            <i className={`link-dot ${online ? "" : "is-off"}`} />
            {online ? "Online" : "Offline · data on this device"}
          </summary>
          <p>
            Local-first: readings are stored on this device.{" "}
            {online
              ? "A network connection is available; this does not confirm an Earth link."
              : "You can keep recording measurements without a network connection."}
          </p>
        </details>
        <span>
          Earth link <b>{formatDelay(env.delayMin)}</b> one way
        </span>
      </div>
      <nav className="main-nav" aria-label="Main">
        {nav.map((n) => (
          <button
            key={n.label}
            type="button"
            className={panel === n.id ? "is-on" : ""}
            aria-current={panel === n.id ? "page" : undefined}
            onClick={() => open(n.id)}
          >
            {n.label}
          </button>
        ))}
        <button
          type="button"
          className="icon-button theme tour-button"
          aria-label="Take the guided tour"
          title="Guided tour"
          onClick={() => useTour.getState().start()}
        >
          <CircleHelp size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button theme"
          onClick={toggleNight}
          aria-label={
            night ? "Switch to day lighting" : "Switch to night lighting"
          }
        >
          {night ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </nav>
    </header>
  );
}

export function CameraControls({
  wide,
  setWide,
}: {
  wide: boolean;
  setWide: (w: boolean) => void;
}) {
  const layer = useMission((s) => s.layer);
  const setLayer = useMission((s) => s.setLayer);
  const rotate = useMission((s) => s.rotate);
  const resetView = useMission((s) => s.resetView);
  return (
    <div className="camera">
      <button
        type="button"
        className="icon-button"
        onClick={() => rotate(-Math.PI / 6)}
        aria-label="Rotate body left"
      >
        <ChevronLeft size={17} />
      </button>
      <span className="camera-layers" role="group" aria-label="Display layer">
        {(["anatomy", "skeleton"] as Layer[]).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={layer === l}
            className={layer === l ? "is-on" : ""}
            onClick={() => setLayer(l)}
          >
            {l}
          </button>
        ))}
      </span>
      <button
        type="button"
        className="icon-button"
        onClick={() => rotate(Math.PI / 6)}
        aria-label="Rotate body right"
      >
        <ChevronRight size={17} />
      </button>
      <i aria-hidden="true" />
      <button
        type="button"
        className="icon-button"
        onClick={resetView}
        aria-label="Reset view"
      >
        <RotateCcw size={14} />
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={() => setWide(!wide)}
        aria-label={wide ? "Show panels" : "Hide panels"}
      >
        {wide ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    </div>
  );
}

export function ActionBar() {
  const open = useMission((s) => s.open);
  const { latest, score } = useAssessment();
  const isDone = (id: IndicatorId) =>
    !!latest[id] && latest[id]?.source !== "simulator";
  const done = checkProgress(latest).required;
  const nextMissing = checkSequence.find((id) => !isDone(id));
  return (
    <div className="action-bar">
      <button type="button" className="checkin" onClick={() => open("routine")}>
        <span className="checkin-head">
          <span>Daily check-in</span>
          <b>
            {done}/{requiredCheck.length}
          </b>
          <small>
            {requiredCheck.length - done
              ? `${requiredCheck.length - done} to NEWS2`
              : "NEWS2 ready"}
          </small>
        </span>
        <span className="checkin-track" aria-hidden="true">
          <i style={{ width: `${(done / requiredCheck.length) * 100}%` }} />
        </span>
      </button>
      <button
        type="button"
        className="btn btn-solid record"
        onClick={() =>
          score.complete ? open("record", nextMissing ? { recordFor: nextMissing } : undefined) : open("routine")
        }
      >
        <Plus size={15} aria-hidden="true" /> {score.complete ? "Record measurement" : score.measured ? "Continue daily check" : "Start daily check"}
      </button>
    </div>
  );
}

/** Each system in the dock: the reading it leads with, and the others it carries in small type. */
const dock: Record<SystemId, { lead: IndicatorId; extra?: { label: string; ids: IndicatorId[] }; note?: string }> = {
  head: { lead: "consciousness", note: "Consciousness, ACVPU" },
  heart: { lead: "pulse", extra: { label: "BP", ids: ["systolic", "diastolic"] } },
  lungs: { lead: "spo2", extra: { label: "Breathing", ids: ["respiration"] } },
  bones: { lead: "exercise", extra: { label: "Reaction", ids: ["reaction"] } },
  immune: { lead: "temperature", extra: { label: "Glucose", ids: ["glucose"] } },
  sleep: { lead: "sleep", extra: { label: "Mood", ids: ["mood"] } },
};

/** Saves the mission report (main's report builder) for the flight surgeon. */
export function MissionBrief() {
  const notify = useMission((s) => s.notify);

  function exportBrief() {
    const now = new Date().toISOString();
    const { entries, missionStart, environment } = useMission.getState();
    const currentAssessment = assess(entries, now, environment);
    const journal = emergencyJournal.getSnapshot();
    const actions = emergencyActionsForReport(
      readEmergencyRecords(),
      crew.code,
      now,
    );
    const actionRecordNote =
      journal.problem === "unreadable"
        ? "Emergency journal unreadable. Existing device records could not be included; any available confirmations are session-only."
        : journal.persistence === "session"
          ? "Emergency confirmations are session-only and may be lost on reload."
          : "Emergency confirmations read from the device journal. Times reflect user confirmations, not independently verified care.";
    const report = buildReport(
      currentAssessment,
      { now, missionStart, environment, actionRecordNote },
      actions,
    );
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitruvio-brief-day-${String(missionDay(now, missionStart)).padStart(3, "0")}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Mission brief saved as a text file.");
  }

  return (
    <button type="button" className="btn btn-outline mission-brief" aria-label="Download mission brief" title="Download mission brief" onClick={exportBrief}>
      <span>Mission brief</span> <Download size={14} aria-hidden="true" />
    </button>
  );
}

/** The dock: one tile per body system, the only place to pick one besides the body itself. Each
 *  tile leads with its main reading, carries the others in small type and glows in the system's
 *  worst status. The Emergency door closes the row. */
export function SystemDock() {
  const { readings, states, deviations } = useAssessment();
  const selected = useMission((s) => s.selected);
  const select = useMission((s) => s.select);
  const setEmergency = useMission((s) => s.setEmergency);
  return (
    <section className="telemetry is-aura" aria-label="Body systems">
      {systems.map((sys) => {
        const { lead, extra, note } = dock[sys.id];
        const st = states[sys.id];
        const ind = indicators[lead];
        const value = readings[lead];
        const extraStatus = extra
          ? extra.ids.reduce<Status>((worst, id) => {
              const s = deviations[id].status;
              return rank[s] > rank[worst] ? s : worst;
            }, "missing")
          : "missing";
        const extraValue = extra?.ids.map((id) => formatValue(id, readings[id])).join("/");
        const unit = extra ? indicators[extra.ids[0]].unit : "";
        const extraMissing = !extra || extra.ids.every((id) => readings[id] === null);
        const extraUnit = extraMissing ? "" : unit === "1–5" ? "of 5" : unit;
        const spoken = [
          `${sys.name}: ${st === "missing" ? "no data" : st}.`,
          `${ind.name} ${formatValue(lead, value)}${value !== null && ind.kind === "number" ? ` ${ind.unit}` : ""}.`,
          extra ? `${extra.label} ${extraValue} ${extraUnit}.` : "",
        ].join(" ");
        return (
          <button
            type="button"
            key={sys.id}
            className={`tele aura dock-tile is-${st === "missing" ? "calm" : st}${selected === sys.id ? " is-selected" : ""}`}
            aria-pressed={selected === sys.id}
            aria-label={spoken}
            onClick={() => select(sys.id)}
          >
            <span className="tele-label">
              <i className="dock-code">{sys.code}</i>
              <span className="dock-name">{sys.short}</span>
              {(st === "watch" || st === "alert") && (
                <span aria-hidden="true">{stateShape[st]}</span>
              )}
            </span>
            <ReadingGlyph id={lead} readings={readings} />
            <span className="tele-value" key={String(value)}>
              <strong className={ind.kind === "number" ? undefined : "is-word"}>
                <LiveFigure value={formatValue(lead, value)} />
              </strong>
              {ind.kind === "number" && value !== null && (
                <small>{lead === "spo2" ? "% SpO₂" : lead === "exercise" ? "min exercise" : ind.unit}</small>
              )}
            </span>
            {ind.kind === "number" && ind.usual ? (
              <span className={`tele-baseline is-${deviations[lead].status}`}>
                <BaselineTrack id={lead} value={value} />
              </span>
            ) : (
              <span className="tele-baseline" aria-hidden="true" />
            )}
            <small className={`dock-extra is-${extraStatus}`}>
              {extra ? (
                <>
                  {extra.label} <b>{extraValue}</b> {extraUnit}
                </>
              ) : (
                note
              )}
            </small>
          </button>
        );
      })}
      <button
        type="button"
        className="emergency-door"
        onClick={() => setEmergency(true)}
      >
        <Plus size={18} aria-hidden="true" /> Emergency
      </button>
    </section>
  );
}

const rank: Record<Status, number> = { missing: 0, normal: 1, watch: 2, alert: 3 };

export function Footer() {
  const open = useMission((s) => s.open);
  return (
    <footer className="app-footer micro">
      <span>Prototype · sources labelled per reading · not medical advice</span>
      <button type="button" onClick={() => open("sources")}>
        Sources and credits <ArrowUpRight size={10} aria-hidden="true" />
      </button>
    </footer>
  );
}
