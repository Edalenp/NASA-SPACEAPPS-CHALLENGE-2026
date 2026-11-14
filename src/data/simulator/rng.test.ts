import { describe, expect, it } from 'vitest'
import { createRng } from './rng'

const take = (seed: number, n = 20) => {
  const r = createRng(seed)
  return Array.from({ length: n }, () => r.next())
}

describe('rng con semilla', () => {
  it('la misma semilla produce la misma secuencia', () => {
    expect(take(42)).toEqual(take(42))
  })

  it('semillas distintas producen secuencias distintas', () => {
    expect(take(42)).not.toEqual(take(43))
  })

  it('next() queda en [0, 1)', () => {
    for (const x of take(7, 1000)) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('int() respeta los límites inclusivos', () => {
    const r = createRng(1)
    for (let i = 0; i < 1000; i++) {
      const n = r.int(3, 6)
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(6)
    }
  })

  it('normal() se acerca a la media pedida', () => {
    const r = createRng(99)
    const xs = Array.from({ length: 5000 }, () => r.normal(70, 5))
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    expect(mean).toBeGreaterThan(69)
    expect(mean).toBeLessThan(71)
  })
})