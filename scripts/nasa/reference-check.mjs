import { Buffer } from 'node:buffer'
import { createHash, randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { buildOsd575BandsDataset, parseOsdCmpCsv } from './osd575-cmp.mjs'
import {
  DEFAULT_MAX_BYTES,
  prepareCacheRoot,
  resolveCachePath,
  validateProductionManifest,
} from './source-download.mjs'

const GROUP_IDS = [
  'blood-pressure', 'temperature', 'spo2', 'heart-rate', 'glucose', 'sleep', 'mood', 'respiratory-rate',
]
const GROUP_STATUS = {
  'blood-pressure': 'documented', temperature: 'documented', spo2: 'inferred-editorial',
  'heart-rate': 'not-documented', glucose: 'not-documented', sleep: 'not-documented',
  mood: 'not-documented', 'respiratory-rate': 'not-documented',
}
const ITEM_IDS = [
  'blood-oximeter', 'blood-pressure-cuff-large', 'blood-pressure-cuff-small',
  'blood-pressure-monitor', 'stethoscope', 'thermometer',
]
const ANALYTES = [
  ['glucose', 'mg/dL'], ['calcium', 'mg/dL'], ['sodium', 'mmol/L'], ['potassium', 'mmol/L'],
]
const CATALOG_IDS = [
  'hrp', 'iss-medical-kit', 'osd-575', 'nasa-std-3001-vol1', 'ochmo-tb-020',
  'donki', 'noaa-swpc', 'csa-radiation', 'news2', 'nasa-3d-resources',
]
const RADIATION_LIMITS = [
  ['career-effective-dose', 600, '<600', 'V1 4030', 40, 4],
  ['spe-effective-dose', 250, '<250', 'V1 4031', 42, 6],
]

export class ReferenceCheckError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(`reference-check.${code}: ${message}`)
    this.name = 'ReferenceCheckError'
    this.code = code
  }
}

function fail(code, message) {
  throw new ReferenceCheckError(code, message)
}

function expect(condition, code, message) {
  if (!condition) fail(code, message)
}

function nonEmpty(value, field) {
  expect(typeof value === 'string' && value.trim() !== '', 'dataset', `${field} must be a non-empty string`)
}

function same(actual, expected, field) {
  expect(JSON.stringify(actual) === JSON.stringify(expected), 'dataset', `${field} does not match`)
}

function sha256(body) {
  return createHash('sha256').update(body).digest('hex')
}

function assertSignature(entry, body) {
  if (entry.id === 'osd-575') {
    expect(body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf, 'cache', 'OSD CSV must start with UTF-8 BOM')
    return
  }
  expect(body.subarray(0, 4).toString('ascii') === '%PDF', 'cache', 'PDF must start with %PDF')
}

function validateMedicalKit(dataset) {
  expect(dataset?.datasetId === 'iss-medical-kit-2015', 'dataset', 'medical-kit datasetId')
  expect(Array.isArray(dataset.items) && dataset.items.length === 6, 'dataset', 'medical-kit item count')
  same(dataset.items.map((item) => item.id), ITEM_IDS, 'medical-kit item ids')
  for (const item of dataset.items) {
    nonEmpty(item.itemName, `${item.id}.itemName`)
    nonEmpty(item.quote, `${item.id}.quote`)
    nonEmpty(item.location, `${item.id}.location`)
    expect(item.sourcePage === 9, 'dataset', `${item.id}.sourcePage`)
    expect(item.pack === 'Medical Diagnostic Pack', 'dataset', `${item.id}.pack`)
    expect(item.table === 'Table 5. Medical Diagnostic Pack (Blue)', 'dataset', `${item.id}.table`)
  }
  expect(Array.isArray(dataset.groups) && dataset.groups.length === 8, 'dataset', 'medical-kit group count')
  const groupIds = dataset.groups.map((group) => group.id)
  same(groupIds, GROUP_IDS, 'medical-kit group ids')
  const itemIds = new Set(dataset.items.map((item) => item.id))
  const referenced = new Set()
  for (const group of dataset.groups) {
    expect(group.status === GROUP_STATUS[group.id], 'dataset', `${group.id}.status`)
    expect(Array.isArray(group.items), 'dataset', `${group.id}.items`)
    for (const itemId of group.items) {
      expect(itemIds.has(itemId), 'dataset', `${group.id}.items references ${itemId}`)
      referenced.add(itemId)
    }
    if (group.status === 'not-documented') expect(group.items.length === 0, 'dataset', `${group.id} must be empty`)
    if (group.status === 'documented') expect(group.items.length > 0, 'dataset', `${group.id} must have items`)
    for (const field of ['pack', 'packColor', 'location', 'quote', 'sourcePage']) {
      expect(!Object.hasOwn(group, field), 'dataset', `${group.id} contains fake ${field}`)
    }
  }
  expect(!referenced.has('stethoscope'), 'dataset', 'stethoscope must stay unmapped')
  expect(referenced.size === 5, 'dataset', 'medical-kit mapped item count')
  expect(dataset.contentPolicy?.diagnosticItemsOnly === true, 'dataset', 'contentPolicy')
  expect(dataset.optionalReactionTest?.included === false, 'dataset', 'optionalReactionTest')
}

