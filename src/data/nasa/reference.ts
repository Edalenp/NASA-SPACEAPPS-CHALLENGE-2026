import medicalKitData from './medical-kit.json'
import osdBandsData from './osd575-bands.json'
import radiationData from './radiation-reference.json'
import catalogData from './reference-catalog.json'
import type {
  AnalyteUnit,
  MedicalKitDataset,
  MedicalKitGroupId,
  MedicalKitGroupStatus,
  Osd575BandsDataset,
  OsdAnalyteId,
  RadiationLimitId,
  RadiationReferenceDataset,
  ReferenceCatalogDataset,
  ReferenceCatalogEntryId,
  ReferenceCurationMethod,
  ReferenceDatasetId,
} from './reference-types'

const DATASET_ID = 'iss-medical-kit-2015'
const SOURCE_URL =
  'https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf'
const VERIFICATION_DATE = '2026-11-14'
const DOCUMENT = {
  id: 'MED CL/SpX-6 - ALL/FIN/T', revision: '09 APR 15', fileName: '3.001_M_26501.doc',
  sourcePage: 9, table: 'Table 5. Medical Diagnostic Pack (Blue)',
  pack: 'Medical Diagnostic Pack', packColor: 'Blue', versionDate: '2015-04-09',
} as const
const ITEM_IDS = [
  'blood-oximeter', 'blood-pressure-cuff-large', 'blood-pressure-cuff-small',
  'blood-pressure-monitor', 'stethoscope', 'thermometer',
] as const
const ITEM_ID_SET = new Set<string>(ITEM_IDS)
const GROUP_SPECS: readonly {
  id: MedicalKitGroupId
  status: MedicalKitGroupStatus
  items: readonly string[]
}[] = [
  {
    id: 'blood-pressure', status: 'documented',
    items: ['blood-pressure-cuff-large', 'blood-pressure-cuff-small', 'blood-pressure-monitor'],
  },
  { id: 'temperature', status: 'documented', items: ['thermometer'] },
  { id: 'spo2', status: 'inferred-editorial', items: ['blood-oximeter'] },
  { id: 'heart-rate', status: 'not-documented', items: [] },
  { id: 'glucose', status: 'not-documented', items: [] },
  { id: 'sleep', status: 'not-documented', items: [] },
  { id: 'mood', status: 'not-documented', items: [] },
  { id: 'respiratory-rate', status: 'not-documented', items: [] },
]

const OSD_ERROR = 'osd575-bands'
const OSD_DATASET_ID = 'osd575-cmp-v3'
const OSD_SOURCE_URL =
  'https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv'
const OSD_DOI = '10.26030/mc5d-p710'
const OSD_VERSION = '3'
const OSD_LICENSE = 'CC0-1.0'
const OSD_BYTES = 8506
const OSD_VERIFICATION_DATE = '2026-11-14'
const OSD_ANALYTES: readonly { id: OsdAnalyteId; unit: AnalyteUnit }[] = [
  { id: 'glucose', unit: 'mg/dL' },
  { id: 'calcium', unit: 'mg/dL' },
  { id: 'sodium', unit: 'mmol/L' },
  { id: 'potassium', unit: 'mmol/L' },
]
const OSD_PHASE_COUNTS = { pre: 12, post: 16, all: 28 } as const
const OSD_COHORT = { uniqueSamples: 28, crewCount: 4, preSamples: 12, postSamples: 16 } as const
const OSD_NEGATIVE_NOTICES = [
  'not normal intervals', 'not a personal baseline',
  'not simulator calibration', 'not a 180-day prediction',
] as const

const RAD_ERROR = 'radiation-reference'
const RAD_DATASET_ID = 'nasa-radiation-reference'
const RAD_STANDARD_URL =
  'https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf'
