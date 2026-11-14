import { describe, expect, it } from 'vitest'
import type { IndicatorType, Measurement } from '../engine'
import { buildAlert } from './alertBuilder'

const UNITS: Record<string, Measurement['unit']> = {
  heartRate: 'bpm',
  respiratoryRate: 'breaths/min',
  oxygenSaturation: '%',
  systolicBloodPressure: 'mmHg',
  temperature: '°C',
}

const m = (type: IndicatorType, value: number, measuredAt: string, id: string): Measurement => ({
  id,
  crewMemberId: 'crew-1',
  type,
  value,
  unit: UNITS[type] ?? 'score',
  measuredAt,
  source: 'manual',
})

const NOW = '2026-11-14T20:00:00.000Z'
const day = (n: number) => `2026-11-${String(n).padStart(2, '0')}T08:00:00.000Z`

const normalLatest = () => ({
  respiratoryRate: m('respiratoryRate', 16, day(14), 'rr'),
  oxygenSaturation: m('oxygenSaturation', 97, day(14), 'sp'),
  systolicBloodPressure: m('systolicBloodPressure', 120, day(14), 'bp'),
  heartRate: m('heartRate', 70, day(14), 'hr'),
  temperature: m('temperature', 37, day(14), 'tp'),
})

describe('buildAlert', () => {
  it('classifies a complete normal set as low', () => {
    const { alert } = buildAlert({
      crewMemberId: 'crew-1',
      now: NOW,
      latest: normalLatest(),
      history: {},
      consciousness: 'alert',
    })
    expect(alert.isComplete).toBe(true)
    expect(alert.level).toBe('low')
  })

  it('marks the alert incomplete when consciousness is missing', () => {
    const { alert, news2 } = buildAlert({
      crewMemberId: 'crew-1',
      now: NOW,
      latest: normalLatest(),
      history: {},
      consciousness: null,
    })
    expect(news2.isComplete).toBe(false)
    expect(alert.isComplete).toBe(false)
    expect(alert.level).toBeNull()
    expect(alert.news2Score).toBeNull()
  })

  it('adds 2 points when supplemental oxygen is used', () => {
    const base = {
      crewMemberId: 'crew-1',
      now: NOW,
      latest: normalLatest(),
      history: {},
      consciousness: 'alert' as const,
    }
    expect(buildAlert(base).news2.total).toBe(0)
    expect(buildAlert({ ...base, onSupplementalOxygen: true }).news2.total).toBe(2)
  })

  it('excludes the current value from its own baseline', () => {
    const current = m('heartRate', 70, day(14), 'hr-now')
    const prior = (n: number) =>
      Array.from({ length: n }, (_, i) => m('heartRate', 70, day(i + 1), `hr-${i}`))
    const six = buildAlert({
      crewMemberId: 'crew-1',
      now: NOW,
      latest: { heartRate: current },
      history: { heartRate: [...prior(6), current] },
      consciousness: 'alert',
    })
    expect(six.baselines.heartRate).toBeUndefined()
    const seven = buildAlert({
      crewMemberId: 'crew-1',
      now: NOW,
      latest: { heartRate: current },
      history: { heartRate: [...prior(7), current] },
      consciousness: 'alert',
    })
    expect(seven.baselines.heartRate?.sampleCount).toBe(7)
  })

  it('sets attention on a value outside the personal baseline', () => {
    const current = m('heartRate', 80, day(14), 'hr-now')
    const history = Array.from({ length: 7 }, (_, i) => m('heartRate', 70, day(i + 1), `hr-${i}`))
    const { alert } = buildAlert({
      crewMemberId: 'crew-1',
      now: NOW,
      latest: { heartRate: current },
      history: { heartRate: [...history, current] },
      consciousness: 'alert',
    })
    expect(alert.zones.heartCirculation.state).toBe('attention')
  })
})