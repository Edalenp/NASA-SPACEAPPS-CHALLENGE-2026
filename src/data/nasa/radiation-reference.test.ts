import { afterEach, describe, expect, it, vi } from 'vitest'
import radiationData from './radiation-reference.json'
import { getRadiationReference } from './reference'

const CAREER_QUOTE =
  'An individual crewmember’s total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv. This limit is universal for all ages and sexes.'
const SPE_STANDARD_QUOTE =
  'The program shall protect crewmembers from exposure to the design reference Solar Particle Event (SPE) environment proton energy spectrum (sum of the October 1989 events) to less than an effective dose of 250 mSv.'
const SPE_BRIEF_QUOTE =
  'The program shall protect crewmembers from exposure to the design reference Solar Particle Event (SPE) environment proton energy spectrum (sum of the October 1989 events) to less than a NASA effective dose of 250 mSv.'
const BRIEF_STATUS_QUOTE =
  'This Technical Brief is derived from NASA-STD-3001 and is for reference only. It does not supersede or waive existing Agency, Program, or Contract requirements.'

type MutableLimit = {
  id: string
  value: number
  unit: string
  constraint: string
  doseType: string
  requirementId: string
  standardPage: number
  briefPage: number
  standardQuote: string
  briefQuote: string
  context: string
}
type MutableRadiation = {
  datasetId: string
  status: string
  statusNote: string
  sources: {
    standard: { label: string; url: string; approvedAt: string }
    brief: {
      label: string; url: string; date: string; status: string; statusPage: number; statusQuote: string
    }
  }
  limits: MutableLimit[]
  semantics: {
    doseType: string; unit: string; notOrganDose: boolean; noSvConversion: boolean
    noMgyConversion: boolean; notPersonalDoseMeasurement: boolean; notCurrentEvent: boolean
    noClinicalAction: boolean; csaNote: string; notes: string[]
  }
  engineIntegration: { included: boolean; reason: string }
}

function cloneRadiation(): MutableRadiation {
  return structuredClone(radiationData) as unknown as MutableRadiation
}

async function expectInvalid(data: MutableRadiation, message: RegExp): Promise<void> {
  vi.resetModules()
  vi.doMock('./radiation-reference.json', () => ({ default: data }))
  await expect(import('./reference')).rejects.toThrow(message)
}

afterEach(() => {
  vi.doUnmock('./radiation-reference.json')
  vi.resetModules()
})

