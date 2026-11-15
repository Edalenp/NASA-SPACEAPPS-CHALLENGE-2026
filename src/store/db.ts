import Dexie, { type Table } from 'dexie'
import type {
  ConsciousnessObservation,
  CrewMember,
  Environment,
  IndicatorType,
  Measurement,
} from '../engine'
import type { IndicatorId, ReadingValue } from '../data/indicators'

/** Compatibility records for the monitoring console, including categorical readings. */
export interface ConsoleEntry {
  crewMemberId?: string
  id?: number
  indicator: IndicatorId
  value: ReadingValue
  timestamp: string
}

export class VitruvioDB extends Dexie {
  measurements!: Table<Measurement, string>
  observations!: Table<ConsciousnessObservation, string>
  crewMembers!: Table<CrewMember, string>
  environments!: Table<Environment, string>
  entries!: Table<ConsoleEntry, number>

  constructor(name = 'vitruvio') {
    super(name)
    this.version(1).stores({
      entries: '++id,indicator,timestamp',
      measurements: 'id, crewMemberId, source, [crewMemberId+type+measuredAt]',
      observations: 'id, crewMemberId, observedAt, source',
      crewMembers: 'id',
      environments: 'id',
    })
    // Both branches previously called their different schemas version 1.
    // Dexie compares the installed stores during upgrade; retain both record types.
    this.version(2).stores({
      measurements: 'id, crewMemberId, source, [crewMemberId+type+measuredAt]',
      observations: 'id, crewMemberId, observedAt, source',
      crewMembers: 'id',
      environments: 'id',
      entries: '++id,indicator,timestamp',
    })
  }
}

export const db = new VitruvioDB()
export const newId = (): string => crypto.randomUUID()


export function saveMeasurement(m: Measurement): Promise<string> {
  return db.measurements.put(m)
}


export function saveMeasurements(ms: Measurement[]): Promise<string> {
  return db.measurements.bulkPut(ms)
}


export function getSeries(
  crewMemberId: string,
  type: IndicatorType,
  from = '',
  to = '\uffff',
): Promise<Measurement[]> {
  return db.measurements
    .where('[crewMemberId+type+measuredAt]')
    .between([crewMemberId, type, from], [crewMemberId, type, to], true, true)
    .toArray()
}

export async function getLatestByType(
  crewMemberId: string,
): Promise<Partial<Record<IndicatorType, Measurement>>> {
  const all = await db.measurements
    .where('crewMemberId')
    .equals(crewMemberId)
    .toArray()
  const latest: Partial<Record<IndicatorType, Measurement>> = {}
  for (const m of all) {
    const prev = latest[m.type]
    if (!prev || m.measuredAt > prev.measuredAt) latest[m.type] = m
  }
  return latest
}


export function saveObservation(o: ConsciousnessObservation): Promise<string> {
  return db.observations.put(o)
}

export async function getLatestObservation(
  crewMemberId: string,
): Promise<ConsciousnessObservation | undefined> {
  const list = await db.observations
    .where('crewMemberId')
    .equals(crewMemberId)
    .sortBy('observedAt')
  return list[list.length - 1]
}


export const saveCrewMember = (c: CrewMember) => db.crewMembers.put(c)
export const saveEnvironment = (e: Environment) => db.environments.put(e)
export const getCrewMember = (id: string) => db.crewMembers.get(id)
export const getEnvironment = (id: string) => db.environments.get(id)


export async function clearSimulated(): Promise<void> {
  await db.measurements.where('source').equals('simulator').delete()
  await db.observations.where('source').equals('simulator').delete()
}


export async function clearAll(): Promise<void> {
  await Promise.all([
    db.measurements.clear(),
    db.observations.clear(),
    db.crewMembers.clear(),
    db.environments.clear(),
    db.entries.clear(),
  ])
}

