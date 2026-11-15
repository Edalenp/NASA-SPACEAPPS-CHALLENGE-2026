export type ReferenceDatasetId =
  | 'medical-kit'
  | 'osd575-bands'
  | 'radiation-reference'
  | 'reference-catalog'

export type ReferenceCurationMethod = 'manual' | 'mixed' | 'automated'

export type AnalyteUnit = 'mg/dL' | 'mmol/L'

export type MedicalKitGroupId =
  | 'blood-pressure'
  | 'temperature'
  | 'spo2'
  | 'heart-rate'
  | 'glucose'
  | 'sleep'
  | 'mood'
  | 'respiratory-rate'

export type MedicalKitGroupStatus = 'documented' | 'inferred-editorial' | 'not-documented'

export interface ReferenceSource {
  url: string
  verificationDate: string
}

export interface MedicalKitDocument {
  id: string
  revision: string
  fileName: string
  sourcePage: number
  table: string
  pack: string
  packColor: string
  versionDate: string
  historical: true
  notCurrentInventory: true
}

export interface MedicalKitSource extends ReferenceSource {
  pdfPageCount: number
}

export interface MedicalKitContentPolicy {
  diagnosticItemsOnly: true
  excludesMedications: true
  excludesDoses: true
  excludesOperationalInstructions: true
}

export interface MedicalKitItem {
  id: string
  itemName: string
  quantity: string
  location: string
  pack: string
  packColor: string
  table: string
  sourcePage: number
  quote: string
}

export interface MedicalKitGroup {
  id: MedicalKitGroupId
  label: string
  status: MedicalKitGroupStatus
  items: string[]
  inferenceNote?: string
  note?: string
}

export interface MedicalKitOptionalReactionTest {
  included: false
  reason: string
}

export interface MedicalKitDataset {
  datasetId: 'iss-medical-kit-2015'
  title: string
  document: MedicalKitDocument
  source: MedicalKitSource
  contentPolicy: MedicalKitContentPolicy
  items: MedicalKitItem[]
  groups: MedicalKitGroup[]
  optionalReactionTest: MedicalKitOptionalReactionTest
}

export type OsdPhase = 'pre' | 'post'

export type OsdAnalyteId = 'glucose' | 'calcium' | 'sodium' | 'potassium'

export interface OsdBand { min: number; max: number }

export interface OsdPhaseCounts { pre: number; post: number; all: number }

export interface OsdAnalyteBands { pre: OsdBand; post: OsdBand; all: OsdBand }

export interface OsdAnalyteSummary {
  id: OsdAnalyteId; unit: AnalyteUnit; phaseCounts: OsdPhaseCounts; bands: OsdAnalyteBands
}

export interface OsdCohort { uniqueSamples: number; crewCount: number; preSamples: number; postSamples: number }

export interface OsdStudy { id: 'OSD-575'; version: '3'; doi: '10.26030/mc5d-p710'; license: 'CC0-1.0' }

export interface OsdSource { url: string; retrievedAt: string; verificationDate: string; bytes: number; sha256: string }

export interface OsdClinicalContext { scope: string; notices: string[] }

export interface Osd575BandsDataset {
  datasetId: 'osd575-cmp-v3'; study: OsdStudy; source: OsdSource
  cohort: OsdCohort; analytes: OsdAnalyteSummary[]; clinicalContext: OsdClinicalContext
}

export type RadiationLimitId = 'career-effective-dose' | 'spe-effective-dose'

export interface RadiationStandardSource { label: string; url: string; approvedAt: string }

export interface RadiationBriefSource {
  label: string; url: string; date: string; status: string; statusPage: number; statusQuote: string
}

export interface RadiationLimit {
  id: RadiationLimitId
  value: number
  unit: 'mSv'
  constraint: '<600' | '<250'
  doseType: 'NASA effective dose'
  requirementId: 'V1 4030' | 'V1 4031'
  standardPage: number
  briefPage: number
  standardQuote: string
  briefQuote: string
  context: string
}

export interface RadiationSemantics {
  doseType: 'NASA effective dose'
  unit: 'mSv'
  notOrganDose: true
  noSvConversion: true
  noMgyConversion: true
  notPersonalDoseMeasurement: true
  notCurrentEvent: true
  noClinicalAction: true
  csaNote: string
  notes: string[]
}

export interface RadiationReferenceDataset {
  datasetId: 'nasa-radiation-reference'
  status: 'reference-only'
  statusNote: string
  sources: { standard: RadiationStandardSource; brief: RadiationBriefSource }
  limits: RadiationLimit[]
  semantics: RadiationSemantics
  engineIntegration: { included: false; reason: string }
}

export type ReferenceCatalogEntryId =
  | 'hrp' | 'iss-medical-kit' | 'osd-575' | 'nasa-std-3001-vol1' | 'ochmo-tb-020'
  | 'donki' | 'noaa-swpc' | 'csa-radiation' | 'news2' | 'nasa-3d-resources'

export interface ReferenceLicenseTerms { label: string; url: string; notes: string }

export interface ReferenceCatalogOwner { module: string; handoff: string }

export interface ReferenceCatalogEntry {
  id: ReferenceCatalogEntryId
  title: string
  publisher: string
  urls: string[]
  edition: string
  purpose: string
  srsReferences: string[]
  verificationDate: string
  dataNature: string
  curationMethod: ReferenceCurationMethod
  licenseTerms: ReferenceLicenseTerms
  owner: ReferenceCatalogOwner
  notes: string
}

export interface ReferenceCatalogDataset {
  datasetId: 'nasa-reference-catalog'
  verificationDate: string
  licenseNotice: string
  hostAllowlist: string[]
  entries: ReferenceCatalogEntry[]
}
