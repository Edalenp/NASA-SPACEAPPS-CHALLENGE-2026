import { describe, expect, it } from 'vitest'
import { news2Params, paramScore, type News2Param } from './consoleNews2'

describe('news2Params', () => {
  it('lists the seven NEWS2 parameters in RCP order', () => {
    expect([...news2Params]).toEqual([
      'respiration',
      'spo2',
      'oxygen',
      'systolic',
      'pulse',
      'consciousness',
      'temperature',
    ])
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

  it('is type-safe over the parameter union', () => {
    const ids: readonly News2Param[] = news2Params
    expect(ids).toHaveLength(7)
  })
})