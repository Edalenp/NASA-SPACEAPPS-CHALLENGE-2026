import snapshotData from './donki-snapshot.json';

/**
 * NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), solar energetic
 * particle (SEP) events. DONKI is run by the Community Coordinated Modeling Center at NASA Goddard
 * and served openly through api.nasa.gov. VITRUVIO reads the SEP list, the particle radiation that
 * matters for a crew's dose, and keeps a copy on the device so the console still answers offline.
 */

/** One SEP record, as DONKI publishes it (only the fields VITRUVIO reads). */
export interface DonkiSepRecord {
  sepID: string;
  eventTime: string;
  instruments?: { displayName: string }[] | null;
  link?: string | null;
  linkedEvents?: { activityID: string }[] | null;
}

/** An SEP event as VITRUVIO uses it. */
export interface SepEvent {
  id: string;
  /** ISO time the event was registered. */
  time: string;
  instruments: string[];
  /**
   * True when at least one instrument is a spacecraft detector (GOES, SOHO, STEREO, ACE...).
   * DONKI also lists events flagged by a forecasting model (instrument names starting "MODEL:");
   * those alone are treated as a forecast, not an observation.
   */
  observed: boolean;
  /** The highest particle energy threshold named by the instruments, for example ">100 MeV". */
  energy: string | null;
  link: string | null;
  /** DONKI activity IDs of the flares and CMEs DONKI linked to this event. */
  linked: string[];
}

export const DONKI_SEP_ENDPOINT = 'https://api.nasa.gov/DONKI/SEP';
export const DONKI_SOURCE = {
  title: 'NASA DONKI · Solar energetic particle events (CCMC, NASA Goddard)',
  url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  api: 'https://api.nasa.gov/',
};
/** DONKI rejects a request wider than 60 days. VITRUVIO looks back 30. */
export const DONKI_WINDOW_DAYS = 30;
/** How long a fetched list counts as fresh before the console asks DONKI again. */
export const DONKI_STALE_MS = 3 * 60 * 60 * 1000;
export const DONKI_CACHE_KEY = 'vt-donki-sep-v1';

function energyOf(instruments: string[]): string | null {
  let best: { mev: number; label: string } | null = null;
  for (const name of instruments) {
    for (const m of name.matchAll(/(>?)\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*MeV/gi)) {
      const low = Number(m[2]);
      const label = m[1] ? `>${m[2]} MeV` : m[3] ? `${m[2]}–${m[3]} MeV` : `${m[2]} MeV`;
      if (!best || low > best.mev) best = { mev: low, label };
    }
  }
  return best?.label ?? null;
}

/** Normalises DONKI records; anything malformed is dropped rather than guessed. */
export function normaliseSep(records: unknown): SepEvent[] {
  if (!Array.isArray(records)) return [];
  const out: SepEvent[] = [];
  for (const r of records as DonkiSepRecord[]) {
    if (!r || typeof r.sepID !== 'string' || typeof r.eventTime !== 'string') continue;
    // DONKI writes minutes without seconds ("2024-05-10T13:35Z"); Date accepts that form.
    const ms = Date.parse(r.eventTime);
    if (!Number.isFinite(ms)) continue;
    const instruments = (r.instruments ?? []).map((i) => i?.displayName).filter((n): n is string => typeof n === 'string');
    out.push({
      id: r.sepID,
      time: new Date(ms).toISOString(),
      instruments,
      observed: instruments.some((n) => !/^model\s*:/i.test(n.trim())),
      energy: energyOf(instruments),
      link: typeof r.link === 'string' ? r.link : null,
      linked: (r.linkedEvents ?? []).map((l) => l?.activityID).filter((a): a is string => typeof a === 'string'),
    });
  }
  return out.sort((a, b) => b.time.localeCompare(a.time));
}

/** The window DONKI is asked for: the last 30 days up to today, in its YYYY-MM-DD form. */
export function donkiWindow(nowIso: string, days = DONKI_WINDOW_DAYS): { startDate: string; endDate: string } {
  const end = new Date(nowIso);
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export function donkiUrl(nowIso: string, apiKey: string): string {
  const { startDate, endDate } = donkiWindow(nowIso);
  const q = new URLSearchParams({ startDate, endDate, api_key: apiKey });
  return `${DONKI_SEP_ENDPOINT}?${q.toString()}`;
}

/** Thrown with a message the console can show as it is. */
export class DonkiError extends Error {}

/** Asks DONKI for the last 30 days of SEP events. */
export async function fetchSep(nowIso: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<SepEvent[]> {
  let res: Response;
  try {
    res = await fetchImpl(donkiUrl(nowIso, apiKey), { headers: { Accept: 'application/json' } });
  } catch {
    throw new DonkiError('NASA DONKI could not be reached.');
  }
  if (res.status === 429) throw new DonkiError('NASA DONKI asked us to wait: the hourly request limit was reached.');
  if (!res.ok) throw new DonkiError(`NASA DONKI answered with an error (HTTP ${res.status}).`);
  // An empty window comes back as an empty body or []: both mean no events.
  const text = await res.text();
  if (text.trim() === '') return [];
  try {
    return normaliseSep(JSON.parse(text));
  } catch {
    throw new DonkiError('NASA DONKI sent data VITRUVIO could not read.');
  }
}

/** What the device keeps between visits. */
export interface DonkiCache {
  fetchedAt: string;
  startDate: string;
  endDate: string;
  events: SepEvent[];
}

export function readCache(storage: Pick<Storage, 'getItem'> | undefined): DonkiCache | null {
  try {
    const raw = storage?.getItem(DONKI_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as DonkiCache;
    if (typeof c.fetchedAt !== 'string' || !Number.isFinite(Date.parse(c.fetchedAt)) || !Array.isArray(c.events)) return null;
    return { fetchedAt: c.fetchedAt, startDate: c.startDate, endDate: c.endDate, events: c.events.filter((e) => e && typeof e.id === 'string' && typeof e.time === 'string') };
  } catch {
    return null;
  }
}

export function writeCache(storage: Pick<Storage, 'setItem'> | undefined, cache: DonkiCache): void {
  try {
    storage?.setItem(DONKI_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* Private mode or full storage: the console keeps the list for this session only. */
  }
}

export function isStale(cache: DonkiCache | null, nowIso: string): boolean {
  return !cache || Date.parse(nowIso) - Date.parse(cache.fetchedAt) > DONKI_STALE_MS;
}

/**
 * The copy built into the app: the DONKI answer for the 60 days before the build, and a real
 * past event (the May 2024 solar storm) the crew can replay to see how VITRUVIO responds.
 */
export const DONKI_SNAPSHOT = {
  fetchedAt: snapshotData.fetchedAt,
  startDate: snapshotData.window.startDate,
  endDate: snapshotData.window.endDate,
  events: normaliseSep(snapshotData.sep),
} satisfies DonkiCache;

export const DONKI_REPLAY = {
  label: snapshotData.replay.label,
  /** The moment the replay puts the console at: during the event, after DONKI registered it. */
  at: snapshotData.replay.at,
  startDate: snapshotData.replay.window.startDate,
  endDate: snapshotData.replay.window.endDate,
  events: normaliseSep(snapshotData.replay.sep),
};
