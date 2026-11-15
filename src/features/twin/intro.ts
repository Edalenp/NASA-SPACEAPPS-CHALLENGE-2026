import { create } from 'zustand';

/** Seconds the opening scan takes to sweep the body, deck to crown. */
export const SCAN_SECONDS = 2.8;
/** Height the scan climbs to, in metres: a little above the crew member's head. */
export const SCAN_TOP = 1.95;

/** The opening scan: the twin reveals the body, then the interface comes in. Rendering preference,
 *  never health state, so it lives apart from the mission store. */
/** Where the scan line is now (metres), read every frame by the pins: written in place, so the
 *  sweep never re-renders React. */
export const scanLine = { height: -1 };

interface IntroState {
  /** Asset loading, mirrored from the scene so the loader can live outside the lazy 3D bundle. */
  loading: boolean;
  progress: number;
  item: string;
  /** The body has drawn its first frame with every material compiled. */
  ready: boolean;
  /** The loader has stepped aside: the opening scan may start. */
  revealed: boolean;
  done: boolean;
  finish: () => void;
}

export const useIntro = create<IntroState>((set) => ({
  loading: true,
  progress: 0,
  item: '',
  ready: false,
  revealed: false,
  done: false,
  finish: () => set({ done: true }),
}));
