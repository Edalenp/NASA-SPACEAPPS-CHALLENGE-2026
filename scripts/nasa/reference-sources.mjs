import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SourceDownloadError, downloadSource, validateProductionManifest } from './source-download.mjs'
import {
  ReferenceCheckError,
  compareOsdDataset,
  deriveOsdFromCache,
  validateReferenceDatasets,
  verifyCachedFiles,
  writeJsonAtomic,
} from './reference-check.mjs'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'scripts/nasa/source-manifest.json')
const DATA_DIR = path.join(PROJECT_ROOT, 'src/data/nasa')
const OSD_PATH = path.join(DATA_DIR, 'osd575-bands.json')
const DATA_FILES = [
  'medical-kit.json',
  'osd575-bands.json',
  'radiation-reference.json',
  'reference-catalog.json',
]
const USAGE = `Usage: node scripts/nasa/reference-sources.mjs [mode] [--cache <dir>] [--write-osd]

Modes (choose one):
  --check                 Validate manifest and committed JSON offline (default)
  --fetch                 Download the four manifest assets (requires --cache)
  --verify-cache          Verify four cached assets and rederive OSD (requires --cache)

Options:
  --write-osd             Write osd575-bands.json only after full validation
  --cache <dir>           External cache root (required for --fetch/--verify-cache)
  --help                  Show this help

The CLI never accepts an output path, URL, API key, or credential.`

class UsageError extends Error {
  constructor(message) {
    super(`reference-sources.usage: ${message}\n\n${USAGE}`)
    this.name = 'UsageError'
    this.code = 'usage'
  }
}

function usage(message) {
  throw new UsageError(message)
}

/**
 * @param {string[]} argv
 * @returns {{ help: true } | { mode: 'check'|'fetch'|'verify-cache', cache?: string, writeOsd: boolean }}
 */
export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true }
  if (argv.includes('--help')) usage('--help must be used alone')

  let mode
  let cache
  let writeOsd = false
  const seen = new Set()
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--check' || arg === '--fetch' || arg === '--verify-cache') {
      if (seen.has('mode')) usage('multiple modes are not allowed')
      seen.add('mode')
      mode = arg.slice(2)
    } else if (arg === '--write-osd') {
      if (seen.has('write')) usage('--write-osd is duplicated')
      seen.add('write')
      writeOsd = true
    } else if (arg === '--cache') {
      if (seen.has('cache')) usage('--cache is duplicated')
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) usage('--cache requires a directory value')
      index += 1
      seen.add('cache')
      cache = value
    } else {
      usage(`unknown argument: ${arg}`)
    }
  }

  const selected = mode ?? 'check'
  if (writeOsd && selected === 'check') usage('--write-osd requires --fetch or --verify-cache')
  if ((selected === 'fetch' || selected === 'verify-cache') && !cache) {
    usage(`${selected} requires --cache <dir>`)
  }
  return { mode: selected, cache, writeOsd }
}

async function readJson(filePath, deps) {
  const read = deps.readJson ?? (async (target) => JSON.parse(await fs.readFile(target, 'utf8')))
  return read(filePath)
}

async function readDatasets(deps) {
  const dataFiles = {}
  for (const name of DATA_FILES) dataFiles[name] = await readJson(path.join(DATA_DIR, name), deps)
  return dataFiles
}

async function check(deps) {
  const manifest = validateProductionManifest(await readJson(MANIFEST_PATH, deps))
  const dataFiles = await readDatasets(deps)
  const summary = validateReferenceDatasets({ manifest, dataFiles })
  return `check ok: manifest=${summary.manifestAssets} datasets=${summary.datasets} groups=${summary.medicalGroups} catalog=${summary.catalogEntries} radiation=${summary.radiationLimits} osd=${summary.osdSamples}`
}

async function deriveAndCompare(manifest, cacheRoot, deps) {
  const cached = await verifyCachedFiles({
    manifest,
    cacheRoot,
    readFile: deps.readFile,
    lstat: deps.lstat,
    maxBytes: deps.maxBytes,
  })
  const committed = await readJson(OSD_PATH, deps)
  const derived = await deriveOsdFromCache({
    manifest,
    cacheRoot,
    readFile: deps.readFile,
  })
  const json = compareOsdDataset(committed, derived)
  return { cached, derived, json }
}

async function writeIfNeeded(json, derived, writeOsd, deps) {
  if (!writeOsd) return 'not-requested'
  let existing
  try {
    existing = await (deps.readFile ?? fs.readFile)(OSD_PATH, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (existing !== undefined) {
    if (existing === json) return 'unchanged'
    let existingData
    try {
      existingData = JSON.parse(existing)
    } catch {
      throw new ReferenceCheckError('osd-divergence', 'first difference at dataset (analyte=n/a, phase=n/a): existing OSD JSON is not parseable')
    }
    compareOsdDataset(existingData, derived)
    throw new ReferenceCheckError('osd-divergence', 'first difference at dataset (analyte=n/a, phase=n/a): byte serialization differs')
  }
  const writer = deps.writeJsonAtomic ?? writeJsonAtomic
  await writer(OSD_PATH, derived)
  return 'written'
}

async function fetchAll(manifest, cacheRoot, deps) {
  const results = []
  for (const entry of manifest.entries) {
    results.push(await downloadSource(manifest, entry.id, {
      cacheRoot,
      fetchImpl: deps.fetchImpl,
      now: deps.now,
      timeoutMs: deps.timeoutMs,
      maxBytes: deps.maxBytes,
    }))
  }
  return results
}

/**
 * @param {string[]} argv
 * @param {Record<string, unknown>} [deps]
 * @returns {Promise<number>}
 */
export async function runReferenceSources(argv, deps = {}) {
  const out = deps.stdout ?? ((line) => process.stdout.write(`${line}\n`))
  const err = deps.stderr ?? ((line) => process.stderr.write(`${line}\n`))
  try {
    const options = parseArgs(argv)
    if ('help' in options) {
      out(USAGE)
      return 0
    }
    if (options.mode === 'check') {
      out(await check(deps))
      return 0
    }
    const manifest = validateProductionManifest(await readJson(MANIFEST_PATH, deps))
    if (options.mode === 'fetch') {
      const fetched = await fetchAll(manifest, options.cache, deps)
      const { cached, derived, json } = await deriveAndCompare(manifest, options.cache, deps)
      const write = await writeIfNeeded(json, derived, options.writeOsd, deps)
      out(`fetch ok: assets=${fetched.length} verified=${cached.length} osd=byte-identical write-osd=${write}`)
      return 0
    }
    const { cached, derived, json } = await deriveAndCompare(manifest, options.cache, deps)
    const write = await writeIfNeeded(json, derived, options.writeOsd, deps)
    out(`verify-cache ok: assets=${cached.length} osd=byte-identical write-osd=${write}`)
    return 0
  } catch (error) {
    if (
      error instanceof SourceDownloadError
      && (error.code === 'hash-mismatch' || error.code === 'byte-length')
      && error.sourceId
    ) {
      err(
        `upstream-review-required: source=${error.sourceId} check=${error.code}; `
        + 'pinned manifest not updated; review the upstream source and update the pin manually.',
      )
      return 1
    }
    err(error instanceof Error ? error.message : String(error))
    return 1
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = await runReferenceSources(process.argv.slice(2))
}
