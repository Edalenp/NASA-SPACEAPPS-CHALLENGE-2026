import { create } from 'zustand';
import type { GLTFLoader } from 'three-stdlib';

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
  /** Bytes of the anatomical model received and expected: the one large file, so the loader can
   *  show it arriving instead of waiting for the whole file to count as one item. */
  model: { loaded: number; total: number };
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
  model: { loaded: 0, total: 0 },
  ready: false,
  revealed: false,
  done: false,
  finish: () => set({ done: true }),
}));

/** The model's size as served, for when the server does not send a length (compressed responses). */
const MODEL_BYTES = 7_614_076;
const tracked = new WeakSet<object>();

/**
 * Reports a loader's download in bytes to the intro store. Passed as useGLTF's loader extension;
 * the loader is shared, so it is wrapped once.
 */
export function trackModelBytes(loader: GLTFLoader) {
  if (tracked.has(loader)) return;
  tracked.add(loader);
  const load = loader.load.bind(loader);
  loader.load = (url, onLoad, onProgress, onError) => load(url, onLoad, (event) => {
    const total = event.lengthComputable && event.total ? event.total : MODEL_BYTES;
    useIntro.setState({ model: { loaded: Math.min(event.loaded, total), total } });
    onProgress?.(event);
  }, onError);
}
