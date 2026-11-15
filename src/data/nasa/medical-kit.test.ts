import { afterEach, describe, expect, it, vi } from 'vitest'
import medicalKitData from './medical-kit.json'
import { getMedicalKit } from './reference'
import type { MedicalKitGroupId } from './reference-types'

const DOCUMENT = {
  id: 'MED CL/SpX-6 - ALL/FIN/T', revision: '09 APR 15', fileName: '3.001_M_26501.doc',
  sourcePage: 9, table: 'Table 5. Medical Diagnostic Pack (Blue)',
  pack: 'Medical Diagnostic Pack', packColor: 'Blue', versionDate: '2015-04-09',
  historical: true, notCurrentInventory: true,
}
const SOURCE = {
  url: 'https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
  pdfPageCount: 27, verificationDate: '2026-11-14',
}
const POLICY = {
  diagnosticItemsOnly: true, excludesMedications: true,
  excludesDoses: true, excludesOperationalInstructions: true,
}
const ITEMS = [
  ['blood-oximeter', 'Blood Oximeter', 'B1', 'Blood Oximeter 1 B1'],
  ['blood-pressure-cuff-large', 'Blood Pressure Cuff - Large', 'B2', 'Blood Pressure Cuff - Large 1 B2'],
  ['blood-pressure-cuff-small', 'Blood Pressure Cuff - Small', 'B2', 'Blood Pressure Cuff - Small 1 B2'],
  ['blood-pressure-monitor', 'Blood Pressure Monitor', 'B4', 'Blood Pressure Monitor 1 B4'],
  ['stethoscope', 'Stethoscope', 'B1', 'Stethoscope 1 B1'],
  ['thermometer', 'Thermometer', 'B3', 'Thermometer 1 B3'],
] as const
const GROUPS = [
  ['blood-pressure', 'Blood pressure (systolic and diastolic)', 'documented', ['blood-pressure-cuff-large', 'blood-pressure-cuff-small', 'blood-pressure-monitor']],
  ['temperature', 'Temperature', 'documented', ['thermometer']],
  ['spo2', 'Peripheral oxygen saturation', 'inferred-editorial', ['blood-oximeter']],
  ['heart-rate', 'Heart rate', 'not-documented', []],
  ['glucose', 'Glucose', 'not-documented', []],
  ['sleep', 'Sleep', 'not-documented', []],
  ['mood', 'Mood', 'not-documented', []],
  ['respiratory-rate', 'Respiratory rate', 'not-documented', []],
] as const
const UNDOCUMENTED_ID_SET = new Set<string>(GROUPS.slice(3).map(([id]) => id))
const FORBIDDEN_CONTENT =
  /medication|dosage|dose|tablet|capsule|vial|syringe|inject|intravenous|oral|topical|side effect|strength|route|prescription|treatment|therapy|drug|administer|swallow|bacitracin|oxymetazoline|ibuprofen|modafinil|atropine|acetazolamide|fluconazole|diphenhydramine|aripiprazole|metoprolol|meclizine|omeprazole|benzocaine|ertapenem|fluticasone|cyclopentolate|hydromorphone|silver nitrate/i
const DOSE_UNIT = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|units?)\b/i

type MutableItem = { id: string; itemName: string; quote: string; [key: string]: unknown }
type MutableGroup = {
  id: string
  label: string
  status: string
  items: string[]
  inferenceNote?: string
  note?: string
  [key: string]: unknown
}
type MutableKit = {
  datasetId: string; title: string; document: Record<string, unknown>
  source: Record<string, unknown>; contentPolicy: Record<string, unknown>
  items: MutableItem[]; groups: MutableGroup[]
  optionalReactionTest: Record<string, unknown> & { reason: string }
}

function cloneKit(): MutableKit {
  return structuredClone(medicalKitData) as unknown as MutableKit
}

async function expectInvalid(kit: MutableKit, message: RegExp): Promise<void> {
  vi.resetModules()
  vi.doMock('./medical-kit.json', () => ({ default: kit }))
  await expect(import('./reference')).rejects.toThrow(message)
}

