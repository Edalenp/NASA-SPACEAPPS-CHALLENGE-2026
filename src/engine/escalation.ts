import type { Alert, Environment } from './types'

export type ContactRole = 'crewPartner' | 'medicalOfficer' | 'missionControl'

export interface EscalationStep {
  contactRole: ContactRole
  dueAt: string
}

export interface EscalationPlan {
  alertId: string
  steps: EscalationStep[]
}

const HIGH_FIRST_STEP_MINUTES = 5
const HIGH_SECOND_STEP_MINUTES = 10
const SINGLE_RED_FIRST_STEP_MINUTES = 10
const MEDIUM_FIRST_STEP_MINUTES = 15
const MEDIUM_SECOND_STEP_MINUTES = 30

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

export function planEscalation(
  alert: Alert,
  environment: Environment,
  now: string,
): EscalationPlan {
  const roundTripDelay = environment.communicationDelayMinutes * 2
  if (alert.level === 'high') {
    return {
      alertId: alert.id,
      steps: [
        {
          contactRole: 'medicalOfficer',
          dueAt: addMinutes(now, HIGH_FIRST_STEP_MINUTES + roundTripDelay),
        },
        {
          contactRole: 'missionControl',
          dueAt: addMinutes(now, HIGH_SECOND_STEP_MINUTES + roundTripDelay),
        },
      ],
    }
  }
  if (alert.level === 'singleRed') {
    return {
      alertId: alert.id,
      steps: [
        {
          contactRole: 'medicalOfficer',
          dueAt: addMinutes(now, SINGLE_RED_FIRST_STEP_MINUTES + roundTripDelay),
        },
      ],
    }
  }
  if (alert.level === 'medium') {
    return {
      alertId: alert.id,
      steps: [
        {
          contactRole: 'crewPartner',
          dueAt: addMinutes(now, MEDIUM_FIRST_STEP_MINUTES + roundTripDelay),
        },
        {
          contactRole: 'medicalOfficer',
          dueAt: addMinutes(now, MEDIUM_SECOND_STEP_MINUTES + roundTripDelay),
        },
      ],
    }
  }
  return { alertId: alert.id, steps: [] }
}
