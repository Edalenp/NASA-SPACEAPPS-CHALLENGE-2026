import { create } from 'zustand';
import { db } from './db';
import type { CrewMember } from '../engine/types';

export interface CrewProfile extends CrewMember {
  order?: number;
  gender: string;
  anatomy: 'male' | 'female';
}
export const ORIGINAL_CREW_ID = 'JL–02';
export const originalCrew: CrewProfile = { id: ORIGINAL_CREW_ID, displayName: 'Jordan Lee', role: 'crew', environmentId: 'transit', gender: '', anatomy: 'male', order: 0 };
interface CrewState { members: CrewProfile[]; activeId: string; ready: boolean; pending: boolean; error: string }
export const useCrew = create<CrewState>(() => ({ members: [originalCrew], activeId: ORIGINAL_CREW_ID, ready: false, pending: false, error: '' }));
export const activeCrew = () => useCrew.getState().members.find(p => p.id === useCrew.getState().activeId) ?? originalCrew;
let initialization: Promise<void> | undefined;
export function initializeCrew() {
  if (useCrew.getState().ready) return Promise.resolve();
  return initialization ??= (async () => {
    try {
      const saved = await db.crewMembers.toArray();
      const profiles = saved.map((p, index) => ({ ...p, order: (p as CrewProfile).order ?? (p.id === ORIGINAL_CREW_ID ? 0 : index + 1), gender: (p as CrewProfile).gender ?? '', anatomy: (p as CrewProfile).anatomy === 'female' ? 'female' as const : 'male' as const }));
      if (!profiles.some(p => p.id === ORIGINAL_CREW_ID)) { await db.crewMembers.put(originalCrew); profiles.unshift({ ...originalCrew, order: 0 }); }
      let activeId = ORIGINAL_CREW_ID;
      try { const id = localStorage.getItem('vt-active-crew'); if (profiles.some(p => p.id === id)) activeId = id!; } catch { /* Device storage remains authoritative. */ }
      useCrew.setState({ members: profiles.sort((a, b) => a.order - b.order), activeId, ready: true, error: '' });
    } catch {
      // Keep the console and emergency guidance reachable when storage fails.
      // No alternate profile is guessed and no stored data is overwritten.
      useCrew.setState({ members: [originalCrew], activeId: ORIGINAL_CREW_ID, ready: true, error: 'Could not load crew profiles. Using the original profile for this session; reload to retry.' });
    } finally { initialization = undefined; }
  })();
}
export async function saveCrewProfiles(profiles: CrewProfile[]) {
  if (!profiles.length || profiles.some(p => !p.displayName.trim() || p.displayName.length > 60 || !['male', 'female'].includes(p.anatomy))) throw new Error('Enter a name and anatomy for every crew member.');
  if (new Set(profiles.map(p => p.id)).size !== profiles.length) throw new Error('Duplicate crew identifiers.');
  // Add/update only: reducing the setup form never deletes existing people or readings.
  await db.transaction('rw', db.crewMembers, () => db.crewMembers.bulkPut(profiles.map((p, order) => ({ ...p, order, displayName: p.displayName.trim() }))));
  const saved = await db.crewMembers.toArray();
  useCrew.setState({ members: (saved as CrewProfile[]).sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000)) });
}