afterEach(() => {
  vi.doUnmock('./medical-kit.json')
  vi.resetModules()
})

describe('medical kit document metadata', () => {
  it('pins the historical 2015 document and its Blue diagnostic pack', () => {
    const kit = getMedicalKit()

    expect(kit.datasetId).toBe('iss-medical-kit-2015')
    expect(kit.title).toBe('ISS Medical Kit - Medical Diagnostic Pack (Blue), 2015 historical reference')
    expect(kit.document).toEqual(DOCUMENT)
    expect(kit.source).toEqual(SOURCE)
    expect(kit.contentPolicy).toEqual(POLICY)
    expect(kit.optionalReactionTest.included).toBe(false)
    expect(kit.optionalReactionTest.reason).toContain('outside the eight reference groups')
  })

  it('does not invent current-inventory or download metadata', () => {
    const kit = getMedicalKit()

    expect(Object.keys(kit)).toEqual([
      'datasetId', 'title', 'document', 'source', 'contentPolicy', 'items', 'groups', 'optionalReactionTest',
    ])
    expect(JSON.stringify(kit)).not.toMatch(/downloadedAt|scriptPath/)
  })
})

describe('literal page 9 hardware items', () => {
  it('contains exactly the six reviewed items with literal quotes', () => {
    const kit = getMedicalKit()
    const actual = kit.items.map(({ id, itemName, location, quote }) => [id, itemName, location, quote])

    expect(actual).toEqual(ITEMS.map((row) => [...row]))
  })

  it('keeps every item on page 9, table 5, Blue pack', () => {
    for (const item of getMedicalKit().items) {
      expect([item.quantity, item.pack, item.packColor, item.table, item.sourcePage]).toEqual([
        '1', 'Medical Diagnostic Pack', 'Blue', 'Table 5. Medical Diagnostic Pack (Blue)', 9,
      ])
      expect(item.quote).toContain(item.itemName)
      expect(item.quote).toContain(item.location)
    }
  })

  it('contains no medication names, dose units, routes, or instructions', () => {
    const content = JSON.stringify({
      items: getMedicalKit().items,
      groups: getMedicalKit().groups,
    }).toLowerCase()

    expect(content).not.toMatch(FORBIDDEN_CONTENT)
    expect(content).not.toMatch(DOSE_UNIT)
  })
})

describe('eight reference groups', () => {
  it('exposes the exact group ids, labels, statuses, and item mappings', () => {
    const actual = getMedicalKit().groups.map(({ id, label, status, items }) => [id, label, status, items])

    expect(actual).toEqual(GROUPS.map((row) => [...row]))
  })

  it('documents only blood pressure and temperature', () => {
    const documented = getMedicalKit().groups.filter((group) => group.status === 'documented')

    expect(documented.map((group) => [group.id, group.items])).toEqual([
      ['blood-pressure', ['blood-pressure-cuff-large', 'blood-pressure-cuff-small', 'blood-pressure-monitor']],
      ['temperature', ['thermometer']],
    ])
  })

  it('marks the SpO2 link as an editorial inference', () => {
    const spo2 = getMedicalKit().groups.find((group) => group.id === 'spo2')

    expect(spo2?.items).toEqual(['blood-oximeter'])
    expect(spo2?.inferenceNote).toContain('editorial')
    expect(spo2?.inferenceNote).toContain('not a NASA claim')
  })

  it('keeps the five undocumented groups empty without fake packs', () => {
    const undocumented = getMedicalKit().groups.filter((group) => UNDOCUMENTED_ID_SET.has(group.id))

    expect(undocumented.map((group) => group.id)).toEqual([
      'heart-rate', 'glucose', 'sleep', 'mood', 'respiratory-rate',
    ])
    for (const group of undocumented) {
      expect(group.items).toEqual([])
      expect(group.note).toContain('does not document')
      expect(group.note).toContain('not a claim')
      for (const field of ['pack', 'packColor', 'location', 'quote', 'sourcePage']) {
        expect(Object.hasOwn(group, field), `${group.id}.${field}`).toBe(false)
      }
    }
  })

  it('records the stethoscope without mapping it to a measurement group', () => {
    const kit = getMedicalKit()
    const referenced = kit.groups.flatMap((group) => group.items)

    expect(kit.items.find((item) => item.id === 'stethoscope')?.quote).toBe('Stethoscope 1 B1')
    expect(referenced).toHaveLength(5)
    expect(new Set(referenced).size).toBe(5)
    expect(referenced).not.toContain('stethoscope')
  })

  it('resolves every documented group item to a real item id', () => {
    const kit = getMedicalKit()
    const itemIds = new Set(kit.items.map((item) => item.id))

    for (const group of kit.groups) {
      for (const itemId of group.items) {
        expect(itemIds.has(itemId), `${group.id}.${itemId}`).toBe(true)
      }
    }
  })
})

