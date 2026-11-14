import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Measurement } from '../engine'
import {
  clearAll,
  clearSimulated,
  getLatestByType,
  getLatestObservation,
  getSeries,
  saveMeasurement,
  saveMeasurements,
  saveObservation,
} from './db'

const m = (over: Partial<Measurement>): Measurement => ({
  id: crypto.randomUUID(),
  crewMemberId: 'crew-1',
  type: 'heartRate',
  value: 70,
  unit: 'bpm',
  measuredAt: '2026-11-14T09:00:00.000Z',
  source: 'manual',
  ...over,
})

beforeEach(async () => {
  await clearAll()
})

describe('db', () => {
  it('guarda valor, unidad, fecha y hora', async () => {
    await saveMeasurement(m({ value: 72 }))
    const [x] = await getSeries('crew-1', 'heartRate')
    expect(x).toMatchObject({ value: 72, unit: 'bpm', measuredAt: '2026-11-14T09:00:00.000Z' })
  })

  it('devuelve la serie ordenada y filtrada por rango', async () => {
    await saveMeasurements([
      m({ type: 'glucose', unit: 'mg/dL', measuredAt: '2026-11-14T10:00:00.000Z' }),
      m({ type: 'glucose', unit: 'mg/dL', measuredAt: '2026-11-14T08:00:00.000Z' }),
      m({ type: 'glucose', unit: 'mg/dL', measuredAt: '2026-11-14T09:00:00.000Z' }),
      m({ type: 'oxygenSaturation', unit: '%' }),
    ])
    const all = await getSeries('crew-1', 'glucose')
    expect(all.map((x) => x.measuredAt)).toEqual([
      '2026-11-14T08:00:00.000Z',
      '2026-11-14T09:00:00.000Z',
      '2026-11-14T10:00:00.000Z',
    ])
    const part = await getSeries('crew-1', 'glucose', '2026-11-14T08:30:00.000Z', '2026-11-14T09:30:00.000Z')
    expect(part).toHaveLength(1)
  })

  it('devuelve la última medición por indicador', async () => {
    await saveMeasurements([
      m({ type: 'oxygenSaturation', unit: '%', value: 97, measuredAt: '2026-11-14T08:00:00.000Z' }),
      m({ type: 'oxygenSaturation', unit: '%', value: 95, measuredAt: '2026-11-14T09:00:00.000Z' }),
      m({ type: 'heartRate', value: 80 }),
    ])
    const latest = await getLatestByType('crew-1')
    expect(latest.oxygenSaturation?.value).toBe(95)
    expect(latest.heartRate?.value).toBe(80)
  })

  it('no mezcla tripulantes', async () => {
    await saveMeasurements([m({ crewMemberId: 'crew-1' }), m({ crewMemberId: 'crew-2' })])
    expect(await getSeries('crew-2', 'heartRate')).toHaveLength(1)
  })

  it('guardar el mismo id no duplica', async () => {
    const x = m({ id: 'fixed' })
    await saveMeasurement(x)
    await saveMeasurement({ ...x, value: 99 })
    const s = await getSeries('crew-1', 'heartRate')
    expect(s).toHaveLength(1)
    expect(s[0].value).toBe(99)
  })

  it('clearSimulated no borra los datos manuales', async () => {
    await saveMeasurements([m({ source: 'simulator' }), m({ source: 'manual' })])
    await clearSimulated()
    const rest = await getSeries('crew-1', 'heartRate')
    expect(rest).toHaveLength(1)
    expect(rest[0].source).toBe('manual')
  })

  it('guarda y recupera la última observación ACVPU', async () => {
    await saveObservation({ id: 'o1', crewMemberId: 'crew-1', level: 'alert', observedAt: '2026-11-14T08:00:00.000Z', source: 'manual' })
    await saveObservation({ id: 'o2', crewMemberId: 'crew-1', level: 'voice', observedAt: '2026-11-14T09:00:00.000Z', source: 'manual' })
    expect((await getLatestObservation('crew-1'))?.level).toBe('voice')
  })
})