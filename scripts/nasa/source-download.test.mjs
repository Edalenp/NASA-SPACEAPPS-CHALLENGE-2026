import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, it } from 'node:test'
import {
  PRODUCTION_ASSET_IDS,
  SOURCE_HOST_ALLOWLIST,
  SourceDownloadError,
  downloadSource,
  prepareCacheRoot,
  resolveCachePath,
  validateProductionManifest,
  validateSourceManifest,
} from './source-download.mjs'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const MANIFEST = JSON.parse(await fs.readFile(new URL('./source-manifest.json', import.meta.url), 'utf8'))
const ISS = MANIFEST.entries.find((entry) => entry.id === 'iss-medical-kit')
const PDF_BODY = Buffer.from('%PDF-1.7\nsynthetic source-download test\n')
const PINS = {
  'iss-medical-kit': {
    host: 'www.nasa.gov', sha256: 'c9df53518cfcc2244999c9e1a70014a34fd7d297e1d84699c41b9688d429d0c3',
    bytes: 400064, contentType: 'application/pdf', cacheFile: 'iss-medical-kit-2015.pdf',
  },
  'osd-575': {
    host: 'nasa-osdr.s3.us-west-2.amazonaws.com',
    sha256: '5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9',
    bytes: 8506, contentType: 'text/csv', cacheFile: 'OSD-575-v3-CMP.csv',
  },
  'nasa-std-3001-vol1': {
    host: 'standards.nasa.gov',
    sha256: '93f9f08700959cd542485e21d746b26d3863589c6ee7645d1e9b0bc5bfdda319',
    bytes: 1839091, contentType: 'application/pdf', cacheFile: 'nasa-std-3001-vol-1-rev-c.pdf',
  },
  'ochmo-tb-020': {
    host: 'www.nasa.gov',
    sha256: '1559a1d51115d0e5b7e2fb77d6e14027de3ce4b17def27164249b503f266d1ff',
    bytes: 2081939, contentType: 'application/pdf', cacheFile: 'ochmo-tb-020-rev-g.pdf',
  },
}

const tempRoots = []
afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})

async function tempRoot(prefix = 'source-download-') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempRoots.push(dir)
  return dir
}

function sha(body) {
  return createHash('sha256').update(body).digest('hex')
}

function testManifest(body = PDF_BODY) {
  const entry = structuredClone(ISS)
  entry.bytes = body.length
  entry.sha256 = sha(body)
  return { schemaVersion: 1, generatedAt: MANIFEST.generatedAt, entries: [entry] }
}

function response(body, options = {}) {
  const headers = {}
  if (options.contentType !== null) headers['content-type'] = options.contentType ?? 'application/pdf'
  if (options.contentLength !== null) headers['content-length'] = String(options.contentLength ?? body.length)
  return new Response(
    options.stream ?? new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(body))
        controller.close()
      },
    }),
    { status: options.status ?? 200, headers },
  )
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { location } })
}

function fetchStub(responses) {
  const calls = []
  const impl = async (url, init) => {
    calls.push({ url, init })
    const next = responses.shift()
    if (!next) throw new Error('unexpected fetch')
    return typeof next === 'function' ? next(url, init) : next
  }
  return { impl, calls }
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof SourceDownloadError, String(error))
    assert.equal(error.code, code)
    return true
  })
}

function throwsCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof SourceDownloadError, String(error))
    assert.equal(error.code, code)
    return true
  })
}

function throwsSource(fn) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof SourceDownloadError, String(error))
    return true
  })
}

