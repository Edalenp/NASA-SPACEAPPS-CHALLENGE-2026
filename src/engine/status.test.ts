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