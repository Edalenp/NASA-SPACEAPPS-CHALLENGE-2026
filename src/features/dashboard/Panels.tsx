import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  environments,
  formatDelay,
  systems,
  type EnvironmentId,
} from "../../data/mission";
import { formatValue, indicators } from "../../data/indicators";
import { GuidesPanel } from "../guides/GuidesPanel";
import { useMission, type Panel } from "../../store/mission";
import { useAssessment } from "../../store/derived";
import {
  newsParameters as news2Params,
  systemZones,
} from "../measurements/adapter";
import { RecordPanel } from "../measurements/RecordPanel";
import { TrendsPanel } from "../trends/TrendsPanel";
import { RoutinePanel } from "../routine/RoutinePanel";
import { AssessmentPlan } from "./AssessmentPlan";
import { getRisksByZone } from "../../data/nasa";
import { Dialog } from "../../ui/Dialog";
import { LiveFigure } from "../../ui/LiveFigure";

const titles: Record<Exclude<Panel, null>, string> = {
  system: "",
  record: "Record a measurement.",
  trends: "A view across the mission.",
  guides: "Measure with confidence.",
  routine: "Your daily check-in.",
  mission: "Mission environment.",
  news: "Early warning score.",
  sources: "Built on open knowledge.",
};

export function Panels() {
  const panel = useMission((s) => s.panel);
  const open = useMission((s) => s.open);
  const selected = useMission((s) => s.selected);
  const guide = useMission((s) => s.guide);
  const sys = systems.find((s) => s.id === selected)!;
  return (
    <Dialog
      open={panel !== null}
      onOpenChange={(o) => {
        if (!o) open(null);
      }}
      kicker={`VITRUVIO / ${panel ?? ""}`}
      title={panel === "system" ? sys.name : panel ? titles[panel] : ""}
    >
      {panel === "system" && <SystemPanel />}
      {panel === "record" && <RecordPanel />}
      {panel === "trends" && <TrendsPanel />}
      {panel === "guides" && (
        <GuidesPanel
          guide={guide}
          onSelectGuide={(id) => open("guides", { guide: id })}
          onRecord={(id) => open("record", { recordFor: id })}
        />
      )}
      {panel === "routine" && <RoutinePanel />}
      {panel === "mission" && <MissionPanel />}
      {panel === "news" && <NewsPanel />}
      {panel === "sources" && <SourcesPanel />}
    </Dialog>
  );
}

const HRP = "https://www.nasa.gov/hrp/";

