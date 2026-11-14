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
import sourcesData from './sources.json'

const HAZARD_IDS: readonly HazardId[] = [
  'radiation',
  'isolation',
  'distance',
  'gravity',
  'environment',
]

const RISK_IDS = [
  'altered-immune-response',
  'bone-fracture',
  'cardiovascular-adaptation',
  'celestial-dust-exposure',
  'cognitive-behavioral-conditions',
  'decompression-sickness',
  'inadequate-food-nutrition',
  'reduced-cardiorespiratory-musculoskeletal-fitness',
  'renal-stone-formation',
  'sans',
  'sleep-circadian-workload',
] as const

// Oráculo externo independiente de risks.json: crosswalk autoritativo del
// arquitecto, cotejado contra las páginas individuales del HRP
// (humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=N) el 2026-11-14.
const HRP_ID_BY_RISK: Record<string, number> = {
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

const HAZARD_BY_RISK: Record<string, HazardId> = {
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

const ZONES_BY_RISK: Record<string, readonly ZoneId[]> = {
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

// Distribución real auditada (sin cuotas artificiales): cobertura de 6 zonas >= 1.
const ZONE_COUNTS: Record<ZoneId, number> = {
  head: 2,
  heartCirculation: 2,
  lungs: 2,
  musculoskeletal: 2,
  immuneMetabolic: 3,
  sleepMood: 2,
}

// Riesgos eliminados por el crosswalk autoritativo (no activos, fusionados o
// sin riesgo dedicado probado): no deben reaparecer nunca en este dataset.
const ELIMINATED_RISK_IDS: readonly string[] = [
  'intracranial-pressure-cephalic-fluid-shift',
  'cardiac-rhythm-problems-arrhythmias',
  'toxic-atmospheric-exposure-spacecraft-fire-effluents',
  'spaceflight-spinal-elongation-lumbar-pain',
  'crew-fatigue-performance-decrement',
]

// 78: Concern of Intervertebral Disc Damage [inactive] en el índice oficial.
// 79: riesgo de arritmias fusionado en 179; sin página activa propia.
const RETIRED_HRP_IDS: readonly number[] = [78, 79]

const RISK_KEYS = [
  'countermeasures',
  'description',
  'hazardId',
  'id',
  'officialUrl',
  'targetZones',
  'title',
]
const HAZARD_KEYS = ['description', 'id', 'name', 'nasaUrl']
const EVIDENCE_KEYS = [
  'hrpId',
  'hrpStatus',
  'officialTitle',
  'officialUrl',
  'riskId',
  'sourceExcerpt',
  'sourceSection',
  'verifiedAt',
]

const VERIFIED_AT = '2026-11-14'
const HAZARD_SOURCE_URL = 'https://www.nasa.gov/humans-in-space/the-human-body-in-space/'

const canonicalRiskUrl = (hrpId: number): string =>
  `https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=${hrpId}`

const DOSAGE_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|ml|mcg|µg|cc|iu|units?|tablets?|capsules?|pills?|drops?|doses?|grams?|g)\b/i
const MEDICATION_PATTERN =
  /\b(?:dose|dosage|dosages|prescrib\w*|medications?|pharmaceuticals?|pharmacy|drugs?|ibuprofen|acetaminophen|paracetamol|amoxicillin|antibiotics?|analgesics?|sedatives?)\b/i
const CLINICAL_INSTRUCTION_PATTERN =
  /\b(?:should|must|prescrib\w*|administer|treat\w*|therapy|lower-body negative pressure)\b/i

function expectNasaHttpsUrl(raw: string): URL {
  const url = new URL(raw)

  expect(url.protocol, raw).toBe('https:')
  expect(url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'), raw).toBe(true)
  expect(url.username, raw).toBe('')
  expect(url.password, raw).toBe('')
  expect(url.pathname.replace(/\/$/, ''), raw).not.toBe('')
  expect(url.hash, raw).toBe('')

  return url
}

describe('hazard dataset contract', () => {
  it('exposes exactly the five RIDGE hazard ids', () => {
    const hazards = getHazards()

    expect(hazards).toHaveLength(5)
    expect(hazards.map((hazard) => hazard.id).sort()).toEqual([
      'distance',
      'environment',
      'gravity',
      'isolation',
      'radiation',
    ])
  })

  it('resolves each hazard by id and rejects unknown ids at runtime', () => {
    for (const id of HAZARD_IDS) {
      const hazard = getHazardById(id)
      expect(hazard?.id, id).toBe(id)
      expect(hazard?.name, id).not.toBe('')
      expect(hazard?.description, id).not.toBe('')
      expect(hazard?.nasaUrl, id).not.toBe('')
    }

    expect(getHazardById('nuclear' as HazardId)).toBeUndefined()
    expect(getHazardById('' as HazardId)).toBeUndefined()
    expect(getHazardById('Radiation' as HazardId)).toBeUndefined()
    expect(getHazardById('radiation ' as HazardId)).toBeUndefined()
  })
})

describe('record schemas (type-drift detection)', () => {
  it('risk records carry exactly the HrpRisk fields', () => {
    for (const risk of getAllRisks()) {
      expect(Object.keys(risk).sort(), risk.id).toEqual(RISK_KEYS)
      expect(typeof risk.id, risk.id).toBe('string')
      expect(typeof risk.title, risk.id).toBe('string')
      expect(typeof risk.hazardId, risk.id).toBe('string')
      expect(typeof risk.description, risk.id).toBe('string')
      expect(typeof risk.countermeasures, risk.id).toBe('string')
      expect(typeof risk.officialUrl, risk.id).toBe('string')
      expect(Array.isArray(risk.targetZones), risk.id).toBe(true)
      expect(risk.targetZones.length, risk.id).toBeGreaterThan(0)
      expect(risk.targetZones, risk.id).toEqual([...new Set(risk.targetZones)])
      for (const zoneId of risk.targetZones) {
        expect(ZONE_IDS, risk.id).toContain(zoneId)
      }
    }
  })

  it('hazard records carry exactly the SpaceflightHazard fields', () => {
    for (const hazard of getHazards()) {
      expect(Object.keys(hazard).sort(), hazard.id).toEqual(HAZARD_KEYS)
      expect(typeof hazard.name, hazard.id).toBe('string')
      expect(typeof hazard.description, hazard.id).toBe('string')
      expect(typeof hazard.nasaUrl, hazard.id).toBe('string')
    }
  })

  it('uses unique kebab-case risk ids', () => {
    const ids = getAllRisks().map((risk) => risk.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })
})

describe('curated set completeness', () => {
  it('exposes exactly the 11 curated active risks and nothing else', () => {
    expect(getAllRisks().map((risk) => risk.id).sort()).toEqual([...RISK_IDS].sort())
  })

  it('covers all six zones with the audited real distribution 2-2-2-2-3-2', () => {
    expect(getAllRisks()).toHaveLength(11)
    for (const zoneId of ZONE_IDS) {
      const count = getRisksByZone(zoneId).length

      expect(count, zoneId).toBeGreaterThanOrEqual(1)
      expect(count, zoneId).toBe(ZONE_COUNTS[zoneId])
    }
  })

  it('returns only zone members and rejects unknown zones', () => {
    for (const zoneId of ZONE_IDS) {
      for (const risk of getRisksByZone(zoneId)) {
        expect(risk.targetZones, risk.id).toContain(zoneId)
      }
    }

    expect(getRisksByZone('chest' as ZoneId)).toEqual([])
    expect(getRisksByHazard('noise' as HazardId)).toEqual([])
  })

  it('keeps the radiation hazard empty without dropping it (editorial subset)', () => {
    expect(getRisksByHazard('radiation')).toEqual([])
    expect(getHazardById('radiation')?.id).toBe('radiation')
    expect(getRisksByHazard('isolation').map((risk) => risk.id)).toEqual([
      'cognitive-behavioral-conditions',
    ])
    expect(getRisksByHazard('distance').map((risk) => risk.id)).toEqual([
      'inadequate-food-nutrition',
    ])
    expect(getRisksByHazard('gravity').map((risk) => risk.id).sort()).toEqual([
      'bone-fracture',
      'cardiovascular-adaptation',
      'reduced-cardiorespiratory-musculoskeletal-fitness',
      'renal-stone-formation',
      'sans',
    ])
    expect(getRisksByHazard('environment').map((risk) => risk.id).sort()).toEqual([
      'altered-immune-response',
      'celestial-dust-exposure',
      'decompression-sickness',
      'sleep-circadian-workload',
    ])
  })
})

describe('hazard and zone mapping against the authoritative crosswalk', () => {
  it('keeps every risk on its crosswalk hazard, zones, and canonical HRP page', () => {
    const byId = new Map(getAllRisks().map((risk) => [risk.id, risk]))

    expect(Object.keys(HAZARD_BY_RISK).sort()).toEqual([...RISK_IDS].sort())
    for (const riskId of RISK_IDS) {
      const risk = byId.get(riskId)
      if (!risk) throw new Error(`Missing curated risk: ${riskId}`)

      expect(risk.hazardId, riskId).toBe(HAZARD_BY_RISK[riskId])
      expect([...risk.targetZones].sort(), riskId).toEqual([...ZONES_BY_RISK[riskId]].sort())
      expect(risk.officialUrl, riskId).toBe(canonicalRiskUrl(HRP_ID_BY_RISK[riskId]))
    }
  })
})

describe('source evidence (RNF-12, RF-14, F5 strength)', () => {
  it('pins every source to a real nasa.gov page: https alone is not enough', () => {
    const urls = [
      ...getHazards().map((hazard) => hazard.nasaUrl),
      ...getAllRisks().map((risk) => risk.officialUrl),
    ]

    for (const raw of urls) {
      expectNasaHttpsUrl(raw)
    }
  })

  it('links every risk to its own canonical HRP page, never a generic shared index', () => {
    const urls = getAllRisks().map((risk) => risk.officialUrl)

    expect(new Set(urls).size, 'risks share an officialUrl').toBe(urls.length)
    for (const raw of urls) {
      const url = expectNasaHttpsUrl(raw)

      expect(url.hostname, raw).toBe('humanresearchroadmap.nasa.gov')
      expect(url.pathname, raw).toBe('/Risks/risk.aspx')
      expect(url.searchParams.get('i') ?? '', raw).toMatch(/^\d+$/)
      expect(url.searchParams.get('i'), raw).not.toBe('78')
    }
  })

  it('uses the NASA hazard base page without invented anchors', () => {
    for (const hazard of getHazards()) {
      const url = expectNasaHttpsUrl(hazard.nasaUrl)

      expect(hazard.nasaUrl, hazard.id).toBe(HAZARD_SOURCE_URL)
      expect(url.search, hazard.id).toBe('')
    }
  })
})

describe('provenance metadata (SRS 5.2 honest scope)', () => {
  it('records verification dates on every provenance layer without invented download metadata', () => {
    expect(sourcesData.curationMethod).toBe('manual')
    expect(sourcesData.verifiedAt).toBe(VERIFIED_AT)
    expect(sourcesData.files['hazards.json'].verifiedAt).toBe(VERIFIED_AT)
    expect(sourcesData.files['risks.json'].verifiedAt).toBe(VERIFIED_AT)

    expect(JSON.stringify(sourcesData)).not.toMatch(/downloadedAt|scriptPath/)
    for (const evidence of sourcesData.riskEvidence) {
      expect(evidence.verifiedAt, evidence.riskId).toBe(VERIFIED_AT)
    }
  })

  it('matches file sourceUrls to the actual dataset URLs', () => {
    const hazardUrls = getHazards().map((hazard) => hazard.nasaUrl)
    const riskUrls = getAllRisks().map((risk) => risk.officialUrl)

    expect([...sourcesData.files['hazards.json'].sourceUrls].sort()).toEqual(
      [...new Set(hazardUrls)].sort(),
    )
    expect([...sourcesData.files['risks.json'].sourceUrls].sort()).toEqual([...riskUrls].sort())
    for (const raw of [
      ...sourcesData.files['hazards.json'].sourceUrls,
      ...sourcesData.files['risks.json'].sourceUrls,
    ]) {
      expectNasaHttpsUrl(raw)
    }
  })

  it('keeps one unique, active evidence entry per risk with no duplicated or retired HRP ids', () => {
    const riskIds = getAllRisks().map((risk) => risk.id)
    const evidenceIds = sourcesData.riskEvidence.map((evidence) => evidence.riskId)
    const hrpIds = sourcesData.riskEvidence.map((evidence) => evidence.hrpId)

    expect(sourcesData.riskEvidence).toHaveLength(11)
    expect([...evidenceIds].sort()).toEqual([...riskIds].sort())
    expect(new Set(hrpIds).size, 'duplicated HRP ids').toBe(hrpIds.length)
    expect([...hrpIds].sort((a, b) => a - b)).toEqual(
      Object.values(HRP_ID_BY_RISK).sort((a, b) => a - b),
    )
    for (const retired of RETIRED_HRP_IDS) {
      expect(hrpIds, `retired HRP id ${retired}`).not.toContain(retired)
    }
  })

  it('links evidence to the risk records and the declared NASA pages', () => {
    const byId = new Map(getAllRisks().map((risk) => [risk.id, risk]))

    for (const evidence of sourcesData.riskEvidence) {
      const risk = byId.get(evidence.riskId)
      if (!risk) throw new Error(`Evidence references missing risk: ${evidence.riskId}`)

      expect(Object.keys(evidence).sort(), evidence.riskId).toEqual(EVIDENCE_KEYS)
      expect(evidence.officialUrl, evidence.riskId).toBe(risk.officialUrl)
      expect(evidence.officialUrl, evidence.riskId).toBe(canonicalRiskUrl(evidence.hrpId))
      expect(evidence.officialTitle, evidence.riskId).toBe(risk.title)
      expect(evidence.sourceSection.length, evidence.riskId).toBeGreaterThan(0)
      expect(evidence.sourceExcerpt.length, evidence.riskId).toBeGreaterThan(0)
      expect(evidence.sourceExcerpt.length, evidence.riskId).toBeLessThanOrEqual(500)
      expect(evidence.hrpStatus, evidence.riskId).toBe('Active')
    }
  })

  it('excludes retired and eliminated risks from the dataset and the evidence', () => {
    const ids = getAllRisks().map((risk) => risk.id)
    const evidenceIds = sourcesData.riskEvidence.map((evidence) => evidence.riskId)
    const allText = JSON.stringify({ risks: getAllRisks(), evidence: sourcesData.riskEvidence })

    for (const eliminated of ELIMINATED_RISK_IDS) {
      expect(ids, eliminated).not.toContain(eliminated)
      expect(evidenceIds, eliminated).not.toContain(eliminated)
    }
    for (const retired of RETIRED_HRP_IDS) {
      expect(allText, `retired HRP id ${retired}`).not.toContain(`risk.aspx?i=${retired}"`)
    }
  })
})

describe('content policy', () => {
  it('keeps countermeasures empty for every risk, including SANS (no clinical actions)', () => {
    const sans = getAllRisks().find((risk) => risk.id === 'sans')

    expect(sans?.countermeasures).toBe('')
    for (const risk of getAllRisks()) {
      const text = `${risk.title} ${risk.description}`

      expect(risk.countermeasures, risk.id).toBe('')
      expect(text, risk.id).not.toMatch(CLINICAL_INSTRUCTION_PATTERN)
    }
  })

  it('contains no medication names or dosage instructions (RF-19)', () => {
    for (const risk of getAllRisks()) {
      const text = `${risk.title} ${risk.description} ${risk.countermeasures}`

      expect(text, risk.id).not.toMatch(DOSAGE_PATTERN)
      expect(text, risk.id).not.toMatch(MEDICATION_PATTERN)
    }
  })

  it('keeps all dataset text in English', () => {
    for (const risk of getAllRisks()) {
      expect(risk.title, risk.id).toMatch(/^[\x20-\x7E\n]+$/)
      expect(risk.description, risk.id).toMatch(/^[\x20-\x7E\n]+$/)
      expect(/\b(?:of|to|in|that|with|could|may|during|from|or|and|the)\b/i.test(risk.description), risk.id).toBe(true)
    }
    for (const hazard of getHazards()) {
      expect(`${hazard.name} ${hazard.description}`, hazard.id).toMatch(/^[\x20-\x7E\n]+$/)
    }
    for (const note of sourcesData.editorialMappingNotes) {
      expect(note).toMatch(/^[\x20-\x7E\n]+$/)
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
