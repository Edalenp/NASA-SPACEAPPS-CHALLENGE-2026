import { describe, expect, it } from 'vitest'
import type { EnvironmentKind } from './types'
import { featuredHazards, featuredRisks, FEATURED_HAZARDS, featuredZones } from './environment'
import { getAllRisks, type HrpRisk } from '../data/nasa'

const KINDS: EnvironmentKind[] = ['spacecraft', 'spaceStation', 'rover', 'planetaryBase']

const customRisks: HrpRisk[] = [
  {
    id: 'r-radiation',
    title: 'Radiation risk',
    hazardId: 'radiation',
    targetZones: ['head', 'heartCirculation'],
    description: '',
    countermeasures: '',
    officialUrl: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=1',
  },
  {
    id: 'r-isolation',
    title: 'Isolation risk',
    hazardId: 'isolation',
    targetZones: ['sleepMood'],
    description: '',
    countermeasures: '',
    officialUrl: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=2',
  },
  {
    id: 'r-gravity',
    title: 'Gravity risk',
    hazardId: 'gravity',
    targetZones: ['musculoskeletal'],
    description: '',
    countermeasures: '',
    officialUrl: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=3',
  },
]

describe('FEATURED_HAZARDS', () => {
  it('covers every environment kind', () => {
    for (const kind of KINDS) {
      expect(FEATURED_HAZARDS[kind].length).toBeGreaterThan(0)
      expect(new Set(FEATURED_HAZARDS[kind]).size).toBe(FEATURED_HAZARDS[kind].length)
    }
  })
})

describe('featuredHazards', () => {
  it('returns the hazards of the environment', () => {
    expect(featuredHazards('spacecraft')).toEqual(['radiation', 'distance', 'isolation'])
  })
})

describe('featuredRisks', () => {
  it('keeps only risks whose hazard is featured', () => {
    const risks = featuredRisks('spacecraft', customRisks)
    expect(risks.map((risk) => risk.id)).toEqual(['r-radiation', 'r-isolation'])
  })

  it('changes with the environment', () => {
    expect(featuredRisks('spaceStation', customRisks).map((risk) => risk.id)).toEqual(['r-radiation', 'r-gravity'])
  })

  it('works with the real NASA dataset', () => {
    const risks = featuredRisks('rover', getAllRisks())
    for (const risk of risks) {
      expect(FEATURED_HAZARDS.rover).toContain(risk.hazardId)
    }
  })
})

describe('featuredZones', () => {
  it('unions the target zones of the featured risks', () => {
    expect(featuredZones('spacecraft', customRisks)).toEqual([
      'head',
      'heartCirculation',
      'sleepMood',
    ])
  })

  it('is deterministic', () => {
    expect(JSON.stringify(featuredZones('rover', customRisks))).toBe(
      JSON.stringify(featuredZones('rover', customRisks)),
    )
  })
})
