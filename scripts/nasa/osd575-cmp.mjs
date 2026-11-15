/**
 * @typedef {'pre'|'post'} OsdPhase
 * @typedef {'glucose'|'calcium'|'sodium'|'potassium'} OsdAnalyteId
 * @typedef {{ id: OsdAnalyteId, unit: 'mg/dL'|'mmol/L', header: string }} OsdAnalyteDefinition
 * @typedef {{ sampleName: string, crewId: string, phase: OsdPhase, timepoint: string, values: Record<OsdAnalyteId, number> }} OsdSample
 * @typedef {{ samples: OsdSample[], crews: string[], phases: { pre: number, post: number }, analytes: OsdAnalyteDefinition[] }} OsdCmpParseResult
 * @typedef {{ min: number, max: number }} OsdBand
 * @typedef {{ id: OsdAnalyteId, unit: 'mg/dL'|'mmol/L', phaseCounts: { pre: number, post: number, all: number }, bands: { pre: OsdBand, post: OsdBand, all: OsdBand } }} OsdAnalyteBands
 * @typedef {{ uniqueSamples: number, crewCount: number, preSamples: number, postSamples: number }} OsdCohort
 * @typedef {{ cohort: OsdCohort, analytes: OsdAnalyteBands[] }} OsdBandsResult
 * @typedef {{ url: string, retrievedAt: string, verificationDate: string, bytes: number, sha256: string }} OsdSourceMetadata
 * @typedef {{ datasetId: 'osd575-cmp-v3', study: { id: 'OSD-575', version: '3', doi: string, license: string }, source: OsdSourceMetadata, cohort: OsdCohort, analytes: OsdAnalyteBands[], clinicalContext: { scope: string, notices: string[] } }} Osd575BandsDataset
 */

export const OSD575_SOURCE_URL =
  'https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv'
export const OSD575_STUDY = Object.freeze({
  id: 'OSD-575', version: '3', doi: '10.26030/mc5d-p710', license: 'CC0-1.0',
})
export const OSD575_ANALYTES = Object.freeze([
  Object.freeze({ id: 'glucose', unit: 'mg/dL', header: 'glucose_value_milligram_per_deciliter' }),
  Object.freeze({ id: 'calcium', unit: 'mg/dL', header: 'calcium_value_milligram_per_deciliter' }),
  Object.freeze({ id: 'sodium', unit: 'mmol/L', header: 'sodium_value_millimol_per_liter' }),
  Object.freeze({ id: 'potassium', unit: 'mmol/L', header: 'potassium_value_millimol_per_liter' }),
])
export const OSD575_EXPECTED_TIMEPOINTS = Object.freeze([
  'L-3', 'L-44', 'L-92', 'R+1', 'R+45', 'R+82', 'R+194',
])

const SAMPLE_HEADER = 'Sample Name'
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

export class OsdCmpError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(`osd575-cmp.${code}: ${message}`)
    this.name = 'OsdCmpError'
    this.code = code
  }
}

function fail(code, message) {
  throw new OsdCmpError(code, message)
}

function parseCsvRows(text) {
  if (typeof text !== 'string') fail('csv', 'expected CSV text')
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let quoteClosed = false
  let sawContent = false

  const endField = () => {
    row.push(field)
    field = ''
    quoteClosed = false
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
          quoteClosed = true
        }
      } else {
        field += char
      }
      continue
    }
    if (quoteClosed) {
      if (char === ',') {
        endField()
        continue
      }
      if (char === '\r') {
        if (input[index + 1] === '\n') index += 1
        endRow()
        continue
      }
      if (char === '\n') {
        endRow()
        continue
      }
      fail('csv', `unexpected character after closing quote at offset ${index}`)
    }
    if (char === '"') {
      if (field.length > 0) fail('csv', `unexpected quote at offset ${index}`)
      inQuotes = true
      sawContent = true
      continue
    }
    if (char === ',') {
      endField()
      continue
    }
    if (char === '\r') {
      if (input[index + 1] === '\n') index += 1
      endRow()
      continue
    }
    if (char === '\n') {
      endRow()
      continue
    }
    field += char
    sawContent = true
  }

  if (inQuotes) fail('csv', 'unclosed quoted field')
  if (quoteClosed || field.length > 0 || row.length > 0) endRow()
  while (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop()
  }
  if (!sawContent && rows.length === 0) fail('csv', 'empty CSV')
  return rows
}

