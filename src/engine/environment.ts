import { risks as nasaRisks } from '../data/nasa'
import type { HazardId, HrpRisk } from '../data/nasa'
import type { EnvironmentKind, ZoneId } from './types'

export type { HazardId, HrpRisk } from '../data/nasa'

export const FEATURED_HAZARDS: Record<EnvironmentKind, HazardId[]> = {
  spacecraft: ['radiation', 'distance', 'isolation'],
  spaceStation: ['gravity', 'environment', 'radiation'],
  rover: ['radiation', 'distance', 'gravity', 'environment'],
  planetaryBase: ['radiation', 'isolation', 'distance', 'gravity'],
}

export function featuredHazards(kind: EnvironmentKind): HazardId[] {
  return [...FEATURED_HAZARDS[kind]]
}

export function featuredRisks(
  kind: EnvironmentKind,
  allRisks: readonly HrpRisk[] = nasaRisks,
): HrpRisk[] {
  const featured = new Set<string>(FEATURED_HAZARDS[kind])
  return allRisks.filter((risk) => featured.has(risk.hazardId))
}

export function featuredZones(
  kind: EnvironmentKind,
  allRisks: readonly HrpRisk[] = nasaRisks,
): ZoneId[] {
  const zones: ZoneId[] = []
  for (const risk of featuredRisks(kind, allRisks)) {
    for (const zone of risk.targetZones) {
      if (!zones.includes(zone)) zones.push(zone)
    }
  }
  return zones
}
