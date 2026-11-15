import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAll, db } from './db';
import { useMission } from './mission';
import { useCrew, originalCrew, saveCrewProfiles, initializeCrew } from './crew';
import { switchCrew } from './crewActions';
import { useHealthStore } from './healthStore';
import { buildReport } from '../features/measurements/report';

const second = { ...originalCrew, id: 'test-astronaut-2', displayName: 'Valentina', anatomy: 'female' as const };
beforeEach(async () => {
  await clearAll();
  useCrew.setState({ members: [originalCrew], activeId: originalCrew.id, ready: false, pending: false, error: '' });
  useMission.setState({ busy: false, emergency: false });
  await initializeCrew();
  await saveCrewProfiles([originalCrew, second]);
  await useMission.getState().hydrate();
});
describe('crew labs', () => {
  it('keeps the console reachable with an explicit warning if profile storage fails', async () => {
    useCrew.setState({ ready: false });
    const read = vi.spyOn(db.crewMembers, 'toArray').mockRejectedValueOnce(new Error('Storage unavailable'));
    await initializeCrew();
    expect(useCrew.getState()).toMatchObject({ ready: true, activeId: originalCrew.id });
    expect(useCrew.getState().error).toContain('Could not load crew profiles');
    read.mockRestore();
  });
  it('isolates metrics, observations, categorical readings, assessment and reports across switches', async () => {
    await useMission.getState().record('pulse', 72);
    await useMission.getState().record('oxygen', 'oxygen');
    await useMission.getState().record('consciousness', 'voice');
    await switchCrew(second.id);
    expect(useMission.getState().readings.pulse).toBeNull();
    expect(useMission.getState().readings.oxygen).toBeNull();
    expect(useMission.getState().readings.consciousness).toBeNull();
    expect(useHealthStore.getState().assessment.latest.pulse).toBeUndefined();
    await useMission.getState().record('pulse', 95);
    await useMission.getState().record('oxygen', 'air');
    const state = useMission.getState();
    const report = buildReport(useHealthStore.getState().assessment, { now: state.now, missionStart: state.missionStart, environment: state.environment }, []);
    expect(report).toContain('Valentina');
    expect(report).not.toContain('Jordan Lee');
    await switchCrew(originalCrew.id);
    expect(useMission.getState().readings).toMatchObject({ pulse: 72, oxygen: 'oxygen', consciousness: 'voice' });
    await switchCrew(second.id);
    expect(useMission.getState().readings).toMatchObject({ pulse: 95, oxygen: 'air', consciousness: null });
  });
  it('imports unowned legacy rows only into the original profile', async () => {
    await db.entries.add({ indicator: 'pulse', value: 80, timestamp: new Date().toISOString() });
    await switchCrew(second.id);
    expect(useMission.getState().entries).toHaveLength(0);
    await switchCrew(originalCrew.id);
    expect(useMission.getState().readings.pulse).toBe(80);
    expect((await db.measurements.toArray())[0].crewMemberId).toBe(originalCrew.id);
  });
  it('loads distinct simulations without touching another astronaut’s records', async () => {
    await useMission.getState().loadSimulation();
    const count = await db.measurements.where('crewMemberId').equals(originalCrew.id).count();
    await switchCrew(second.id);
    expect(useMission.getState().entries).toHaveLength(0);
    await useMission.getState().loadSimulation();
    expect(await db.measurements.where('crewMemberId').equals(originalCrew.id).count()).toBe(count);
    expect(await db.measurements.where('crewMemberId').equals(second.id).count()).toBe(count);
  });
  it('prevents switches during writes or emergencies and retains existing profiles when saving', async () => {
    useMission.setState({ busy: true });
    await expect(switchCrew(second.id)).rejects.toThrow();
    useMission.setState({ busy: false, emergency: true });
    await expect(switchCrew(second.id)).rejects.toThrow();
    await saveCrewProfiles([{ ...originalCrew, displayName: 'Santiago' }]);
    expect(await db.crewMembers.get(second.id)).toBeDefined();
  });
});