function validateOsd(dataset, osdEntry) {
  expect(dataset?.datasetId === 'osd575-cmp-v3', 'dataset', 'OSD datasetId')
  same(dataset.cohort, { uniqueSamples: 28, crewCount: 4, preSamples: 12, postSamples: 16 }, 'OSD cohort')
  expect(Array.isArray(dataset.analytes) && dataset.analytes.length === 4, 'dataset', 'OSD analyte count')
  for (const [index, [id, unit]] of ANALYTES.entries()) {
    const analyte = dataset.analytes[index]
    expect(analyte.id === id && analyte.unit === unit, 'dataset', `OSD analyte ${id}`)
    same(analyte.phaseCounts, { pre: 12, post: 16, all: 28 }, `OSD ${id} phaseCounts`)
    for (const phase of ['pre', 'post', 'all']) {
      const band = analyte.bands[phase]
      expect(Number.isFinite(band.min) && Number.isFinite(band.max), 'dataset', `OSD ${id}.${phase}`)
      expect(band.min <= band.max, 'dataset', `OSD ${id}.${phase} order`)
    }
  }
  expect(dataset.study?.id === 'OSD-575' && dataset.study?.version === '3', 'dataset', 'OSD study')
  expect(dataset.study?.doi === '10.26030/mc5d-p710' && dataset.study?.license === 'CC0-1.0', 'dataset', 'OSD license')
  expect(dataset.source?.url === osdEntry.sourceUrl, 'dataset', 'OSD source URL')
  expect(dataset.source?.bytes === osdEntry.bytes, 'dataset', 'OSD source bytes')
  expect(dataset.source?.sha256 === osdEntry.sha256, 'dataset', 'OSD source hash')
  expect(dataset.source?.verificationDate === '2026-11-14', 'dataset', 'OSD verification date')
  const notices = dataset.clinicalContext?.notices?.join(' ').toLowerCase() ?? ''
  for (const notice of ['not normal intervals', 'not a personal baseline', 'not simulator calibration', 'not a 180-day prediction']) {
    expect(notices.includes(notice), 'dataset', `OSD missing notice ${notice}`)
  }
}

