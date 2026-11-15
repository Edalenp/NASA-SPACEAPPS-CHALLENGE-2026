import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  OSD575_EXPECTED_TIMEPOINTS,
  OSD575_SOURCE_URL,
  buildOsd575BandsDataset,
  deriveOsdBands,
  parseOsdCmpCsv,
} from './osd575-cmp.mjs'

// Synthetic fixtures only: C901-C904, synthetic timepoints, synthetic values.
// No real OSD-575 participant ids or observations are reproduced here.
const HEADER = [
  'Sample Name',
  'glucose_value_milligram_per_deciliter',
  'calcium_value_milligram_per_deciliter',
  'sodium_value_millimol_per_liter',
  'potassium_value_millimol_per_liter',
  'glucose_range_min_milligram_per_deciliter',
  'glucose_range_max_milligram_per_deciliter',
  'Notes',
]
const CREWS = ['C901', 'C902', 'C903', 'C904']

function syntheticRows() {
  let rowNumber = 0
  return CREWS.flatMap((crew, crewIndex) =>
    OSD575_EXPECTED_TIMEPOINTS.map((timepoint, timepointIndex) => {
      rowNumber += 1
      const pre = timepoint.startsWith('L-')
      return [
        `${crew}_serum_${timepoint}`,
        String((pre ? 10 : 20) + crewIndex + timepointIndex),
        String(1 + crewIndex + timepointIndex / 10),
        String(130 + crewIndex),
        String(3 + crewIndex / 10),
        '-999',
        '999',
        `"synthetic, ${crew} ""note ${rowNumber}"""`,
      ]
    }),
  )
}

function makeCsv(rows = syntheticRows(), options = {}) {
  const header = options.header ?? HEADER
  const separator = options.crlf ? '\r\n' : '\n'
  const bom = options.bom ? '\uFEFF' : ''
  const trailing = options.trailing === false ? '' : `${separator}${separator}`
  return `${bom}${header.join(separator === '\r\n' ? ',' : ',')}${separator}${rows
    .map((row) => row.join(','))
    .join(separator)}${trailing}`
}

function cloneRows() {
  return syntheticRows().map((row) => [...row])
}