function validateHeader(header) {
  if (header.length === 0) fail('header', 'empty header row')
  if (header.some((name) => name.trim() === '')) fail('header', 'empty column name')
  if (new Set(header).size !== header.length) fail('header', 'duplicate column name')

  const sampleIndex = header.indexOf(SAMPLE_HEADER)
  if (sampleIndex === -1) fail('header', `missing ${SAMPLE_HEADER}`)

  const indexes = {}
  for (const analyte of OSD575_ANALYTES) {
    const exactIndex = header.indexOf(analyte.header)
    if (exactIndex === -1) fail('header', `missing ${analyte.header}`)
    const alias = header.find(
      (name) => name.startsWith(`${analyte.id}_value_`) && name !== analyte.header,
    )
    if (alias) fail('header', `unexpected ${analyte.id} value column ${alias}`)
    indexes[analyte.id] = exactIndex
  }
  return { sampleIndex, indexes }
}

function parseSampleName(sampleName) {
  const match = /^([^_]+)_.*_(L-\d+|R\+\d+)$/.exec(sampleName)
  if (!match) fail('phase', `sample ${sampleName} has no L-/R+ timepoint`)
  const crewId = match[1]
  const timepoint = match[2]
  return {
    crewId,
    phase: timepoint.startsWith('L-') ? 'pre' : 'post',
    timepoint,
  }
}

function parseFiniteNumber(raw, field) {
  const text = raw.trim()
  if (text === '') fail('numeric', `${field} is empty`)
  if (!DECIMAL.test(text)) fail('numeric', `${field} is not a decimal number`)
  const value = Number(text)
  if (!Number.isFinite(value)) fail('numeric', `${field} is not finite`)
  return value
}

export function parseOsdCmpCsv(text) {
  const rows = parseCsvRows(text)
  if (rows.length === 0) fail('csv', 'missing header')
  const header = rows[0]
  const { sampleIndex, indexes } = validateHeader(header)
  const dataRows = rows.slice(1)
  if (dataRows.length === 0) fail('row', 'no data rows')

  const samples = []
  const seenSamples = new Set()
  const crewTimepoints = new Map()

  dataRows.forEach((row, rowIndex) => {
    if (row.length !== header.length) {
      fail('row', `row ${rowIndex + 2} has ${row.length} fields; expected ${header.length}`)
    }
    const sampleName = row[sampleIndex].trim()
    if (sampleName === '') fail('sample', `row ${rowIndex + 2} has an empty sample name`)
    if (seenSamples.has(sampleName)) fail('sample', `duplicate sample ${sampleName}`)
    seenSamples.add(sampleName)

    const { crewId, phase, timepoint } = parseSampleName(sampleName)
    const timepoints = crewTimepoints.get(crewId) ?? new Set()
    timepoints.add(timepoint)
    crewTimepoints.set(crewId, timepoints)

    /** @type {Record<OsdAnalyteId, number>} */
    const values = {}
    for (const analyte of OSD575_ANALYTES) {
      values[analyte.id] = parseFiniteNumber(
        row[indexes[analyte.id]],
        `${sampleName}.${analyte.id}`,
      )
    }
    samples.push({ sampleName, crewId, phase, timepoint, values })
  })

  if (samples.length !== 28) fail('count', `expected 28 samples, received ${samples.length}`)
  const crews = [...crewTimepoints.keys()].sort()
  if (crews.length !== 4) fail('count', `expected 4 crews, received ${crews.length}`)
  const pre = samples.filter((sample) => sample.phase === 'pre').length
  const post = samples.filter((sample) => sample.phase === 'post').length
  if (pre !== 12 || post !== 16) fail('count', `expected 12 pre and 16 post, received ${pre}/${post}`)

  for (const crew of crews) {
    const timepoints = crewTimepoints.get(crew)
    if (!timepoints || timepoints.size !== OSD575_EXPECTED_TIMEPOINTS.length) {
      fail('phase', `crew ${crew} must have exactly 7 timepoints`)
    }
    for (const timepoint of OSD575_EXPECTED_TIMEPOINTS) {
      if (!timepoints.has(timepoint)) fail('phase', `crew ${crew} is missing ${timepoint}`)
    }
  }

  return {
    samples,
    crews,
    phases: { pre, post },
    analytes: OSD575_ANALYTES.map((analyte) => ({ ...analyte })),
  }
}

