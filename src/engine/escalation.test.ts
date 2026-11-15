import { describe, expect, it } from 'vitest'
import { planEscalation } from './escalation'
import type { Alert, Environment, ZoneEvaluation, ZoneId } from './types'

const NOW = '2026-11-14T09:00:00.000Z'

const environment: Environment = {
  id: 'env-station',
  kind: 'spaceStation',
  name: 'Low Earth Orbit Station',
  communicationDelayMinutes: 0,
}
const mars: Environment = { ...environment, kind: 'planetaryBase', communicationDelayMinutes: 20 }

const zone = (zoneId: ZoneId, state: ZoneEvaluation['state'] = 'normal'): ZoneEvaluation => ({
  zoneId,
  state,
  indicators: [],
  actions: [],
})

const alert: Alert = {
  id: 'alert-001',
  crewMemberId: 'crew-1',
  createdAt: NOW,
  news2Score: 9,
  isComplete: true,
  level: 'high',
  consciousness: 'alert',
  zones: {
    head: zone('head'),
    heartCirculation: zone('heartCirculation'),
    lungs: zone('lungs'),
    musculoskeletal: zone('musculoskeletal'),
    immuneMetabolic: zone('immuneMetabolic'),
    sleepMood: zone('sleepMood'),
  },
}

describe('planEscalation', () => {
  it('sends a high alert straight to medical officer then mission control', () => {
    const plan = planEscalation({ ...alert, level: 'high' }, environment, NOW)
    expect(plan.steps.map((step) => step.contactRole)).toEqual(['medicalOfficer', 'missionControl'])
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:05:00.000Z')
    expect(plan.steps[1].dueAt).toBe('2026-11-14T09:10:00.000Z')
    expect(plan.steps.map((step) => step.channel)).toEqual(['onboard', 'earth'])
  })

  it('never delays onboard help by the Earth link (RF-24)', () => {
    for (const level of ['high', 'medium', 'singleRed'] as const) {
      const near = planEscalation({ ...alert, level }, environment, NOW)
      const far = planEscalation({ ...alert, level }, mars, NOW)
      const onboard = (steps: typeof near.steps) =>
        steps.filter((step) => step.channel === 'onboard').map((step) => step.dueAt)
      expect(onboard(far.steps), level).toEqual(onboard(near.steps))
    }
    const single = planEscalation({ ...alert, level: 'singleRed' }, mars, NOW)
    expect(single.steps[0].dueAt).toBe('2026-11-14T09:10:00.000Z')
  })

  it('states the earliest Earth reply one round trip after contacting mission control', () => {
    const plan = planEscalation({ ...alert, level: 'high' }, { ...environment, communicationDelayMinutes: 8 }, NOW)
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:05:00.000Z')
    expect(plan.steps[1].dueAt).toBe('2026-11-14T09:10:00.000Z')
    expect(plan.steps[1].earliestReplyAt).toBe('2026-11-14T09:26:00.000Z')
    expect(plan.steps[0].earliestReplyAt).toBeUndefined()
  })

  it('sends a medium alert to crew partner then medical officer', () => {
    const plan = planEscalation({ ...alert, level: 'medium' }, mars, NOW)
    expect(plan.steps.map((step) => step.contactRole)).toEqual(['crewPartner', 'medicalOfficer'])
    expect(plan.steps[0].dueAt).toBe('2026-11-14T09:15:00.000Z')
    expect(plan.steps[1].dueAt).toBe('2026-11-14T09:30:00.000Z')
  })

  it('escalates a singleRed alert to the medical officer', () => {
    const plan = planEscalation({ ...alert, level: 'singleRed' }, environment, NOW)
    expect(plan.steps.map((step) => step.contactRole)).toEqual(['medicalOfficer'])
    expect(plan.steps[0].reason).toBe('singleRed')
  })

  it('does not escalate a low alert with every zone normal', () => {
    expect(planEscalation({ ...alert, level: 'low' }, environment, NOW).steps).toEqual([])
  })

  it('follows up a clinical alert even when NEWS2 is low (RF-23)', () => {
    const zones = { ...alert.zones, heartCirculation: zone('heartCirculation', 'alert') }
    const plan = planEscalation({ ...alert, level: 'low', zones }, mars, NOW)
    expect(plan.steps).toEqual([
      { contactRole: 'medicalOfficer', dueAt: '2026-11-14T09:10:00.000Z', channel: 'onboard', reason: 'zoneAlert' },
    ])
  })

  it('schedules a review for a change from the personal range', () => {
    const zones = { ...alert.zones, sleepMood: zone('sleepMood', 'attention') }
    const plan = planEscalation({ ...alert, level: 'low', zones }, environment, NOW)
    expect(plan.steps.map((step) => [step.contactRole, step.reason])).toEqual([['medicalOfficer', 'zoneAttention']])
    expect(plan.steps[0].dueAt).toBe('2026-11-14T10:00:00.000Z')
  })

  it('follows the recorded readings when NEWS2 is incomplete, and says so', () => {
    const zones = { ...alert.zones, lungs: zone('lungs', 'alert') }
    const plan = planEscalation({ ...alert, level: null, isComplete: false, zones }, environment, NOW)
    expect(plan.partial).toBe(true)
    expect(plan.steps.map((step) => step.reason)).toEqual(['zoneAlert'])
  })

  it('returns no contacts for an incomplete alert with nothing abnormal', () => {
    const plan = planEscalation({ ...alert, level: null, isComplete: false }, environment, NOW)
    expect(plan.steps).toEqual([])
    expect(plan.partial).toBe(true)
  })
})
