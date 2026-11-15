import type { SepEvent } from '../data/nasa/donki'
import type { EnvironmentId } from '../data/mission'

/**
 * Space weather for the crew, from NASA DONKI's solar energetic particle (SEP) events.
 *
 * Rules (each one cites why):
 * - alert: a spacecraft detector registered an SEP event in the last 48 hours. Particle events
 *   usually last hours to a few days; the crew shelters and logs the dose to that event.
 *   NASA-STD-3001 Vol. 1 (V1 4031) requires protecting the crew from a solar particle event, and
 *   HRP lists space radiation among the five hazards of human spaceflight.
 * - watch: only a forecasting model flagged an event in the last 48 hours, or the last observed
 *   event is two to seven days old. The crew keeps the dosimeter on and the shelter ready.
 * - quiet: nothing in the last seven days.
 *
 * VITRUVIO suggests and explains. It does not estimate a dose: the dosimeter does.
 */

export type SpaceWeatherLevel = 'quiet' | 'watch' | 'alert'

export interface SpaceWeather {
  level: SpaceWeatherLevel
  headline: string
  detail: string
  /** Suggested crew actions, most important first. Empty when quiet. */
  actions: string[]
  /** The event the level comes from, if any. */
  event: SepEvent | null
  /** Hours from the event to `now`, rounded down. */
  hoursAgo: number | null
  /** Where the crew is changes how much a near-Earth observation tells them. */
  locationNote: string
}

export const ALERT_HOURS = 48
export const WATCH_DAYS = 7

export const SPACE_WEATHER_SOURCES = [
  {
    title: 'NASA DONKI · Solar energetic particle events',
    url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    title: 'NASA-STD-3001 Vol. 1 Rev. C · V1 4031, protection from a solar particle event',
    url: 'https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1',
  },
  {
    title: 'NASA Human Research Program · Space radiation hazard',
    url: 'https://www.nasa.gov/hrp/hazards/',
  },
]

const HOUR = 60 * 60 * 1000

/**
 * Among several detections of the same storm, the one to show: GOES first (the detector in Earth
 * orbit behind NOAA's solar radiation storm scale), then the highest energy, then the newest.
 */
function rank(e: SepEvent): number {
  const goes = e.instruments.some((n) => /^GOES/i.test(n.trim())) ? 1e6 : 0
  const mev = Number(e.energy?.match(/\d+(?:\.\d+)?/)?.[0] ?? 0)
  return goes + mev * 1000 + Date.parse(e.time) / 1e12
}
const best = (list: SepEvent[]) => list.slice().sort((a, b) => rank(b) - rank(a))[0]

function when(event: SepEvent): string {
  return `${event.time.slice(0, 10)} ${event.time.slice(11, 16)} UTC`
}

function detector(event: SepEvent): string {
  const real = event.instruments.filter((n) => !/^model\s*:/i.test(n.trim()))
  return (real[0] ?? event.instruments[0] ?? 'DONKI').replace(/\s+/g, ' ')
}

export function locationNote(environment: EnvironmentId): string {
  return environment === 'station'
    ? 'Most of DONKI’s particle detectors watch from near Earth, as the station does; Earth’s magnetic field shields part of low orbit.'
    : 'Most of DONKI’s particle detectors watch from near Earth. In transit or at Mars a particle event can arrive later, weaker or not at all: treat it as an early warning and trust your dosimeter.'
}

export function assessSpaceWeather(events: readonly SepEvent[], nowIso: string, environment: EnvironmentId): SpaceWeather {
  const now = Date.parse(nowIso)
  // Never act on an event registered after `now` (the replay moves `now` into the past).
  const past = events
    .filter((e) => Date.parse(e.time) <= now)
    .sort((a, b) => b.time.localeCompare(a.time))
  const age = (e: SepEvent) => (now - Date.parse(e.time)) / HOUR
  const note = locationNote(environment)

  const observedRecent = best(past.filter((e) => e.observed && age(e) <= ALERT_HOURS))
  if (observedRecent) {
    return {
      level: 'alert',
      headline: 'Solar particle event in progress.',
      detail: `NASA DONKI registered a solar energetic particle event at ${when(observedRecent)}${observedRecent.energy ? `, ${observedRecent.energy}` : ''}, seen by ${detector(observedRecent)}.`,
      actions: [
        'Move to the shielded shelter area until the event ends.',
        'Wear your dosimeter and log each reading to this event.',
        'Tell the Crew Medical Officer and postpone spacewalks.',
      ],
      event: observedRecent,
      hoursAgo: Math.floor(age(observedRecent)),
      locationNote: note,
    }
  }

  const forecast = past.find((e) => !e.observed && age(e) <= ALERT_HOURS)
  const observedWeek = past.find((e) => e.observed && age(e) <= WATCH_DAYS * 24)
  const watchEvent = forecast ?? observedWeek
  if (watchEvent) {
    return {
      level: 'watch',
      headline: forecast ? 'A particle event is forecast.' : 'A particle event ended recently.',
      detail: forecast
        ? `A NASA DONKI forecast model flagged a solar energetic particle event at ${when(forecast)}. No spacecraft detector has confirmed it yet.`
        : `NASA DONKI’s last solar energetic particle event was at ${when(watchEvent)}. Levels can rise again while the same active region faces you.`,
      actions: ['Keep your dosimeter on.', 'Know the way to the shelter and plan spacewalks around it.'],
      event: watchEvent,
      hoursAgo: Math.floor(age(watchEvent)),
      locationNote: note,
    }
  }

  return {
    level: 'quiet',
    headline: 'No solar particle events.',
    detail: `NASA DONKI lists no solar energetic particle events in the last ${WATCH_DAYS} days.`,
    actions: [],
    event: null,
    hoursAgo: null,
    locationNote: note,
  }
}
