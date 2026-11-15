import { describe, expect, it } from 'vitest'
import { planEscalation } from './escalation'
import type { Alert, Environment } from './types'

const NOW = '2026-11-14T09:00:00.000Z'

const environment: Environment = {
  id: 'env-station',
  kind: 'spaceStation',
  name: 'Low Earth Orbit Station',
  communicationDelayMinutes: 0,
}

const alert: Alert = {
  id: 'alert-001',
  crewMemberId: 'crew-1',
  createdAt: NOW,
  news2Score: 9,
  isComplete: true,
  level: 'high',
  consciousness: 'alert',
  zones: {
    head: { zoneId: 'head', state: 'normal', indicators: [], actions: [] },
    heartCirculation: { zoneId: 'heartCirculation', state: 'normal', indicators: [], actions: [] },
    lungs: { zoneId: 'lungs', state: 'normal', indicators: [], actions: [] },
    musculoskeletal: { zoneId: 'musculoskeletal', state: 'normal', indicators: [], actions: [] },
    immuneMetabolic: { zoneId: 'immuneMetabolic', state: 'normal', indicators: [], actions: [] },
    sleepMood: { zoneId: 'sleepMood', state: 'normal', indicators: [], actions: [] },
  },
}

describe('planEscalation', () => {
  it('sends a high alert straight to medical officer then mission control', () => {
    const plan = planEscalation({ ...alert, level: 'high' }, environment, NOW)
    expect(plan.steps.map((step) => step.contactRole)).toEqual([
      'medicalOfficer',
      'missionControl',
    ])
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:05:00.000Z')
    expect(plan.steps[1].dueAt).toBe('2026-11-14T09:10:00.000Z')
  })

  it('adds a round trip delay to high alert deadlines', () => {
    const plan = planEscalation(
      { ...alert, level: 'high' },
      { ...environment, communicationDelayMinutes: 8 },
      NOW,
    )
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:21:00.000Z')
    expect(plan.steps[1].dueAt).toBe('2026-11-14T09:26:00.000Z')
  })

  it('sends a medium alert to crew partner then medical officer', () => {
    const plan = planEscalation({ ...alert, level: 'medium' }, environment, NOW)
    expect(plan.steps.map((step) => step.contactRole)).toEqual(['crewPartner', 'medicalOfficer'])
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:15:00.000Z')
    expect(plan.steps[1].dueAt).toBe('2026-11-14T09:30:00.000Z')
  })

  it('adds a round trip delay to medium alert deadlines', () => {
    const plan = planEscalation(
      { ...alert, level: 'medium' },
      { ...environment, communicationDelayMinutes: 5 },
      NOW,
    )
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:25:00.000Z')
    expect(plan.steps[1].dueAt).toBe('2026-11-14T09:40:00.000Z')
  })

  it('escalates a singleRed alert to the medical officer', () => {
    const plan = planEscalation({ ...alert, level: 'singleRed' }, environment, NOW)
    expect(plan.steps.map((step) => step.contactRole)).toEqual(['medicalOfficer'])
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:10:00.000Z')
  })

  it('adds a round trip delay to singleRed deadlines', () => {
    const plan = planEscalation(
      { ...alert, level: 'singleRed' },
      { ...environment, communicationDelayMinutes: 8 },
      NOW,
    )
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:26:00.000Z')
  })

  it('does not escalate low alerts', () => {
    expect(planEscalation({ ...alert, level: 'low' }, environment, NOW).steps).toEqual([])
  })

  it('does not escalate incomplete alerts without level', () => {
    expect(planEscalation({ ...alert, level: null }, environment, NOW).steps).toEqual([])
  })
})
