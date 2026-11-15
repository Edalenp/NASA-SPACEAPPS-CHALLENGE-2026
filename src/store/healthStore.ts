import { create } from 'zustand'
import type { EnvironmentId } from '../data/mission'
import { assess } from '../features/measurements/assessment'
import type { RecordEntry } from '../features/measurements/adapter'

export type Assessment = ReturnType<typeof assess>

export interface HealthInputs {
  entries: RecordEntry[]
  now: string
  environment: EnvironmentId
}

interface HealthState {
  assessment: Assessment
  inputs: HealthInputs
  status: 'ready' | 'error'
  error: string | null
  /** Recompute the single derived assessment from the mission's current inputs. */
  refresh: (entries: RecordEntry[], now: string, environment: EnvironmentId) => void
}

const initialNow = new Date().toISOString()
const initialInputs: HealthInputs = {
  entries: [],
  now: initialNow,
  environment: 'transit',
}

export const useHealthStore = create<HealthState>((set) => ({
  assessment: assess(initialInputs.entries, initialInputs.now, initialInputs.environment),
  inputs: initialInputs,
  status: 'ready',
  error: null,
  refresh: (entries, now, environment) => {
    try {
      const assessment = assess(entries, now, environment)
      set({
        assessment,
        inputs: { entries, now, environment },
        status: 'ready',
        error: null,
      })
    } catch (e) {
      set({
        status: 'error',
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  },
}))
