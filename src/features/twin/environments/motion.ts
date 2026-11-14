import { useEffect, useState } from 'react';
import { create } from 'zustand';

function initialMotion() {
  try { return localStorage.getItem('vt-habitat-motion') !== 'paused'; }
  catch { return true; }
}

/** Separate from mission data so a rendering preference cannot alter health state. */
export const useHabitatMotion = create<{ playing: boolean; toggle: () => void }>((set) => ({
  playing: initialMotion(),
  toggle: () => set((state) => {
    const playing = !state.playing;
    try { localStorage.setItem('vt-habitat-motion', playing ? 'playing' : 'paused'); } catch { /* optional preference */ }
    return { playing };
  }),
}));

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
