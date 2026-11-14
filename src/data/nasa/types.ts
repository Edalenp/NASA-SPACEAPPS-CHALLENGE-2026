import type { ZoneId } from '../../engine/types'

export type HazardId = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'environment'

export interface SpaceflightHazard {
  id: HazardId
  name: string
  description: string
  nasaUrl: string
}

export interface HrpRisk {
  id: string
  title: string
  hazardId: HazardId
  targetZones: ZoneId[]
  description: string
  countermeasures: string
  officialUrl: string
}
