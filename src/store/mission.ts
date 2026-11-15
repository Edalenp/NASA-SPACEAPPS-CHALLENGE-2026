import { create } from "zustand";
import { db, newId } from "./db";
import { useHealthStore } from "./healthStore";
import { crew, type EnvironmentId, type SystemId } from "../data/mission";
import type { IndicatorId, ReadingValue } from "../data/indicators";
import { PHYSICAL_RANGES, validateBloodPressurePair } from "../data/ranges";
import { generateMission } from "../data/simulator";
import {
  defaultMissionStart,
  emptyReadings,
  indicatorTypes,
  legacyId,
  legacyMeasurement,
  missionDay,
  readingsAt,
  timeline,
  validateReading,
  type RecordEntry,
} from "../features/measurements/adapter";
import type { ConsciousnessLevel } from "../engine";

export type Entry = RecordEntry;
export type Layer = "anatomy" | "skeleton" | "surface";
export type Panel =
  | "record"
  | "trends"
  | "guides"
  | "routine"
  | "sources"
  | "news"
  | "mission"
  | "system"
  | null;
function preference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
const initialNow = new Date().toISOString();
const savedStart = preference("vt-mission-start");
const initialStart =
  savedStart && Number.isFinite(Date.parse(savedStart))
    ? savedStart
    : defaultMissionStart(initialNow);

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
  now: string;
  missionStart: string;
  hydrated: boolean;
  storageError: string;
  busy: boolean;
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
  open: (
    p: Panel,
    opts?: { guide?: IndicatorId; recordFor?: IndicatorId },
  ) => void;
  setEmergency: (on: boolean) => void;
  notify: (msg: string) => void;
  record: (indicator: IndicatorId, value: ReadingValue) => Promise<void>;
  hydrate: () => Promise<void>;
  tick: () => void;
  loadSimulation: () => Promise<void>;
}

// The health store is the single place where mission inputs become an assessment.
function syncHealth(
  state: Pick<MissionState, "entries" | "now" | "environment">,
) {
  useHealthStore
    .getState()
    .refresh(state.entries, state.now, state.environment);
}

