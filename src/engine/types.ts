export const ZONE_IDS = [
  'head',
  'heartCirculation',
  'lungs',
  'musculoskeletal',
  'immuneMetabolic',
  'sleepMood',
] as const

export type ZoneId = (typeof ZONE_IDS)[number]

export type ZoneState = 'normal' | 'attention' | 'alert'

export type IndicatorType =
  | 'systolicBloodPressure'
  | 'diastolicBloodPressure'
  | 'heartRate'
  | 'glucose'
  | 'temperature'
  | 'sleepHours'
  | 'mood'
  | 'respiratoryRate'
  | 'oxygenSaturation'
  | 'reactionTime'

export type MeasurementUnit =
  | 'mmHg'
  | 'bpm'
  | 'mg/dL'
  | '°C'
  | 'h'
  | 'score'
  | 'breaths/min'
  | '%'
  | 'ms'

export type MeasurementSource =
  | 'manual'
  | 'cameraExperimental'
  | 'reactionTest'
  | 'simulator'

export type ConsciousnessLevel =
  | 'alert'
  | 'newConfusion'
  | 'voice'
  | 'pain'
  | 'unresponsive'

export type EnvironmentKind =
  | 'spacecraft'
  | 'spaceStation'
  | 'rover'
  | 'planetaryBase'

export type CrewRole = 'crew' | 'medicalOfficer'

export type AlertLevel = 'low' | 'singleRed' | 'medium' | 'high'

export interface Measurement {
  id: string
  crewMemberId: string
  type: IndicatorType
  value: number
  unit: MeasurementUnit
  measuredAt: string
  source: MeasurementSource
  missionDay?: number
}

export interface ConsciousnessObservation {
  id: string
  crewMemberId: string
  level: ConsciousnessLevel
  observedAt: string
  source: MeasurementSource
}

export interface CrewMember {
  id: string
  displayName: string
  role: CrewRole
  environmentId: string
}

export interface Environment {
  id: string
  kind: EnvironmentKind
  name: string
  communicationDelayMinutes: number
}

export interface SourcedAction {
  text: string
  sourceTitle: string
  sourceUrl: string
}

export interface ZoneEvaluation {
  zoneId: ZoneId
  state: ZoneState
  indicators: IndicatorType[]
  actions: SourcedAction[]
}

export interface Alert {
  id: string
  crewMemberId: string
  createdAt: string
  news2Score: number | null
  isComplete: boolean
  level: AlertLevel | null
  consciousness: ConsciousnessLevel
  zones: Record<ZoneId, ZoneEvaluation>
}
