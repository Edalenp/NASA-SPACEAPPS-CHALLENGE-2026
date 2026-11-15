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
  | 'calcium'
  | 'sodium'
  | 'potassium'

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
  | 'mmol/L'

export type MeasurementSource =
  | 'manual'
  | 'cameraExperimental'
  | 'reactionTest'
  | 'simulator'

export type GlucoseTiming = 'unknown' | 'fasting' | 'afterMeal' | 'random'

export type GlucoseSpecimen =
  | 'unknown'
  | 'capillary'
  | 'venousPlasma'
  | 'interstitial'

/** Optional draw context for a glucose reading. Unknown is the safe default, never fasting. */
export interface GlucoseContext {
  timing: GlucoseTiming
  specimen: GlucoseSpecimen
}

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

export type ActivityKind = 'sleep' | 'rest' | 'work' | 'exercise' | 'eva'

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
  /** RF-05: how a timed reaction test was scored; present only for source 'reactionTest'. */
  reaction?: ReactionSummary
  /** Optional glucose draw context; absent on older records and read as unknown. */
  glucoseContext?: GlucoseContext
}

export interface ReactionSummary {
  validTrials: number
  failures: number
  durationMs: number
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

/** Why an action was raised: a NEWS2 point, an absolute clinical limit or the personal range. */
export type ActionTrigger = 'news2' | 'clinical' | 'baseline'

export interface SourcedAction {
  text: string
  sourceTitle: string
  sourceUrl: string
  /** Optional provenance (RF-18). Emergency protocol steps leave these out. */
  indicator?: IndicatorType
  trigger?: ActionTrigger
  state?: 'attention' | 'alert'
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
