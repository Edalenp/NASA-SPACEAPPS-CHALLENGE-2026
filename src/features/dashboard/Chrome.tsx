/** Header, mission line, action bar, telemetry strip and footer. Layout from demo-vitruvio. */
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
} from "lucide-react";
import {
  crew,
  environments,
  formatDelay,
  MISSION_DAY,
  MISSION_LENGTH,
} from "../../data/mission";
import {
  dailyCheck,
  formatValue,
  indicators,
  type IndicatorId,
} from "../../data/indicators";
import { useMission, type Layer, type Panel } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { deviation, stateShape } from "../../engine/status";
import { Lockup } from "../../ui/Logo";
import { BaselineTrack } from "../../ui/BaselineTrack";

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
  return (
    <>
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
            Day <strong>{String(MISSION_DAY).padStart(3, "0")}</strong>{" "}
            <span className="micro">of {MISSION_LENGTH} · 08:30 MET</span>
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
      <div className="mission-line">
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
        <button type="button" onClick={() => open("mission")}>
          Earth link <b>{formatDelay(env.delayMin)}</b> one way{" "}
          <ArrowUpRight size={11} aria-hidden="true" />
        </button>
        <span className="mission-subject">
          {crew.code} · {crew.role} · active
        </span>
      </div>
    </>
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
  const setEmergency = useMission((s) => s.setEmergency);
  const { readings } = useAssessment();
  const done = dailyCheck.filter((id) => readings[id] !== null).length;
  const nextMissing = dailyCheck.find((id) => readings[id] === null);
  return (
    <div className="action-bar">
      <button type="button" className="checkin" onClick={() => open("routine")}>
        <span className="checkin-head">
          <span>Daily check-in</span>
          <b>
            {done}/{dailyCheck.length}
          </b>
          <small>
            {dailyCheck.length - done
              ? `${dailyCheck.length - done} pending`
              : "Complete"}
          </small>
        </span>
        <span className="checkin-track" aria-hidden="true">
          <i style={{ width: `${(done / dailyCheck.length) * 100}%` }} />
        </span>
      </button>
      <button
        type="button"
        className="btn btn-solid record"
        onClick={() =>
          open("record", nextMissing ? { recordFor: nextMissing } : undefined)
        }
      >
        <Plus size={15} aria-hidden="true" /> Record measurement
      </button>
      <button
        type="button"
        className="emergency-door aura is-alert"
        onClick={() => setEmergency(true)}
      >
        <Plus size={18} aria-hidden="true" /> Emergency
      </button>
    </div>
  );
}

const strip: { id: IndicatorId; label: string; pair?: IndicatorId }[] = [
  { id: "pulse", label: "Pulse" },
  { id: "spo2", label: "Oxygen" },
  { id: "systolic", label: "Blood pressure", pair: "diastolic" },
  { id: "temperature", label: "Temperature" },
];

export function Telemetry() {
  const { readings, score } = useAssessment();
  const select = useMission((s) => s.select);
  const notify = useMission((s) => s.notify);
  const env = environments[useMission((s) => s.environment)];

  function exportBrief() {
    const lines = [
      "VITRUVIO / MISSION BRIEF",
      `Crew member: ${crew.name} (${crew.code})`,
      `Mission day ${String(MISSION_DAY).padStart(3, "0")} of ${MISSION_LENGTH}, ${env.name}`,
      `NEWS2: ${score.complete ? score.total : "incomplete"} (${score.risk} risk, ${score.measured}/7 parameters)`,
      "",
      ...(Object.keys(indicators) as IndicatorId[]).map((id) => {
        const d = deviation(id, readings[id]);
        const ind = indicators[id];
        return `${ind.name}: ${formatValue(id, readings[id])}${readings[id] !== null && ind.kind === "number" ? ` ${ind.unit}` : ""} (${d.text})`;
      }),
      "",
      `Earth delay: ${formatDelay(env.delayMin)} one way (scenario setting).`,
      "Prototype with simulated data. Not for medical use. NEWS2 © Royal College of Physicians 2017.",
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitruvio-brief-day-${String(MISSION_DAY).padStart(3, "0")}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Mission brief saved as a text file.");
  }

  return (
    <section className="telemetry is-aura" aria-label="Latest readings">
      {strip.map((m) => {
        const d = deviation(m.id, readings[m.id]);
        const pairDev = m.pair ? deviation(m.pair, readings[m.pair]) : null;
        const priority = { missing: 0, normal: 1, watch: 2, alert: 3 };
        const worst =
          pairDev && priority[pairDev.status] > priority[d.status]
            ? pairDev
            : d;
        const st = worst.status;
        return (
          <button
            type="button"
            key={m.id}
            className={`tele aura is-${st === "missing" ? "calm" : st}`}
            onClick={() =>
              select(
                m.id === "spo2"
                  ? "lungs"
                  : m.id === "temperature"
                    ? "immune"
                    : "heart",
              )
            }
          >
            <span className="tele-label micro">
              {m.label}
              {st !== "normal" && (
                <span aria-hidden="true">{stateShape[st]}</span>
              )}
            </span>
            <span
              className="tele-value"
              key={`${readings[m.id]}-${m.pair ? readings[m.pair] : ""}`}
            >
              <strong>
                {formatValue(m.id, readings[m.id])}
                {m.pair && `/${formatValue(m.pair, readings[m.pair])}`}
              </strong>
              <small>{indicators[m.id].unit}</small>
            </span>
            <span className={`tele-baseline is-${d.status}`}>
              <BaselineTrack id={m.id} value={readings[m.id]} />
              {m.pair && (
                <span className={`is-${pairDev?.status}`}>
                  <BaselineTrack id={m.pair} value={readings[m.pair]} />
                </span>
              )}
            </span>
            <small className={`tele-note ${st === "normal" ? "sr-only" : ""}`}>
              {m.pair && st !== "normal"
                ? `${worst === pairDev ? "Diastolic" : "Systolic"}: `
                : ""}
              {worst.text}
            </small>
          </button>
        );
      })}
      <div className="brief">
        <button type="button" className="btn btn-ghost" onClick={exportBrief}>
          Mission brief <Download size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function Footer() {
  const open = useMission((s) => s.open);
  return (
    <footer className="app-footer micro">
      <span>Prototype · simulated data · not medical advice</span>
      <button type="button" onClick={() => open("sources")}>
        Sources and credits <ArrowUpRight size={10} aria-hidden="true" />
      </button>
    </footer>
  );
}
