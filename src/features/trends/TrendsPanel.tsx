import { useState } from "react";
import { ChevronLeft, ChevronRight, Orbit } from "lucide-react";
import {
  indicators,
  formatValue,
  type IndicatorId,
} from "../../data/indicators";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { DAY_MS, type RecordEntry } from "../measurements/adapter";
import { PersonalRange } from "../measurements/PersonalRange";
import type { Baseline } from "../../engine";

function HistoryChart({
  points,
  baseline,
  id,
  from,
  to,
}: {
  points: RecordEntry[];
  baseline?: Baseline;
  id: IndicatorId;
  from: number;
  to: number;
}) {
  const values = points.map((e) => e.value as number);
  const low = Math.min(...values, baseline?.lower ?? Infinity),
    high = Math.max(...values, baseline?.upper ?? -Infinity);
  const padding = Math.max((high - low) * 0.15, Math.abs(high) * 0.02, 0.5);
  // A taller plot (280 units) so the chart fills the wide dialog's right column.
  const y = (n: number) =>
    300 - ((n - low + padding) / (high - low + 2 * padding)) * 280;
  const x = (t: string) =>
    52 + ((Date.parse(t) - from) / Math.max(to - from, 1)) * 520;
  const path = points
    .map((e, i) => `${i ? "L" : "M"}${x(e.timestamp)} ${y(e.value as number)}`)
    .join(" ");
  return (
    <svg
      className="history-chart"
      viewBox="0 0 640 360"
      role="img"
      aria-label={`${indicators[id].name}, ${points.length} readings. ${baseline ? "Personal range shown as a shaded band." : "Insufficient prior data for a personal range."} Exact values follow in the history table.`}
    >
      {baseline && (
        <rect
          className="trend-band"
          x="52"
          width="520"
          y={y(baseline.upper)}
          height={Math.max(1, y(baseline.lower) - y(baseline.upper))}
        />
      )}
      {[low, (low + high) / 2, high]
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((v) => (
          <g key={v}>
            <line
              x1="52"
              x2="572"
              y1={y(v)}
              y2={y(v)}
              stroke="var(--vt-line)"
            />
            <text x="44" y={y(v) + 4} textAnchor="end">
              {Number(v.toFixed(1))}
            </text>
          </g>
        ))}
      <path className="trend-line" d={path} />
      {points.map((e) => (
        <circle
          key={e.recordId}
          cx={x(e.timestamp)}
          cy={y(e.value as number)}
          r="3"
          fill={e.source === "simulator" ? "var(--vt-ink-3)" : "var(--vt-ink)"}
        >
          <title>
            {e.timestamp}: {e.value} {indicators[id].unit} · {e.source}
          </title>
        </circle>
      ))}
      <text x="52" y="331">
        {new Date(from).toISOString().slice(0, 10)}
      </text>
      <text x="572" y="331" textAnchor="end">
        {new Date(to).toISOString().slice(0, 10)}
      </text>
      <text x="52" y="349">
        UTC · {indicators[id].unit}
      </text>
    </svg>
  );
}

const PAGE = 8;

