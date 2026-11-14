import { describe, expect, it } from 'vitest'
import { advanceProtocol, createProtocol, type EmergencyProtocol } from './emergency'
import type { SourcedAction } from './types'

const actions: SourcedAction[] = [
  { text: 'Seal the affected module', sourceTitle: 'Emergency Handbook', sourceUrl: 'https://nasa.gov/handbook' },
  { text: 'Report to mission control', sourceTitle: 'Emergency Handbook', sourceUrl: 'https://nasa.gov/handbook' },
]

function freshProtocol(): EmergencyProtocol {
  return createProtocol('proto-001', 'crew-1', 'Depressurization', actions)
}

describe('createProtocol', () => {
  it('creates a pending protocol with sourced steps', () => {
    const protocol = freshProtocol()
    expect(protocol.status).toBe('notStarted')
    expect(protocol.startedAt).toBeNull()
    expect(protocol.steps).toHaveLength(2)
    for (const step of protocol.steps) {
      expect(step.state).toBe('pending')
      expect(step.completedAt).toBeNull()
    }
  })
})

describe('advanceProtocol', () => {
  it('moves from notStarted to inProgress on start', () => {
    const protocol = advanceProtocol(freshProtocol(), { type: 'start', at: '2026-11-14T09:00:00.000Z' })
    expect(protocol.status).toBe('inProgress')
    expect(protocol.startedAt).toBe('2026-11-14T09:00:00.000Z')
  })

  it('ignores a start on an already started protocol', () => {
    const started = advanceProtocol(freshProtocol(), { type: 'start', at: '2026-11-14T09:00:00.000Z' })
    const again = advanceProtocol(started, { type: 'start', at: '2026-11-14T09:05:00.000Z' })
    expect(again.startedAt).toBe('2026-11-14T09:00:00.000Z')
  })

  it('completes steps in order and finishes the protocol on the last one', () => {
    let protocol = advanceProtocol(freshProtocol(), { type: 'start', at: '2026-11-14T09:00:00.000Z' })
    protocol = advanceProtocol(protocol, { type: 'completeStep', stepIndex: 0, at: '2026-11-14T09:02:00.000Z' })
    expect(protocol.steps[0].state).toBe('done')
    expect(protocol.status).toBe('inProgress')
    protocol = advanceProtocol(protocol, { type: 'completeStep', stepIndex: 1, at: '2026-11-14T09:04:00.000Z' })
    expect(protocol.status).toBe('completed')
    expect(protocol.steps[1].completedAt).toBe('2026-11-14T09:04:00.000Z')
  })

  it('ignores commands on a protocol that has not started', () => {
    const protocol = advanceProtocol(freshProtocol(), { type: 'completeStep', stepIndex: 0, at: '2026-11-14T09:02:00.000Z' })
    expect(protocol.steps[0].state).toBe('pending')
    expect(protocol.status).toBe('notStarted')
  })

  it('ignores out of range step indexes and double completions', () => {
    let protocol = advanceProtocol(freshProtocol(), { type: 'start', at: '2026-11-14T09:00:00.000Z' })
    protocol = advanceProtocol(protocol, { type: 'completeStep', stepIndex: 99, at: '2026-11-14T09:02:00.000Z' })
    expect(protocol.steps.every((step) => step.state === 'pending')).toBe(true)
    protocol = advanceProtocol(protocol, { type: 'completeStep', stepIndex: 0, at: '2026-11-14T09:02:00.000Z' })
    const twice = advanceProtocol(protocol, { type: 'completeStep', stepIndex: 0, at: '2026-11-14T09:03:00.000Z' })
    expect(twice.steps[0].completedAt).toBe('2026-11-14T09:02:00.000Z')
  })

  it('skips a pending step but does not finish the protocol', () => {
    let protocol = advanceProtocol(freshProtocol(), { type: 'start', at: '2026-11-14T09:00:00.000Z' })
    protocol = advanceProtocol(protocol, { type: 'skipStep', stepIndex: 0, at: '2026-11-14T09:02:00.000Z' })
    expect(protocol.steps[0].state).toBe('skipped')
    expect(protocol.status).toBe('inProgress')
  })

  it('aborts an in progress protocol and ignores later commands', () => {
    let protocol = advanceProtocol(freshProtocol(), { type: 'start', at: '2026-11-14T09:00:00.000Z' })
    protocol = advanceProtocol(protocol, { type: 'abort', at: '2026-11-14T09:03:00.000Z' })
    expect(protocol.status).toBe('aborted')
    const after = advanceProtocol(protocol, { type: 'completeStep', stepIndex: 0, at: '2026-11-14T09:04:00.000Z' })
    expect(after.steps[0].state).toBe('pending')
    expect(after.status).toBe('aborted')
  })
})
