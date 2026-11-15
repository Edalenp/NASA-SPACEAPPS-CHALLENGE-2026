import { create } from 'zustand';

/** What the landing waits for behind its loading plate: the body twin drawn, the fibres drawn,
 *  and the console's pictures in the cache. The model's bytes come from the twin's own tracker. */
interface LandingLoad {
  twin: boolean;
  fibres: boolean;
  console: boolean;
  /** The plate has left: the hero may make its entrance. */
  ready: boolean;
}

export const useLandingLoad = create<LandingLoad>(() => ({ twin: false, fibres: false, console: false, ready: false }));

export function markLoaded(part: 'twin' | 'fibres' | 'console') {
  if (!useLandingLoad.getState()[part]) useLandingLoad.setState({ [part]: true });
}

/** The landing plate's steps; Root shows them too, before the landing's code arrives. */
export const LANDING_STEPS = ['Anatomical model', 'Muscle fibres & body twin', 'Console, ready offline'] as const;

/** The console's habitat pictures, fetched into the HTTP cache so /lab opens without waiting. */
export const CONSOLE_ASSETS = ['/textures/deep-space.png', '/textures/earth-blue-marble.png', '/textures/planet.png'];
