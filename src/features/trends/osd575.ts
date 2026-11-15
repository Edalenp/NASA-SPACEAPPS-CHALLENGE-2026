import type { IndicatorId } from '../../data/indicators';
import { indicators } from '../../data/indicators';
import { getOsd575Bands } from '../../data/nasa/reference';
import type { OsdAnalyteId } from '../../data/nasa/reference-types';

export type CrewPhase = 'pre' | 'post' | 'all';

export interface CrewBand {
  min: number;
  max: number;
  phase: CrewPhase;
  samples: number;
  crewCount: number;
  doi: string;
}

const ANALYTES: readonly OsdAnalyteId[] = ['glucose', 'calcium', 'sodium', 'potassium'];
const isAnalyte = (id: IndicatorId): id is IndicatorId & OsdAnalyteId => (ANALYTES as readonly string[]).includes(id);

/**
 * RF-27: the observed range of the Inspiration4 crew (NASA OSDR OSD-575, comprehensive metabolic
 * panel) for one reading, before flight, after flight or both. Only when the units match the
 * app's own, so a band is never drawn on the wrong scale. An observation, not a normal interval.
 */
export function crewBand(id: IndicatorId, phase: CrewPhase = 'all'): CrewBand | null {
  if (!isAnalyte(id)) return null;
  const data = getOsd575Bands();
  const analyte = data.analytes.find((a) => a.id === id);
  const indicator = indicators[id];
  if (!analyte || indicator.kind !== 'number' || analyte.unit !== indicator.unit) return null;
  const band = analyte.bands[phase];
  return {
    min: band.min,
    max: band.max,
    phase,
    samples: analyte.phaseCounts[phase],
    crewCount: data.cohort.crewCount,
    doi: data.study.doi,
  };
}

export function crewBandNotices(): string[] {
  return getOsd575Bands().clinicalContext.notices;
}
