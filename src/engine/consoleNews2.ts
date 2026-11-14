/**
 * NEWS2 aggregate score, unmodified, from the RCP 2017 chart transcribed in
 * news2-scoring.json. Scale 1 for SpO2 only (Scale 2 needs a clinician).
 * Code written with AI assistance (Claude).
 */
import table from './news2-scoring.json';
import type { Consciousness, IndicatorId, OxygenSupport, ReadingValue } from '../data/indicators';

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

export interface News2Result {
  total: number;
  scores: Record<News2Param, number | null>;
  measured: number;
  complete: boolean;
  singleRed: boolean;
  risk: 'Low' | 'Low–medium' | 'Medium' | 'High';
  escalation: Escalation;
  monitoring: string;
}

export function news2(readings: Partial<Record<IndicatorId, ReadingValue | null>>): News2Result {
  const scores = Object.fromEntries(
    NEWS2_PARAMS.map((id) => [id, paramScore(id, readings[id] ?? null)]),
  ) as Record<News2Param, number | null>;
  const values = Object.values(scores).filter((s): s is number => s !== null);
  const total = values.reduce((a, b) => a + b, 0);
  const singleRed = values.some((s) => s === 3);
  const risk = total >= 7 ? 'High' : total >= 5 ? 'Medium' : singleRed ? 'Low–medium' : 'Low';
  const escalation: Escalation = total >= 7 ? 'surgeon' : total >= 5 || singleRed ? 'cmo' : 'self';
  const monitoring =
    total >= 7 ? 'Continuous monitoring'
    : total >= 5 || singleRed ? 'Measure at least every hour'
    : total >= 1 ? 'Measure every 4 to 6 hours'
    : 'Measure every 12 hours';
  return { total, scores, measured: values.length, complete: values.length === NEWS2_PARAMS.length, singleRed, risk, escalation, monitoring };
}

