import { create } from 'zustand';
import Dexie, { type EntityTable } from 'dexie';
import { scenarioReadings, type EnvironmentId, type SystemId } from '../data/mission';
import type { IndicatorId, ReadingValue } from '../data/indicators';

export interface Entry {
  id?: number;
  indicator: IndicatorId;
  value: ReadingValue;
  timestamp: string;
}

export const db = new Dexie('vitruvio') as Dexie & { entries: EntityTable<Entry, 'id'> };
db.version(1).stores({ entries: '++id,indicator,timestamp' });

export type Layer = 'anatomy' | 'skeleton' | 'surface';
export type Panel = 'record' | 'trends' | 'guides' | 'routine' | 'sources' | 'news' | 'mission' | 'system' | null;

function readTheme(): boolean {
  try {
    const saved = localStorage.getItem('vt-theme');
    if (saved) return saved === 'night';
  } catch { /* storage blocked */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

interface MissionState {
  selected: SystemId;
  focus: SystemId | null;
  focusRevision: number;
  layer: Layer;
  night: boolean;
  rotation: number;
  reset: number;
  environment: EnvironmentId;
  readings: Record<IndicatorId, ReadingValue | null>;
  entries: Entry[];
  panel: Panel;
  guide: IndicatorId;
  recordFor: IndicatorId;
  emergency: boolean;
  toast: string;
  select: (s: SystemId) => void;
  setLayer: (l: Layer) => void;
  toggleNight: () => void;
  rotate: (rad: number) => void;
  resetView: () => void;
  setEnvironment: (e: EnvironmentId) => void;
  open: (p: Panel, opts?: { guide?: IndicatorId; recordFor?: IndicatorId }) => void;
  setEmergency: (on: boolean) => void;
  notify: (msg: string) => void;
  record: (indicator: IndicatorId, value: ReadingValue) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useMission = create<MissionState>((set, get) => ({
  selected: 'heart',
  focus: null,
  focusRevision: 0,
  layer: 'anatomy',
  night: readTheme(),
  rotation: 0,
  reset: 0,
  environment: 'transit',
  readings: { ...scenarioReadings },
  entries: [],
  panel: null,
  guide: 'pulse',
  recordFor: 'pulse',
  emergency: false,
  toast: '',
  select: (selected) => set((s) => ({ selected, focus: selected, focusRevision: s.focusRevision + 1 })),
  setLayer: (layer) => set({ layer }),
  toggleNight: () =>
    set((s) => {
      try { localStorage.setItem('vt-theme', s.night ? 'day' : 'night'); } catch { /* storage blocked */ }
      return { night: !s.night };
    }),
  rotate: (rad) => set((s) => ({ rotation: s.rotation + rad })),
  resetView: () => set((s) => ({ rotation: 0, focus: null, reset: s.reset + 1 })),
  setEnvironment: (environment) => set({ environment }),
  open: (panel, opts) => set((s) => ({ panel, guide: opts?.guide ?? s.guide, recordFor: opts?.recordFor ?? s.recordFor })),
  setEmergency: (emergency) => set({ emergency, panel: null }),
  notify: (toast) => set({ toast }),
  record: async (indicator, value) => {
    const entry: Entry = { indicator, value, timestamp: new Date().toISOString() };
    set((s) => ({ readings: { ...s.readings, [indicator]: value }, entries: [...s.entries, entry] }));
    try {
      await db.entries.add(entry);
      get().notify('Saved on this device. Score and states updated.');
    } catch {
      get().notify('Saved for this session only. Browser storage is blocked.');
    }
  },
  hydrate: async () => {
    try {
      const entries = await db.entries.orderBy('timestamp').toArray();
      const readings = { ...scenarioReadings };
      for (const e of entries) readings[e.indicator] = e.value;
      set({ entries, readings });
    } catch { /* IndexedDB unavailable: keep the scenario */ }
  },
}));
