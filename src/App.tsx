import { lazy, Suspense, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useMission } from './store/mission';
import { crew } from './data/mission';
import { Header, CameraControls, ActionBar, Telemetry, Footer } from './features/dashboard/Chrome';
import { ScoreBlock, SystemsPanel } from './features/dashboard/SystemsPanel';
import { Inspector } from './features/dashboard/Inspector';
import { Panels } from './features/dashboard/Panels';
import { Emergency } from './features/emergency/Emergency';

const Scene = lazy(() => import('./features/twin/Scene'));

export default function App() {
  const night = useMission((s) => s.night);
  const emergency = useMission((s) => s.emergency);
  const toast = useMission((s) => s.toast);
  const notify = useMission((s) => s.notify);
  const hydrate = useMission((s) => s.hydrate);
  const [wide, setWide] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = night ? 'night' : 'day'; }, [night]);
  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => notify(''), 4000);
    return () => clearTimeout(t);
  }, [toast, notify]);

  if (emergency) return <Emergency />;

  return (
    <div className={`shell ${wide ? 'is-wide' : ''}`}>
      <Header />
      <main className="stage">
        <div className="stage-scene">
          <Suspense fallback={<div className="scene-loading"><span className="micro">Preparing viewport</span></div>}>
            <Scene />
          </Suspense>
        </div>
        <aside className="stage-left">
          <ScoreBlock />
          <SystemsPanel />
        </aside>
        <div className="specimen" aria-hidden="true">
          <span className="micro">Digital body / {crew.code}</span>
          <b>{crew.name}</b>
          <span className="micro">{crew.role} · mission simulation</span>
        </div>
        <aside className="stage-right">
          <Inspector />
        </aside>
        <CameraControls wide={wide} setWide={setWide} />
      </main>
      <ActionBar />
      <Telemetry />
      <Footer />
      <Panels />
      {toast && (
        <div role="status" className="toast">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </div>
  );
}