const RAD_BRIEF_URL = 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf'
const RAD_STANDARD_APPROVED_AT = '2023-09-15'
const RAD_BRIEF_DATE = '2025-06-06'
const RAD_LIMIT_SPECS: readonly {
  id: RadiationLimitId
  value: number
  constraint: '<600' | '<250'
  requirementId: 'V1 4030' | 'V1 4031'
  standardPage: number
  briefPage: number
}[] = [
  {
    id: 'career-effective-dose', value: 600, constraint: '<600',
    requirementId: 'V1 4030', standardPage: 40, briefPage: 4,
  },
  {
    id: 'spe-effective-dose', value: 250, constraint: '<250',
    requirementId: 'V1 4031', standardPage: 42, briefPage: 6,
  },
]

const CATALOG_ERROR = 'reference-catalog'
const CATALOG_DATASET_ID = 'nasa-reference-catalog'
const CATALOG_HOSTS = [
  'www.nasa.gov', 'standards.nasa.gov', 'humanresearchroadmap.nasa.gov', 'osdr.nasa.gov',
  'nasa-osdr.s3.us-west-2.amazonaws.com', 'www.rcp.ac.uk', 'www.swpc.noaa.gov',
  'www.spaceweather.gov', 'www.weather.gov', 'www.asc-csa.gc.ca', 'ccmc.gsfc.nasa.gov',
  'science.nasa.gov', 'github.com',
] as const
const CATALOG_HOST_SET = new Set<string>(CATALOG_HOSTS)
const CATALOG_ENTRY_IDS: readonly ReferenceCatalogEntryId[] = [
  'hrp', 'iss-medical-kit', 'osd-575', 'nasa-std-3001-vol1', 'ochmo-tb-020',
  'donki', 'noaa-swpc', 'csa-radiation', 'news2', 'nasa-3d-resources',
]
const REFERENCE_DATASET_IDS: readonly ReferenceDatasetId[] = [
  'medical-kit', 'osd575-bands', 'radiation-reference', 'reference-catalog',
]

function fail(field: string, message: string, dataset = 'medical-kit'): never {
  throw new Error(`${dataset}.${field}: ${message}`)
}

function nonEmpty(field: string, value: unknown, dataset = 'medical-kit'): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(field, 'expected a non-empty string', dataset)
  }
}

function exact(field: string, actual: unknown, expected: unknown, dataset = 'medical-kit'): void {
  if (actual !== expected) {
    fail(field, `expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`, dataset)
  }
}

function exactKeys(
  field: string,
  value: object,
  keys: readonly string[],
  dataset = 'medical-kit',
): void {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.join('|') !== expected.join('|')) {
    const missing = expected.filter((key) => !actual.includes(key))
    const unexpected = actual.filter((key) => !expected.includes(key))
    fail(
      field,
      `missing fields: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'}`,
      dataset,
    )
  }
}

function validateDocument(data: typeof medicalKitData): void {
  exactKeys('document', data.document, [
    'id', 'revision', 'fileName', 'sourcePage', 'table', 'pack', 'packColor', 'versionDate',
    'historical', 'notCurrentInventory',
  ])
  for (const key of Object.keys(DOCUMENT) as Array<keyof typeof DOCUMENT>) {
    exact(`document.${key}`, data.document[key], DOCUMENT[key])
  }
  exact('document.historical', data.document.historical, true)
  exact('document.notCurrentInventory', data.document.notCurrentInventory, true)
}

function validateSource(data: typeof medicalKitData): void {
  exactKeys('source', data.source, ['url', 'pdfPageCount', 'verificationDate'])
  exact('source.url', data.source.url, SOURCE_URL)
  exact('source.pdfPageCount', data.source.pdfPageCount, 27)
  exact('source.verificationDate', data.source.verificationDate, VERIFICATION_DATE)
}

function validatePolicy(data: typeof medicalKitData): void {
  const keys = [
    'diagnosticItemsOnly', 'excludesMedications', 'excludesDoses', 'excludesOperationalInstructions',
  ] as const
  exactKeys('contentPolicy', data.contentPolicy, keys)
  for (const key of keys) exact(`contentPolicy.${key}`, data.contentPolicy[key], true)
}

