import { afterEach, describe, expect, it, vi } from 'vitest'
import osdBandsData from './osd575-bands.json'
import { getOsd575Bands } from './reference'

const EXPECTED = {
  glucose: { unit: 'mg/dL', bands: { pre: { min: 56, max: 100 }, post: { min: 36, max: 103 }, all: { min: 36, max: 103 } } },
  calcium: { unit: 'mg/dL', bands: { pre: { min: 9.3, max: 10.3 }, post: { min: 9.2, max: 10.1 }, all: { min: 9.2, max: 10.3 } } },
  sodium: { unit: 'mmol/L', bands: { pre: { min: 138, max: 143 }, post: { min: 136, max: 141 }, all: { min: 136, max: 143 } } },
  potassium: { unit: 'mmol/L', bands: { pre: { min: 3.3, max: 4.6 }, post: { min: 3.0, max: 5.9 }, all: { min: 3.0, max: 5.9 } } },
} as const
const ANALYTE_IDS = ['glucose', 'calcium', 'sodium', 'potassium'] as const
const NEGATIVE_NOTICES = [
  'not normal intervals', 'not a personal baseline',
  'not simulator calibration', 'not a 180-day prediction',
] as const

type MutableBand = { min: number; max: number }
type MutableAnalyte = {
  id: string
  unit: string
  phaseCounts: { pre: number; post: number; all: number }
  bands: { pre: MutableBand; post: MutableBand; all: MutableBand }
}
type MutableOsd = {
  datasetId: string
  study: Record<string, unknown>
  source: Record<string, unknown> & { url: string; sha256?: string; bytes: number; retrievedAt: string; verificationDate: string }
  cohort: { uniqueSamples: number; crewCount: number; preSamples: number; postSamples: number }
  analytes: MutableAnalyte[]
  clinicalContext: { scope: string; notices: string[] }
}

function cloneOsd(): MutableOsd {
  return structuredClone(osdBandsData) as unknown as MutableOsd
}

async function expectInvalid(osd: MutableOsd, message: RegExp): Promise<void> {
  vi.resetModules()
  vi.doMock('./osd575-bands.json', () => ({ default: osd }))
  await expect(import('./reference')).rejects.toThrow(message)
}

afterEach(() => {
  vi.doUnmock('./osd575-bands.json')
  vi.resetModules()
})

describe('OSD-575 aggregate cohort', () => {
  it('exposes the exact cohort shape and four analyte units', () => {
    const dataset = getOsd575Bands()

    expect(dataset.cohort).toEqual({
      uniqueSamples: 28, crewCount: 4, preSamples: 12, postSamples: 16,
    })
    expect(dataset.analytes.map(({ id, unit }) => ({ id, unit }))).toEqual([
      { id: 'glucose', unit: 'mg/dL' },
      { id: 'calcium', unit: 'mg/dL' },
      { id: 'sodium', unit: 'mmol/L' },
      { id: 'potassium', unit: 'mmol/L' },
    ])
    for (const analyte of dataset.analytes) {
      expect(analyte.phaseCounts).toEqual({ pre: 12, post: 16, all: 28 })
    }
  })

  it('matches the reviewed observed min/max oracle', () => {
    const analytes = new Map(getOsd575Bands().analytes.map((analyte) => [analyte.id, analyte]))

    for (const id of ANALYTE_IDS) {
      const expected = EXPECTED[id]
      const actual = analytes.get(id)

      expect(actual?.unit, id).toBe(expected.unit)
      expect(actual?.bands, id).toEqual(expected.bands)
    }
  })

  it('keeps every band finite, ordered, and range-column free', () => {
    const dataset = getOsd575Bands()
    const keys = new Set<string>()

    const collectKeys = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(collectKeys)
        return
      }
      if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
          keys.add(key)
          collectKeys(child)
        }
      }
    }
    collectKeys(dataset)

    for (const analyte of dataset.analytes) {
      for (const phase of ['pre', 'post', 'all'] as const) {
        expect(Number.isFinite(analyte.bands[phase].min), `${analyte.id}.${phase}`).toBe(true)
        expect(Number.isFinite(analyte.bands[phase].max), `${analyte.id}.${phase}`).toBe(true)
        expect(analyte.bands[phase].min, `${analyte.id}.${phase}`).toBeLessThanOrEqual(
          analyte.bands[phase].max,
        )
      }
    }
    for (const forbidden of [
      'normal', 'normalRange', 'referenceRange', 'clinicalThreshold',
      'baseline', 'calibration', 'prediction', 'range_min', 'range_max',
    ]) {
      expect(keys.has(forbidden), forbidden).toBe(false)
    }
  })

  it('pins DOI, CC0, version, source URL, bytes, and SHA-256 provenance', () => {
    const dataset = getOsd575Bands()

    expect(dataset.study).toEqual({
      id: 'OSD-575', version: '3', doi: '10.26030/mc5d-p710', license: 'CC0-1.0',
    })
    expect(dataset.source.url).toBe(
      'https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv',
    )
    expect(dataset.source.bytes).toBe(8506)
    expect(dataset.source.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(dataset.source.verificationDate).toBe('2026-11-14')
    expect(Number.isNaN(Date.parse(dataset.source.retrievedAt))).toBe(false)
  })

  it('states explicit negative notices and no positive clinical labels', () => {
    const dataset = getOsd575Bands()
    const notices = dataset.clinicalContext.notices.join(' ').toLowerCase()

    expect(dataset.clinicalContext.scope).toContain('observational context only')
    for (const notice of NEGATIVE_NOTICES) expect(notices).toContain(notice)
    expect(JSON.stringify(dataset)).not.toMatch(/"clinicalThreshold"|"normalRange"|"referenceRange"/i)
  })

  it('contains no real participant ids, sample names, sex, email, or rows', () => {
    const text = JSON.stringify(getOsd575Bands())

    expect(text).not.toMatch(/C\d{3}_serum_|sampleName|crewId|serum|sex|email|timepoint|"values"/i)
    expect(text).not.toMatch(/_L-|_R\+/)
  })
})