function validateRadiation(dataset, manifest) {
  expect(dataset?.datasetId === 'nasa-radiation-reference' && dataset.status === 'reference-only', 'dataset', 'radiation identity')
  expect(Array.isArray(dataset.limits) && dataset.limits.length === 2, 'dataset', 'radiation limit count')
  for (const [index, [id, value, constraint, requirementId, standardPage, briefPage]] of RADIATION_LIMITS.entries()) {
    const limit = dataset.limits[index]
    expect(limit.id === id && limit.value === value && limit.constraint === constraint, 'dataset', `radiation ${id}`)
    expect(limit.requirementId === requirementId && limit.standardPage === standardPage && limit.briefPage === briefPage, 'dataset', `radiation ${id} citation`)
    expect(limit.unit === 'mSv' && limit.doseType === 'NASA effective dose', 'dataset', `radiation ${id} semantics`)
  }
  const standard = manifest.entries.find((entry) => entry.id === 'nasa-std-3001-vol1')
  const brief = manifest.entries.find((entry) => entry.id === 'ochmo-tb-020')
  expect(dataset.sources?.standard?.url === standard.sourceUrl, 'dataset', 'radiation standard URL')
  expect(dataset.sources?.brief?.url === brief.sourceUrl, 'dataset', 'radiation brief URL')
  expect(dataset.sources?.standard?.approvedAt === '2023-09-15', 'dataset', 'radiation standard date')
  expect(dataset.sources?.brief?.date === '2025-06-06', 'dataset', 'radiation brief date')
  expect(dataset.sources?.brief?.status?.includes('does not supersede'), 'dataset', 'radiation brief status')
  for (const flag of ['notOrganDose', 'noSvConversion', 'noMgyConversion', 'notPersonalDoseMeasurement', 'notCurrentEvent', 'noClinicalAction']) {
    expect(dataset.semantics?.[flag] === true, 'dataset', `radiation semantics ${flag}`)
  }
  expect(!JSON.stringify(dataset).includes('"unit":"mGy"'), 'dataset', 'radiation mGy unit')
  expect(!JSON.stringify(dataset).includes('"unit":"Sv"'), 'dataset', 'radiation Sv unit')
}

function validateCatalog(dataset) {
  expect(dataset?.datasetId === 'nasa-reference-catalog', 'dataset', 'catalog datasetId')
  expect(Array.isArray(dataset.entries) && dataset.entries.length === 10, 'dataset', 'catalog entry count')
  same(dataset.entries.map((entry) => entry.id), CATALOG_IDS, 'catalog entry ids')
  expect(Array.isArray(dataset.hostAllowlist) && dataset.hostAllowlist.length === 13, 'dataset', 'catalog host list')
  expect(dataset.hostAllowlist.every((host) => !host.includes('*')), 'dataset', 'catalog wildcard host')
  expect(dataset.entries.find((entry) => entry.id === 'hrp')?.curationMethod === 'manual', 'dataset', 'HRP curation')
  expect(dataset.entries.find((entry) => entry.id === 'osd-575')?.curationMethod === 'mixed', 'dataset', 'OSD curation')
  const hosts = new Set(dataset.hostAllowlist)
  for (const entry of dataset.entries) {
    for (const field of ['title', 'publisher', 'edition', 'purpose', 'dataNature', 'notes']) nonEmpty(entry[field], `${entry.id}.${field}`)
    expect(entry.verificationDate === '2026-11-14', 'dataset', `${entry.id}.verificationDate`)
    expect(Array.isArray(entry.urls) && entry.urls.length > 0, 'dataset', `${entry.id}.urls`)
    expect(Array.isArray(entry.srsReferences) && entry.srsReferences.length > 0, 'dataset', `${entry.id}.srsReferences`)
    expect(['manual', 'mixed', 'automated'].includes(entry.curationMethod), 'dataset', `${entry.id}.curationMethod`)
    nonEmpty(entry.licenseTerms?.label, `${entry.id}.licenseTerms.label`)
    nonEmpty(entry.licenseTerms?.notes, `${entry.id}.licenseTerms.notes`)
    nonEmpty(entry.owner?.module, `${entry.id}.owner.module`)
    nonEmpty(entry.owner?.handoff, `${entry.id}.owner.handoff`)
    for (const raw of [...entry.urls, entry.licenseTerms.url]) {
      const url = new URL(raw)
      expect(url.protocol === 'https:' && hosts.has(url.hostname), 'dataset', `${entry.id} URL host`)
    }
    for (const forbidden of ['apiKey', 'liveClient', 'mock', 'thresholds', 'bands']) {
      expect(!Object.hasOwn(entry, forbidden), 'dataset', `${entry.id} contains ${forbidden}`)
    }
  }
  const nasa3d = dataset.entries.find((entry) => entry.id === 'nasa-3d-resources')
  expect(!nasa3d.urls.some((url) => url.toLowerCase().endsWith('.glb')), 'dataset', 'catalog GLB asset')
}