describe('getMedicalKit isolation', () => {
  it('returns independent deep copies on every call', () => {
    const first = getMedicalKit()
    const second = getMedicalKit()

    expect(first).not.toBe(second)
    expect(first.document).not.toBe(second.document)
    expect(first.source).not.toBe(second.source)
    expect(first.items).not.toBe(second.items)
    expect(first.items[0]).not.toBe(second.items[0])
    expect(first.groups).not.toBe(second.groups)
    expect(first.groups[0]).not.toBe(second.groups[0])
    expect(first.groups[0]?.items).not.toBe(second.groups[0]?.items)
    expect(first.optionalReactionTest).not.toBe(second.optionalReactionTest)
  })

  it('does not let nested mutations corrupt the shared dataset', () => {
    const before = getMedicalKit()
    const mutated = getMedicalKit()

    mutated.title = 'mutated'
    mutated.document.id = 'mutated'
    mutated.source.url = 'https://example.invalid/source.pdf'
    mutated.items[0].itemName = 'Mutated Item'
    mutated.items.push({ ...mutated.items[0], id: 'mutated-item' })
    mutated.groups[0].label = 'Mutated Group'
    mutated.groups[0].items.push('mutated-item')
    mutated.groups[2].inferenceNote = 'mutated'
    mutated.groups[3].note = 'mutated'
    mutated.optionalReactionTest.reason = 'mutated'

    expect(getMedicalKit()).toEqual(before)
  })
})

const INVALID_CASES: Array<[string, (kit: MutableKit) => void, RegExp]> = [
  ['duplicate item ids', (kit) => { kit.items[1].id = kit.items[0].id }, /items\[1\]\.id: duplicate item id/],
  ['an undocumented group with an item', (kit) => { kit.groups[3].items = ['thermometer'] }, /groups\[3\]\.items/],
  ['an inferred-editorial group without its note', (kit) => { delete kit.groups[2].inferenceNote }, /groups\[2\].*inferenceNote/],
  ['an unknown group status', (kit) => { kit.groups[0].status = 'fake-status' }, /groups\[0\]\.status/],
  ['an empty item quote', (kit) => { kit.items[0].quote = '' }, /items\[0\]\.quote/],
  ['an unknown group item reference', (kit) => { kit.groups[1].items = ['missing-item'] }, /groups\[1\]\.items\[0\]/],
  ['a fake pack field', (kit) => { kit.groups[3].pack = 'Fake Pack' }, /groups\[3\].*pack/],
  ['missing document provenance', (kit) => { delete kit.document.revision }, /document.*revision/],
]

describe('runtime validation', () => {
  it.each(INVALID_CASES)('rejects %s', async (_name, mutate, message) => {
    const kit = cloneKit()
    mutate(kit)
    await expectInvalid(kit, message)
  })
})

describe('type surface', () => {
  it('uses the declared group ids', () => {
    const ids: MedicalKitGroupId[] = getMedicalKit().groups.map((group) => group.id)

    expect(ids).toHaveLength(8)
  })
})
