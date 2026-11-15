/**
 * NEWS2 aggregate score, unmodified, from the RCP 2017 chart transcribed in
 * news2-scoring.json. Scale 1 for SpO2 only (Scale 2 needs a clinician).
 * Code written with AI assistance (Claude).
 */
import table from './news2-scoring.json';
import type { Consciousness, OxygenSupport, ReadingValue } from '../data/indicators';

interface Band { min?: number; max?: number; score: number }

const NEWS2_PARAMS = ['respiration', 'spo2', 'oxygen', 'systolic', 'pulse', 'consciousness', 'temperature'] as const;
export type News2Param = (typeof NEWS2_PARAMS)[number];
export const news2Params: readonly News2Param[] = NEWS2_PARAMS;

function band(bands: Band[], v: number): number {
  const hit = bands.find((b) => (b.min === undefined || v >= b.min) && (b.max === undefined || v <= b.max));
  return hit?.score ?? 0;
}

export function paramScore(id: News2Param, v: ReadingValue | null): number | null {
  if (v === null || v === undefined) return null;
  const p = table.parameters;
  switch (id) {
    case 'respiration': return band(p.respirationRate, v as number);
    case 'spo2': return band(p.spo2Scale1, v as number);
    case 'oxygen': return (v as OxygenSupport) === 'oxygen' ? 2 : 0;
    case 'systolic': return band(p.systolicBloodPressure, v as number);
    case 'pulse': return band(p.pulse, v as number);
    case 'consciousness': return (v as Consciousness) === 'alert' ? 0 : 3;
    case 'temperature': return band(p.temperature, Math.round((v as number) * 10) / 10);
  }
}

export type Escalation = 'self' | 'cmo' | 'surgeon';
