import type { Alert, Environment } from './types'

export type ContactRole = 'crewPartner' | 'medicalOfficer' | 'missionControl'

/** Why a contact is in the plan. NEWS2 levels first, then findings NEWS2 does not score. */
export type EscalationReason =
  | 'news2High'
  | 'news2Medium'
  | 'singleRed'
  | 'zoneAlert'
  | 'zoneAttention'

export interface EscalationStep {
  contactRole: ContactRole
  /** When to make the contact. Onboard help is never pushed back by the Earth link. */
  dueAt: string
  /** 'earth' contacts cross the communication delay; 'onboard' ones do not. */
  channel?: 'onboard' | 'earth'
  /** Earth contacts only: earliest reply, one round trip after the message leaves. */
  earliestReplyAt?: string
  reason?: EscalationReason
}

export interface EscalationPlan {
  alertId: string
  steps: EscalationStep[]
  /** True when NEWS2 is incomplete: the plan then follows the readings that are recorded. */
  partial?: boolean
}

/** Minutes from the assessment to each contact. Onboard times never include the Earth delay. */
export const ESCALATION_MINUTES = {
  high: { medicalOfficer: 5, missionControl: 10 },
  singleRed: { medicalOfficer: 10 },
  medium: { crewPartner: 15, medicalOfficer: 30 },
  zoneAlert: { medicalOfficer: 10 },
  zoneAttention: { medicalOfficer: 60 },
} as const

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

/**
 * RF-23 / RF-24. NEWS2 sets the level; zone findings outside NEWS2 (absolute clinical limits,
 * personal-range changes, a red parameter on an incomplete score) still get a follow-up, so an
 * alert never returns an empty plan. Crewmates and the Crew Medical Officer are aboard: their
 * times ignore the Earth link. Mission control is contacted at the same pace, and the plan
 * states when a reply can arrive at the earliest.
 */
export function planEscalation(
  alert: Alert,
  environment: Environment,
  now: string,
): EscalationPlan {
  const roundTrip = environment.communicationDelayMinutes * 2
  const onboard = (contactRole: ContactRole, minutes: number, reason: EscalationReason): EscalationStep => ({
    contactRole,
    dueAt: addMinutes(now, minutes),
    channel: 'onboard',
    reason,
  })
  const earth = (minutes: number, reason: EscalationReason): EscalationStep => ({
    contactRole: 'missionControl',
    dueAt: addMinutes(now, minutes),
    channel: 'earth',
    earliestReplyAt: addMinutes(now, minutes + roundTrip),
    reason,
  })
  const partial = !alert.isComplete
  const plan = (steps: EscalationStep[]): EscalationPlan => ({ alertId: alert.id, steps, ...(partial ? { partial } : {}) })

  if (alert.level === 'high') {
    const m = ESCALATION_MINUTES.high
    return plan([onboard('medicalOfficer', m.medicalOfficer, 'news2High'), earth(m.missionControl, 'news2High')])
  }
  if (alert.level === 'medium') {
    const m = ESCALATION_MINUTES.medium
    return plan([
      onboard('crewPartner', m.crewPartner, 'news2Medium'),
      onboard('medicalOfficer', m.medicalOfficer, 'news2Medium'),
    ])
  }
  if (alert.level === 'singleRed') {
    return plan([onboard('medicalOfficer', ESCALATION_MINUTES.singleRed.medicalOfficer, 'singleRed')])
  }
  // Low or incomplete NEWS2: fall back to what the zones found.
  const states = Object.values(alert.zones).map((zone) => zone.state)
  if (states.includes('alert')) {
    return plan([onboard('medicalOfficer', ESCALATION_MINUTES.zoneAlert.medicalOfficer, 'zoneAlert')])
  }
  if (states.includes('attention')) {
    return plan([onboard('medicalOfficer', ESCALATION_MINUTES.zoneAttention.medicalOfficer, 'zoneAttention')])
  }
  return plan([])
}
