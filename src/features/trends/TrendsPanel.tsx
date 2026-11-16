import { useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Orbit } from "lucide-react";
import {
  indicators,
  formatValue,
  type IndicatorId,
} from "../../data/indicators";
import { useMission } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import { DAY_MS } from "../measurements/adapter";
import { PersonalRange } from "../measurements/PersonalRange";
import { crewBand, crewBandNotices, type CrewPhase } from "./osd575";
import "./trends.css";
import { BalanceRadar, TrendChart, TrendKpis, WeeklyRidges } from "./TrendCharts";
import { evidenceFromSearch } from '../evidence/entry';

const PAGE = 8;

export function TrendsPanel() {
  const [id, setId] = useState<IndicatorId>(() => evidenceFromSearch(window.location.search) === 'osd575' ? 'glucose' : 'systolic');
  const [days, setDays] = useState(30);
  const [source, setSource] = useState("all");
  const [view, setView] = useState<"chart" | "weeks" | "balance" | "history">("chart");
  const [page, setPage] = useState(0);
  const [phase, setPhase] = useState<CrewPhase>("all");
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
  // The personal range applies when the shown readings share the latest reading's source.
  const band =
    source === "all" || (source === "simulator") === (latest[id]?.source === "simulator")
      ? baselines[id]
      : undefined;
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
        {crewBand(id) && (
          <div className="trend-crew-note">
            <span className="micro">NASA OSDR · OSD-575 · Inspiration4</span>
            <div className="segmented" role="group" aria-label="Crew band phase">
              {(["pre", "post", "all"] as const).map((p) => (
                <button key={p} type="button" className={phase === p ? "is-on" : ""} aria-pressed={phase === p} onClick={() => setPhase(p)}>
                  {p === "pre" ? "Pre-flight" : p === "post" ? "Post-flight" : "Both"}
                </button>
              ))}
            </div>
            <p className="dialog-fine">
              Dashed band: the lowest to highest value measured in the 4 crew of the
              3-day Inspiration4 flight ({crewBand(id, phase)!.samples} samples). {crewBandNotices().slice(0, 2).join(" ")}{" "}
              <a href={`https://doi.org/${crewBand(id)!.doi}`} target="_blank" rel="noreferrer">
                doi:{crewBand(id)!.doi} <ArrowUpRight size={10} aria-hidden="true" />
              </a>
            </p>
          </div>
        )}
        <p className="dialog-fine">
          The personal range uses prior readings from the current reading’s
          source. The evaluated reading is excluded. Simulation is illustrative,
          not NASA observations.
        </p>
        <div className="simulation-loader">
          <span>
            <b>Explore the mission.</b>
            <small>
              Seeded demo · up to the current mission day and time, within a
              180-day mission. Includes simulated NEWS2 observations; manual readings take priority.
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
            {([["chart", "Trend"], ["weeks", "Weeks"], ["balance", "Balance"], ["history", `History (${available.length})`]] as const).map(([key, label]) => (
              <button key={key} type="button" className={view === key ? "is-on" : ""} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>
            ))}
          </div>
        </div>
        {view === "balance" ? (
          <BalanceRadar entries={entries.filter((e) => e.timestamp <= now)} now={now} />
        ) : view === "chart" || view === "weeks" ? (
          indicators[id].kind === "choice" ? (
            <div className="measurement-empty">
              <h3>Categorical observation.</h3>
              <p>Its readings appear in the history.</p>
            </div>
          ) : points.length ? (
            view === "weeks" ? (
              <WeeklyRidges points={points} id={id} baseline={band} from={from} to={to} />
            ) : (
              <>
                <TrendKpis points={points} id={id} baseline={band} />
                <TrendChart points={points} id={id} baseline={band} from={from} to={to} crew={crewBand(id, phase)} />
              </>
            )
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
                        : e.reaction
                          ? `Reaction test · ${e.reaction.validTrials} valid, ${e.reaction.failures} failures`
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