/**
 * @param {{ manifest: object, dataFiles: Record<string, object> }} input
 * @returns {{ manifestAssets: number, datasets: number, medicalGroups: number, catalogEntries: number, radiationLimits: number, osdSamples: number }}
 */
export function validateReferenceDatasets({ manifest, dataFiles }) {
  const production = validateProductionManifest(manifest)
  for (const name of ['medical-kit.json', 'osd575-bands.json', 'radiation-reference.json', 'reference-catalog.json']) {
    expect(dataFiles[name] && typeof dataFiles[name] === 'object', 'dataset', `missing ${name}`)
  }
  for (const entry of production.entries) {
    for (const usedBy of entry.usedBy) expect(dataFiles[usedBy], 'manifest', `usedBy ${usedBy} is missing`)
  }
  const osdEntry = production.entries.find((entry) => entry.id === 'osd-575')
  validateMedicalKit(dataFiles['medical-kit.json'])
  validateOsd(dataFiles['osd575-bands.json'], osdEntry)
  validateRadiation(dataFiles['radiation-reference.json'], production)
  validateCatalog(dataFiles['reference-catalog.json'])
  return {
    manifestAssets: production.entries.length,
    datasets: 4,
    medicalGroups: 8,
    catalogEntries: 10,
    radiationLimits: 2,
    osdSamples: 28,
  }
}

async function assertExistingCacheRoot(cacheRoot, lstat) {
  let stat
  try {
    stat = await lstat(cacheRoot)
  } catch (error) {
    if (error.code === 'ENOENT') fail('cache-missing', `cache root does not exist: ${cacheRoot}`)
    throw error
  }
  expect(stat.isDirectory() && !stat.isSymbolicLink(), 'cache', 'cache root must be a real directory')
  return prepareCacheRoot(cacheRoot)
}

/**
 * @param {{ manifest: object, cacheRoot: string, readFile?: Function, lstat?: Function, maxBytes?: number }} input
 * @returns {Promise<Array<{id:string,bytes:number,sha256:string,contentType:string}>>}
 */
export async function verifyCachedFiles({
  manifest,
  cacheRoot,
  readFile = fs.readFile,
  lstat = fs.lstat,
  maxBytes = DEFAULT_MAX_BYTES,
}) {
  const production = validateProductionManifest(manifest)
  const root = await assertExistingCacheRoot(cacheRoot, lstat)
  const results = []
  for (const entry of production.entries) {
    const target = await resolveCachePath(root, entry.cacheFile)
    let stat
    try {
      stat = await lstat(target)
    } catch (error) {
      if (error.code === 'ENOENT') fail('cache-missing', `cache file is missing: ${entry.cacheFile}`)
      throw error
    }
    expect(stat.isFile() && !stat.isSymbolicLink(), 'cache', `unsafe cache file: ${entry.cacheFile}`)
    expect(stat.size <= maxBytes, 'cache-cap', `cache file exceeds cap: ${entry.cacheFile}`)
    const body = await readFile(target)
    expect(body.length === entry.bytes, 'cache-bytes', `${entry.cacheFile} byte length`)
    expect(sha256(body) === entry.sha256, 'cache-hash', `${entry.cacheFile} SHA-256`)
    assertSignature(entry, body)
    results.push({ id: entry.id, bytes: body.length, sha256: entry.sha256, contentType: entry.contentType })
  }
  return results
}

/**
 * @param {{ manifest: object, cacheRoot: string, readFile?: Function }} input
 * @returns {Promise<object>}
 */