function SystemPanel() {
  const selected = useMission((s) => s.selected);
  const env = environments[useMission((s) => s.environment)];
  const sys = systems.find((s) => s.id === selected)!;
  return (
    <>
      <p className="dialog-copy">{sys.description}</p>
      <div className="block">
        <span className="micro">Spaceflight hazards that weigh here</span>
        <ul className="tags">
          {sys.hazards.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
      <div className="block">
        <span className="micro">NASA Human Research Program risk</span>
        <p className="dialog-copy">
          {sys.hrpRisk}. Your environment adds: {env.context.toLowerCase()}.
        </p>
      </div>
      {getRisksByZone(systemZones[selected]).map((risk) => (
        <p key={risk.id} className="dialog-fine">
          <a href={risk.officialUrl} target="_blank" rel="noreferrer">
            {risk.title} ↗
          </a>
        </p>
      ))}
      <a
        className="btn btn-outline"
        href={HRP}
        target="_blank"
        rel="noreferrer"
      >
        NASA Human Research Program{" "}
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>
      <p className="dialog-fine">
        Risk names are paraphrased from the HRP risk list. NASA does not endorse
        this prototype.
      </p>
    </>
  );
}

function MissionPanel() {
  const environment = useMission((s) => s.environment);
  const setEnvironment = useMission((s) => s.setEnvironment);
  return (
    <>
      <p className="dialog-copy">
        The environment sets the context and how long Earth takes to answer.
      </p>
      <div className="options">
        {(Object.keys(environments) as EnvironmentId[]).map((k) => {
          const e = environments[k];
          return (
            <button
              key={k}
              type="button"
              aria-pressed={environment === k}
              className={environment === k ? "is-on" : ""}
              onClick={() => setEnvironment(k)}
            >
              <span className="micro">{e.code}</span>
              <b>{e.name}</b>
              <span className="micro">
                {formatDelay(e.delayMin)} one way · {e.context}
              </span>
            </button>
          );
        })}
      </div>
      <p className="dialog-fine">
        Delays are scenario settings. No link to a real mission is made.
      </p>
    </>
  );
}

function NewsPanel() {
  const { score, readings } = useAssessment();
  const open = useMission((s) => s.open);
  // Green when the score is low; colour when it asks someone to act: watch for the CMO, alert for urgent care.
  const tone = !score.complete ? "calm" : score.escalation === "self" ? "good" : score.escalation === "cmo" ? "watch" : "alert";
  return (
    <>
      <div className={`news-total aura is-${tone}`}>
        <strong>
          <LiveFigure value={score.complete ? String(score.total) : "—"} />
        </strong>
        <span>
          of 20 · {score.risk} · {score.measured} of 7 measured
        </span>
      </div>
      <table className="news-table">
        <caption className="sr-only">NEWS2 parameters and scores</caption>
        <tbody>
          {news2Params.map((p) => (
            <tr key={p} className={score.scores[p] ? "is-scored" : ""}>
              <th scope="row">{indicators[p].name}</th>
              <td>
                {formatValue(p, readings[p])}{" "}
                <small>
                  {indicators[p].kind === "number" && readings[p] !== null
                    ? indicators[p].unit
                    : ""}
                </small>
              </td>
              <td>
                <span className={`score-box s${score.scores[p] ?? "x"}`}>
                  {score.scores[p] ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="dialog-h3">Who to tell</h3>
      <AssessmentPlan />
      <p className="dialog-fine">
        NEWS2, unmodified, © Royal College of Physicians 2017. Validated for
        care on Earth, not for spaceflight. Concern about a crewmate overrides
        the score. SpO₂ uses Scale 1.
      </p>
      {!score.complete && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() =>
            open("record", {
              recordFor: news2Params.find((id) => readings[id] === null),
            })
          }
        >
          Record a missing reading <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

function SourcesPanel() {
  return (
    <div className="sources">
      <article>
        <span className="micro">Early warning / NEWS2</span>
        <h3>Royal College of Physicians, 2017</h3>
        <p>
          Scoring bands and thresholds unaltered. Transcribed with AI
          assistance; human check pending.
        </p>
      </article>
      <article>
        <span className="micro">Spaceflight context</span>
        <h3>NASA Human Research Program</h3>
        <p>
          The five hazards of human spaceflight and the related HRP risks,
          paraphrased per body system. Links give context, not endorsement.
        </p>
        <a href={HRP} target="_blank" rel="noreferrer">
          nasa.gov/hrp <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </article>
      <article>
        <span className="micro">Anatomical model / CC BY 4.0</span>
        <h3>Open Anatomy 3D</h3>
        <p>
          BodyParts3D © DBCLS (CC BY 4.0); HuBMAP Human Reference Atlas (CC BY
          4.0); MakeHuman (CC0). Materials changed for this scene.
        </p>
        <a
          href="https://github.com/MervinR07/open-anatomy-3d"
          target="_blank"
          rel="noreferrer"
        >
          Model, attribution and licence{" "}
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </article>
      <article>
        <span className="micro">Built by Tonoteam Ultimate</span>
        <p>
          React, TypeScript, React Three Fiber, Zustand, Dexie, Radix, Vite PWA.
          Code written with AI assistance (OpenAI Codex, Anthropic Claude).
          Readings are labelled by source; the optional mission simulation is
          illustrative.
        </p>
      </article>
    </div>
  );
}
