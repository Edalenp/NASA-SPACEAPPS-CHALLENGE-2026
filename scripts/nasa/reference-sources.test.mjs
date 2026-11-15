import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, it } from 'node:test'
import { ReferenceCheckError, compareOsdDataset, deriveOsdFromCache, validateReferenceDatasets, verifyCachedFiles, writeJsonAtomic } from './reference-check.mjs'
import { runReferenceSources } from './reference-sources.mjs'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DATA_DIR = path.join(PROJECT_ROOT, 'src/data/nasa')
const CLI_PATH = path.join(PROJECT_ROOT, 'scripts/nasa/reference-sources.mjs')
const MANIFEST = JSON.parse(await fs.readFile(new URL('./source-manifest.json', import.meta.url), 'utf8'))
const OSD_JSON = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'osd575-bands.json'), 'utf8'))
const DATA_FILES = ['medical-kit.json', 'osd575-bands.json', 'radiation-reference.json', 'reference-catalog.json']
const tempRoots = []

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})

async function tempRoot(prefix = 'reference-sources-') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempRoots.push(dir)
  return dir
}

function sha(body) {
  return createHash('sha256').update(body).digest('hex')
}

async function readDataFiles() {
  const files = {}
  for (const name of DATA_FILES) files[name] = JSON.parse(await fs.readFile(path.join(DATA_DIR, name), 'utf8'))
  return files
}

function capture() {
  const stdout = []
  const stderr = []
  return {
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
    out: () => stdout.join('\n'),
    err: () => stderr.join('\n'),
  }
}

async function testAssets() {
  const cacheRoot = await tempRoot('reference-sources-cache-')
  const manifest = structuredClone(MANIFEST)
  for (const entry of manifest.entries) {
    const body = entry.id === 'osd-575'
      ? Buffer.from('\uFEFFbad,header\n1,2\n')
      : Buffer.from('%PDF-1.7\nsynthetic test asset\n')
    await fs.writeFile(path.join(cacheRoot, entry.cacheFile), body)
    entry.bytes = body.length
    entry.sha256 = sha(body)
  }
  return { cacheRoot, manifest }
}