function validateItem(
  item: (typeof medicalKitData.items)[number],
  index: number,
  itemIds: Set<string>,
): void {
  const field = `items[${index}]`
  exactKeys(field, item, [
    'id', 'itemName', 'quantity', 'location', 'pack', 'packColor', 'table', 'sourcePage', 'quote',
  ])
  nonEmpty(`${field}.id`, item.id)
  if (!ITEM_ID_SET.has(item.id)) fail(`${field}.id`, `unknown item id "${item.id}"`)
  if (itemIds.has(item.id)) fail(`${field}.id`, `duplicate item id "${item.id}"`)
  itemIds.add(item.id)
  for (const key of ['itemName', 'quantity', 'location', 'quote'] as const) {
    nonEmpty(`${field}.${key}`, item[key])
  }
  for (const key of ['pack', 'packColor', 'table'] as const) {
    exact(`${field}.${key}`, item[key], DOCUMENT[key])
  }
  exact(`${field}.sourcePage`, item.sourcePage, DOCUMENT.sourcePage)
}

function validateItems(data: typeof medicalKitData): Set<string> {
  if (data.items.length !== ITEM_IDS.length) {
    fail('items', `expected ${ITEM_IDS.length} items, received ${data.items.length}`)
  }
  const itemIds = new Set<string>()
  data.items.forEach((item, index) => validateItem(item, index, itemIds))
  return itemIds
}

function validateGroup(
  group: (typeof medicalKitData.groups)[number],
  spec: (typeof GROUP_SPECS)[number],
  index: number,
  itemIds: Set<string>,
  referencedItemIds: Set<string>,
): void {
  const field = `groups[${index}]`
  exact(`${field}.id`, group.id, spec.id)
  exact(`${field}.status`, group.status, spec.status)
  nonEmpty(`${field}.label`, group.label)
  exactKeys(
    field,
    group,
    spec.status === 'inferred-editorial'
      ? ['id', 'label', 'status', 'items', 'inferenceNote']
      : spec.status === 'not-documented'
        ? ['id', 'label', 'status', 'items', 'note']
        : ['id', 'label', 'status', 'items'],
  )
  if (!Array.isArray(group.items) || group.items.length !== spec.items.length) {
    fail(`${field}.items`, `expected ${spec.items.length} item ids, received ${group.items.length}`)
  }
  group.items.forEach((itemId, itemIndex) => {
    exact(`${field}.items[${itemIndex}]`, itemId, spec.items[itemIndex])
    if (!itemIds.has(itemId)) fail(`${field}.items[${itemIndex}]`, `unknown item id "${itemId}"`)
    if (referencedItemIds.has(itemId)) {
      fail(`${field}.items[${itemIndex}]`, `item "${itemId}" is referenced twice`)
    }
    referencedItemIds.add(itemId)
  })
  if (spec.status === 'inferred-editorial') nonEmpty(`${field}.inferenceNote`, group.inferenceNote)
  if (spec.status === 'not-documented') nonEmpty(`${field}.note`, group.note)
}

function validateGroups(data: typeof medicalKitData, itemIds: Set<string>): void {
  if (data.groups.length !== GROUP_SPECS.length) {
    fail('groups', `expected ${GROUP_SPECS.length} groups, received ${data.groups.length}`)
  }
  const referencedItemIds = new Set<string>()
  data.groups.forEach((group, index) => {
    const spec = GROUP_SPECS[index]
    if (!spec) fail(`groups[${index}]`, 'unexpected group')
    validateGroup(group, spec, index, itemIds, referencedItemIds)
  })
  for (const itemId of itemIds) {
    if (!referencedItemIds.has(itemId) && itemId !== 'stethoscope') {
      fail(`items.${itemId}`, 'documented item is not mapped to a group')
    }
  }
  if (referencedItemIds.has('stethoscope')) fail('groups', 'stethoscope must not be attributed to a measurement group')
}