describe('parseOsdCmpCsv', () => {
  it('parses synthetic 28-row CSV with BOM, CRLF, quoted commas, escaped quotes, and blank trailing lines', () => {
    const parsed = parseOsdCmpCsv(makeCsv(undefined, { bom: true, crlf: true }))
    const bands = deriveOsdBands(parsed.samples)

    assert.equal(parsed.samples.length, 28)
    assert.deepEqual(parsed.phases, { pre: 12, post: 16 })
    assert.deepEqual(parsed.crews, CREWS)
    assert.equal(parsed.analytes.length, 4)
    assert.deepEqual(bands.cohort, {
      uniqueSamples: 28,
      crewCount: 4,
      preSamples: 12,
      postSamples: 16,
    })
    assert.deepEqual(bands.analytes.find((analyte) => analyte.id === 'glucose').bands.pre, {
      min: 10,
      max: 15,
    })
  })

  it('accepts finite scientific notation', () => {
    const rows = cloneRows()
    rows[0][1] = '1e2'
    const parsed = parseOsdCmpCsv(makeCsv(rows))

    assert.equal(parsed.samples[0].values.glucose, 100)
  })

  it('rejects malformed quotes instead of shifting columns', () => {
    const unclosed = cloneRows()
    unclosed[0][7] = '"unclosed'
    assert.throws(() => parseOsdCmpCsv(makeCsv(unclosed)), /osd575-cmp\.csv/)

    const badEscape = cloneRows()
    badEscape[0][7] = '"a"b"'
    assert.throws(() => parseOsdCmpCsv(makeCsv(badEscape)), /osd575-cmp\.csv/)
  })

  it('rejects header duplicates, missing targets, wrong unit aliases, and row field-count drift', () => {
    const duplicate = [...HEADER]
    duplicate[1] = 'Sample Name'
    assert.throws(() => parseOsdCmpCsv(makeCsv(undefined, { header: duplicate })), /osd575-cmp\.header/)

    const missing = HEADER.filter((name) => name !== 'glucose_value_milligram_per_deciliter')
    assert.throws(() => parseOsdCmpCsv(makeCsv(undefined, { header: missing })), /osd575-cmp\.header/)

    const wrongUnit = [...HEADER]
    wrongUnit[1] = 'glucose_value_millimol_per_liter'
    assert.throws(() => parseOsdCmpCsv(makeCsv(undefined, { header: wrongUnit })), /osd575-cmp\.header/)

    const extraField = cloneRows()
    extraField[0].push('extra')
    assert.throws(() => parseOsdCmpCsv(makeCsv(extraField)), /osd575-cmp\.row/)
  })

  it('rejects duplicate samples, unknown phases, and fake timepoint sets', () => {
    const duplicate = cloneRows()
    duplicate[1][0] = duplicate[0][0]
    assert.throws(() => parseOsdCmpCsv(makeCsv(duplicate)), /osd575-cmp\.sample/)

    const unknownPhase = cloneRows()
    unknownPhase[0][0] = 'C901_serum_X-3'
    assert.throws(() => parseOsdCmpCsv(makeCsv(unknownPhase)), /osd575-cmp\.phase/)

    const fakeTimepoint = cloneRows()
    fakeTimepoint[0][0] = 'C901_serum_L-4'
    assert.throws(() => parseOsdCmpCsv(makeCsv(fakeTimepoint)), /osd575-cmp\.phase/)
  })

  it('rejects empty, NA, NaN, infinity, hex, locale commas, and nonnumeric values', () => {
    for (const value of ['', 'NA', 'NaN', 'inf', '-inf', '0x10', '"1,2"', 'abc']) {
      const rows = cloneRows()
      rows[0][1] = value
      assert.throws(() => parseOsdCmpCsv(makeCsv(rows)), /osd575-cmp\.numeric/, value)
    }
  })

  it('ignores laboratory range columns', () => {
    const rows = cloneRows()
    for (const row of rows) {
      row[5] = '-9999'
      row[6] = '9999'
    }
    const parsed = parseOsdCmpCsv(makeCsv(rows))
    const bands = deriveOsdBands(parsed.samples)

    assert.deepEqual(bands.analytes.find((analyte) => analyte.id === 'glucose').bands.pre, {
      min: 10,
      max: 15,
    })
  })
})

describe('deriveOsdBands and buildOsd575BandsDataset', () => {
  it('builds aggregate-only JSON with provenance and explicit negative notices', () => {
    const parsed = parseOsdCmpCsv(makeCsv())
    const dataset = buildOsd575BandsDataset(parsed.samples, {
      url: OSD575_SOURCE_URL,
      retrievedAt: '2026-11-14T00:00:00Z',
      verificationDate: '2026-11-14',
      bytes: 8506,
      sha256: 'a'.repeat(64),
    })
    const text = JSON.stringify(dataset)

    assert.equal(dataset.datasetId, 'osd575-cmp-v3')
    assert.deepEqual(dataset.study, {
      id: 'OSD-575',
      version: '3',
      doi: '10.26030/mc5d-p710',
      license: 'CC0-1.0',
    })
    assert.equal(dataset.source.url, OSD575_SOURCE_URL)
    assert.equal(dataset.analytes.length, 4)
    assert.match(text, /not normal intervals/i)
    assert.match(text, /not a personal baseline/i)
    assert.match(text, /not simulator calibration/i)
    assert.match(text, /not a 180-day prediction/i)
    assert.doesNotMatch(text, /C90[1-4]|sampleName|values/)
  })

  it('rejects invalid source metadata', () => {
    const parsed = parseOsdCmpCsv(makeCsv())
    const valid = {
      url: OSD575_SOURCE_URL,
      retrievedAt: '2026-11-14T00:00:00Z',
      verificationDate: '2026-11-14',
      bytes: 8506,
      sha256: 'a'.repeat(64),
    }

    assert.throws(
      () => buildOsd575BandsDataset(parsed.samples, { ...valid, url: 'https://example.com/x.csv' }),
      /osd575-cmp\.source/,
    )
    assert.throws(
      () => buildOsd575BandsDataset(parsed.samples, { ...valid, bytes: 0 }),
      /osd575-cmp\.source/,
    )
    assert.throws(
      () => buildOsd575BandsDataset(parsed.samples, { ...valid, sha256: 'abc' }),
      /osd575-cmp\.source/,
    )
  })
})