function runChild(args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

describe('reference-sources CLI', () => {
  it('prints help without reading files', async () => {
    const output = capture()
    let reads = 0
    const code = await runReferenceSources(['--help'], {
      readJson: () => { reads += 1; throw new Error('must not read') },
      stdout: output.stdout,
      stderr: output.stderr,
    })
    assert.equal(code, 0)
    assert.equal(reads, 0)
    assert.match(output.out(), /Usage: node scripts\/nasa\/reference-sources\.mjs/)
  })

  it('rejects unknown, duplicate, incompatible, and positional arguments before reads', async () => {
    const cases = [
      ['--unknown'], ['https://example.com'], ['--cache'], ['--cache', 'a', '--cache', 'b'],
      ['--fetch'], ['--verify-cache'], ['--write-osd'], ['--check', '--write-osd'],
      ['--check', '--fetch', '--cache', 'x'], ['--fetch', '--verify-cache', '--cache', 'x'],
      ['--help', '--check'],
    ]
    for (const argv of cases) {
      const output = capture()
      let reads = 0
      const code = await runReferenceSources(argv, {
        readJson: () => { reads += 1; throw new Error('must not read') },
        stdout: output.stdout,
        stderr: output.stderr,
      })
      assert.equal(code, 1, argv.join(' '))
      assert.equal(reads, 0, argv.join(' '))
      assert.match(output.err(), /reference-sources\.usage/)
    }
  })

  it('runs --check from an unrelated cwd with network blocked', async () => {
    const cwd = await tempRoot('reference-sources-cwd-')
    const preload = path.join(cwd, 'block-fetch.mjs')
    await fs.writeFile(preload, "globalThis.fetch = () => { throw new Error('network blocked') }\n")
    const result = await runChild(['--check'], cwd, {
      NODE_OPTIONS: `--import=${pathToFileURL(preload).href}`,
    })
    assert.equal(result.code, 0, result.stderr)
    assert.match(result.stdout, /check ok: manifest=4 datasets=4 groups=8 catalog=10 radiation=2 osd=28/)
    assert.equal(result.stderr, '')
  })

  it('does not request network for library --check', async () => {
    const output = capture()
    const code = await runReferenceSources(['--check'], {
      fetchImpl: () => { throw new Error('network forbidden') },
      stdout: output.stdout,
      stderr: output.stderr,
    })
    assert.equal(code, 0, output.err())
    assert.match(output.out(), /check ok:/)
  })

  it('reports a missing cache for --verify-cache without fetching', async () => {
    const output = capture()
    const cacheRoot = path.join(await tempRoot('reference-sources-missing-'), 'absent')
    const code = await runReferenceSources(['--verify-cache', '--cache', cacheRoot], {
      stdout: output.stdout,
      stderr: output.stderr,
    })
    assert.equal(code, 1)
    assert.match(output.err(), /reference-check\.cache-missing/)
  })
})

describe('offline data validation', () => {
  it('accepts the committed datasets and rejects relevant corruption', async () => {
    const base = await readDataFiles()
    const summary = validateReferenceDatasets({ manifest: MANIFEST, dataFiles: base })
    assert.deepEqual(summary, {
      manifestAssets: 4, datasets: 4, medicalGroups: 8,
      catalogEntries: 10, radiationLimits: 2, osdSamples: 28,
    })

    const mutations = [
      (files) => { files['medical-kit.json'].groups[0].status = 'not-documented' },
      (files) => { files['medical-kit.json'].groups[0].items[0] = 'missing' },
      (files) => { files['medical-kit.json'].groups[3].pack = 'Fake Pack' },
      (files) => { files['medical-kit.json'].items.pop() },
      (files) => { files['osd575-bands.json'].cohort.uniqueSamples = 27 },
      (files) => { files['osd575-bands.json'].analytes[0].unit = 'mmol/L' },
      (files) => { files['radiation-reference.json'].limits[0].value = 601 },
      (files) => { files['reference-catalog.json'].entries[0].id = 'wrong' },
      (files) => { files['reference-catalog.json'].hostAllowlist[0] = '*.nasa.gov' },
      (files) => { files['reference-catalog.json'].entries[0].apiKey = 'secret' },
    ]
    for (const mutate of mutations) {
      const files = structuredClone(base)
      mutate(files)
      assert.throws(
        () => validateReferenceDatasets({ manifest: MANIFEST, dataFiles: files }),
        (error) => error instanceof ReferenceCheckError,
      )
    }
  })
})

describe('cache and output helpers', () => {
  it('verifies cached files and rejects tampering, short bodies, missing files, and caps', async () => {
    const { cacheRoot, manifest } = await testAssets()
    const verified = await verifyCachedFiles({ manifest, cacheRoot })
    assert.equal(verified.length, 4)

    const tampered = path.join(cacheRoot, manifest.entries[0].cacheFile)
    const bytes = await fs.readFile(tampered)
    bytes[bytes.length - 2] ^= 0xff
    await fs.writeFile(tampered, bytes)
    await assert.rejects(
      () => verifyCachedFiles({ manifest, cacheRoot }),
      (error) => error instanceof ReferenceCheckError && error.code === 'cache-hash',
    )

    const { cacheRoot: shortRoot, manifest: shortManifest } = await testAssets()
    await fs.truncate(path.join(shortRoot, shortManifest.entries[0].cacheFile), 2)
    await assert.rejects(
      () => verifyCachedFiles({ manifest: shortManifest, cacheRoot: shortRoot }),
      (error) => error instanceof ReferenceCheckError && error.code === 'cache-bytes',
    )

    const missingRoot = await tempRoot('reference-sources-empty-cache-')
    await assert.rejects(
      () => verifyCachedFiles({ manifest, cacheRoot: missingRoot }),
      (error) => error instanceof ReferenceCheckError && error.code === 'cache-missing',
    )

    const { cacheRoot: capRoot, manifest: capManifest } = await testAssets()
    await assert.rejects(
      () => verifyCachedFiles({ manifest: capManifest, cacheRoot: capRoot, maxBytes: 4 }),
      (error) => error instanceof ReferenceCheckError && error.code === 'cache-cap',
    )
  })

  it('rejects a parse error after cache hash validation', async () => {
    const { cacheRoot, manifest } = await testAssets()
    await verifyCachedFiles({ manifest, cacheRoot })
    await assert.rejects(
      () => deriveOsdFromCache({ manifest, cacheRoot }),
      /osd575-cmp\./,
    )
  })

  it('compares OSD JSON byte-for-byte', () => {
    assert.doesNotThrow(() => compareOsdDataset({ a: 1 }, { a: 1 }))
    assert.throws(
      () => compareOsdDataset({ a: 1 }, { a: 2 }),
      /reference-check\.osd-divergence/,
    )
  })

  it('reports OSD band differences with analyte/phase and metadata with n/a', () => {
    const band = structuredClone(OSD_JSON)
    band.analytes[0].bands.pre.min += 1
    assert.throws(
      () => compareOsdDataset(OSD_JSON, band),
      (error) => /glucose/.test(error.message)
        && /\bpre\b/.test(error.message)
        && /bands\.pre\.min/.test(error.message),
    )

    const metadata = structuredClone(OSD_JSON)
    metadata.source.sha256 = 'wrong'
    assert.throws(
      () => compareOsdDataset(OSD_JSON, metadata),
      (error) => /source\.sha256/.test(error.message)
        && /analyte=n\/a/.test(error.message)
        && /phase=n\/a/.test(error.message),
    )
  })

  it('writes atomically and preserves the destination when rename fails', async () => {
    const root = await tempRoot('reference-sources-output-')
    const destination = path.join(root, 'osd.json')
    const dataset = { schema: 'test', values: [1, 2] }
    const result = await writeJsonAtomic(destination, dataset)
    assert.equal(result.bytes, Buffer.byteLength(`${JSON.stringify(dataset, null, 2)}\n`))
    assert.equal(await fs.readFile(destination, 'utf8'), `${JSON.stringify(dataset, null, 2)}\n`)

    await fs.writeFile(destination, 'sentinel')
    await assert.rejects(
      () => writeJsonAtomic(destination, { changed: true }, { rename: async () => { throw new Error('rename fail') } }),
      /rename fail/,
    )
    assert.equal(await fs.readFile(destination, 'utf8'), 'sentinel')
    assert.deepEqual(
      (await fs.readdir(root)).filter((name) => name.endsWith('.tmp')),
      [],
    )
  })
})
