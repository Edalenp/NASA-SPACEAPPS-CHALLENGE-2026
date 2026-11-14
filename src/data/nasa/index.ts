import { ZONE_IDS, type ZoneId } from '../../engine/types'
import hazardsData from './hazards.json'
import risksData from './risks.json'
import type { HazardId, HrpRisk, SpaceflightHazard } from './types'

const HAZARD_IDS: readonly HazardId[] = [
  'radiation',
  'isolation',
  'distance',
  'gravity',
  'environment',
]
const HAZARD_ID_SET = new Set<string>(HAZARD_IDS)
const ZONE_ID_SET = new Set<string>(ZONE_IDS)

function isHazardId(value: string): value is HazardId {
  return HAZARD_ID_SET.has(value)
}

function isZoneId(value: string): value is ZoneId {
  return ZONE_ID_SET.has(value)
}

function parseHazards(data: typeof hazardsData): SpaceflightHazard[] {
  return data.map((hazard) => {
    if (!isHazardId(hazard.id)) {
      throw new Error(`Unknown NASA hazard id: ${hazard.id}`)
    }
    return { ...hazard, id: hazard.id }
  })
}

function parseRisks(data: typeof risksData): HrpRisk[] {
  return data.map((risk) => {
    if (!isHazardId(risk.hazardId)) {
      throw new Error(`Risk ${risk.id} references unknown hazard: ${risk.hazardId}`)
    }
    if (risk.targetZones.length === 0) {
      throw new Error(`Risk ${risk.id} has no target zones`)
    }
    const targetZones = risk.targetZones.map((zoneId) => {
      if (!isZoneId(zoneId)) {
        throw new Error(`Risk ${risk.id} references unknown zone: ${zoneId}`)
      }
      return zoneId
    })
    return { ...risk, hazardId: risk.hazardId, targetZones }
  })
}

export type * from './types'

export const hazards: readonly SpaceflightHazard[] = parseHazards(hazardsData)
export const risks: readonly HrpRisk[] = parseRisks(risksData)
export const HAZARDS = hazards
export const RISKS = risks

export function getHazards(): SpaceflightHazard[] {
  return [...hazards]
}

export function getHazardById(id: HazardId): SpaceflightHazard | undefined {
  return hazards.find((hazard) => hazard.id === id)
}

export function getAllRisks(): HrpRisk[] {
  return [...risks]
}

export function getRisksByZone(zoneId: ZoneId): HrpRisk[] {
  return risks.filter((risk) => risk.targetZones.includes(zoneId))
}

export function getRisksByHazard(hazardId: HazardId): HrpRisk[] {
  return risks.filter((risk) => risk.hazardId === hazardId)
}