function buildMedicalKit(data: typeof medicalKitData): MedicalKitDataset {
  return {
    datasetId: DATASET_ID,
    title: data.title,
    document: { ...DOCUMENT, historical: true, notCurrentInventory: true },
    source: { url: SOURCE_URL, pdfPageCount: 27, verificationDate: VERIFICATION_DATE },
    contentPolicy: {
      diagnosticItemsOnly: true, excludesMedications: true,
      excludesDoses: true, excludesOperationalInstructions: true,
    },
    items: data.items.map((item) => ({ ...item })),
    groups: data.groups.map((group, index) => {
      const spec = GROUP_SPECS[index]
      const unexpected = () => fail(`groups[${index}]`, 'unexpected group')
      return {
        ...group,
        id: spec?.id ?? unexpected(),
        status: spec?.status ?? unexpected(),
        items: [...group.items],
      }
    }),
    optionalReactionTest: { included: false, reason: data.optionalReactionTest.reason },
  }
}

function validateMedicalKitData(data: typeof medicalKitData): MedicalKitDataset {
  exact('datasetId', data.datasetId, DATASET_ID)
  nonEmpty('title', data.title)
  validateDocument(data)
  validateSource(data)
  validatePolicy(data)
  const itemIds = validateItems(data)
  validateGroups(data, itemIds)
  exactKeys('optionalReactionTest', data.optionalReactionTest, ['included', 'reason'])
  exact('optionalReactionTest.included', data.optionalReactionTest.included, false)
  nonEmpty('optionalReactionTest.reason', data.optionalReactionTest.reason)
  return buildMedicalKit(data)
}

function validateOsdBandsData(data: typeof osdBandsData): Osd575BandsDataset {
  const D = OSD_ERROR
  exactKeys('dataset', data, ['datasetId', 'study', 'source', 'cohort', 'analytes', 'clinicalContext'], D)
  exact('datasetId', data.datasetId, OSD_DATASET_ID, D)
  exactKeys('study', data.study, ['id', 'version', 'doi', 'license'], D)
  for (const [key, value] of [
    ['id', 'OSD-575'], ['version', OSD_VERSION], ['doi', OSD_DOI], ['license', OSD_LICENSE],
  ] as const) exact(`study.${key}`, data.study[key], value, D)
  exactKeys('source', data.source, ['url', 'retrievedAt', 'verificationDate', 'bytes', 'sha256'], D)
  exact('source.url', data.source.url, OSD_SOURCE_URL, D)
  exact('source.bytes', data.source.bytes, OSD_BYTES, D)
  exact('source.verificationDate', data.source.verificationDate, OSD_VERIFICATION_DATE, D)
  if (!/^[a-f0-9]{64}$/.test(data.source.sha256)) fail('source.sha256', 'expected 64 lowercase hex characters', D)
  for (const key of ['retrievedAt', 'verificationDate'] as const) {
    nonEmpty(`source.${key}`, data.source[key], D)
    if (Number.isNaN(Date.parse(data.source[key]))) fail(`source.${key}`, 'expected a parsable date', D)
  }
  exactKeys('cohort', data.cohort, ['uniqueSamples', 'crewCount', 'preSamples', 'postSamples'], D)
  for (const key of ['uniqueSamples', 'crewCount', 'preSamples', 'postSamples'] as const) {
    exact(`cohort.${key}`, data.cohort[key], OSD_COHORT[key], D)
  }
  if (data.analytes.length !== OSD_ANALYTES.length) fail('analytes', `expected 4 analytes, received ${data.analytes.length}`, D)
  data.analytes.forEach((analyte, index) => {
    const field = `analytes[${index}]`
    const expected = OSD_ANALYTES[index]
    if (!expected) fail(field, 'unexpected analyte', D)
    exactKeys(field, analyte, ['id', 'unit', 'phaseCounts', 'bands'], D)
    exact(`${field}.id`, analyte.id, expected.id, D)
    exact(`${field}.unit`, analyte.unit, expected.unit, D)
    exactKeys(`${field}.phaseCounts`, analyte.phaseCounts, ['pre', 'post', 'all'], D)
    for (const phase of ['pre', 'post', 'all'] as const) exact(`${field}.phaseCounts.${phase}`, analyte.phaseCounts[phase], OSD_PHASE_COUNTS[phase], D)
    exactKeys(`${field}.bands`, analyte.bands, ['pre', 'post', 'all'], D)
    for (const phase of ['pre', 'post', 'all'] as const) {
      const band = analyte.bands[phase]
      exactKeys(`${field}.bands.${phase}`, band, ['min', 'max'], D)
      for (const key of ['min', 'max'] as const) {
        if (typeof band[key] !== 'number' || !Number.isFinite(band[key])) fail(`${field}.bands.${phase}.${key}`, 'expected a finite number', D)
      }
      if (band.min > band.max) fail(`${field}.bands.${phase}`, 'min must be <= max', D)
    }
  })
  exactKeys('clinicalContext', data.clinicalContext, ['scope', 'notices'], D)
  nonEmpty('clinicalContext.scope', data.clinicalContext.scope, D)
  if (data.clinicalContext.notices.length === 0) fail('clinicalContext.notices', 'expected at least one notice', D)
  const notices = data.clinicalContext.notices.join(' ').toLowerCase()
  for (const notice of OSD_NEGATIVE_NOTICES) if (!notices.includes(notice)) fail('clinicalContext.notices', `missing explicit notice "${notice}"`, D)
  return {
    ...data,
    datasetId: OSD_DATASET_ID,
    study: { ...data.study, id: 'OSD-575', version: '3', doi: OSD_DOI, license: OSD_LICENSE },
    source: { ...data.source, url: OSD_SOURCE_URL, bytes: OSD_BYTES, verificationDate: OSD_VERIFICATION_DATE },
    cohort: { ...OSD_COHORT },
    analytes: data.analytes.map((analyte, index) => {
      const expected = OSD_ANALYTES[index]
      if (!expected) fail(`analytes[${index}]`, 'unexpected analyte', D)
      return {
        ...analyte,
        id: expected.id,
        unit: expected.unit,
        phaseCounts: { ...analyte.phaseCounts },
        bands: {
          pre: { ...analyte.bands.pre }, post: { ...analyte.bands.post }, all: { ...analyte.bands.all },
        },
      }
    }),
    clinicalContext: { ...data.clinicalContext, notices: [...data.clinicalContext.notices] },
  }
}

