import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
import { FirstCheckWelcome } from "./features/routine/FirstCheckWelcome";
import { SceneLoader } from "./ui/SceneLoader";
import { Tour } from "./features/tour/Tour.tsx";
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
  const [exploring, setExploring] = useState(false);
  const gesture = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const release = () => { gesture.current.active = false; setExploring(false); };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', release);
    };
  }, []);

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
    <div className={`shell ${wide ? "is-wide" : ""} ${exploring ? "is-exploring" : ""} ${introDone ? "is-arrived" : "is-intro"}`}>
      <Header />
      <main className="stage">
        <div className="stage-scene"
          onPointerDownCapture={(event) => {
            if ((event.target as Element).closest('button') || event.button !== 0) return;
            gesture.current = { x: event.clientX, y: event.clientY, active: true };
          }}
          onPointerMoveCapture={(event) => {
            const drag = gesture.current;
            if (!drag.active || !event.buttons) return;
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) {
              setExploring(true);
            }
          }}
          onPointerUpCapture={() => { gesture.current.active = false; setExploring(false); }}
          onPointerCancel={() => { gesture.current.active = false; setExploring(false); }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </div>
        {/* The selected system's detail. Systems are picked in the dock below or on the body. */}
        <aside className="stage-left" inert={wide}>
          <Inspector key={selected} />
        </aside>
        <aside className="stage-right" inert={wide}>
          <ScoreBlock />
          <MissionBrief />
        </aside>
        <FirstCheckWelcome />
        <ActionBar />
        <CameraControls wide={wide} setWide={setWide} />
      </main>
      <SystemDock />
      <Footer />
      <Panels />
      <SceneLoader />
      <Tour />
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
