import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { GlucoseContext } from '../engine'
import { normalizeGlucoseContext } from '../engine'
import { assess } from '../features/measurements/assessment'
import type { RecordEntry } from '../features/measurements/adapter'
import { crew } from '../data/mission'
import { clearAll, db, saveMeasurement } from './db'
import { useMission } from './mission'

const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma', fastingHours: 8 }
const randomCapillary: GlucoseContext = { timing: 'random', specimen: 'capillary' }
const now = '2026-11-14T15:00:00.000Z'

const glucoseEntry = (
  value: number,
  index: number,
  timestamp: string,
  ctx: GlucoseContext = fastingVenous,
  source: RecordEntry['source'] = 'manual',
): RecordEntry => ({
  indicator: 'glucose',
  value,
  timestamp,
  source,
  recordId: `glucose-${index}-${source}`,
  ctx,
})

const normalVitals: RecordEntry[] = [
  { indicator: 'pulse', value: 70, timestamp: now, source: 'manual', recordId: 'pulse' },
  { indicator: 'systolic', value: 120, timestamp: now, source: 'manual', recordId: 'systolic' },
  { indicator: 'respiration', value: 16, timestamp: now, source: 'manual', recordId: 'respiration' },
  { indicator: 'spo2', value: 98, timestamp: now, source: 'manual', recordId: 'spo2' },
  { indicator: 'temperature', value: 37, timestamp: now, source: 'manual', recordId: 'temperature' },
  { indicator: 'consciousness', value: 'alert', timestamp: now, source: 'manual', recordId: 'consciousness' },
  { indicator: 'oxygen', value: 'air', timestamp: now, source: 'manual', recordId: 'oxygen' },
]

beforeEach(async () => {
  await clearAll()
  useMission.setState({ busy: false })
  await useMission.getState().hydrate()
})

describe('glucose context persistence', () => {
  it('roundtrips a new glucose context through record, Dexie, hydrate and assessment', async () => {
    await useMission.getState().record('glucose', 95, { ctx: fastingVenous })

    const stored = (await db.measurements.toArray()).find((m) => m.type === 'glucose')
    expect(stored?.glucoseContext).toEqual(fastingVenous)

    const assessment = assess(
      useMission.getState().entries,
      useMission.getState().now,
      'transit',
    )
    expect(assessment.latest.glucose?.ctx).toEqual(fastingVenous)
    expect(assessment.readings.glucose).toBe(95)
  })

  it('keeps reactionTest metadata on the engine measurement', async () => {
    await useMission.getState().record('pulse', 300, {
      source: 'reactionTest',
      reaction: { validTrials: 3, failures: 0, durationMs: 900 },
    })
    const assessment = assess(
      useMission.getState().entries,
      useMission.getState().now,
      'transit',
    )
    expect(assessment.latest.pulse?.reaction).toEqual({
      validTrials: 3,
      failures: 0,
      durationMs: 900,
    })
  })

  it('reads old records as unknown without rewriting their stored value', async () => {
    const at = new Date().toISOString()
    const base = {
      crewMemberId: crew.code,
      type: 'glucose' as const,
      value: 100,
      unit: 'mg/dL' as const,
      measuredAt: at,
      source: 'manual' as const,
    }
    await saveMeasurement({ ...base, id: 'old-without-context' })
    await saveMeasurement({
      ...base,
      id: 'old-malformed-context',
      glucoseContext: { timing: 'bogus', specimen: 42 } as unknown as GlucoseContext,
    })
    await useMission.getState().hydrate()

    const entries = useMission.getState().entries
    const missing = entries.find((e) => e.recordId === 'old-without-context')
    const malformed = entries.find((e) => e.recordId === 'old-malformed-context')
    expect(normalizeGlucoseContext(missing?.ctx)).toEqual({
      timing: 'unknown',
      specimen: 'unknown',
    })
    expect(malformed?.ctx).toEqual({ timing: 'unknown', specimen: 'unknown' })
    expect((await db.measurements.get('old-malformed-context'))?.glucoseContext).toEqual({
      timing: 'bogus',
      specimen: 42,
    })
    const preserved = await db.measurements.get('old-without-context')
    expect(preserved).toMatchObject({
      id: 'old-without-context',
      source: 'manual',
      value: 100,
      measuredAt: at,
    })
    expect(preserved?.glucoseContext).toBeUndefined()
  })
})

describe('glucose contextual baseline', () => {
  const prior = (ctx: GlucoseContext, count = 7) =>
    Array.from({ length: count }, (_, i) =>
      glucoseEntry(100, i, `2026-11-14T08:0${i}:00.000Z`, ctx),
    )
  const current = glucoseEntry(130, 99, now, fastingVenous)

  it('uses seven prior readings with the same context, not seven different days', () => {
    const result = assess([...prior(fastingVenous), current], now, 'transit')
    expect(result.baselines.glucose?.sampleCount).toBe(7)
    expect(result.sampleCounts.glucose).toBe(7)
  })

  it('does not mix another context into the baseline', () => {
    const mixed = [...prior(fastingVenous, 6), ...prior(randomCapillary, 1)]
    const result = assess([...mixed, current], now, 'transit')
    expect(result.baselines.glucose).toBeUndefined()
    expect(result.sampleCounts.glucose).toBe(6)
  })

  it('excludes the current reading and future points', () => {
    const future = glucoseEntry(100, 98, '2026-11-14T16:00:00.000Z', fastingVenous)
    const result = assess([...prior(fastingVenous, 6), future, current], now, 'transit')
    expect(result.baselines.glucose).toBeUndefined()
    expect(result.sampleCounts.glucose).toBe(6)
  })

  it('keeps the current source policy', () => {
    const simulated = Array.from({ length: 7 }, (_, i) =>
      glucoseEntry(100, i, `2026-11-14T08:0${i}:00.000Z`, fastingVenous, 'simulator'),
    )
    const result = assess([...simulated, current], now, 'transit')
    expect(result.baselines.glucose).toBeUndefined()
    expect(result.sampleCounts.glucose).toBe(0)
  })

  it('matches unknown only with unknown', () => {
    const unknown = { timing: 'unknown', specimen: 'unknown' } as const
    const unknownCurrent = glucoseEntry(130, 99, now, unknown)
    expect(
      assess([...prior(unknown), unknownCurrent], now, 'transit').baselines.glucose
        ?.sampleCount,
    ).toBe(7)
    expect(
      assess([...prior(fastingVenous), unknownCurrent], now, 'transit').baselines.glucose,
    ).toBeUndefined()
  })
})

describe('glucose clinical context in the assessment', () => {
  it('keeps NEWS2 scores unchanged when glucose is added', () => {
    const baseline = assess(normalVitals, now, 'transit')
    for (const [value, ctx] of [
      [40, fastingVenous],
      [130, fastingVenous],
      [200, randomCapillary],
    ] as const) {
      const result = assess(
        [...normalVitals, glucoseEntry(value, value, now, ctx)],
        now,
        'transit',
      )
      expect(result.score).toEqual(baseline.score)
    }
  })

  it('marks the screening watch only for fasting venous plasma', () => {
    const fasting = assess([glucoseEntry(130, 1, now, fastingVenous)], now, 'transit')
    const random = assess([glucoseEntry(130, 2, now, randomCapillary)], now, 'transit')
    expect(fasting.deviations.glucose.status).toBe('watch')
    expect(random.deviations.glucose.status).toBe('missing')
  })
})