function isReferenceCurationMethod(value: string): value is ReferenceCurationMethod {
  return value === 'manual' || value === 'mixed' || value === 'automated'
}

function assertCatalogUrl(field: string, raw: string): void {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    fail(field, 'invalid URL', CATALOG_ERROR)
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.hash !== '') fail(field, 'expected a plain https URL without credentials or fragment', CATALOG_ERROR)
  if (!CATALOG_HOST_SET.has(url.hostname)) fail(field, `host "${url.hostname}" is not allowlisted`, CATALOG_ERROR)
}

function validateRadiationData(data: typeof radiationData): RadiationReferenceDataset {
  const D = RAD_ERROR
  exactKeys('dataset', data, ['datasetId', 'status', 'statusNote', 'sources', 'limits', 'semantics', 'engineIntegration'], D)
  exact('datasetId', data.datasetId, RAD_DATASET_ID, D)
  exact('status', data.status, 'reference-only', D)
  nonEmpty('statusNote', data.statusNote, D)
  exactKeys('sources', data.sources, ['standard', 'brief'], D)
  exactKeys('sources.standard', data.sources.standard, ['label', 'url', 'approvedAt'], D)
  nonEmpty('sources.standard.label', data.sources.standard.label, D)
  exact('sources.standard.url', data.sources.standard.url, RAD_STANDARD_URL, D)
  exact('sources.standard.approvedAt', data.sources.standard.approvedAt, RAD_STANDARD_APPROVED_AT, D)
  exactKeys('sources.brief', data.sources.brief, ['label', 'url', 'date', 'status', 'statusPage', 'statusQuote'], D)
  nonEmpty('sources.brief.label', data.sources.brief.label, D)
  exact('sources.brief.url', data.sources.brief.url, RAD_BRIEF_URL, D)
  exact('sources.brief.date', data.sources.brief.date, RAD_BRIEF_DATE, D)
  nonEmpty('sources.brief.status', data.sources.brief.status, D)
  exact('sources.brief.statusPage', data.sources.brief.statusPage, 2, D)
  nonEmpty('sources.brief.statusQuote', data.sources.brief.statusQuote, D)
  if (data.limits.length !== RAD_LIMIT_SPECS.length) {
    fail('limits', `expected ${RAD_LIMIT_SPECS.length} limits, received ${data.limits.length}`, D)
  }
  data.limits.forEach((limit, index) => {
    const expected = RAD_LIMIT_SPECS[index]
    if (!expected) fail(`limits[${index}]`, 'unexpected limit', D)
    const field = `limits[${index}]`
    exactKeys(field, limit, ['id', 'value', 'unit', 'constraint', 'doseType', 'requirementId', 'standardPage', 'briefPage', 'standardQuote', 'briefQuote', 'context'], D)
    exact(`${field}.id`, limit.id, expected.id, D)
    exact(`${field}.value`, limit.value, expected.value, D)
    exact(`${field}.unit`, limit.unit, 'mSv', D)
    exact(`${field}.constraint`, limit.constraint, expected.constraint, D)
    exact(`${field}.doseType`, limit.doseType, 'NASA effective dose', D)
    exact(`${field}.requirementId`, limit.requirementId, expected.requirementId, D)
    exact(`${field}.standardPage`, limit.standardPage, expected.standardPage, D)
    exact(`${field}.briefPage`, limit.briefPage, expected.briefPage, D)
    for (const key of ['standardQuote', 'briefQuote', 'context'] as const) {
      nonEmpty(`${field}.${key}`, limit[key], D)
    }
  })
  exactKeys('semantics', data.semantics, ['doseType', 'unit', 'notOrganDose', 'noSvConversion', 'noMgyConversion', 'notPersonalDoseMeasurement', 'notCurrentEvent', 'noClinicalAction', 'csaNote', 'notes'], D)
  exact('semantics.doseType', data.semantics.doseType, 'NASA effective dose', D)
  exact('semantics.unit', data.semantics.unit, 'mSv', D)
  for (const key of [
    'notOrganDose', 'noSvConversion', 'noMgyConversion', 'notPersonalDoseMeasurement',
    'notCurrentEvent', 'noClinicalAction',
  ] as const) exact(`semantics.${key}`, data.semantics[key], true, D)
  nonEmpty('semantics.csaNote', data.semantics.csaNote, D)
  if (!Array.isArray(data.semantics.notes) || data.semantics.notes.length === 0) {
    fail('semantics.notes', 'expected at least one note', D)
  }
  data.semantics.notes.forEach((note, index) => nonEmpty(`semantics.notes[${index}]`, note, D))
  exactKeys('engineIntegration', data.engineIntegration, ['included', 'reason'], D)
  exact('engineIntegration.included', data.engineIntegration.included, false, D)
  nonEmpty('engineIntegration.reason', data.engineIntegration.reason, D)
  // Every field and source URL above has been validated; return a typed deep clone.
  return structuredClone(data) as RadiationReferenceDataset
}

