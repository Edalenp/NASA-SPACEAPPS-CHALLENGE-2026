import { describe, expect, it } from 'vitest'
import { deviation, type Deviation } from './status'
import { paramScore, news2Params } from './consoleNews2'
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

describe('paramScore against news2-scoring.json', () => {
  it('scores respiration per JSON bands', () => {
    expect(paramScore('respiration', 7)).toBe(3)
    expect(paramScore('respiration', 10)).toBe(1)
    expect(paramScore('respiration', 15)).toBe(0)
    expect(paramScore('respiration', 22)).toBe(2)
    expect(paramScore('respiration', 26)).toBe(3)
  })

  it('scores spo2 per JSON Scale 1', () => {
    expect(paramScore('spo2', 90)).toBe(3)
    expect(paramScore('spo2', 92)).toBe(2)
    expect(paramScore('spo2', 94)).toBe(1)
    expect(paramScore('spo2', 97)).toBe(0)
  })

  it('scores oxygen support per JSON', () => {
    expect(paramScore('oxygen', 'air')).toBe(0)
    expect(paramScore('oxygen', 'oxygen')).toBe(2)
  })

  it('scores systolic per JSON bands', () => {
    expect(paramScore('systolic', 88)).toBe(3)
    expect(paramScore('systolic', 95)).toBe(2)
    expect(paramScore('systolic', 105)).toBe(1)
    expect(paramScore('systolic', 120)).toBe(0)
    expect(paramScore('systolic', 230)).toBe(3)
  })

  it('scores pulse per JSON bands', () => {
    expect(paramScore('pulse', 38)).toBe(3)
    expect(paramScore('pulse', 45)).toBe(1)
    expect(paramScore('pulse', 70)).toBe(0)
    expect(paramScore('pulse', 100)).toBe(1)
    expect(paramScore('pulse', 120)).toBe(2)
    expect(paramScore('pulse', 140)).toBe(3)
  })

  it('scores consciousness per JSON', () => {
    expect(paramScore('consciousness', 'alert')).toBe(0)
    expect(paramScore('consciousness', 'newConfusion')).toBe(3)
    expect(paramScore('consciousness', 'voice')).toBe(3)
    expect(paramScore('consciousness', 'pain')).toBe(3)
    expect(paramScore('consciousness', 'unresponsive')).toBe(3)
  })

  it('scores temperature per JSON bands (rounded to 0.1)', () => {
    expect(paramScore('temperature', 34.5)).toBe(3)
    expect(paramScore('temperature', 35.5)).toBe(1)
    expect(paramScore('temperature', 37)).toBe(0)
    expect(paramScore('temperature', 38.5)).toBe(1)
    expect(paramScore('temperature', 39.5)).toBe(2)
  })

  it('returns null for missing values', () => {
    for (const id of news2Params) {
      expect(paramScore(id, null)).toBeNull()
    }
  })
})