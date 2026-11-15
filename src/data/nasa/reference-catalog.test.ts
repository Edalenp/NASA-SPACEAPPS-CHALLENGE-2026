import { afterEach, describe, expect, it, vi } from 'vitest'
import catalogData from './reference-catalog.json'
import { getReferenceCatalog, getReferenceDatasetIds } from './reference'
import { getAllRisks } from './index'
import sources from './sources.json'

const IDS = [
  'hrp', 'iss-medical-kit', 'osd-575', 'nasa-std-3001-vol1', 'ochmo-tb-020',
  'donki', 'noaa-swpc', 'csa-radiation', 'news2', 'nasa-3d-resources',
] as const
const HOSTS = [
  'www.nasa.gov', 'standards.nasa.gov', 'humanresearchroadmap.nasa.gov', 'osdr.nasa.gov',
  'nasa-osdr.s3.us-west-2.amazonaws.com', 'www.rcp.ac.uk', 'www.swpc.noaa.gov',
  'www.spaceweather.gov', 'www.weather.gov', 'www.asc-csa.gc.ca', 'ccmc.gsfc.nasa.gov',
  'science.nasa.gov', 'github.com',
] as const

type MutableEntry = {
  id: string; title: string; publisher: string; urls: string[]; edition: string
  purpose: string; srsReferences: string[]; verificationDate: string; dataNature: string
  curationMethod: string; licenseTerms: { label: string; url: string; notes: string }
  owner: { module: string; handoff: string }; notes: string; [key: string]: unknown
}
type MutableCatalog = {
  datasetId: string
  verificationDate: string
  licenseNotice: string
  hostAllowlist: string[]
  entries: MutableEntry[]
}

function cloneCatalog(): MutableCatalog {
  return structuredClone(catalogData) as unknown as MutableCatalog
}

async function expectInvalid(data: MutableCatalog, message: RegExp): Promise<void> {
  vi.resetModules()
  vi.doMock('./reference-catalog.json', () => ({ default: data }))
  await expect(import('./reference')).rejects.toThrow(message)
}

afterEach(() => {
  vi.doUnmock('./reference-catalog.json')
  vi.resetModules()
})