function validateCatalogEntry(
  entry: (typeof catalogData.entries)[number],
  expectedId: ReferenceCatalogEntryId,
  index: number,
): void {
  const D = CATALOG_ERROR
  const field = `entries[${index}]`
  exactKeys(field, entry, ['id', 'title', 'publisher', 'urls', 'edition', 'purpose', 'srsReferences', 'verificationDate', 'dataNature', 'curationMethod', 'licenseTerms', 'owner', 'notes'], D)
  exact(`${field}.id`, entry.id, expectedId, D)
  for (const key of ['title', 'publisher', 'edition', 'purpose', 'verificationDate', 'dataNature', 'notes'] as const) {
    nonEmpty(`${field}.${key}`, entry[key], D)
  }
  if (Number.isNaN(Date.parse(entry.verificationDate))) fail(`${field}.verificationDate`, 'expected a parsable date', D)
  if (!Array.isArray(entry.urls) || entry.urls.length === 0) fail(`${field}.urls`, 'expected at least one URL', D)
  entry.urls.forEach((url, urlIndex) => assertCatalogUrl(`${field}.urls[${urlIndex}]`, url))
  if (!Array.isArray(entry.srsReferences) || entry.srsReferences.length === 0) fail(`${field}.srsReferences`, 'expected at least one SRS reference', D)
  entry.srsReferences.forEach((reference, refIndex) => nonEmpty(`${field}.srsReferences[${refIndex}]`, reference, D))
  if (!isReferenceCurationMethod(entry.curationMethod)) fail(`${field}.curationMethod`, 'expected manual, mixed, or automated', D)
  exactKeys(`${field}.licenseTerms`, entry.licenseTerms, ['label', 'url', 'notes'], D)
  nonEmpty(`${field}.licenseTerms.label`, entry.licenseTerms.label, D)
  nonEmpty(`${field}.licenseTerms.notes`, entry.licenseTerms.notes, D)
  assertCatalogUrl(`${field}.licenseTerms.url`, entry.licenseTerms.url)
  exactKeys(`${field}.owner`, entry.owner, ['module', 'handoff'], D)
  nonEmpty(`${field}.owner.module`, entry.owner.module, D)
  nonEmpty(`${field}.owner.handoff`, entry.owner.handoff, D)
}

