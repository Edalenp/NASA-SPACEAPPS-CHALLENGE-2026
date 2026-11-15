import { describe, expect, it } from 'vitest'
import { ZONE_IDS, type ZoneId } from '../../engine/types'
import {
  getAllRisks,
  getHazardById,
  getHazards,
  getRisksByHazard,
  getRisksByZone,
  type HazardId,
} from './index'

const HAZARD_IDS: readonly HazardId[] = [
  'radiation',
  'isolation',
  'distance',
  'gravity',
  'environment',
]

const RISK_IDS = [
  'sans',
  'cognitive-behavioral-conditions',
  'cardiovascular-adaptation',
  'celestial-dust-exposure',
  'decompression-sickness',
  'bone-fracture',
  'reduced-cardiorespiratory-musculoskeletal-fitness',
  'altered-immune-response',
  'renal-stone-formation',
  'inadequate-food-nutrition',
  'sleep-circadian-workload',
] as const

type RiskId = (typeof RISK_IDS)[number]

const HRP_ID_BY_RISK: Record<RiskId, number> = {
  sans: 105,
  'cognitive-behavioral-conditions': 99,
  'cardiovascular-adaptation': 179,
  'celestial-dust-exposure': 82,
  'decompression-sickness': 168,
  'bone-fracture': 77,
  'reduced-cardiorespiratory-musculoskeletal-fitness': 180,
  'altered-immune-response': 85,
  'renal-stone-formation': 81,
  'inadequate-food-nutrition': 176,
  'sleep-circadian-workload': 100,
}

const HAZARD_BY_RISK: Record<RiskId, HazardId> = {
  sans: 'gravity',
  'cognitive-behavioral-conditions': 'isolation',
  'cardiovascular-adaptation': 'gravity',
  'celestial-dust-exposure': 'environment',
  'decompression-sickness': 'environment',
  'bone-fracture': 'gravity',
  'reduced-cardiorespiratory-musculoskeletal-fitness': 'gravity',
  'altered-immune-response': 'environment',
  'renal-stone-formation': 'gravity',
  'inadequate-food-nutrition': 'distance',
  'sleep-circadian-workload': 'environment',
}

const ZONES_BY_RISK: Record<RiskId, readonly ZoneId[]> = {
  sans: ['head'],
  'cognitive-behavioral-conditions': ['head', 'sleepMood'],
  'cardiovascular-adaptation': ['heartCirculation'],
  'celestial-dust-exposure': ['lungs'],
  'decompression-sickness': ['lungs'],
  'bone-fracture': ['musculoskeletal'],
  'reduced-cardiorespiratory-musculoskeletal-fitness': ['musculoskeletal', 'heartCirculation'],
  'altered-immune-response': ['immuneMetabolic'],
  'renal-stone-formation': ['immuneMetabolic'],
  'inadequate-food-nutrition': ['immuneMetabolic'],
  'sleep-circadian-workload': ['sleepMood'],
}

const DOSAGE_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|ml|mcg|µg|cc|iu|units?|tablets?|capsules?|pills?|drops?|doses?|grams?|g)\b/i
const MEDICATION_PATTERN =
  /\b(?:dose|dosage|dosages|prescrib\w*|medications?|pharmaceuticals?|pharmacy|drugs?|ibuprofen|acetaminophen|paracetamol|amoxicillin|antibiotics?|analgesics?|sedatives?|treatments?)\b/i

describe('NASA HRP hazards', () => {
  it('returns exactly the five official spaceflight hazards', () => {
    const hazards = getHazards()

    expect(hazards).toHaveLength(5)
    expect(hazards.map((hazard) => hazard.id).sort()).toEqual([...HAZARD_IDS].sort())
  })

  it('finds each hazard by id and rejects unknown ids', () => {
    for (const hazardId of HAZARD_IDS) {
      expect(getHazardById(hazardId)?.id, hazardId).toBe(hazardId)
    }

    expect(getHazardById('nuclear' as HazardId)).toBeUndefined()
    expect(getHazardById('' as HazardId)).toBeUndefined()
  })
})