describe('getOsd575Bands isolation', () => {
  it('returns independent deep copies on every call', () => {
    const first = getOsd575Bands()
    const second = getOsd575Bands()

    expect(first).not.toBe(second)
    expect(first.source).not.toBe(second.source)
    expect(first.cohort).not.toBe(second.cohort)
    expect(first.analytes).not.toBe(second.analytes)
    expect(first.analytes[0]).not.toBe(second.analytes[0])
    expect(first.analytes[0]?.bands.pre).not.toBe(second.analytes[0]?.bands.pre)
    expect(first.clinicalContext).not.toBe(second.clinicalContext)
    expect(first.clinicalContext.notices).not.toBe(second.clinicalContext.notices)
  })

  it('does not let nested mutations corrupt the shared dataset', () => {
    const before = getOsd575Bands()
    const mutated = getOsd575Bands()

    mutated.source.url = 'https://example.invalid/source.csv'
    mutated.source.sha256 = 'mutated'
    mutated.cohort.uniqueSamples = 0
    mutated.analytes[0].phaseCounts.pre = 0
    mutated.analytes[0].bands.pre.min = 0
    mutated.analytes[0].bands.pre.max = 0
    mutated.clinicalContext.notices.push('mutated')

    expect(getOsd575Bands()).toEqual(before)
  })
})

const INVALID_CASES: Array<[string, (osd: MutableOsd) => void, RegExp]> = [
  ['a wrong dataset id', (osd) => { osd.datasetId = 'wrong' }, /osd575-bands\.datasetId/],
  ['a wrong analyte unit', (osd) => { osd.analytes[0].unit = 'mmol/L' }, /osd575-bands\.analytes\[0\]\.unit/],
  ['a wrong cohort count', (osd) => { osd.cohort.uniqueSamples = 27 }, /osd575-bands\.cohort\.uniqueSamples/],
  ['a non-finite band', (osd) => { osd.analytes[0].bands.pre.min = Number.NaN }, /osd575-bands\.analytes\[0\]\.bands\.pre\.min/],
  ['an inverted band', (osd) => { osd.analytes[0].bands.pre.min = 101 }, /osd575-bands\.analytes\[0\]\.bands\.pre/],
  ['a missing negative notice', (osd) => { osd.clinicalContext.notices = osd.clinicalContext.notices.filter((notice) => !notice.includes('180-day')) }, /osd575-bands\.clinicalContext\.notices/],
  ['a bad source URL', (osd) => { osd.source.url = 'https://example.invalid/source.csv' }, /osd575-bands\.source\.url/],
  ['a bad SHA-256', (osd) => { osd.source.sha256 = 'abc' }, /osd575-bands\.source\.sha256/],
  ['a missing source field', (osd) => { delete osd.source.sha256 }, /osd575-bands\.source.*sha256/],
]

describe('runtime validation', () => {
  it.each(INVALID_CASES)('rejects %s', async (_name, mutate, message) => {
    const osd = cloneOsd()
    mutate(osd)
    await expectInvalid(osd, message)
  })
})
