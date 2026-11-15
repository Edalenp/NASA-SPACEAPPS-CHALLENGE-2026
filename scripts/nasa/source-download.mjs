import { Buffer } from 'node:buffer'
import { createHash, randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @typedef {'iss-medical-kit'|'osd-575'|'nasa-std-3001-vol1'|'ochmo-tb-020'} AssetId
 * @typedef {{ id: AssetId, sourceUrl: string, host: string, sha256: string, bytes: number, contentType: string, edition: string, retrievedAt: string, cacheFile: string, usedBy: string[], extraction: string }} SourceManifestEntry
 * @typedef {{ schemaVersion: 1, generatedAt: string, entries: SourceManifestEntry[] }} SourceManifest
 * @typedef {{ cacheRoot: string, fetchImpl?: typeof fetch, timeoutMs?: number, maxBytes?: number, now?: () => Date }} DownloadOptions
 * @typedef {{ id: AssetId, cacheFile: string, cachePath: string, sourceUrl: string, contentType: string, bytes: number, sha256: string, retrievedAt: string }} DownloadResult
 */

export const SOURCE_HOST_ALLOWLIST = Object.freeze([
  'www.nasa.gov',
  'standards.nasa.gov',
  'nasa-osdr.s3.us-west-2.amazonaws.com',
])
export const PRODUCTION_ASSET_IDS = Object.freeze([
  'iss-medical-kit',
  'osd-575',
  'nasa-std-3001-vol1',
  'ochmo-tb-020',
])
export const DEFAULT_TIMEOUT_MS = 30_000
export const DEFAULT_MAX_BYTES = 20 * 1024 * 1024

const HOST_SET = new Set(SOURCE_HOST_ALLOWLIST)
const ASSET_URLS = Object.freeze({
  'iss-medical-kit':
    'https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
  'osd-575':
    'https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv',
  'nasa-std-3001-vol1':
    'https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf',
  'ochmo-tb-020':
    'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf',
})
const ASSET_HOSTS = Object.freeze({
  'iss-medical-kit': 'www.nasa.gov',
  'osd-575': 'nasa-osdr.s3.us-west-2.amazonaws.com',
  'nasa-std-3001-vol1': 'standards.nasa.gov',
  'ochmo-tb-020': 'www.nasa.gov',
})
const ASSET_CACHE_FILES = Object.freeze({
  'iss-medical-kit': 'iss-medical-kit-2015.pdf', 'osd-575': 'OSD-575-v3-CMP.csv',
  'nasa-std-3001-vol1': 'nasa-std-3001-vol-1-rev-c.pdf', 'ochmo-tb-020': 'ochmo-tb-020-rev-g.pdf',
})
const ASSET_CONTENT_TYPES = Object.freeze({
  'iss-medical-kit': ['application/pdf'], 'osd-575': ['text/csv'],
  'nasa-std-3001-vol1': ['application/pdf'], 'ochmo-tb-020': ['application/pdf'],
})
const OSD_AWS_PATH =
  '/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv'
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ENTRY_KEYS = [
  'id', 'sourceUrl', 'host', 'sha256', 'bytes', 'contentType', 'edition',
  'retrievedAt', 'cacheFile', 'usedBy', 'extraction',
]

export class SourceDownloadError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {string} [sourceId]
   */
  constructor(code, message, sourceId) {
    super(`source-download.${code}: ${sourceId ? `[${sourceId}] ` : ''}${message}`)
    this.name = 'SourceDownloadError'
    this.code = code
    this.sourceId = sourceId ?? null
  }
}

/**
 * @param {string} code
 * @param {string} message
 * @param {string} [sourceId]
 * @returns {never}
 */
function fail(code, message, sourceId) {
  throw new SourceDownloadError(code, message, sourceId)
}

/**
 * @param {string} field
 * @param {unknown} value
 * @returns {asserts value is string}
 */
function nonEmpty(field, value) {
  if (typeof value !== 'string' || value.trim() === '') fail('manifest', `${field} must be a non-empty string`)
}

/**
 * @param {string} field
 * @param {unknown} value
 */
