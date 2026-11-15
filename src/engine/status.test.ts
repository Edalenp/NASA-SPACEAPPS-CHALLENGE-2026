import { describe, expect, it } from 'vitest'
import { deviation } from './status'
import type { Baseline } from './baseline'
import type { GlucoseContext } from './types'

const fastingVenous: GlucoseContext = { timing: 'fasting', specimen: 'venousPlasma' }

describe('deviation without baseline (NEWS2 evidence only)', () => {
  it('returns missing when value is null', () => {
    expect(deviation('pulse', null)).toEqual({ status: 'missing', delta: 0, text: 'Not measured today' })
  })

  it('returns alert when NEWS2 param scores 3', () => {
    expect(deviation('pulse', 35).status).toBe('alert')
  })

  it('uses the NEWS2 score instead of the illustrative usual band', () => {
    for (const value of [60, 75, 85]) {
      const d = deviation('pulse', value)
      expect(d.status).toBe('normal')
      expect(d.delta).toBe(0)
      expect(d.text).toBe('Within NEWS2 range')
    }
  })

  it('does not claim a personal range without an actual baseline', () => {
    const d = deviation('sleep', 7.5)
    expect(d.status).toBe('missing')
    expect(d.text).not.toContain('usual')
  })

  it('handles choice indicators with NEWS2 scores (oxygen)', () => {
    expect(deviation('oxygen', 'air').status).toBe('normal')
    expect(deviation('oxygen', 'oxygen').status).toBe('watch')
    expect(deviation('oxygen', 'oxygen').text).toBe('NEWS2 scores this reading 2')
  })

  it('handles choice indicators (consciousness)', () => {
    expect(deviation('consciousness', 'alert').status).toBe('normal')
    expect(deviation('consciousness', 'voice').status).toBe('alert')
    expect(deviation('consciousness', 'pain').status).toBe('alert')
  })
})

describe('deviation with calculated baseline', () => {
  const baseline: Baseline = { mean: 72, sd: 3, lower: 66, upper: 78, sampleCount: 7 }

  it('uses only the personal observed range', () => {
    expect(deviation('pulse', 80, baseline).status).toBe('watch')
    expect(deviation('pulse', 80, baseline).delta).toBe(2)
    expect(deviation('pulse', 80, baseline).text).toContain('personal observed history')
    expect(deviation('pulse', 75, baseline).status).toBe('normal')
    expect(deviation('pulse', 75, baseline).text).toContain('personal observed history')
    expect(deviation('pulse', 65, baseline).status).toBe('watch')
  })

  it('baseline does not affect choice indicators', () => {
    expect(deviation('oxygen', 'air', baseline).status).toBe('normal')
    expect(deviation('oxygen', 'oxygen', baseline).status).toBe('watch')
  })

  it('alert from paramScore 3 takes precedence over baseline watch', () => {
    expect(deviation('pulse', 35, baseline).status).toBe('alert')
  })

  it('shows a personal history label with an unknown-context qualifier', () => {
    const glucose: Baseline = { mean: 100, sd: 5, lower: 90, upper: 110, sampleCount: 7 }
    const unknown = deviation('glucose', 100, glucose)
    expect(unknown.status).toBe('normal')
    expect(unknown.text).toContain('personal observed history')
    expect(unknown.text).toContain('glucose context unknown')
    expect(deviation('glucose', 100, glucose, fastingVenous).text).not.toContain('context unknown')
  })
})

describe('deviation with absolute clinical limits', () => {
  it('alerts on severe hypertension even without history', () => {
    const d = deviation('systolic', 200)
    expect(d.status).toBe('alert')
    expect(d.text).toBe('AHA severe hypertension: above 180 mmHg')
    expect(d.delta).toBe(0)
  })

  it('overrides a collapsed pathological baseline', () => {
    const collapsed: Baseline = { mean: 200, sd: 0, lower: 200, upper: 200, sampleCount: 7 }
    const d = deviation('systolic', 200, collapsed)
    expect(d.status).toBe('alert')
    expect(d.text).toBe('AHA severe hypertension: above 180 mmHg')
  })

  it('alerts on severe diastolic pressure', () => {
    expect(deviation('diastolic', 130).status).toBe('alert')
  })

  it('alerts on hypoxemia', () => {
    const d = deviation('spo2', 89)
    expect(d.status).toBe('alert')
    expect(d.text).toBe('Hypoxemia: SpO2 below 90%')
  })

  it('follows the ADA glucose bands by context', () => {
    expect(deviation('glucose', 45).status).toBe('alert')
    expect(deviation('glucose', 60).status).toBe('watch')
    expect(deviation('glucose', 130).status).toBe('missing')
    expect(deviation('glucose', 100).status).toBe('missing')
    expect(deviation('glucose', 130, undefined, fastingVenous).status).toBe('watch')
    expect(deviation('glucose', 200).status).toBe('alert')
  })

  it('watches short sleep without any personal history', () => {
    expect(deviation('sleep', 6.8).status).toBe('watch')
    expect(deviation('sleep', 6.8).delta).toBe(0)
    expect(deviation('sleep', 7.5).status).toBe('missing')
  })

  it('watches fever', () => {
    expect(deviation('temperature', 38.2).status).toBe('watch')
    expect(deviation('temperature', 37).status).toBe('normal')
  })
})
