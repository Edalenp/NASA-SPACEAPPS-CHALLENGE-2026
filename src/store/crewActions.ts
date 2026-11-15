import { useCrew, initializeCrew } from './crew';
import { useMission } from './mission';
import { useHealthStore } from './healthStore';
import { emptyReadings } from '../features/measurements/adapter';
import { useIntro } from '../features/twin/intro';

export async function switchCrew(id: string) {
  if (useCrew.getState().pending || useMission.getState().busy || useMission.getState().emergency) throw new Error('Finish the current operation before changing crew member.');
  await initializeCrew();
  if (!useCrew.getState().members.some(p => p.id === id)) throw new Error('Unknown crew member.');
  useCrew.setState({ pending: true });
  try {
    // Clear the previous snapshot before publishing a new identity.
    useMission.setState({ entries: [], readings: emptyReadings(), hydrated: false, panel: null, focus: null, selected: 'heart', rotation: 0, toast: '', storageError: '' });
    const previous = useMission.getState();
    useHealthStore.getState().refresh([], previous.now, previous.environment);
    useIntro.setState({ ready: false, loading: true, progress: 0, model: { loaded: 0, total: 0 } });
    useCrew.setState({ activeId: id });
    const state = useMission.getState();
    useHealthStore.getState().refresh([], state.now, state.environment);
    await state.hydrate();
    if (useMission.getState().storageError) throw new Error(useMission.getState().storageError);
    try { localStorage.setItem('vt-active-crew', id); } catch { /* Profiles and readings remain in IndexedDB. */ }
  } finally { useCrew.setState({ pending: false }); }
}