function parsableDate(field, value) {
  nonEmpty(field, value)
  if (Number.isNaN(Date.parse(value))) fail('manifest', `${field} must be a parsable date`)
}

/**
 * @param {string} field
 * @param {object} value
 * @param {readonly string[]} keys
 */
function exactKeys(field, value, keys) {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.join('|') !== expected.join('|')) {
    fail('manifest', `${field} fields differ: expected ${expected.join(', ')}; got ${actual.join(', ')}`)
  }
}

/**
 * @param {string} cacheFile
 */
function assertSafeCacheFile(cacheFile) {
  if (typeof cacheFile !== 'string' || cacheFile.trim() === '') fail('cache-path', 'cacheFile must be non-empty')
  if (path.basename(cacheFile) !== cacheFile) fail('cache-path', `cacheFile must be a basename: ${cacheFile}`)
  if (cacheFile.includes('..') || cacheFile.includes(':') || cacheFile.includes('/') || cacheFile.includes('\\')) {
    fail('cache-path', `unsafe cacheFile: ${cacheFile}`)
  }
}

/**
 * @param {string} raw
 * @param {{ assetId?: AssetId, exactAssetUrl?: boolean }} [options]
 * @returns {URL}
 */
function assertAllowedUrl(raw, options = {}) {
  let url
  try {
    url = new URL(raw)
  } catch {
    fail('url', `invalid URL: ${raw}`)
  }
  if (url.protocol !== 'https:') fail('url', `HTTPS required: ${raw}`)
  if (url.username || url.password || url.hash || url.port) {
    fail('url', `credentials, fragments, and ports are not allowed: ${raw}`)
  }
  if (!HOST_SET.has(url.hostname)) fail('url', `host is not allowlisted: ${url.hostname}`)
  if (options.assetId && ASSET_HOSTS[options.assetId] !== url.hostname) {
    fail('url', `host does not match asset ${options.assetId}: ${url.hostname}`)
  }
  if (options.assetId && options.exactAssetUrl && ASSET_URLS[options.assetId] !== raw) {
    fail('url', `URL does not match the pinned asset endpoint: ${raw}`)
  }
  if (url.hostname === 'nasa-osdr.s3.us-west-2.amazonaws.com') {
    if (options.assetId !== 'osd-575' || url.pathname !== OSD_AWS_PATH) {
      fail('url', 'AWS host is allowed only for the pinned OSD-575 CSV path')
    }
  }
  return url
}

/**
 * @param {string} field
 * @param {unknown} usedBy
 */
function assertUsedBy(field, usedBy) {
  if (!Array.isArray(usedBy) || usedBy.length === 0) fail('manifest', `${field} must be non-empty`)
  for (const [index, name] of usedBy.entries()) {
    nonEmpty(`${field}[${index}]`, name)
    if (path.basename(name) !== name || name.includes('..') || name.includes(':') || !name.endsWith('.json')) {
      fail('manifest', `${field}[${index}] must be a safe JSON basename`)
    }
  }
}

/**
 * @param {unknown} input
 * @returns {SourceManifest}
 */