describe('source manifest', () => {
  it('validates the production manifest and pins all four assets', async () => {
    const manifest = validateProductionManifest(MANIFEST)

    assert.deepEqual(manifest.entries.map((entry) => entry.id), PRODUCTION_ASSET_IDS)
    assert.deepEqual(SOURCE_HOST_ALLOWLIST, [
      'www.nasa.gov', 'standards.nasa.gov', 'nasa-osdr.s3.us-west-2.amazonaws.com',
    ])
    for (const entry of manifest.entries) {
      const pin = PINS[entry.id]
      assert.equal(entry.host, pin.host)
      assert.equal(entry.sha256, pin.sha256)
      assert.equal(entry.bytes, pin.bytes)
      assert.equal(entry.contentType, pin.contentType)
      assert.equal(entry.cacheFile, pin.cacheFile)
      assert.ok(Date.parse(entry.retrievedAt))
      for (const usedBy of entry.usedBy) {
        await fs.access(path.join(PROJECT_ROOT, 'src/data/nasa', usedBy))
      }
    }
  })

  it('rejects malformed, unsafe, or non-production manifests', () => {
    const mutations = [
      (m) => { m.entries[0].extra = true },
      (m) => { m.entries[1].id = m.entries[0].id },
      (m) => { m.entries[0].sourceUrl = 'https://www.nasa.gov/other.pdf' },
      (m) => { m.entries[0].host = 'standards.nasa.gov' },
      (m) => { m.entries[0].sourceUrl = 'https://nasa-osdr.s3.us-west-2.amazonaws.com/other.csv' },
      (m) => { m.entries[0].sha256 = 'a'.repeat(63) },
      (m) => { m.entries[0].bytes = 0 },
      (m) => { m.entries[0].contentType = 'text/html' },
      (m) => { m.entries[0].cacheFile = '../x.pdf' },
      (m) => { m.entries[0].usedBy = ['../medical-kit.json'] },
      (m) => { m.entries[0].retrievedAt = 'not-a-date' },
    ]
    for (const mutate of mutations) {
      const clone = structuredClone(MANIFEST)
      mutate(clone)
      throwsSource(() => validateSourceManifest(clone))
    }

    throwsCode(
      () => validateProductionManifest({ ...MANIFEST, entries: MANIFEST.entries.slice(0, 3) }),
      'manifest',
    )
    throwsCode(
      () => validateProductionManifest({ ...MANIFEST, entries: [...MANIFEST.entries].reverse() }),
      'manifest',
    )
  })

  it('rejects non-HTTPS, credentialed, ported, hashed, and lookalike URLs', () => {
    const urls = [
      'http://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
      'https://user:pass@www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
      'https://www.nasa.gov:444/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
      'https://www.nasa.gov.evil.example/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
      'https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf#x',
    ]
    for (const sourceUrl of urls) {
      const clone = structuredClone(MANIFEST)
      clone.entries[0].sourceUrl = sourceUrl
      throwsCode(() => validateSourceManifest(clone), 'url')
    }
  })
})

describe('cache safety', () => {
  it('creates a missing cache root under an existing parent', async () => {
    const parent = await tempRoot()
    const child = path.join(parent, 'cache')
    const root = await prepareCacheRoot(child)

    assert.equal(root, await fs.realpath(child))
    assert.ok((await fs.stat(root)).isDirectory())
  })

  it('rejects relative, UNC, and project-internal cache roots', async () => {
    await expectCode(prepareCacheRoot('relative-cache'), 'cache-path')
    await expectCode(prepareCacheRoot('\\\\server\\share'), 'cache-path')
    await expectCode(prepareCacheRoot(path.join(PROJECT_ROOT, '.source-download-cache')), 'cache-path')
  })

  it('rejects traversal, drive, ADS, slash, and empty cache filenames', async () => {
    const root = await tempRoot()
    for (const cacheFile of ['../x.pdf', 'a/b.pdf', 'C:\\x.pdf', 'x:ads.pdf', '']) {
      await expectCode(resolveCachePath(root, cacheFile), 'cache-path')
    }
  })

  it('rejects symlink/junction cache roots and .tmp directories', async (t) => {
    const target = await tempRoot('source-download-target-')
    const linkParent = await tempRoot('source-download-link-')
    const link = path.join(linkParent, 'link')
    try {
      await fs.symlink(target, link, 'junction')
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('directory junctions are not available')
        return
      }
      throw error
    }
    await expectCode(prepareCacheRoot(link), 'cache-path')

    const root = await tempRoot()
    const outside = await tempRoot('source-download-outside-')
    await fs.symlink(outside, path.join(root, '.tmp'), 'junction')
    const stub = fetchStub([response(PDF_BODY)])
    await expectCode(
      downloadSource(testManifest(), 'iss-medical-kit', { cacheRoot: root, fetchImpl: stub.impl }),
      'cache-path',
    )
    assert.equal(stub.calls.length, 0)
  })
})