export function TrendsPanel() {
  const [id, setId] = useState<IndicatorId>("systolic");
  const [days, setDays] = useState(30);
  const [source, setSource] = useState("all");
  const [view, setView] = useState<"chart" | "history">("chart");
  const [page, setPage] = useState(0);
  const entries = useMission((s) => s.entries);
  const now = useMission((s) => s.now);
  const load = useMission((s) => s.loadSimulation);
  const busy = useMission((s) => s.busy);
  const storageError = useMission((s) => s.storageError);
  const { baselines, latest } = useAssessment();
  const to = Date.parse(now),
    from = Date.parse(now.slice(0, 10)) - (days - 1) * DAY_MS;
  const available = entries.filter(
    (e) =>
      e.indicator === id &&
      e.timestamp <= now &&
      Date.parse(e.timestamp) >= from &&
      (source === "all" ||
        (source === "simulator"
          ? e.source === "simulator"
          : e.source !== "simulator")),
  );
  const points = available.filter(
    (e) => typeof e.value === "number" && !e.legacyScale,
  );
  // The history pages instead of scrolling, newest first; any filter change returns to page one.
  const history = [...available].reverse();
  const pages = Math.max(1, Math.ceil(history.length / PAGE));
  const shown = Math.min(page, pages - 1);
  const filter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(0);
  };
  return (
    <div className="dialog-columns trends-columns">
      <div>
        <div className="history-controls">
          <label>
            Indicator
            <select
              value={id}
              onChange={(e) => filter(setId)(e.target.value as IndicatorId)}
            >
              {(Object.keys(indicators) as IndicatorId[]).map((k) => (
                <option key={k} value={k}>
                  {indicators[k].name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Window
            <select
              value={days}
              onChange={(e) => filter(setDays)(Number(e.target.value))}
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
            </select>
          </label>
          <label>
            Source
            <select
              value={source}
              onChange={(e) => filter(setSource)(e.target.value)}
            >
              <option value="all">All sources</option>
              <option value="manual">Recorded readings</option>
              <option value="simulator">Mission simulation</option>
            </select>
          </label>
        </div>
        <PersonalRange id={id} />
        <p className="dialog-fine">
          The personal range uses prior readings from the current reading’s
          source. The evaluated reading is excluded. Simulation is illustrative,
          not NASA observations.
        </p>
        <div className="simulation-loader">
          <span>
            <b>Explore the mission.</b>
            <small>
              180 days · seed 2026. Future readings stay outside today’s
              assessment.
            </small>
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={() => void load()}
          >
            <Orbit size={14} aria-hidden="true" />{" "}
            {busy ? "Loading…" : "Load mission simulation"}
          </button>
        </div>
        {storageError && (
          <p role="alert" className="form-error">
            {storageError}
          </p>
        )}
      </div>
      <div>
        <div className="trends-head">
          <p className="dialog-copy">
            {indicators[id].name} / {indicators[id].unit}. {available.length}{" "}
            readings in this window.
          </p>
          <div className="segmented" role="group" aria-label="Trend view">
            <button type="button" className={view === "chart" ? "is-on" : ""} aria-pressed={view === "chart"} onClick={() => setView("chart")}>Chart</button>
            <button type="button" className={view === "history" ? "is-on" : ""} aria-pressed={view === "history"} onClick={() => setView("history")}>History ({available.length})</button>
          </div>
        </div>
        {view === "chart" ? (
          indicators[id].kind === "choice" ? (
            <div className="measurement-empty">
              <h3>Categorical observation.</h3>
              <p>Its readings appear in the history.</p>
            </div>
          ) : points.length ? (
            <HistoryChart
              points={points}
              id={id}
              baseline={
                source === "all" ||
                (source === "simulator") === (latest[id]?.source === "simulator")
                  ? baselines[id]
                  : undefined
              }
              from={from}
              to={to}
            />
          ) : (
            <div className="measurement-empty">
              <h3>No readings in this window.</h3>
              <p>Record a measurement or load the mission simulation.</p>
            </div>
          )
        ) : (
          <div className="history-page">
            <table className="news-table">
              <caption className="sr-only">
                {indicators[id].name} · exact values and provenance
              </caption>
              <thead>
                <tr>
                  <th scope="col">Measured (UTC)</th>
                  <th scope="col">Value</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(shown * PAGE, shown * PAGE + PAGE).map((e) => (
                  <tr key={e.recordId}>
                    <td>
                      <time dateTime={e.timestamp}>
                        {e.timestamp.slice(0, 16).replace("T", " ")}
                      </time>
                    </td>
                    <td>
                      {formatValue(id, e.value)}{" "}
                      {e.legacyScale
                        ? "(previous 1–10 scale)"
                        : indicators[id].unit}
                    </td>
                    <td>
                      {e.source === "simulator"
                        ? "Simulation"
                        : e.legacyScale
                          ? "Legacy · excluded from baseline"
                          : "Recorded"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div className="history-pager">
                <button type="button" aria-label="Newer readings" disabled={shown === 0} onClick={() => setPage(shown - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
                <span>
                  {shown * PAGE + 1}–{Math.min(history.length, shown * PAGE + PAGE)} of {history.length}
                </span>
                <button type="button" aria-label="Older readings" disabled={shown === pages - 1} onClick={() => setPage(shown + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