export function validateSourceManifest(input) {
  if (!input || typeof input !== 'object') fail('manifest', 'expected an object')
  exactKeys('manifest', input, ['schemaVersion', 'generatedAt', 'entries'])
  if (input.schemaVersion !== 1) fail('manifest', 'schemaVersion must be 1')
  parsableDate('generatedAt', input.generatedAt)
  if (!Array.isArray(input.entries) || input.entries.length === 0) fail('manifest', 'entries must be non-empty')

  const ids = new Set()
  const cacheFiles = new Set()
  const sourceUrls = new Set()
  input.entries.forEach((entry, index) => {
    const field = `entries[${index}]`
    if (!entry || typeof entry !== 'object') fail('manifest', `${field} must be an object`)
    exactKeys(field, entry, ENTRY_KEYS)
    if (!PRODUCTION_ASSET_IDS.includes(entry.id)) fail('manifest', `${field}.id is not an approved asset`)
    if (ids.has(entry.id)) fail('manifest', `${field}.id is duplicated`)
    ids.add(entry.id)
    assertAllowedUrl(entry.sourceUrl, { assetId: entry.id, exactAssetUrl: true })
    if (entry.host !== ASSET_HOSTS[entry.id]) fail('manifest', `${field}.host does not match the asset`)
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      fail('manifest', `${field}.sha256 must be 64 lowercase hex characters`)
    }
    if (!Number.isInteger(entry.bytes) || entry.bytes <= 0) fail('manifest', `${field}.bytes must be positive`)
    if (!ASSET_CONTENT_TYPES[entry.id].includes(entry.contentType)) {
      fail('manifest', `${field}.contentType is not allowed for the asset`)
    }
    nonEmpty(`${field}.edition`, entry.edition)
    parsableDate(`${field}.retrievedAt`, entry.retrievedAt)
    assertSafeCacheFile(entry.cacheFile)
    if (entry.cacheFile !== ASSET_CACHE_FILES[entry.id]) fail('manifest', `${field}.cacheFile is not the fixed asset filename`)
    if (cacheFiles.has(entry.cacheFile)) fail('manifest', `${field}.cacheFile is duplicated`)
    cacheFiles.add(entry.cacheFile)
    if (sourceUrls.has(entry.sourceUrl)) fail('manifest', `${field}.sourceUrl is duplicated`)
    sourceUrls.add(entry.sourceUrl)
    assertUsedBy(`${field}.usedBy`, entry.usedBy)
    nonEmpty(`${field}.extraction`, entry.extraction)
  })
  return structuredClone(input)
}

/**
 * @param {unknown} input
 * @returns {SourceManifest}
 */