describe('reference catalog', () => {
  it('contains exactly the ten approved families', () => {
    const dataset = getReferenceCatalog()

    expect(dataset.datasetId).toBe('nasa-reference-catalog')
    expect(dataset.verificationDate).toBe('2026-11-14')
    expect(dataset.licenseNotice).toContain('not legal advice')
    expect(dataset.entries.map((entry) => entry.id)).toEqual(IDS)
  })

  it('gives every entry the required provenance fields', () => {
    for (const entry of getReferenceCatalog().entries) {
      expect(entry.title.length, entry.id).toBeGreaterThan(0)
      expect(entry.publisher.length, entry.id).toBeGreaterThan(0)
      expect(entry.urls.length, entry.id).toBeGreaterThan(0)
      expect(entry.edition.length, entry.id).toBeGreaterThan(0)
      expect(entry.purpose.length, entry.id).toBeGreaterThan(0)
      expect(entry.srsReferences.length, entry.id).toBeGreaterThan(0)
      expect(entry.dataNature.length, entry.id).toBeGreaterThan(0)
      expect(entry.notes.length, entry.id).toBeGreaterThan(0)
      expect(entry.verificationDate, entry.id).toBe('2026-11-14')
      expect(entry.licenseTerms.label.length, entry.id).toBeGreaterThan(0)
      expect(entry.licenseTerms.notes.length, entry.id).toBeGreaterThan(30)
      expect(entry.owner.module.length, entry.id).toBeGreaterThan(0)
      expect(entry.owner.handoff.length, entry.id).toBeGreaterThan(0)
    }
  })

  it('uses only exact allowlisted HTTPS hosts', () => {
    const dataset = getReferenceCatalog()
    const hosts = new Set(dataset.hostAllowlist)

    expect(dataset.hostAllowlist).toEqual(HOSTS)
    for (const host of dataset.hostAllowlist) expect(host, host).not.toContain('*')
    for (const entry of dataset.entries) {
      for (const raw of [...entry.urls, entry.licenseTerms.url]) {
        const url = new URL(raw)
        expect(url.protocol, raw).toBe('https:')
        expect(url.username, raw).toBe('')
        expect(url.password, raw).toBe('')
        expect(url.hash, raw).toBe('')
        expect(hosts.has(url.hostname), raw).toBe(true)
      }
    }
  })

  it('keeps HRP as the approved 11-risk manual subset', () => {
    const entry = getReferenceCatalog().entries[0]

    expect(entry?.id).toBe('hrp')
    expect(entry?.curationMethod).toBe('manual')
    expect(entry?.notes).toContain('11')
    expect(entry?.notes).toContain('17')
    expect(getAllRisks()).toHaveLength(11)
  })

  it('records the historical ISS kit and mixed OSD cohort reference', () => {
    const entries = new Map(getReferenceCatalog().entries.map((entry) => [entry.id, entry]))
    const iss = entries.get('iss-medical-kit')
    const osd = entries.get('osd-575')

    expect(iss?.curationMethod).toBe('manual')
    expect(iss?.notes).toContain('2015')
    expect(iss?.notes.toLowerCase()).toContain('not a current')
    expect(osd?.curationMethod).toBe('mixed')
    expect(osd?.edition).toContain('Version 3')
    expect(osd?.licenseTerms.label).toBe('CC0-1.0')
    expect(osd?.notes).toContain('28')
    expect(osd?.notes).toContain('no participant')
    expect(osd?.notes).toContain('not calibration')
  })

  it('documents the live DONKI client and keeps NOAA catalog-only, with migration and redirect notes', () => {
    const entries = new Map(getReferenceCatalog().entries.map((entry) => [entry.id, entry]))
    const donki = entries.get('donki')
    const noaa = entries.get('noaa-swpc')

    expect(donki?.notes).toContain('2026')
    expect(donki?.notes).toContain('re-verify')
    expect(donki?.notes).toContain('api.nasa.gov/DONKI/SEP')
    expect(donki?.licenseTerms.notes.toLowerCase()).toContain('stores no api key')
    expect(noaa?.notes).toContain('spaceweather.gov')
    expect(noaa?.notes).toContain('Fallback prepared, not live')
    for (const entry of [donki, noaa]) {
      expect(Object.hasOwn(entry ?? {}, 'apiKey')).toBe(false)
      expect(Object.hasOwn(entry ?? {}, 'liveClient')).toBe(false)
      expect(Object.hasOwn(entry ?? {}, 'mock')).toBe(false)
    }
  })

  it('credits NEWS2 without transcribing thresholds or bands', () => {
    const news2 = getReferenceCatalog().entries.find((entry) => entry.id === 'news2')

    expect(news2?.urls).toEqual(expect.arrayContaining([
      'https://www.rcp.ac.uk/media/alxev00t/news2-chart-1_the-news-scoring-system_0_0.pdf',
      'https://www.rcp.ac.uk/media/2acdezkd/news2-chart-2_news-thresholds-and-triggers_0.pdf',
    ]))
    expect(news2?.notes).toContain('No NEWS2 thresholds')
    expect(Object.hasOwn(news2 ?? {}, 'thresholds')).toBe(false)
    expect(Object.hasOwn(news2 ?? {}, 'bands')).toBe(false)
  })

  it('flags NASA 3D asset-level licensing and does not publish GLB assets', () => {
    const nasa3d = getReferenceCatalog().entries.find((entry) => entry.id === 'nasa-3d-resources')

    expect(nasa3d?.notes).toContain('No uniform license')
    expect(nasa3d?.notes).toContain('asset-level review')
    expect(nasa3d?.urls).toContain('https://github.com/nasa/NASA-3D-Resources')
    expect(nasa3d?.urls.some((url) => url.toLowerCase().endsWith('.glb'))).toBe(false)
  })

  it('keeps partner sources out of the NASA-only HRP sources file', () => {
    const text = JSON.stringify(sources).toLowerCase()

    expect(text).not.toContain('rcp')
    expect(text).not.toContain('noaa')
    expect(text).not.toContain('csa')
  })

  it('returns deep copies and the full dataset id list', () => {
    const first = getReferenceCatalog()
    const second = getReferenceCatalog()

    expect(first).not.toBe(second)
    expect(first.entries).not.toBe(second.entries)
    expect(first.entries[0]).not.toBe(second.entries[0])
    expect(first.entries[0]?.urls).not.toBe(second.entries[0]?.urls)
    expect(first.entries[0]?.licenseTerms).not.toBe(second.entries[0]?.licenseTerms)
    expect(first.hostAllowlist).not.toBe(second.hostAllowlist)
    expect(getReferenceDatasetIds()).toEqual([
      'medical-kit', 'osd575-bands', 'radiation-reference', 'reference-catalog',
    ])
  })

  it('does not let nested mutations corrupt the shared catalog', () => {
    const before = getReferenceCatalog()
    const mutated = getReferenceCatalog()

    mutated.licenseNotice = 'mutated'
    mutated.hostAllowlist.push('example.com')
    mutated.entries[0].urls.push('https://example.com/')
    mutated.entries[0].licenseTerms.notes = 'mutated'
    mutated.entries[0].owner.handoff = 'mutated'
    mutated.entries[0].srsReferences.push('RF-999')

    expect(getReferenceCatalog()).toEqual(before)
  })
})

const INVALID_CASES: Array<[string, (data: MutableCatalog) => void, RegExp]> = [
  ['a duplicate entry id', (data) => { data.entries[1].id = data.entries[0].id }, /reference-catalog\.entries\[1\]\.id/],
  ['a wildcard host', (data) => { data.hostAllowlist[0] = '*.nasa.gov' }, /reference-catalog\.hostAllowlist\[0\]/],
  ['an untrusted entry URL', (data) => { data.entries[0].urls[0] = 'https://example.com/' }, /reference-catalog\.entries\[0\]\.urls\[0\]/],
  ['an empty license note', (data) => { data.entries[0].licenseTerms.notes = '' }, /reference-catalog\.entries\[0\]\.licenseTerms\.notes/],
  ['a bad curation method', (data) => { data.entries[2].curationMethod = 'automatic' }, /reference-catalog\.entries\[2\]\.curationMethod/],
  ['an empty owner handoff', (data) => { data.entries[0].owner.handoff = '' }, /reference-catalog\.entries\[0\]\.owner\.handoff/],
  ['an extra API-key field', (data) => { data.entries[5].apiKey = 'secret' }, /reference-catalog\.entries\[5\]/],
  ['a bad verification date', (data) => { data.entries[0].verificationDate = 'not-a-date' }, /reference-catalog\.entries\[0\]\.verificationDate/],
  ['an untrusted license URL', (data) => { data.entries[0].licenseTerms.url = 'https://example.com/' }, /reference-catalog\.entries\[0\]\.licenseTerms\.url/],
]

describe('catalog runtime validation', () => {
  it.each(INVALID_CASES)('rejects %s', async (_name, mutate, message) => {
    const data = cloneCatalog()
    mutate(data)
    await expectInvalid(data, message)
  })
})
