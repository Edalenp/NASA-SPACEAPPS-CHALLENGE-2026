import { create } from 'zustand';
import {
  DONKI_REPLAY, DONKI_SNAPSHOT, DonkiError, donkiWindow, fetchSep, isStale, readCache, writeCache, type DonkiCache,
} from '../../data/nasa/donki';

/**
 * Where the SEP list on screen came from:
 * - live: fetched from NASA DONKI in this visit;
 * - saved: fetched on an earlier visit and kept on this device;
 * - built-in: the copy shipped with the app, used until the first successful fetch.
 */
export type DonkiOrigin = 'live' | 'saved' | 'built-in';

interface SpaceWeatherState {
  cache: DonkiCache;
  origin: DonkiOrigin;
  syncing: boolean;
  /** The last reason a fetch failed, shown under the panel. Cleared by the next success. */
  error: string | null;
  /** Replay of a real past event (May 2024) instead of the live list. */
  replay: boolean;
  sync: (opts?: { force?: boolean }) => Promise<void>;
  setReplay: (on: boolean) => void;
}

// A personal key from api.nasa.gov can be set at build time; DEMO_KEY works without sign-up but has
// a small hourly limit per address, which the three-hour cache keeps well under.
const API_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
const storage = typeof localStorage === 'undefined' ? undefined : localStorage;
const saved = readCache(storage);

export const useSpaceWeather = create<SpaceWeatherState>((set, get) => ({
  cache: saved ?? DONKI_SNAPSHOT,
  origin: saved ? 'saved' : 'built-in',
  syncing: false,
  error: null,
  replay: false,
  async sync({ force = false } = {}) {
    const nowIso = new Date().toISOString();
    if (get().syncing) return;
    // A fetched list (this visit or an earlier one) is reused for three hours; the built-in copy never is.
    if (!force && get().origin !== 'built-in' && !isStale(get().cache, nowIso)) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      set({ error: 'Offline: showing the last list kept on this device.' });
      return;
    }
    set({ syncing: true });
    try {
      const events = await fetchSep(nowIso, API_KEY);
      const cache: DonkiCache = { fetchedAt: nowIso, ...donkiWindow(nowIso), events };
      writeCache(storage, cache);
      set({ cache, origin: 'live', error: null, syncing: false });
    } catch (e) {
      set({ syncing: false, error: e instanceof DonkiError ? e.message : 'NASA DONKI could not be reached.' });
    }
  },
  setReplay: (replay) => set({ replay }),
}));

/** The list and the moment the assessment uses: live data now, or the replayed event's moment. */
export function useSpaceWeatherInput(): { events: DonkiCache['events']; nowIso: string } {
  const replay = useSpaceWeather((s) => s.replay);
  const events = useSpaceWeather((s) => s.cache.events);
  return replay ? { events: DONKI_REPLAY.events, nowIso: DONKI_REPLAY.at } : { events, nowIso: new Date().toISOString() };
}