export async function deriveOsdFromCache({ manifest, cacheRoot, readFile = fs.readFile }) {
  const production = validateProductionManifest(manifest)
  const entry = production.entries.find((candidate) => candidate.id === 'osd-575')
  const root = await prepareCacheRoot(cacheRoot)
  const target = await resolveCachePath(root, entry.cacheFile)
  const body = await readFile(target)
  const parsed = parseOsdCmpCsv(body.toString('utf8'))
  return buildOsd575BandsDataset(parsed.samples, {
    url: entry.sourceUrl,
    retrievedAt: entry.retrievedAt,
    verificationDate: entry.retrievedAt.slice(0, 10),
    bytes: entry.bytes,
    sha256: entry.sha256,
  })
}

function childPath(base, key) {
  return base ? `${base}.${key}` : key
}

function firstDifference(expected, actual, base = '') {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return { path: childPath(base, 'length'), expected: expected.length, actual: actual.length }
    }
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(expected[index], actual[index], `${base}[${index}]`)
      if (difference) return difference
    }
    return null
  }
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const expectedKeys = Object.keys(expected)
    const actualKeys = Object.keys(actual)
    for (const key of expectedKeys) {
      if (!Object.hasOwn(actual, key)) {
        return { path: childPath(base, key), expected: expected[key], actual: '<missing>' }
      }
      const difference = firstDifference(expected[key], actual[key], childPath(base, key))
      if (difference) return difference
    }
    for (const key of actualKeys) {
      if (!Object.hasOwn(expected, key)) {
        return { path: childPath(base, key), expected: '<missing>', actual: actual[key] }
      }
    }
    return null
  }
  if (!Object.is(expected, actual)) return { path: base || 'dataset', expected, actual }
  return null
}

function formatOsdDifference(difference, committed) {
  const analyteMatch = /^analytes\[(\d+)\]/.exec(difference.path)
  const analyte = analyteMatch
    ? committed.analytes?.[Number(analyteMatch[1])]?.id ?? 'n/a'
    : 'n/a'
  const phaseMatch = /\.(?:bands|phaseCounts)\.(pre|post|all)(?:\.|$)/.exec(difference.path)
  const phase = phaseMatch ? phaseMatch[1] : 'n/a'
  return `first difference at ${difference.path} (analyte=${analyte}, phase=${phase}): expected ${JSON.stringify(difference.expected)}, got ${JSON.stringify(difference.actual)}`
}

/**
 * @param {object} committed
 * @param {object} derived
 * @returns {string}
 */
export function compareOsdDataset(committed, derived) {
  const difference = firstDifference(committed, derived)
  if (difference) fail('osd-divergence', formatOsdDifference(difference, committed))
  const expected = `${JSON.stringify(committed, null, 2)}\n`
  const actual = `${JSON.stringify(derived, null, 2)}\n`
  expect(
    actual === expected,
    'osd-divergence',
    'first difference at dataset (analyte=n/a, phase=n/a): JSON serialization differs',
  )
  return actual
}

/**
 * Atomic writer for the fixed OSD output. Tests may pass a temp destination;
 * the CLI always passes src/data/nasa/osd575-bands.json.
 * @param {string} destinationPath
 * @param {object} dataset
 * @param {{ rename?: Function }} [deps]
 */
export async function writeJsonAtomic(destinationPath, dataset, deps = {}) {
  const parent = path.dirname(destinationPath)
  const parentStat = await fs.lstat(parent)
  expect(parentStat.isDirectory() && !parentStat.isSymbolicLink(), 'output', 'output parent must be a real directory')
  let targetStat
  try {
    targetStat = await fs.lstat(destinationPath)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  expect(!targetStat || (targetStat.isFile() && !targetStat.isSymbolicLink()), 'output', 'output target is unsafe')
  const json = `${JSON.stringify(dataset, null, 2)}\n`
  const temp = path.join(parent, `.${path.basename(destinationPath)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`)
  const rename = deps.rename ?? fs.rename
  let handle
  try {
    handle = await fs.open(temp, 'wx')
    await handle.writeFile(json)
    await handle.sync()
    await handle.close()
    handle = undefined
    await rename(temp, destinationPath)
  } finally {
    if (handle) await handle.close().catch(() => {})
    await fs.rm(temp, { force: true }).catch(() => {})
  }
  return { path: destinationPath, bytes: Buffer.byteLength(json) }
}