describe('radiation reference', () => {
  it('is reference-only and links the standard and brief', () => {
    const dataset = getRadiationReference()

    expect(dataset.datasetId).toBe('nasa-radiation-reference')
    expect(dataset.status).toBe('reference-only')
    expect(dataset.statusNote).toContain('not a clinical decision tool')
    expect(dataset.sources.standard).toEqual({
      label: 'NASA-STD-3001 Volume 1 Revision C',
      url: 'https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf',
      approvedAt: '2023-09-15',
    })
    expect(dataset.sources.brief.url).toBe(
      'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf',
    )
    expect(dataset.sources.brief.date).toBe('2025-06-06')
    expect(dataset.sources.brief.statusPage).toBe(2)
    expect(dataset.sources.brief.status).toContain('does not supersede')
    expect(dataset.sources.brief.statusQuote).toBe(BRIEF_STATUS_QUOTE)
  })

  it('cites the 600 mSv career constraint exactly', () => {
    const career = getRadiationReference().limits[0]

    expect(career).toMatchObject({
      id: 'career-effective-dose',
      value: 600,
      unit: 'mSv',
      constraint: '<600',
      doseType: 'NASA effective dose',
      requirementId: 'V1 4030',
      standardPage: 40,
      briefPage: 4,
      standardQuote: CAREER_QUOTE,
      briefQuote: CAREER_QUOTE,
    })
    expect(career?.context).toContain('universal for all ages and sexes')
  })

  it('cites the 250 mSv design-reference SPE constraint exactly', () => {
    const spe = getRadiationReference().limits[1]

    expect(spe).toMatchObject({
      id: 'spe-effective-dose',
      value: 250,
      unit: 'mSv',
      constraint: '<250',
      doseType: 'NASA effective dose',
      requirementId: 'V1 4031',
      standardPage: 42,
      briefPage: 6,
      standardQuote: SPE_STANDARD_QUOTE,
      briefQuote: SPE_BRIEF_QUOTE,
    })
    expect(spe?.context).toContain('October 1989')
    expect(spe?.context).toContain('not a personal dose measurement')
    expect(spe?.context).toContain('current-event')
  })

  it('keeps effective-dose semantics without organ, Sv, mGy, or clinical actions', () => {
    const dataset = getRadiationReference()

    expect(dataset.semantics).toMatchObject({
      doseType: 'NASA effective dose',
      unit: 'mSv',
      notOrganDose: true,
      noSvConversion: true,
      noMgyConversion: true,
      notPersonalDoseMeasurement: true,
      notCurrentEvent: true,
      noClinicalAction: true,
    })
    expect(dataset.semantics.csaNote).toContain('not substituted')
    expect(dataset.semantics.notes.join(' ')).toContain('No clinical action')
    expect(dataset.limits.every((limit) => limit.unit === 'mSv')).toBe(true)
    expect(JSON.stringify(dataset)).not.toMatch(/"unit":"(?:mGy|Sv)"/)
    expect(dataset.engineIntegration.included).toBe(false)
  })

  it('returns independent deep copies', () => {
    const first = getRadiationReference()
    const second = getRadiationReference()

    expect(first).not.toBe(second)
    expect(first.sources).not.toBe(second.sources)
    expect(first.limits).not.toBe(second.limits)
    expect(first.limits[0]).not.toBe(second.limits[0])
    expect(first.semantics).not.toBe(second.semantics)
    expect(first.semantics.notes).not.toBe(second.semantics.notes)
  })

  it('does not let nested mutations corrupt the shared dataset', () => {
    const before = getRadiationReference()
    const mutated = getRadiationReference()

    mutated.limits[0].value = 0
    mutated.limits[0].standardQuote = 'mutated'
    mutated.semantics.notes.push('mutated')
    mutated.sources.brief.statusQuote = 'mutated'

    expect(getRadiationReference()).toEqual(before)
  })
})

const INVALID_CASES: Array<[string, (data: MutableRadiation) => void, RegExp]> = [
  ['a wrong career value', (data) => { data.limits[0].value = 601 }, /radiation-reference\.limits\[0\]\.value/],
  ['a wrong constraint', (data) => { data.limits[0].constraint = '<=600' }, /radiation-reference\.limits\[0\]\.constraint/],
  ['a wrong unit', (data) => { data.limits[0].unit = 'mGy' }, /radiation-reference\.limits\[0\]\.unit/],
  ['a wrong requirement id', (data) => { data.limits[1].requirementId = 'V1 9999' }, /radiation-reference\.limits\[1\]\.requirementId/],
  ['a wrong standard page', (data) => { data.limits[0].standardPage = 41 }, /radiation-reference\.limits\[0\]\.standardPage/],
  ['a missing quote', (data) => { data.limits[1].briefQuote = '' }, /radiation-reference\.limits\[1\]\.briefQuote/],
  ['a bad brief status page', (data) => { data.sources.brief.statusPage = 1 }, /radiation-reference\.sources\.brief\.statusPage/],
  ['a clinical-action semantics flag', (data) => { data.semantics.noClinicalAction = false }, /radiation-reference\.semantics\.noClinicalAction/],
  ['an untrusted standard URL', (data) => { data.sources.standard.url = 'https://example.com/std.pdf' }, /radiation-reference\.sources\.standard\.url/],
]

describe('radiation runtime validation', () => {
  it.each(INVALID_CASES)('rejects %s', async (_name, mutate, message) => {
    const data = cloneRadiation()
    mutate(data)
    await expectInvalid(data, message)
  })
})
