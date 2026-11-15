import { lazy, Suspense, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useMission } from "./store/mission";
import { useIntro } from "./features/twin/intro";
import {
  Header,
  CameraControls,
  ActionBar,
  MissionBrief,
  SystemDock,
  Footer,
} from "./features/dashboard/Chrome";
import { ScoreBlock } from "./features/dashboard/ScoreBlock";
import { Inspector } from "./features/dashboard/Inspector";
import { Panels } from "./features/dashboard/Panels";
import { Emergency } from "./features/emergency/Emergency";

const Scene = lazy(() => import("./features/twin/Scene"));

export default function App() {
  const introDone = useIntro((s) => s.done);
  const night = useMission((s) => s.night);
  const emergency = useMission((s) => s.emergency);
  const toast = useMission((s) => s.toast);
  const notify = useMission((s) => s.notify);
  const tick = useMission((s) => s.tick);
  const storageError = useMission((s) => s.storageError);
  const hydrate = useMission((s) => s.hydrate);
  const selected = useMission((s) => s.selected);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = night ? "night" : "day";
  }, [night]);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => notify(""), 4000);
    return () => clearTimeout(t);
  }, [toast, notify]);

  useEffect(() => {
    const timer = setInterval(tick, 30000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, [tick]);

  if (emergency) return <Emergency />;

  return (
    <div className={`shell ${wide ? "is-wide" : ""} ${introDone ? "is-arrived" : "is-intro"}`}>
      <Header />
      <main className="stage">
        <div className="stage-scene">
          <Suspense
            fallback={
              <div className="scene-loading">
                <span className="micro">Preparing viewport</span>
              </div>
            }
          >
            <Scene />
          </Suspense>
        </div>
        {/* The selected system's detail. Systems are picked in the dock below or on the body. */}
        <aside className="stage-left" inert={wide}>
          <Inspector key={selected} />
        </aside>
        <aside className="stage-right">
          <ScoreBlock />
          <MissionBrief />
        </aside>
        <ActionBar />
        <CameraControls wide={wide} setWide={setWide} />
      </main>
      <SystemDock />
      <Footer />
      <Panels />
      {storageError && (
        <div role="alert" className="measurement-storage">
          {storageError}
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
