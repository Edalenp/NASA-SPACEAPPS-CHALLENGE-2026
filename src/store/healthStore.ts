import { create } from 'zustand'
import { planEscalation, type EscalationPlan, type IndicatorType, type Measurement } from '../engine'
import { buildAlert, INDICATOR_TYPES, type HealthSnapshot } from './alertBuilder'
import {
  getCrewMember,
  getEnvironment,
  getLatestByType,
  getLatestObservation,
  getSeries,
} from './db'

export async function loadSnapshot(
  crewMemberId: string,
  now = new Date().toISOString(),
  onSupplementalOxygen?: boolean,
): Promise<HealthSnapshot> {
  const latest = await getLatestByType(crewMemberId)
  const history: Partial<Record<IndicatorType, Measurement[]>> = {}
  await Promise.all(
    INDICATOR_TYPES.filter((type) => latest[type]).map(async (type) => {
      history[type] = await getSeries(crewMemberId, type)
    }),
  )
  const observation = await getLatestObservation(crewMemberId)
  return buildAlert({
    crewMemberId,
    now,
    latest,
    history,
    consciousness: observation?.level ?? null,
    onSupplementalOxygen,
  })
}

interface HealthState {
  snapshot: HealthSnapshot | null
  escalation: EscalationPlan | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  refresh: (crewMemberId: string, onSupplementalOxygen?: boolean) => Promise<void>
}

export const useHealthStore = create<HealthState>((set) => ({
  snapshot: null,
  escalation: null,
  status: 'idle',
  error: null,
  refresh: async (crewMemberId, onSupplementalOxygen) => {
    set({ status: 'loading', error: null })
    try {
      const now = new Date().toISOString()
      const snapshot = await loadSnapshot(crewMemberId, now, onSupplementalOxygen)
      const crew = await getCrewMember(crewMemberId)
      const environment = crew ? await getEnvironment(crew.environmentId) : undefined
      const escalation = environment ? planEscalation(snapshot.alert, environment, now) : null
      set({ snapshot, escalation, status: 'ready' })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : 'Unknown error' })
    }
  },
}))