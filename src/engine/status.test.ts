import { describe, expect, it } from 'vitest'
import { deviation, type Deviation } from './status'
import type { Baseline } from './baseline'

const usualPulse: Deviation = { status: 'normal', delta: 0, text: 'Within your usual range' }

describe('deviation without baseline (static usual range)', () => {
  it('returns missing when value is null', () => {
    expect(deviation('pulse', null)).toEqual({ status: 'missing', delta: 0, text: 'Not measured today' })
  })

  it('returns alert when NEWS2 param scores 3', () => {
    const d = deviation('pulse', 35) // score 3 per RCP chart
    expect(d.status).toBe('alert')
  })

  it('returns watch when value is above usual range', () => {
    const d = deviation('pulse', 85) // usual [68, 80]
    expect(d.status).toBe('watch')
    expect(d.delta).toBe(5)
    expect(d.text).toContain('above usual')
  })

  it('returns watch when value is below usual range', () => {
    const d = deviation('pulse', 60) // usual [68, 80]
    expect(d.status).toBe('watch')
    expect(d.delta).toBe(-8)
    expect(d.text).toContain('below usual')
  })

  it('returns normal when value is within usual range', () => {
    const d = deviation('pulse', 75) // usual [68, 80]
    expect(d).toEqual(usualPulse)
  })

  it('handles choice indicators (oxygen)', () => {
    expect(deviation('oxygen', 'air').status).toBe('normal')
    expect(deviation('oxygen', 'oxygen').status).toBe('watch')
    expect(deviation('oxygen', 'oxygen').text).toBe('Changed from usual')
  })

  it('handles choice indicators (consciousness)', () => {
    expect(deviation('consciousness', 'alert').status).toBe('normal')
    expect(deviation('consciousness', 'voice').status).toBe('alert') // paramScore 3
    expect(deviation('consciousness', 'pain').status).toBe('alert')
  })
})

describe('deviation with calculated baseline', () => {
  const baseline: Baseline = { mean: 72, sd: 3, lower: 66, upper: 78, sampleCount: 7 }

  it('uses baseline range instead of static usual', () => {
    // pulse usual [68,80], baseline [66,78]
    // value 80: static -> normal, baseline -> watch (above 78)
    expect(deviation('pulse', 80, baseline).status).toBe('watch')
    expect(deviation('pulse', 80, baseline).delta).toBe(2)
    // value 75: both in range
    expect(deviation('pulse', 75, baseline).status).toBe('normal')
    // value 65: static -> watch (below 68), baseline -> watch (below 66)
    expect(deviation('pulse', 65, baseline).status).toBe('watch')
  })

  it('baseline does not affect choice indicators', () => {
    expect(deviation('oxygen', 'air', baseline).status).toBe('normal')
    expect(deviation('oxygen', 'oxygen', baseline).status).toBe('watch')
  })

  it('alert from paramScore 3 takes precedence over baseline watch', () => {
    // pulse 35 -> paramScore 3 -> alert, even if baseline would be normal
    expect(deviation('pulse', 35, baseline).status).toBe('alert')
  })
})

describe('deviation with absolute clinical limits', () => {
  it('alerts on severe hypertension even without history', () => {
    const d = deviation('systolic', 200)
    expect(d.status).toBe('alert')
    expect(d.text).toBe('AHA severe hypertension: above 180 mmHg')
    expect(d.delta).toBe(74) // still 74 above the static usual [114, 126]
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

  it('follows the ADA glucose bands', () => {
    expect(deviation('glucose', 45).status).toBe('alert')
    expect(deviation('glucose', 60).status).toBe('watch')
    expect(deviation('glucose', 130).status).toBe('watch')
    expect(deviation('glucose', 100).status).toBe('normal')
  })

  it('watches short sleep without any personal history', () => {
    expect(deviation('sleep', 6.8).status).toBe('watch')
    expect(deviation('sleep', 6.8).delta).toBe(0)
    expect(deviation('sleep', 7.5).status).toBe('normal')
  })

  it('watches fever', () => {
    expect(deviation('temperature', 38.2).status).toBe('watch')
    expect(deviation('temperature', 37).status).toBe('normal')
  })
})