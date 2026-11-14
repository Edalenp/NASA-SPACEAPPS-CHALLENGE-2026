import { describe, expect, it } from 'vitest'
import { getAllRisks } from './index'
import sources from './sources.json'

function expectParsableDate(value: string): void {
  expect(Number.isNaN(Date.parse(value)), value).toBe(false)
}

function expectNasaHttpsUrl(raw: string): URL {
  const url = new URL(raw)

  expect(url.protocol, raw).toBe('https:')
  expect(url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'), raw).toBe(true)
  expect(url.username, raw).toBe('')
  expect(url.password, raw).toBe('')
  expect(url.pathname.replace(/\/$/, ''), raw).not.toBe('')

  return url
}

describe('curation metadata', () => {
  it('declares manual curation with a real verification date', () => {
    expect(sources.curationMethod).toBe('manual')
    expectParsableDate(sources.verifiedAt)
    expect(sources.verifiedAt).toBe('2026-11-14')
  })

  it('describes the curated subset and editorial mappings in English', () => {
    expect(sources.scope).toContain('11')
    expect(sources.editorialMappingNotes.length).toBeGreaterThan(0)
    for (const note of sources.editorialMappingNotes) {
      expect(note.length).toBeGreaterThan(0)
      expect(note).toMatch(/^[\x20-\x7E]+$/)
    }
  })

  it('does not invent download or script metadata', () => {
    expect(Object.keys(sources)).not.toContain('downloadedAt')
    expect(Object.keys(sources)).not.toContain('scriptPath')
    expect(JSON.stringify(sources)).not.toMatch(/downloadedAt|scriptPath/)
  })
})

describe('per-file provenance', () => {
  it('records non-empty NASA sources for hazards.json', () => {
    const file = sources.files['hazards.json']

    expect(file.curationMethod).toBe('manual')
    expectParsableDate(file.verifiedAt)
    expect(file.sourceUrls).toEqual(['https://www.nasa.gov/humans-in-space/the-human-body-in-space/'])
    for (const raw of file.sourceUrls) {
      const url = expectNasaHttpsUrl(raw)
      expect(url.hash, raw).toBe('')
    }
  })

  it('records every per-risk source for risks.json', () => {
    const file = sources.files['risks.json']
    const evidenceUrls = sources.riskEvidence.map((evidence) => evidence.officialUrl)

    expect(file.curationMethod).toBe('manual')
    expectParsableDate(file.verifiedAt)
    expect(file.sourceUrls.length).toBe(11)
    expect(new Set(file.sourceUrls).size).toBe(file.sourceUrls.length)
    expect([...file.sourceUrls].sort()).toEqual([...evidenceUrls].sort())
    for (const raw of file.sourceUrls) {
      expectNasaHttpsUrl(raw)
    }
  })
})

describe('risk evidence crosswalk', () => {
  it('contains one unique evidence entry for every curated risk', () => {
    const risksById = new Map(getAllRisks().map((risk) => [risk.id, risk]))
    const evidenceIds = sources.riskEvidence.map((evidence) => evidence.riskId)

    expect(sources.riskEvidence).toHaveLength(11)
    expect(new Set(evidenceIds).size).toBe(evidenceIds.length)
    expect(new Set(evidenceIds)).toEqual(new Set(risksById.keys()))
    expect(new Set(sources.riskEvidence.map((evidence) => evidence.hrpId)).size).toBe(11)
  })

  it('links each evidence entry to the matching risk and canonical HRP page', () => {
    const risksById = new Map(getAllRisks().map((risk) => [risk.id, risk]))

    for (const evidence of sources.riskEvidence) {
      const risk = risksById.get(evidence.riskId)
      if (!risk) throw new Error(`Evidence references missing risk: ${evidence.riskId}`)

      const url = expectNasaHttpsUrl(evidence.officialUrl)

      expect(url.hostname, evidence.riskId).toBe('humanresearchroadmap.nasa.gov')
      expect(url.pathname, evidence.riskId).toBe('/Risks/risk.aspx')
      expect(url.searchParams.get('i'), evidence.riskId).toBe(String(evidence.hrpId))
      expect(evidence.officialUrl, evidence.riskId).toBe(risk.officialUrl)
      expect(evidence.officialTitle, evidence.riskId).toBe(risk.title)
      expect(Number.isInteger(evidence.hrpId), evidence.riskId).toBe(true)
      expect(evidence.hrpId, evidence.riskId).toBeGreaterThan(0)
    }
  })

  it('keeps evidence excerpts literal, brief, sourced, dated, and active', () => {
    for (const evidence of sources.riskEvidence) {
      expect(evidence.sourceSection.length, evidence.riskId).toBeGreaterThan(0)
      expect(evidence.sourceExcerpt.length, evidence.riskId).toBeGreaterThan(0)
      expect(evidence.sourceExcerpt.length, evidence.riskId).toBeLessThanOrEqual(500)
      expect(evidence.verifiedAt, evidence.riskId).toBe(sources.verifiedAt)
      expectParsableDate(evidence.verifiedAt)
      expect(evidence.hrpStatus, evidence.riskId).toBe('Active')
    }
  })
})
