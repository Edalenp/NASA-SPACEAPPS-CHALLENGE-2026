// QA acceptance tests for the complete-nasa-reference-data contract.
// Spec source of truth: openspec/changes/complete-nasa-reference-data/specs/nasa-reference-data/spec.md
//
// These tests pin the literal contract wording of three scenarios as permanent regression
// tests. They failed before the fix and are now required to stay green so the
// contract-mandated diagnostics cannot regress:
//   1. "Hash mismatch requires upstream review"  -> CLI error is an `upstream-review-required` error
//   2. "Budget and response checks fail closed"  -> the error identifies the source id and the failed check
//   3. "Cache verification rederives the OSD dataset" -> a difference is reported with the analyte and phase
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { compareOsdDataset } from './reference-check.mjs'
import { runReferenceSources } from './reference-sources.mjs'

const MANIFEST = JSON.parse(await fs.readFile(new URL('./source-manifest.json', import.meta.url), 'utf8'))
const OSD_JSON = JSON.parse(
  await fs.readFile(new URL('../../src/data/nasa/osd575-bands.json', import.meta.url), 'utf8'),
)
// Fail a later asset on purpose so "the error identifies the source id" can be proven
// against a specific id, not just whichever asset happens to be first.
const FAILING_ID = 'nasa-std-3001-vol1'

const tempRoots = []
afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})

async function tempRoot(prefix = 'qa-acceptance-') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempRoots.push(dir)
  return dir
}

const sha = (body) => createHash('sha256').update(body).digest('hex')
const pdf = (tag) => Buffer.from(`%PDF-1.7\nsynthetic acceptance asset ${tag}\n`)
const csv = () => Buffer.from('\uFEFFSample Name,note\n')

function goodBodies() {
  return {
    'iss-medical-kit': pdf('iss'),
    'osd-575': csv(),
    'nasa-std-3001-vol1': pdf('std'),
    'ochmo-tb-020': pdf('tb'),
  }
}

function manifestFor(bodies) {
  const manifest = structuredClone(MANIFEST)
  for (const entry of manifest.entries) {
    const body = bodies[entry.id]
    entry.bytes = body.length
    entry.sha256 = sha(body)
  }
  return manifest
}

function streamResponse(body, { status = 200, contentType, contentLength } = {}) {
  const headers = {
    'content-type': contentType ?? 'application/pdf',
    'content-length': String(contentLength ?? body.length),
  }
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(body))
        controller.close()
      },
    }),
    { status, headers },
  )
}