function validateCatalogData(data: typeof catalogData): ReferenceCatalogDataset {
  const D = CATALOG_ERROR
  exactKeys('dataset', data, ['datasetId', 'verificationDate', 'licenseNotice', 'hostAllowlist', 'entries'], D)
  exact('datasetId', data.datasetId, CATALOG_DATASET_ID, D)
  nonEmpty('verificationDate', data.verificationDate, D)
  if (Number.isNaN(Date.parse(data.verificationDate))) fail('verificationDate', 'expected a parsable date', D)
  nonEmpty('licenseNotice', data.licenseNotice, D)
  if (data.hostAllowlist.length !== CATALOG_HOSTS.length) fail('hostAllowlist', `expected ${CATALOG_HOSTS.length} exact hosts`, D)
  data.hostAllowlist.forEach((host, index) => {
    exact(`hostAllowlist[${index}]`, host, CATALOG_HOSTS[index], D)
    if (host.includes('*') || !host.includes('.')) fail(`hostAllowlist[${index}]`, 'expected an exact hostname', D)
  })
  if (data.entries.length !== CATALOG_ENTRY_IDS.length) fail('entries', `expected ${CATALOG_ENTRY_IDS.length} entries`, D)
  data.entries.forEach((entry, index) => {
    const expected = CATALOG_ENTRY_IDS[index]
    if (!expected) fail(`entries[${index}]`, 'unexpected entry', D)
    validateCatalogEntry(entry, expected, index)
  })
  // Every entry, field, URL, and host above has been validated.
  return structuredClone(data) as ReferenceCatalogDataset
}

const medicalKit = validateMedicalKitData(medicalKitData)
const osdBands = validateOsdBandsData(osdBandsData)
const radiation = validateRadiationData(radiationData)
const catalog = validateCatalogData(catalogData)

export function getMedicalKit(): MedicalKitDataset {
  return structuredClone(medicalKit)
}

export function getOsd575Bands(): Osd575BandsDataset {
  return structuredClone(osdBands)
}

export function getRadiationReference(): RadiationReferenceDataset {
  return structuredClone(radiation)
}

export function getReferenceCatalog(): ReferenceCatalogDataset {
  return structuredClone(catalog)
}

export function getReferenceDatasetIds(): ReferenceDatasetId[] {
  return [...REFERENCE_DATASET_IDS]
}
