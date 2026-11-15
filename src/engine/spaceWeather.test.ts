import { describe, expect, it } from 'vitest'
import { assessSpaceWeather, locationNote, SPACE_WEATHER_SOURCES } from './spaceWeather'
import { DONKI_REPLAY, type SepEvent } from '../data/nasa/donki'

const ev = (id: string, time: string, observed = true, energy: string | null = '>10 MeV'): SepEvent => ({
  id,
  time,
  observed,
  energy,
  instruments: [observed ? 'GOES-P: SEISS >10 MeV' : 'MODEL: REleASE:ACE/EPAM 15.8-39.8 MeV'],
  link: null,
  linked: [],
})
const NOW = '2026-11-15T12:00:00.000Z'

describe('assessSpaceWeather', () => {
  it('is quiet with no events', () => {
    const w = assessSpaceWeather([], NOW, 'transit')
    expect(w.level).toBe('quiet')
    expect(w.actions).toEqual([])
    expect(w.event).toBeNull()
  })

  it('alerts on an observed event in the last 48 hours and tells the crew to shelter and log the dose', () => {
    const w = assessSpaceWeather([ev('A', '2026-11-14T13:00:00.000Z')], NOW, 'transit')
    expect(w.level).toBe('alert')
    expect(w.event?.id).toBe('A')
    expect(w.hoursAgo).toBe(23)
    expect(w.actions[0]).toMatch(/shelter/i)
    expect(w.actions.join(' ')).toMatch(/dosimeter/i)
    expect(w.detail).toContain('GOES-P')
  })

  it('treats a model-only event as a forecast: watch, not alert', () => {
    const w = assessSpaceWeather([ev('M', '2026-11-15T06:00:00.000Z', false)], NOW, 'transit')
    expect(w.level).toBe('watch')
    expect(w.headline).toMatch(/forecast/i)
  })

  it('keeps watch for an observed event two to seven days old, then goes quiet', () => {
    expect(assessSpaceWeather([ev('B', '2026-11-12T12:00:00.000Z')], NOW, 'base').level).toBe('watch')
    expect(assessSpaceWeather([ev('C', '2026-11-07T12:00:00.000Z')], NOW, 'base').level).toBe('quiet')
  })

  it('alerts exactly at 48 hours and not after', () => {
    expect(assessSpaceWeather([ev('D', '2026-11-13T12:00:00.000Z')], NOW, 'station').level).toBe('alert')
    expect(assessSpaceWeather([ev('E', '2026-11-13T11:59:00.000Z')], NOW, 'station').level).toBe('watch')
  })

  it('prefers an observed event over a newer forecast', () => {
    const w = assessSpaceWeather([ev('F', '2026-11-15T10:00:00.000Z', false), ev('G', '2026-11-15T02:00:00.000Z')], NOW, 'transit')
    expect(w.level).toBe('alert')
    expect(w.event?.id).toBe('G')
  })

  it('ignores events registered after now (the replay moves now into the past)', () => {
    expect(assessSpaceWeather([ev('H', '2026-11-16T00:00:00.000Z')], NOW, 'transit').level).toBe('quiet')
  })

  it('says how far a near-Earth observation applies', () => {
    expect(locationNote('station')).toMatch(/magnetic field/)
    expect(locationNote('base')).toMatch(/Mars/)
  })

  it('cites DONKI, NASA-STD-3001 and HRP', () => {
    expect(SPACE_WEATHER_SOURCES.map((s) => s.title).join(' ')).toMatch(/DONKI.*NASA-STD-3001.*Human Research Program/)
  })

  it('alerts during the replayed May 2024 storm, from a spacecraft detection', () => {
    const w = assessSpaceWeather(DONKI_REPLAY.events, DONKI_REPLAY.at, 'transit')
    expect(w.level).toBe('alert')
    expect(w.event?.time.startsWith('2024-05-10')).toBe(true)
    expect(w.event?.observed).toBe(true)
    // GOES, in Earth orbit, is shown over STEREO A and SOHO for the same storm.
    expect(w.event?.instruments[0]).toMatch(/^GOES/)
  })
})