function fetchStub(responses) {
  const queue = [...responses]
  return async () => {
    const next = queue.shift()
    if (!next) throw new Error('unexpected fetch')
    return next
  }
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

async function runFetch(manifest, fetchImpl, extra = {}) {
  const cacheRoot = await tempRoot()
  const output = capture()
  const code = await runReferenceSources(['--fetch', '--cache', cacheRoot], {
    readJson: async (target) =>
      String(target).endsWith('source-manifest.json')
        ? manifest
        : JSON.parse(await fs.readFile(target, 'utf8')),
    fetchImpl,
    stdout: output.stdout,
    stderr: output.stderr,
    ...extra,
  })
  return { code, cacheRoot, output }
}

describe('contract: hash mismatch requires upstream review', () => {
  it('CLI hash mismatch reports upstream-review-required and names the source id', async () => {
    const bodies = goodBodies()
    const manifest = manifestFor(bodies)
    const tampered = Buffer.from(bodies[FAILING_ID])
    tampered[tampered.length - 1] ^= 0x01 // same length, wrong SHA-256
    const stub = fetchStub([
      streamResponse(bodies['iss-medical-kit']),
      streamResponse(bodies['osd-575'], { contentType: 'text/csv' }),
      streamResponse(tampered),
    ])
    const { code, output } = await runFetch(manifest, stub)

    assert.equal(code, 1)
    // spec: "the CLI exits with an `upstream-review-required` error"
    assert.match(output.err(), /upstream-review-required/i)
    // spec: "the error identifies the source id and the failed check"
    assert.match(output.err(), /nasa-std-3001-vol1/)
    assert.match(output.err(), /hash/i)
  })

  it('byte-length mismatch (upstream changed) is upstream-review-required, truncated reads are not', async () => {
    const bodies = goodBodies()
    const manifest = manifestFor(bodies)

    // Complete stream received, but the length differs from the pin -> upstream changed.
    const grown = Buffer.concat([bodies[FAILING_ID], Buffer.from('X')])
    const upstreamChanged = await runFetch(
      manifest,
      fetchStub([
        streamResponse(bodies['iss-medical-kit']),
        streamResponse(bodies['osd-575'], { contentType: 'text/csv' }),
        streamResponse(grown),
      ]),
    )
    assert.equal(upstreamChanged.code, 1)
    assert.match(upstreamChanged.output.err(), /upstream-review-required/i)
    assert.match(upstreamChanged.output.err(), /nasa-std-3001-vol1/)
    assert.match(upstreamChanged.output.err(), /byte/i)

    // Content-Length promises more bytes than the stream delivers -> network truncation.
    // This is NOT an upstream content change and must not be labelled as such.
    const truncated = await runFetch(
      manifest,
      fetchStub([
        streamResponse(bodies['iss-medical-kit']),
        streamResponse(bodies['osd-575'], { contentType: 'text/csv' }),
        streamResponse(bodies[FAILING_ID], { contentLength: bodies[FAILING_ID].length + 5 }),
      ]),
    )
    assert.equal(truncated.code, 1)
    assert.doesNotMatch(truncated.output.err(), /upstream-review-required/i)
  })
})

describe('contract: budget and response checks fail closed with source id', () => {
  it('status, content-type, and byte-cap failures name the source id and the failed check', async () => {
    const cases = [
      {
        name: 'non-2xx status',
        expectId: 'iss-medical-kit',
        expectCheck: /status/i,
        options: { maxBytes: undefined },
        responses: () => [streamResponse(pdf('iss'), { status: 500 })],
      },
      {
        name: 'unexpected content type',
        expectId: 'iss-medical-kit',
        expectCheck: /content-type/i,
        options: { maxBytes: undefined },
        responses: () => [streamResponse(pdf('iss'), { contentType: 'text/html' })],
      },
      {
        name: 'byte cap exceeded',
        expectId: 'iss-medical-kit',
        expectCheck: /cap/i,
        options: { maxBytes: 500 },
        responses: () => [streamResponse(pdf('iss'), { contentLength: 600 })],
      },
      {
        name: 'timeout',
        expectId: 'iss-medical-kit',
        expectCheck: /timeout/i,
        options: { timeoutMs: 5 },
        responses: () => [
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(pdf('iss')))
                // never close: body stalls after headers
              },
            }),
            { status: 200, headers: { 'content-type': 'application/pdf', 'content-length': '36' } },
          ),
        ],
      },
    ]
    for (const testCase of cases) {
      const manifest = manifestFor(goodBodies())
      const { code, output } = await runFetch(manifest, fetchStub(testCase.responses()), testCase.options)
      assert.equal(code, 1, testCase.name)
      // spec: "the error identifies the source id and the failed check"
      assert.match(output.err(), new RegExp(testCase.expectId), testCase.name)
      assert.match(output.err(), testCase.expectCheck, testCase.name)
    }
  })
})

describe('contract: cache verification reports the analyte and phase', () => {
  it('OSD divergence names the analyte and phase of the differing band', () => {
    const derived = structuredClone(OSD_JSON)
    derived.analytes[0].bands.pre.min += 1 // glucose / pre

    assert.throws(
      () => compareOsdDataset(OSD_JSON, derived),
      (error) => {
        // spec: "any difference is reported as an error with the analyte and phase"
        assert.match(error.message, /\bglucose\b/)
        assert.match(error.message, /\bpre\b/)
        return true
      },
    )
  })
})
