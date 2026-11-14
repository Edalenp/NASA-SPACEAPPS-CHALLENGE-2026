import { describe, expect, it } from 'vitest'
import {
  ZONE_IDS,
  type Alert,
  type CrewMember,
  type Environment,
  type Measurement,
  type ZoneEvaluation,
  type ZoneId,
} from './index'

const measurement: Measurement = {
  id: 'm-001',
  crewMemberId: 'crew-1',
  type: 'heartRate',
  value: 72,
  unit: 'bpm',
  measuredAt: '2026-11-14T09:00:00.000Z',
  source: 'manual',
  missionDay: 12,
}

const crewMember: CrewMember = {
  id: 'crew-1',
  displayName: 'Demo Crew',
  role: 'crew',
  environmentId: 'env-station',
}

const environment: Environment = {
  id: 'env-station',
  kind: 'spaceStation',
  name: 'Low Earth Orbit Station',
  communicationDelayMinutes: 0,
}

function buildZones(): Record<ZoneId, ZoneEvaluation> {
  const zones = {} as Record<ZoneId, ZoneEvaluation>
  for (const zoneId of ZONE_IDS) {
    zones[zoneId] = { zoneId, state: 'normal', indicators: [], actions: [] }
  }
  return zones
}

const alert: Alert = {
  id: 'alert-001',
  crewMemberId: 'crew-1',
  createdAt: '2026-11-14T09:01:00.000Z',
  news2Score: 0,
  isComplete: true,
  level: 'low',
  consciousness: 'alert',
  zones: buildZones(),
}

describe('engine data contract', () => {
  it('accepts a valid measurement', () => {
    expect(measurement.value).toBe(72)
    expect(measurement.unit).toBe('bpm')
  })

  it('links a crew member to an environment', () => {
    expect(crewMember.environmentId).toBe(environment.id)
  })

  it('builds a zone evaluation for every zone id', () => {
    expect(Object.keys(alert.zones).sort()).toEqual([...ZONE_IDS].sort())
  })

  it('allows an incomplete alert without score or level', () => {
    const incomplete: Alert = {
      ...alert,
      news2Score: null,
      isComplete: false,
      level: null,
    }
    expect(incomplete.news2Score).toBeNull()
    expect(incomplete.level).toBeNull()
  })
})
