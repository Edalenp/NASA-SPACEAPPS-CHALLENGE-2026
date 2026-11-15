import { useEffect } from 'react';
import App from '../../App';
import { initializeCrew, useCrew } from '../../store/crew';
import { useMission } from '../../store/mission';

export default function CrewLab() {
  const id = useCrew(s => { const p = s.members.find(p => p.id === s.activeId); return `${s.activeId}:${p?.anatomy}:${p?.displayName}`; });
  const ready = useCrew(s => s.ready);
  const error = useCrew(s => s.error);
  useEffect(() => { void initializeCrew().then(() => useMission.getState().hydrate()); }, []);
  if (!ready) return <div role="status" style={{ padding: 32 }}>{error || 'Loading crew profiles…'}</div>;
  return <><App key={id} />{error && <div role="alert" className="measurement-storage">{error}</div>}</>;
}
