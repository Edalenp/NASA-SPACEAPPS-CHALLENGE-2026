import { useState } from "react";
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
  const y = (n: number) =>
    190 - ((n - low + padding) / (high - low + 2 * padding)) * 170;
  const x = (t: string) =>
    52 + ((Date.parse(t) - from) / Math.max(to - from, 1)) * 520;
  const path = points
    .map((e, i) => `${i ? "L" : "M"}${x(e.timestamp)} ${y(e.value as number)}`)
    .join(" ");
  return (
    <svg
      className="history-chart"
      viewBox="0 0 640 240"
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
      <text x="52" y="221">
        {new Date(from).toISOString().slice(0, 10)}
      </text>
      <text x="572" y="221" textAnchor="end">
        {new Date(to).toISOString().slice(0, 10)}
      </text>
      <text x="52" y="237">
        UTC · {indicators[id].unit}
      </text>
    </svg>
  );
}

export function TrendsPanel() {
  const [id, setId] = useState<IndicatorId>("systolic");
  const [days, setDays] = useState(30);
  const [source, setSource] = useState("all");
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
  return (
    <div className="measurement-panel">
      <div className="history-controls">
        <label>
          Indicator
          <select
            value={id}
            onChange={(e) => setId(e.target.value as IndicatorId)}
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
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
          </select>
        </label>
        <label>
          Source
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            <option value="manual">Recorded readings</option>
            <option value="simulator">Mission simulation</option>
          </select>
        </label>
      </div>
      <p className="dialog-copy">
        {indicators[id].name} / {indicators[id].unit}. {available.length}{" "}
        readings in this window.
      </p>
      {indicators[id].kind === "choice" ? (
        <p className="dialog-fine">
          Categorical observations appear in the history below.
        </p>
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
      )}
      <PersonalRange id={id} />
      <p className="dialog-fine">
        The personal range uses prior readings from the current reading’s
        source. The evaluated reading is excluded. Simulation is illustrative,
        not NASA observations.
      </p>
      <details className="history-details">
        <summary>View reading history ({available.length})</summary>
        <div className="history-table-wrap">
          <table className="news-table">
            <caption>
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
              {[...available].reverse().map((e) => (
                <tr key={e.recordId}>
                  <td>
                    <time dateTime={e.timestamp}>
                      {e.timestamp.slice(0, 16).replace("T", " ")}
                    </time>
                  </td>
                  <td>
                    {formatValue(id, e.value)}{" "}
                    {e.legacyScale ? "(original 1–5)" : indicators[id].unit}
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
        </div>
      </details>
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
          {busy ? "Loading…" : "Load mission simulation"}
        </button>
      </div>
      {storageError && (
        <p role="alert" className="form-error">
          {storageError}
        </p>
      )}
    </div>
  );
}