export function validateProductionManifest(input) {
  const manifest = validateSourceManifest(input)
  if (manifest.entries.length !== PRODUCTION_ASSET_IDS.length) {
    fail('manifest', `production manifest must contain exactly ${PRODUCTION_ASSET_IDS.length} assets`)
  }
  manifest.entries.forEach((entry, index) => {
    if (entry.id !== PRODUCTION_ASSET_IDS[index]) {
      fail('manifest', `production manifest asset ${index} must be ${PRODUCTION_ASSET_IDS[index]}`)
    }
  })
  return manifest
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizedPath(value) {
  const resolved = path.resolve(value)
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

/**
 * @param {string} candidate
 * @param {string} parent
 * @returns {boolean}
 */
function isInside(candidate, parent) {
  const relative = path.relative(normalizedPath(parent), normalizedPath(candidate))
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

/**
 * @param {string} target
 */
async function assertNoSymlinkSegments(target) {
  const resolved = path.resolve(target)
  const root = path.parse(resolved).root
  const parts = path.relative(root, resolved).split(path.sep).filter(Boolean)
  let current = root
  for (const part of parts) {
    current = path.join(current, part)
    let stat
    try {
      stat = await fs.lstat(current)
    } catch (error) {
      if (error.code === 'ENOENT') break
      throw error
    }
    if (stat.isSymbolicLink()) fail('cache-path', `symlink/junction is not allowed: ${current}`)
    const real = await fs.realpath(current)
    if (normalizedPath(real) !== normalizedPath(current)) fail('cache-path', `symlink/junction is not allowed: ${current}`)
  }
}

/**
 * @param {string} target
 * @returns {Promise<string>}
 */
async function realpathOrNearest(target) {
  try {
    return await fs.realpath(target)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const parent = path.dirname(target)
    if (parent === target) throw error
    return realpathOrNearest(parent)
  }
}

/**
 * @param {string} target
 */
async function assertNotInsideProjectOrGit(target) {
  const realTarget = await realpathOrNearest(target)
  const realProject = await realpathOrNearest(PROJECT_ROOT)
  if (isInside(realTarget, realProject)) fail('cache-path', 'cache root must be outside the project')
  let current = realTarget
  while (true) {
    try {
      const stat = await fs.lstat(path.join(current, '.git'))
      if (stat) fail('cache-path', `cache root must not be inside a Git checkout: ${current}`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
}

/**
 * @param {string} target
 */
async function ensureDirectory(target) {
  try {
    const stat = await fs.lstat(target)
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail('cache-path', `expected a real directory: ${target}`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const parent = path.dirname(target)
    const parentStat = await fs.lstat(parent)
    if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) fail('cache-path', `unsafe parent: ${parent}`)
    await fs.mkdir(target, { recursive: false })
  }
  await assertNoSymlinkSegments(target)
}

/**
 * @param {string} cacheRoot
 * @returns {Promise<string>}
 */
export async function prepareCacheRoot(cacheRoot) {
  if (typeof cacheRoot !== 'string' || !path.isAbsolute(cacheRoot)) fail('cache-path', 'expected an absolute cache root')
  if (cacheRoot.startsWith('\\\\')) fail('cache-path', 'UNC cache roots are not allowed')
  const resolved = path.resolve(cacheRoot)
  await assertNoSymlinkSegments(resolved)
  await assertNotInsideProjectOrGit(resolved)
  await ensureDirectory(resolved)
  await assertNotInsideProjectOrGit(await fs.realpath(resolved))
  return fs.realpath(resolved)
}

/**
 * @param {string} cacheRoot
 * @param {string} cacheFile
 * @returns {Promise<string>}
 */
export async function resolveCachePath(cacheRoot, cacheFile) {
  assertSafeCacheFile(cacheFile)
  const root = path.resolve(cacheRoot)
  const target = path.resolve(root, cacheFile)
  if (path.dirname(target) !== root) fail('cache-path', 'cache file escapes the cache root')
  try {
    const stat = await fs.lstat(target)
    if (stat.isSymbolicLink() || !stat.isFile()) fail('cache-path', `unsafe destination: ${target}`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return target
}

/**
 * @param {SourceManifestEntry} entry
 * @param {typeof fetch} fetchImpl
 * @param {AbortSignal} signal
 * @returns {Promise<Response>}
 */
async function fetchWithRedirects(entry, fetchImpl, signal) {
  let currentUrl = entry.sourceUrl
  for (let redirects = 0; redirects <= 2; redirects += 1) {
    const response = await fetchImpl(currentUrl, {
      redirect: 'manual',
      signal,
      headers: { accept: entry.contentType },
    })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects === 2) fail('redirect', 'too many redirects')
      const location = response.headers.get('location')
      if (!location) fail('redirect', 'redirect response is missing Location')
      const next = new URL(location, currentUrl)
      assertAllowedUrl(next.href, { assetId: entry.id })
      await response.body?.cancel().catch(() => {})
      currentUrl = next.href
      continue
    }
    return response
  }
  fail('redirect', 'too many redirects')
}

/**
 * @param {Response} response
 * @param {number} maxBytes
 * @param {AbortSignal} signal
 * @param {string} sourceId
 * @returns {Promise<Buffer>}
 */
async function readCappedBody(response, maxBytes, signal, sourceId) {
  if (!response.body) fail('body', 'response has no body', sourceId)
  const contentLength = response.headers.get('content-length')
  if (contentLength !== null) {
    const expected = Number(contentLength)
    if (!Number.isInteger(expected) || expected < 0) fail('content-length', 'invalid Content-Length', sourceId)
    if (expected > maxBytes) fail('bytes-cap', `Content-Length ${expected} exceeds ${maxBytes}`, sourceId)
  }
  const reader = response.body.getReader()
  const cancelOnAbort = () => reader.cancel().catch(() => {})
  signal.addEventListener('abort', cancelOnAbort, { once: true })
  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) fail('bytes-cap', `body exceeds ${maxBytes} bytes`, sourceId)
      chunks.push(Buffer.from(value))
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    signal.removeEventListener('abort', cancelOnAbort)
    reader.releaseLock()
  }
  const body = Buffer.concat(chunks, total)
  if (contentLength !== null && body.length !== Number(contentLength)) {
    fail('length', `Content-Length ${contentLength} does not match ${body.length} bytes`, sourceId)
  }
  return body
}

/**
 * @param {SourceManifestEntry} entry
 * @param {Buffer} body
 */
function assertSignature(entry, body) {
  if (entry.id === 'osd-575') {
    if (body.length < 3 || body[0] !== 0xef || body[1] !== 0xbb || body[2] !== 0xbf) {
      fail('signature', 'OSD CSV must start with a UTF-8 BOM', entry.id)
    }
    return
  }
  if (body.length < 4 || body.subarray(0, 4).toString('ascii') !== '%PDF') {
    fail('signature', 'PDF must start with %PDF', entry.id)
  }
}

/**
 * @param {string} target
 * @param {Buffer} body
 * @param {string} tmpDir
 */
async function writeFileAtomic(target, body, tmpDir) {
  const temp = path.join(
    tmpDir,
    `${path.basename(target)}.${process.pid}.${randomBytes(8).toString('hex')}.part`,
  )
  let handle
  try {
    handle = await fs.open(temp, 'wx')
    await handle.writeFile(body)
    await handle.sync()
    await handle.close()
    handle = undefined
    await fs.rename(temp, target)
  } finally {
    if (handle) await handle.close().catch(() => {})
    await fs.rm(temp, { force: true }).catch(() => {})
  }
}

/**
 * @param {string} root
 * @returns {Promise<string>}
 */
async function prepareTmpDir(root) {
  const tmpDir = path.join(root, '.tmp')
  await ensureDirectory(tmpDir)
  return tmpDir
}

/**
 * Download one asset named by the manifest. No URL argument is accepted.
 * @param {SourceManifest} manifestInput
 * @param {AssetId|string} assetId
 * @param {DownloadOptions} options
 * @returns {Promise<DownloadResult>}
 */
export async function downloadSource(manifestInput, assetId, options) {
  const manifest = validateSourceManifest(manifestInput)
  const entry = manifest.entries.find((candidate) => candidate.id === assetId)
  if (!entry) fail('manifest', `asset is not present in the manifest: ${assetId}`)
  if (!options || typeof options !== 'object') fail('cache-path', 'options are required')
  if (typeof options.cacheRoot !== 'string') fail('cache-path', 'cacheRoot is required')
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) fail('timeout', 'timeoutMs must be positive', entry.id)
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) fail('bytes-cap', 'maxBytes must be positive', entry.id)
  const root = await prepareCacheRoot(options.cacheRoot)
  const target = await resolveCachePath(root, entry.cacheFile)
  const tmpDir = await prepareTmpDir(root)

  const controller = new AbortController()
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new SourceDownloadError('timeout', `exceeded ${timeoutMs}ms`, entry.id))
    }, timeoutMs)
    timer.unref?.()
  })
  const task = (async () => {
    const response = await fetchWithRedirects(entry, fetchImpl, controller.signal)
    if (response.status < 200 || response.status >= 300) {
      fail('status', `unexpected HTTP status ${response.status}`, entry.id)
    }
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!ASSET_CONTENT_TYPES[entry.id].includes(contentType)) {
      fail('content-type', `unexpected Content-Type ${contentType || '(missing)'}`, entry.id)
    }
    const body = await readCappedBody(response, maxBytes, controller.signal, entry.id)
    const sha256 = createHash('sha256').update(body).digest('hex')
    if (body.length !== entry.bytes) fail('byte-length', `expected ${entry.bytes} bytes, received ${body.length}`, entry.id)
    if (sha256 !== entry.sha256) fail('hash-mismatch', 'SHA-256 does not match the manifest', entry.id)
    assertSignature(entry, body)
    await writeFileAtomic(target, body, tmpDir)
    return {
      id: entry.id,
      cacheFile: entry.cacheFile,
      cachePath: target,
      sourceUrl: entry.sourceUrl,
      contentType,
      bytes: body.length,
      sha256,
      retrievedAt: (options.now?.() ?? new Date()).toISOString(),
    }
  })().catch((error) => {
    if (controller.signal.aborted) throw new SourceDownloadError('timeout', `exceeded ${timeoutMs}ms`, entry.id)
    throw error
  })

  try {
    return await Promise.race([task, timeout])
  } finally {
    clearTimeout(timer)
  }
}