// One flight day is a UTC date. Reopening tomorrow must not reset the clock.
export const useMission = create<MissionState>((set, get) => ({
  selected: "heart",
  focus: null,
  focusRevision: 0,
  layer: "anatomy",
  night: preference("vt-theme")
    ? preference("vt-theme") === "night"
    : typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches === true,
  rotation: 0,
  reset: 0,
  environment: "transit",
  readings: emptyReadings(),
  entries: [],
  now: initialNow,
  missionStart: initialStart,
  hydrated: false,
  storageError: "",
  busy: false,
  panel: null,
  guide: "pulse",
  recordFor: "pulse",
  emergency: false,
  toast: "",
  // Picking the system already under inspection a second time returns to the whole body.
  select: (selected) =>
    set((s) =>
      s.focus === selected
        ? { rotation: 0, focus: null, reset: s.reset + 1 }
        : { selected, focus: selected, focusRevision: s.focusRevision + 1 },
    ),
  setLayer: (layer) => set({ layer }),
  toggleNight: () =>
    set((s) => {
      try {
        localStorage.setItem("vt-theme", s.night ? "day" : "night");
      } catch {
        /* Optional preference. */
      }
      return { night: !s.night };
    }),
  rotate: (rad) => set((s) => ({ rotation: s.rotation + rad })),
  resetView: () =>
    set((s) => ({ rotation: 0, focus: null, reset: s.reset + 1 })),
  setEnvironment: (environment) => {
    set({ environment });
    syncHealth(get());
  },
  open: (panel, opts) =>
    set((s) => ({
      panel,
      guide: opts?.guide ?? s.guide,
      recordFor: opts?.recordFor ?? s.recordFor,
    })),
  setEmergency: (emergency) => set({ emergency, panel: null }),
  notify: (toast) => set({ toast }),
  tick: () => {
    const now = new Date().toISOString();
    set({ now, readings: readingsAt(get().entries, now).readings });
    syncHealth(get());
  },
  record: async (indicator, value) => {
    if (get().busy || !get().hydrated)
      throw new Error("Please wait for device storage.");
    const error = validateReading(indicator, value);
    if (error) throw new Error(error);
    const current = readingsAt(
      get().entries,
      new Date().toISOString(),
    ).readings;
    if (indicator === "systolic" || indicator === "diastolic") {
      const systolic = indicator === "systolic" ? value : current.systolic;
      const diastolic = indicator === "diastolic" ? value : current.diastolic;
      if (typeof systolic === "number" && typeof diastolic === "number") {
        const pair = validateBloodPressurePair(systolic, diastolic);
        if (!pair.ok) throw new Error(pair.message);
      }
    }
    set({ busy: true });
    const timestamp = new Date().toISOString();
    const type = indicatorTypes[indicator];
    try {
      if (type) {
        await db.measurements.put({
          id: newId(),
          crewMemberId: crew.code,
          type,
          value: value as number,
          unit: PHYSICAL_RANGES[type].unit,
          measuredAt: timestamp,
          source: "manual",
          missionDay: missionDay(timestamp, get().missionStart),
        });
      } else if (indicator === "consciousness") {
        await db.observations.put({
          id: newId(),
          crewMemberId: crew.code,
          level: value as ConsciousnessLevel,
          observedAt: timestamp,
          source: "manual",
        });
      } else {
        // The canonical contract has no oxygen-support or exercise record. Keep the existing table.
        await db.entries.add({ indicator, value, timestamp });
      }
      await get().hydrate();
      if (get().storageError) throw new Error(get().storageError);
      get().notify("Saved on this device. Assessment updated.");
    } catch (error) {
      set({
        storageError:
          "Could not confirm the reading in device storage. Reload before retrying.",
      });
      throw error instanceof Error
        ? error
        : new Error("Could not save this reading.");
    } finally {
      set({ busy: false });
    }
  },
  hydrate: async () => {
    try {
      try {
        localStorage.setItem("vt-mission-start", get().missionStart);
      } catch {
        /* IndexedDB is independent. */
      }
      const legacy = await db.entries.orderBy("timestamp").toArray();
      // Idempotent, additive import. Preserve original records; validate imported readings against main.
      await db.transaction("rw", db.measurements, db.observations, async () => {
        for (const e of legacy) {
          const m = legacyMeasurement(e);
          if (m && !(await db.measurements.get(m.id)))
            await db.measurements.put(m);
          if (
            e.indicator === "consciousness" &&
            !validateReading(e.indicator, e.value) &&
            !(await db.observations.get(legacyId(e)))
          ) {
            await db.observations.put({
              id: legacyId(e),
              crewMemberId: crew.code,
              level: e.value as ConsciousnessLevel,
              observedAt: e.timestamp,
              source: "manual",
            });
          }
        }
      });
      const [measurements, observations] = await Promise.all([
        db.measurements.where("crewMemberId").equals(crew.code).toArray(),
        db.observations.where("crewMemberId").equals(crew.code).toArray(),
      ]);
      const entries = timeline(measurements, observations, legacy);
      const now = new Date().toISOString();
      set({
        entries,
        now,
        readings: readingsAt(entries, now).readings,
        hydrated: true,
        storageError: "",
      });
      syncHealth(get());
    } catch {
      set({
        hydrated: true,
        storageError:
          "Device storage is unavailable. Reload to retry; unsaved readings are not retained.",
      });
    }
  },
  loadSimulation: async () => {
    if (get().busy || !get().hydrated) return;
    set({ busy: true });
    try {
      const measurements = generateMission({
        seed: 2026,
        crewMemberId: crew.code,
        startDate: new Date(get().missionStart),
      });
      await db.transaction("rw", db.measurements, async () => {
        for (const m of measurements)
          if (!(await db.measurements.get(m.id))) await db.measurements.put(m);
      });
      await get().hydrate();
      if (!get().storageError)
        get().notify(
          "Mission simulation loaded. Manual readings are preserved.",
        );
    } catch {
      set({
        storageError: "Could not load the simulation into device storage.",
      });
    } finally {
      set({ busy: false });
    }
  },
}));
