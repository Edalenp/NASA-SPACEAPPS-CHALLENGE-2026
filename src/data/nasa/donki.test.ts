import { describe, expect, it, vi } from 'vitest'
import {
  DONKI_CACHE_KEY, DONKI_REPLAY, DONKI_SNAPSHOT, DONKI_STALE_MS, DonkiError, donkiUrl, donkiWindow, fetchSep, isStale,
  normaliseSep, readCache, writeCache,
} from './donki'

const RECORD = {
  sepID: '2024-05-10T13:35:00-SEP-001',
  eventTime: '2024-05-10T13:35Z',
  instruments: [{ displayName: 'GOES-P: SEISS >10 MeV' }],
  link: 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30612/-1',
  linkedEvents: [{ activityID: '2024-05-10T06:27:00-FLR-001' }],
}

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }
}
const asFetch = (f: unknown) => f as typeof fetch

describe('normaliseSep', () => {
  it('reads DONKI records, their time, energy and links', () => {
    const [e] = normaliseSep([RECORD])
    expect(e).toMatchObject({
      id: RECORD.sepID,
      time: '2024-05-10T13:35:00.000Z',
      observed: true,
      energy: '>10 MeV',
      linked: ['2024-05-10T06:27:00-FLR-001'],
    })
  })

  it('marks model-only records as not observed', () => {
    const [e] = normaliseSep([{ ...RECORD, instruments: [{ displayName: 'MODEL: REleASE:ACE/EPAM 15.8-39.8 MeV' }] }])
    expect(e.observed).toBe(false)
    expect(e.energy).toBe('15.8–39.8 MeV')
  })

  it('keeps the highest energy threshold', () => {
    const [e] = normaliseSep([
      { ...RECORD, instruments: [{ displayName: 'GOES-P: SEISS >10 MeV' }, { displayName: 'GOES-P: SEISS >100 MeV' }] },
    ])
    expect(e.energy).toBe('>100 MeV')
  })

  it('drops malformed records and sorts newest first', () => {
    const out = normaliseSep([
      { sepID: 1 },
      { ...RECORD, eventTime: 'nope' },
      RECORD,
      { ...RECORD, sepID: 'later', eventTime: '2024-05-11T02:10Z' },
      null,
    ])
    expect(out.map((e) => e.id)).toEqual(['later', RECORD.sepID])
    expect(normaliseSep('not a list')).toEqual([])
  })
})

describe('the request', () => {
  it('asks for the last 30 days, inside the 60-day limit DONKI accepts', () => {
    expect(donkiWindow('2026-11-15T12:00:00Z')).toEqual({ startDate: '2026-10-16', endDate: '2026-11-15' })
    expect(donkiUrl('2026-11-15T12:00:00Z', 'KEY')).toBe(
      'https://api.nasa.gov/DONKI/SEP?startDate=2026-10-16&endDate=2026-11-15&api_key=KEY',
    )
  })

  it('returns events, or none for an empty body', async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify([RECORD]), { status: 200 }))
    expect((await fetchSep('2026-11-15T12:00:00Z', 'K', asFetch(ok)))[0].id).toBe(RECORD.sepID)
    const empty = vi.fn(async () => new Response('', { status: 200 }))
    expect(await fetchSep('2026-11-15T12:00:00Z', 'K', asFetch(empty))).toEqual([])
  })

  it('explains rate limits, server errors and no network', async () => {
    const limited = vi.fn(async () => new Response('', { status: 429 }))
    await expect(fetchSep('2026-11-15T12:00:00Z', 'K', asFetch(limited))).rejects.toThrow(/request limit/)
    const broken = vi.fn(async () => new Response('', { status: 503 }))
    await expect(fetchSep('2026-11-15T12:00:00Z', 'K', asFetch(broken))).rejects.toThrow(DonkiError)
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(fetchSep('2026-11-15T12:00:00Z', 'K', asFetch(offline))).rejects.toThrow(/could not be reached/)
  })
})

describe('the cache', () => {
  it('round-trips and rejects garbage', () => {
    const s = memoryStorage()
    writeCache(s, { fetchedAt: '2026-11-15T12:00:00.000Z', startDate: '2026-10-16', endDate: '2026-11-15', events: normaliseSep([RECORD]) })
    expect(readCache(s)?.events[0].id).toBe(RECORD.sepID)
    s.m.set(DONKI_CACHE_KEY, '{bad json')
    expect(readCache(s)).toBeNull()
    expect(readCache(undefined)).toBeNull()
  })

  it('goes stale after three hours', () => {
    const c = { fetchedAt: '2026-11-15T12:00:00.000Z', startDate: '', endDate: '', events: [] }
    expect(isStale(c, new Date(Date.parse(c.fetchedAt) + DONKI_STALE_MS - 1000).toISOString())).toBe(false)
    expect(isStale(c, new Date(Date.parse(c.fetchedAt) + DONKI_STALE_MS + 1000).toISOString())).toBe(true)
    expect(isStale(null, c.fetchedAt)).toBe(true)
  })
})

describe('the built-in copy', () => {
  it('ships a real DONKI answer and a real past event to replay', () => {
    expect(Date.parse(DONKI_SNAPSHOT.fetchedAt)).not.toBeNaN()
    expect(DONKI_REPLAY.events.length).toBeGreaterThan(0)
    expect(DONKI_REPLAY.events.some((e) => e.observed && e.instruments.some((i) => i.startsWith('GOES')))).toBe(true)
  })
})
