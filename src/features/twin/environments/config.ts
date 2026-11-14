import type { EnvironmentId } from '../../../data/mission';

/** Visual context only. Never feeds clinical scores or communication delays. */
export interface HabitatConfig {
  title: string;
  description: string;
  width: number;
  height: number;
  rear: number;
  windowWidth: number;
  windowHeight: number;
  sill: number;
  chamfer: number;
  mullions: number[];
  daylight: string;
  horizon: string;
  zenith: string;
  ground: string;
}

export const habitats: Record<EnvironmentId, HabitatConfig> = {
  station: {
    title: 'Orbital station',
    description: 'An observation gallery above Earth, with a slowly turning planet and solar arrays.',
    width: 18, height: 7, rear: -7.6,
    windowWidth: 16.2, windowHeight: 2.65, sill: 0.55, chamfer: 0.4,
    mullions: [-5.1, 5.1],
    daylight: '#dbe8ed', horizon: '#667d8e', zenith: '#182836', ground: '#9c9a87',
  },
  transit: {
    title: 'Transit vehicle',
    description: 'A deep-space observation cabin, with a distant Mars and a rotating transfer assembly.',
    width: 15, height: 6, rear: -6.8,
    windowWidth: 10.8, windowHeight: 1.85, sill: 0.72, chamfer: 0.35,
    mullions: [-3.6, 3.6],
    daylight: '#e8e5d9', horizon: '#73828b', zenith: '#253642', ground: '#949584',
  },
  rover: {
    title: 'Surface rover',
    description: 'A pressurised field cabin overlooking moving dunes, scattered rocks and a distant ridge.',
    width: 12, height: 5.2, rear: -5.8,
    windowWidth: 10.6, windowHeight: 2.05, sill: 0.65, chamfer: 0.4,
    mullions: [-3.8, 3.8],
    daylight: '#efe0c9', horizon: '#e5c9ac', zenith: '#9eafa9', ground: '#a88b70',
  },
  base: {
    title: 'Planetary base',
    description: 'A broad habitat gallery facing a Mars outpost, solar field and layered mountains.',
    width: 21, height: 7.5, rear: -8.2,
    windowWidth: 18.6, windowHeight: 2.9, sill: 0.45, chamfer: 0.35,
    mullions: [-6.2, 6.2],
    daylight: '#ede1d1', horizon: '#e6d0b5', zenith: '#a8b8b2', ground: '#b29a7d',
  },
};

/** Deterministic decoration: changing environment never changes the mission seed. */
export function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