describe('curated risk set', () => {
  it('exposes exactly the 11 curated active risks', () => {
    expect(getAllRisks().map((risk) => risk.id).sort()).toEqual([...RISK_IDS].sort())
  })

  it('matches the reviewed hazard, zone, and HRP crosswalk', () => {
    const byId = new Map(getAllRisks().map((risk) => [risk.id, risk]))

    for (const riskId of RISK_IDS) {
      const risk = byId.get(riskId)
      if (!risk) throw new Error(`Missing curated risk: ${riskId}`)

      expect(risk.hazardId, riskId).toBe(HAZARD_BY_RISK[riskId])
      expect([...risk.targetZones].sort(), riskId).toEqual([...ZONES_BY_RISK[riskId]].sort())
      expect(risk.officialUrl, riskId).toBe(
        `https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=${HRP_ID_BY_RISK[riskId]}`,
      )
    }
  })

  it('uses unique kebab-case ids', () => {
    const ids = getAllRisks().map((risk) => risk.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })
})

describe('zone and hazard filtering', () => {
  it('covers every zone and keeps getRisksByZone sound and complete', () => {
    for (const zoneId of ZONE_IDS) {
      const expected = RISK_IDS.filter((riskId) => ZONES_BY_RISK[riskId].includes(zoneId)).sort()
      const actual = getRisksByZone(zoneId)
        .map((risk) => risk.id)
        .sort()

      expect(actual.length, zoneId).toBeGreaterThan(0)
      expect(actual, zoneId).toEqual(expected)
    }

    expect(getRisksByZone('chest' as ZoneId)).toEqual([])
  })

  it('keeps getRisksByHazard sound and complete across all five hazards', () => {
    for (const hazardId of HAZARD_IDS) {
      const expected = RISK_IDS.filter((riskId) => HAZARD_BY_RISK[riskId] === hazardId).sort()
      const actual = getRisksByHazard(hazardId)
        .map((risk) => risk.id)
        .sort()

      expect(actual, hazardId).toEqual(expected)
    }

    expect(getRisksByHazard('radiation')).toEqual([])
    expect(getRisksByHazard('noise' as HazardId)).toEqual([])
  })
})

describe('source evidence and content policy', () => {
  it('uses distinct canonical NASA HRP pages for every risk', () => {
    const urls = getAllRisks().map((risk) => risk.officialUrl)

    expect(new Set(urls).size).toBe(urls.length)
    for (const risk of getAllRisks()) {
      const url = new URL(risk.officialUrl)

      expect(url.protocol, risk.id).toBe('https:')
      expect(url.hostname, risk.id).toBe('humanresearchroadmap.nasa.gov')
      expect(url.pathname, risk.id).toBe('/Risks/risk.aspx')
      expect(url.searchParams.get('i'), risk.id).toBe(String(HRP_ID_BY_RISK[risk.id as RiskId]))
      expect(url.username, risk.id).toBe('')
      expect(url.password, risk.id).toBe('')
    }
  })

  it('pins hazard pages to a real NASA host without invented anchors', () => {
    for (const hazard of getHazards()) {
      const url = new URL(hazard.nasaUrl)

      expect(url.protocol, hazard.id).toBe('https:')
      expect(
        url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'),
        hazard.id,
      ).toBe(true)
      expect(url.hash, hazard.id).toBe('')
      expect(url.pathname.replace(/\/$/, ''), hazard.id).not.toBe('')
    }
  })

  it('keeps countermeasures reserved and empty', () => {
    for (const risk of getAllRisks()) {
      expect(risk.countermeasures, risk.id).toBe('')
    }
  })

  it('contains no medication names or dosage instructions', () => {
    for (const risk of getAllRisks()) {
      const text = `${risk.title} ${risk.description} ${risk.countermeasures}`

      expect(text, risk.id).not.toMatch(DOSAGE_PATTERN)
      expect(text, risk.id).not.toMatch(MEDICATION_PATTERN)
    }
  })

  it('uses brief English descriptions without operational instructions', () => {
    for (const risk of getAllRisks()) {
      const description = risk.description
      const sentenceCount = (description.match(/[.!?](?=\s|$)/g) ?? []).length

      expect(description.length, risk.id).toBeGreaterThan(0)
      expect(description, risk.id).toMatch(/^[\x20-\x7E\n]+$/)
      expect(sentenceCount, risk.id).toBeGreaterThanOrEqual(2)
      expect(sentenceCount, risk.id).toBeLessThanOrEqual(3)
      expect(description, risk.id).not.toMatch(/\b(?:should|must|recommend\w*|perform|use)\b/i)
    }
  })
})

describe('helper isolation', () => {
  it('returns fresh arrays so callers cannot corrupt the shared dataset', () => {
    const hazards = getHazards()
    hazards.push(hazards[0])
    expect(getHazards()).toHaveLength(5)

    const risks = getAllRisks()
    risks.length = 0
    expect(getAllRisks()).toHaveLength(11)

    expect(getRisksByZone('head')).not.toBe(getRisksByZone('head'))
    expect(getRisksByHazard('gravity')).not.toBe(getRisksByHazard('gravity'))
  })
})