describe('download integrity', () => {
  it('downloads a trusted test asset and writes atomically', async () => {
    const root = await tempRoot()
    const stub = fetchStub([response(PDF_BODY)])
    const result = await downloadSource(testManifest(), 'iss-medical-kit', {
      cacheRoot: root,
      fetchImpl: stub.impl,
      now: () => new Date('2026-11-14T00:00:00Z'),
    })

    assert.equal(result.bytes, PDF_BODY.length)
    assert.equal(result.sha256, sha(PDF_BODY))
    assert.equal(result.contentType, 'application/pdf')
    assert.equal(result.retrievedAt, '2026-11-14T00:00:00.000Z')
    assert.deepEqual(await fs.readFile(path.join(root, ISS.cacheFile)), PDF_BODY)
    assert.deepEqual(await fs.readdir(path.join(root, '.tmp')), [])
    assert.equal(stub.calls[0].init.redirect, 'manual')
  })

  it('follows two allowlisted redirects and rejects a third', async () => {
    const body = PDF_BODY
    const manifest = testManifest(body)
    const root = await tempRoot()
    const okStub = fetchStub([
      redirect('https://www.nasa.gov/a'), redirect('/b'), response(body),
    ])
    const result = await downloadSource(manifest, 'iss-medical-kit', {
      cacheRoot: root, fetchImpl: okStub.impl,
    })
    assert.equal(result.bytes, body.length)
    assert.equal(okStub.calls.length, 3)

    const root2 = await tempRoot()
    const failStub = fetchStub([
      redirect('https://www.nasa.gov/a'), redirect('/b'), redirect('/c'),
    ])
    await expectCode(
      downloadSource(manifest, 'iss-medical-kit', { cacheRoot: root2, fetchImpl: failStub.impl }),
      'redirect',
    )
    assert.equal(failStub.calls.length, 3)
  })

  it('refuses an untrusted redirect before requesting it', async () => {
    const root = await tempRoot()
    const stub = fetchStub([redirect('https://example.com/x')])
    await expectCode(
      downloadSource(testManifest(), 'iss-medical-kit', { cacheRoot: root, fetchImpl: stub.impl }),
      'url',
    )
    assert.equal(stub.calls.length, 1)
  })

  it('times out after headers while the body is stalled', async () => {
    const root = await tempRoot()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(PDF_BODY))
      },
    })
    const stub = fetchStub([response(PDF_BODY, { stream })])
    await expectCode(
      downloadSource(testManifest(), 'iss-medical-kit', {
        cacheRoot: root, fetchImpl: stub.impl, timeoutMs: 20,
      }),
      'timeout',
    )
  })

  it('enforces byte caps before concatenation', async () => {
    const root = await tempRoot()
    const body = Buffer.alloc(10, 1)
    const noLength = fetchStub([response(body, { contentLength: null })])
    await expectCode(
      downloadSource(testManifest(body), 'iss-medical-kit', {
        cacheRoot: root, fetchImpl: noLength.impl, maxBytes: 5,
      }),
      'bytes-cap',
    )

    const early = fetchStub([response(body)])
    await expectCode(
      downloadSource(testManifest(body), 'iss-medical-kit', {
        cacheRoot: await tempRoot(), fetchImpl: early.impl, maxBytes: 5,
      }),
      'bytes-cap',
    )
  })

  it('rejects HTTP, MIME, hash, byte-length, and Content-Length failures', async () => {
    const body = PDF_BODY
    const hashBody = Buffer.from(body)
    hashBody[hashBody.length - 2] ^= 0xff
    const cases = [
      ['status', response(body, { status: 500 }), testManifest(body)],
      ['content-type', response(body, { contentType: 'text/html' }), testManifest(body)],
      ['hash-mismatch', response(hashBody), testManifest(body)],
      ['byte-length', response(body), { ...testManifest(body), entries: [{ ...testManifest(body).entries[0], bytes: body.length + 1 }] }],
      ['length', response(body, { contentLength: body.length + 1 }), testManifest(body)],
      ['length', response(body, { contentLength: body.length - 1 }), testManifest(body)],
    ]
    for (const [code, fakeResponse, manifest] of cases) {
      const stub = fetchStub([fakeResponse])
      await expectCode(
        downloadSource(manifest, 'iss-medical-kit', {
          cacheRoot: await tempRoot(), fetchImpl: stub.impl,
        }),
        code,
      )
    }
  })

  it('preserves an existing destination on failure and cleans temp files', async () => {
    const root = await tempRoot()
    const target = path.join(root, ISS.cacheFile)
    await fs.writeFile(target, 'sentinel')
    const stub = fetchStub([response(PDF_BODY, { status: 500 })])
    await expectCode(
      downloadSource(testManifest(), 'iss-medical-kit', { cacheRoot: root, fetchImpl: stub.impl }),
      'status',
    )
    assert.equal(await fs.readFile(target, 'utf8'), 'sentinel')
    assert.deepEqual(await fs.readdir(path.join(root, '.tmp')), [])
  })

  it('exposes the source id on every transfer and integrity failure', async () => {
    const changed = Buffer.from(PDF_BODY)
    changed[changed.length - 2] ^= 0xff
    const grown = Buffer.concat([PDF_BODY, Buffer.from('x')])
    const cases = [
      ['status', response(PDF_BODY, { status: 500 }), undefined],
      ['content-type', response(PDF_BODY, { contentType: 'text/html' }), undefined],
      ['bytes-cap', response(PDF_BODY), { maxBytes: 1 }],
      ['hash-mismatch', response(changed), undefined],
      ['byte-length', response(grown), undefined],
      ['length', response(PDF_BODY, { contentLength: PDF_BODY.length + 5 }), undefined],
    ]
    for (const [code, fakeResponse, options] of cases) {
      const stub = fetchStub([fakeResponse])
      await assert.rejects(
        downloadSource(testManifest(), 'iss-medical-kit', {
          cacheRoot: await tempRoot(), fetchImpl: stub.impl, ...options,
        }),
        (error) => {
          assert.ok(error instanceof SourceDownloadError, String(error))
          assert.equal(error.code, code)
          assert.equal(error.sourceId, 'iss-medical-kit')
          return true
        },
      )
    }
  })

  it('rejects a symlink destination and an unknown asset id', async (t) => {
    const root = await tempRoot()
    const outside = await tempRoot('source-download-outside-')
    try {
      await fs.symlink(outside, path.join(root, ISS.cacheFile), 'junction')
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        t.skip('directory junctions are not available')
        return
      }
      throw error
    }
    const stub = fetchStub([response(PDF_BODY)])
    await expectCode(
      downloadSource(testManifest(), 'iss-medical-kit', { cacheRoot: root, fetchImpl: stub.impl }),
      'cache-path',
    )
    assert.equal(stub.calls.length, 0)
    await expectCode(
      downloadSource(testManifest(), 'not-an-asset', { cacheRoot: await tempRoot(), fetchImpl: stub.impl }),
      'manifest',
    )
    await expectCode(
      downloadSource(testManifest(), 'iss-medical-kit', { fetchImpl: stub.impl }),
      'cache-path',
    )
  })
})

describe('reviewer gap coverage', () => {
  it('rejects a hash-valid body without the PDF or BOM signature', async () => {
    const root = await tempRoot()
    const junk = Buffer.from('completely synthetic non-PDF payload\n')
    const stub = fetchStub([response(junk, { contentType: 'application/pdf' })])
    await expectCode(
      downloadSource(testManifest(junk), 'iss-medical-kit', { cacheRoot: root, fetchImpl: stub.impl }),
      'signature',
    )
    assert.deepEqual(await fs.readdir(root), ['.tmp'])
    assert.deepEqual(await fs.readdir(path.join(root, '.tmp')), [])
  })

  it('rejects a safe basename that is not the fixed asset cache filename', () => {
    const clone = structuredClone(MANIFEST)
    clone.entries[0].cacheFile = 'other-name.pdf'
    throwsCode(() => validateSourceManifest(clone), 'manifest')
  })

  it('rejects a cache root inside another Git checkout', async () => {
    const gitRoot = await tempRoot('source-download-git-')
    await fs.mkdir(path.join(gitRoot, '.git'))
    await expectCode(prepareCacheRoot(path.join(gitRoot, 'cache')), 'cache-path')
  })
})
