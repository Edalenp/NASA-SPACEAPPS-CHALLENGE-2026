import { useEffect } from 'react';
import App from '../../App';
import { initializeCrew, useCrew } from '../../store/crew';
import { useMission } from '../../store/mission';
import { evidenceFromSearch } from '../evidence/entry';

export default function CrewLab() {
  const id = useCrew(s => { const p = s.members.find(p => p.id === s.activeId); return `${s.activeId}:${p?.anatomy}:${p?.displayName}`; });
  const ready = useCrew(s => s.ready);
  const error = useCrew(s => s.error);
  useEffect(() => {
    let live = true;
    void initializeCrew().then(async () => {
      await useMission.getState().hydrate();
      const evidence = evidenceFromSearch(window.location.search);
      if (!live || !evidence) return;
      const mission = useMission.getState();
      if (evidence === 'osd575') mission.open('trends');
      else if (evidence === 'radiation') mission.open('mission');
      else if (evidence === 'iss-kit') mission.open('guides', { guide: 'systolic' });
      else { useMission.setState({ selected: 'bones', focus: null }); mission.open('system'); }
    });
    return () => { live = false; };
  }, []);
  if (!ready) return <div role="status" style={{ padding: 32 }}>{error || 'Loading crew profiles…'}</div>;
  return <><App key={id} />{error && <div role="alert" className="measurement-storage">{error}</div>}</>;
}
