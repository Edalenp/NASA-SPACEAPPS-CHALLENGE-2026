import type { IndicatorId, ReadingValue } from './indicators';

/** Body systems shown on the twin. Merged from demo-vitruvio (six systems). */
export type SystemId = 'head' | 'heart' | 'lungs' | 'bones' | 'immune' | 'sleep';

export interface BodySystem {
  id: SystemId;
  code: string;
  name: string;
  short: string;
  /** Readings that decide this system's state, the first one is the headline. */
  readings: IndicatorId[];
  description: string;
  /** NASA's five hazards of human spaceflight that weigh on this system. */
  hazards: Hazard[];
  /** Short paraphrase of the related NASA Human Research Program risk. */
  hrpRisk: string;
  /** Anchor of the pin on the 1.8 m twin, metres. */
  pin: [number, number, number];
}

export type Hazard = 'Radiation' | 'Isolation and confinement' | 'Distance from Earth' | 'Gravity fields' | 'Hostile and closed environments';

export const systems: BodySystem[] = [
  {
    id: 'head', code: '01', name: 'Head & cognition', short: 'Head',
    readings: ['consciousness'],
    description: 'Awareness, coordination and response. A window into how you adapt to the mission.',
    hazards: ['Isolation and confinement', 'Radiation'],
    hrpRisk: 'Adverse cognitive or behavioural conditions',
    pin: [0, 1.66, 0.12],
  },
  {
    id: 'heart', code: '02', name: 'Heart & circulation', short: 'Circulation',
    readings: ['pulse', 'systolic', 'diastolic'],
    description: 'The transport network. It moves oxygen and nutrients through your body every second.',
    hazards: ['Gravity fields', 'Radiation'],
    hrpRisk: 'Cardiovascular adaptations and orthostatic intolerance',
    pin: [0.055, 1.26, 0.12],
  },
  {
    id: 'lungs', code: '03', name: 'Respiratory system', short: 'Lungs',
    readings: ['spo2', 'respiration', 'oxygen'],
    description: 'Oxygen in, carbon dioxide out. Read oxygen saturation and breathing rate together.',
    hazards: ['Hostile and closed environments'],
    hrpRisk: 'Exposure to cabin CO₂ and air contaminants',
    pin: [-0.12, 1.29, 0.1],
  },
  {
    id: 'bones', code: '04', name: 'Bones & muscles', short: 'Musculoskeletal',
    readings: ['exercise'],
    description: 'The structure behind every movement. Exercise is the countermeasure you control.',
    hazards: ['Gravity fields'],
    hrpRisk: 'Bone loss and reduced muscle strength',
    pin: [0.12, 0.66, 0.1],
  },
  {
    id: 'immune', code: '05', name: 'Immune & metabolism', short: 'Metabolism',
    readings: ['temperature', 'glucose'],
    description: 'Energy, balance and protection, read in the context of a changing environment.',
    hazards: ['Radiation', 'Hostile and closed environments'],
    hrpRisk: 'Altered immune response',
    pin: [0, 1.04, 0.14],
  },
  {
    id: 'sleep', code: '06', name: 'Sleep & mood', short: 'Sleep & mood',
    readings: ['sleep', 'mood'],
    description: 'Recovery is part of the mission. This is a function, not an organ.',
    hazards: ['Isolation and confinement', 'Distance from Earth'],
    hrpRisk: 'Sleep loss, circadian misalignment and work overload',
    pin: [-0.26, 1.7, 0.12],
  },
];

/** Readings at 08:30 on mission day 042. Simulated. Null means not measured today. */
export const scenarioReadings: Record<IndicatorId, ReadingValue | null> = {
  pulse: 92,
  systolic: 106,
  diastolic: 70,
  respiration: 16,
  spo2: 98,
  oxygen: 'air',
  consciousness: 'alert',
  temperature: 36.8,
  glucose: null,
  sleep: null,
  mood: null,
  exercise: 75,
};

export const MISSION_DAY = 42;
export const MISSION_LENGTH = 180;

/** 30 sols of simulated history ending today, used by the trend ruler. */
export const history: Record<'pulse' | 'systolic', number[]> = {
  pulse: [74, 73, 75, 72, 76, 74, 75, 77, 74, 73, 76, 75, 74, 78, 76, 74, 75, 77, 76, 79, 78, 80, 78, 81, 80, 79, 83, 86, 89, 92],
  systolic: [121, 122, 120, 123, 121, 119, 122, 124, 121, 120, 122, 123, 121, 119, 120, 122, 121, 123, 122, 120, 121, 122, 120, 119, 121, 122, 120, 114, 110, 106],
};

export type EnvironmentId = 'transit' | 'station' | 'rover' | 'base';

export const environments: Record<EnvironmentId, { name: string; code: string; delayMin: number; context: string }> = {
  station: { name: 'Orbital station', code: 'LOW EARTH ORBIT', delayMin: 0, context: 'Microgravity' },
  transit: { name: 'Transit vehicle', code: 'TRANSIT / EARTH–MARS', delayMin: 11.7, context: 'Microgravity, deep space' },
  rover: { name: 'Surface rover', code: 'SURFACE / ROVER', delayMin: 12, context: 'Partial gravity, isolation' },
  base: { name: 'Planetary base', code: 'MARS / HABITAT', delayMin: 20, context: 'Partial gravity' },
};

export function formatDelay(min: number): string {
  if (min < 0.05) return '< 1 s';
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return s ? `${m} min ${String(s).padStart(2, '0')} s` : `${m} min`;
}

export const crew = { name: 'Jordan Lee', initials: 'JL', code: 'JL–02', role: 'Crew member 02' };
