/** PRNG determinista (mulberry32): misma semilla, misma secuencia. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 // [0, 1)
  }
}

export interface Rng {
  /** Número en [0, 1) */
  next: () => number
  /** Número en [min, max) */
  range: (min: number, max: number) => number
  /** Entero en [min, max] */
  int: (min: number, max: number) => number
  /** Distribución normal (Box-Muller) */
  normal: (mean: number, sd: number) => number
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed)
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    normal: (mean, sd) => {
      const u = 1 - next() // evita log(0)
      const v = next()
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    },
  }
}