import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { VitruvioDB } from './db'

describe('combined branch database migration', () => {
  it.each(['console', 'engine'])('retains existing %s version-1 data and opens both APIs', async (branch) => {
    const name = `migration-${branch}-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(1).stores(branch === 'console' ? { entries: '++id,indicator,timestamp' } : {
      measurements: 'id, crewMemberId, source, [crewMemberId+type+measuredAt]',
      observations: 'id, crewMemberId, observedAt, source', crewMembers: 'id', environments: 'id',
    })
    const entry = { indicator: 'pulse' as const, value: 84, timestamp: '2026-11-14T09:00:00Z' }
    const measurement = { id: 'preserved', crewMemberId: 'JL-02', type: 'heartRate', value: 84, unit: 'bpm', measuredAt: entry.timestamp, source: 'manual' }
    await old.table(branch === 'console' ? 'entries' : 'measurements').add(branch === 'console' ? entry : measurement)
    old.close()
    const combined = new VitruvioDB(name)
    try {
      await combined.open()
      expect(combined.tables.map(t => t.name).sort()).toEqual(['crewMembers', 'entries', 'environments', 'measurements', 'observations'])
      if (branch === 'console') expect(await combined.entries.toArray()).toEqual([expect.objectContaining(entry)])
      else expect(await combined.measurements.get('preserved')).toEqual(measurement)
      await combined.entries.add({ ...entry, id: undefined })
      await combined.measurements.put({ ...measurement, type: 'heartRate', unit: 'bpm', source: 'manual' })
      expect(await combined.measurements.count()).toBe(1)
    } finally { await combined.delete() }
  })
})