export function deriveOsdBands(samples) {
  if (!Array.isArray(samples) || samples.length === 0) fail('count', 'no samples to derive')
  const cohort = {
    uniqueSamples: samples.length,
    crewCount: new Set(samples.map((sample) => sample.crewId)).size,
    preSamples: samples.filter((sample) => sample.phase === 'pre').length,
    postSamples: samples.filter((sample) => sample.phase === 'post').length,
  }

  const analytes = OSD575_ANALYTES.map((analyte) => {
    const values = { pre: [], post: [], all: [] }
    for (const sample of samples) {
      const value = sample.values[analyte.id]
      if (!Number.isFinite(value)) fail('numeric', `${sample.sampleName}.${analyte.id}`)
      values.all.push(value)
      if (sample.phase === 'pre') values.pre.push(value)
      else if (sample.phase === 'post') values.post.push(value)
      else fail('phase', `unknown phase ${sample.phase}`)
    }
    const band = (phase, list) => {
      if (list.length === 0) fail('count', `no ${phase} values for ${analyte.id}`)
      return { min: Math.min(...list), max: Math.max(...list) }
    }
    return {
      id: analyte.id,
      unit: analyte.unit,
      phaseCounts: {
        pre: values.pre.length,
        post: values.post.length,
        all: values.all.length,
      },
      bands: {
        pre: band('pre', values.pre),
        post: band('post', values.post),
        all: band('all', values.all),
      },
    }
  })
  return { cohort, analytes }
}

function validateSourceMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') fail('source', 'metadata is required')
  if (metadata.url !== OSD575_SOURCE_URL) fail('source', 'unexpected source URL')
  if (!Number.isInteger(metadata.bytes) || metadata.bytes <= 0) {
    fail('source', 'bytes must be a positive integer')
  }
  if (typeof metadata.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(metadata.sha256)) {
    fail('source', 'sha256 must be 64 lowercase hex characters')
  }
  for (const field of ['retrievedAt', 'verificationDate']) {
    if (typeof metadata[field] !== 'string' || Number.isNaN(Date.parse(metadata[field]))) {
      fail('source', `${field} must be a parsable date`)
    }
  }
  return {
    url: OSD575_SOURCE_URL,
    retrievedAt: metadata.retrievedAt,
    verificationDate: metadata.verificationDate,
    bytes: metadata.bytes,
    sha256: metadata.sha256,
  }
}

export function buildOsd575BandsDataset(samples, sourceMetadata) {
  const { cohort, analytes } = deriveOsdBands(samples)
  return {
    datasetId: 'osd575-cmp-v3',
    study: { ...OSD575_STUDY },
    source: validateSourceMetadata(sourceMetadata),
    cohort,
    analytes,
    clinicalContext: {
      scope: 'pre-flight and post-flight observational context only',
      notices: [
        'Values are observed cohort aggregates, not normal intervals.',
        'Values are not in-flight data and not a personal baseline.',
        'Values are not simulator calibration input.',
        'Values are not a 180-day prediction input.',
      ],
    },
  }
}
