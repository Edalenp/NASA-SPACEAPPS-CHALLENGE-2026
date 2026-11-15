import { describe, expect, it } from 'vitest';
import * as healthActions from './health-actions';
import { HEALTH_ACTION_REVIEW_MATRIX, HEALTH_ACTION_SCOPE, HEALTH_ACTION_SOURCES, HEALTH_ACTION_STATUS, type HealthActionGroupId, type HealthActionState } from './health-actions';
import healthActionsSource from './health-actions.ts?raw';
import healthActionsDoc from '../../docs/health-actions-sources.md?raw';
const groups = ['pulse', 'blood-pressure', 'respiration', 'spo2', 'temperature', 'glucose', 'sleep', 'mood'] as const satisfies readonly HealthActionGroupId[];
const states = ['attention', 'alert'] as const satisfies readonly HealthActionState[];
const guideKeys = ['pulse', 'systolic', 'diastolic', 'respiration', 'spo2', 'temperature', 'glucose', 'sleep', 'mood'] as const;
const allowedHosts = new Set(['medlineplus.gov', 'my.clevelandclinic.org', 'www.fda.gov', 'www.nhlbi.nih.gov', 'www.nimh.nih.gov']);
const bannedAction = /emergency|evacuat|triage|diagnos|urgent|immediate|\bCPR\b|physical therapy|medication|\bdose\b|\bmg\b|\bmcg\b|\bml\b|\bibuprofen\b|\bparacetamol\b|\bacetaminophen\b|\baspirin\b|NEWS2|RCP|ZoneState|wait for Earth|normal|high|low|\d/i;
const expectedSummaries: Record<string, string> = {
  pulse: "Supports professional advice when a resting pulse stays above a person's usual range.",
  'blood-pressure': "Supports comparing home blood-pressure readings with readings taken at a provider's office before drawing conclusions.",
  respiration: 'General vital-sign guidance that supports seeking professional advice when a vital-sign concern arises.',
  spo2: 'Supports professional follow-up when a person is worried about an oximeter reading or feels unwell or worse.',
  temperature: 'Supports taking unusually high or low body temperature seriously and seeking provider advice.',
  glucose: 'Supports discussing blood glucose results with a provider rather than interpreting them alone.',
  sleep: 'Supports professional advice when insufficient sleep starts affecting daytime activities.',
  mood: 'Supports contacting a primary care professional when mental-health concerns arise.',
};
describe('health action content', () => {
  it('covers exactly 8 groups x 2 states and the 9 mandatory guide keys', () => {
    expect(Object.keys(HEALTH_ACTION_REVIEW_MATRIX).sort()).toEqual([...groups].sort());
    const covered = new Set<string>();
    let entries = 0;
    for (const id of groups) {
      const group = HEALTH_ACTION_REVIEW_MATRIX[id];
      expect(group.id, id).toBe(id);
      for (const state of states) {
        expect(group[state].text.length, `${id}.${state}`).toBeGreaterThan(0);
        expect(group[state].sourceIds.length, `${id}.${state}`).toBeGreaterThan(0);
        entries++;
      }
      for (const guideId of group.guideIds) covered.add(guideId);
    }
    expect(entries).toBe(16);
    expect([...covered].sort()).toEqual([...guideKeys].sort());
    expect(HEALTH_ACTION_REVIEW_MATRIX).not.toHaveProperty('normal');
    expect(HEALTH_ACTION_REVIEW_MATRIX).not.toHaveProperty('oxygen');
    expect(HEALTH_ACTION_REVIEW_MATRIX).not.toHaveProperty('reaction');
  });
  it('registers the 8 verified sources with allowed hosts, dates and original summaries', () => {
    expect(HEALTH_ACTION_SOURCES).toHaveLength(8);
    const ids = new Set(HEALTH_ACTION_SOURCES.map((source) => source.id));
    expect(ids.size).toBe(8);
    for (const source of HEALTH_ACTION_SOURCES) {
      expect(Object.keys(source).sort()).toEqual(['checkedAt', 'id', 'scopeNote', 'section', 'supportSummary', 'title', 'url']);
      expect(source.checkedAt).toBe('2026-11-15');
      expect(Number.isNaN(Date.parse(source.checkedAt))).toBe(false);
      expect(source.supportSummary).toBe(expectedSummaries[source.id]);
      expect(source.supportSummary.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
      const url = new URL(source.url);
      expect(url.protocol).toBe('https:');
      expect(allowedHosts.has(url.hostname), source.url).toBe(true);
    }
    for (const id of groups) expect(ids.has(id), id).toBe(true);
  });
  it('resolves unique source references and uses the declared group/review fields', () => {
    const sourceIds = new Set(HEALTH_ACTION_SOURCES.map((source) => source.id));
    for (const id of groups) {
      const group = HEALTH_ACTION_REVIEW_MATRIX[id];
      expect(Object.keys(group).sort()).toEqual(['alert', 'attention', 'guideIds', 'id', 'kind']);
      expect(group.kind).toBe(id === 'sleep' || id === 'mood' ? 'self-report' : 'measurement');
      for (const state of states) {
        const entry = group[state];
        expect(Object.keys(entry).sort()).toEqual(['sourceIds', 'text']);
        expect(new Set(entry.sourceIds).size).toBe(entry.sourceIds.length);
        for (const ref of entry.sourceIds) expect(sourceIds.has(ref), `${id}.${state}:${ref}`).toBe(true);
        expect(entry.sourceIds).toContain(id);
      }
    }
  });
  it('declares draft status, editorial translation and non-operational limits', () => {
    expect(HEALTH_ACTION_STATUS).toBe('draft-for-medical-review');
    expect(HEALTH_ACTION_SCOPE).toMatchObject({ draftForMedicalReview: true, notNasaProcedure: true, notClinicalValidation: true, notAutomaticUse: true, medicalReviewRequired: true, noNasaAssignment: true, noEmergencyEquivalence: true, noOperationalUseWithoutClearance: true, sourceUse: 'source-links-and-original-summaries' });
    expect(HEALTH_ACTION_SCOPE.editorialProviderTranslation.from).toEqual(['provider', 'doctor']);
    expect(HEALTH_ACTION_SCOPE.editorialProviderTranslation.to).toBe('onboard medical officer');
    expect(HEALTH_ACTION_SCOPE.editorialProviderTranslation.isNasaGuidance).toBe(false);
    expect(HEALTH_ACTION_SCOPE.editorialProviderTranslation.note).toMatch(/editorial/i);
    expect(HEALTH_ACTION_SCOPE.editorialProviderTranslation.note).toMatch(/not NASA/i);
    expect(HEALTH_ACTION_SCOPE.note).toMatch(/not a NASA procedure/i);
    expect(HEALTH_ACTION_SCOPE.note).toMatch(/medical professional/i);
    expect(HEALTH_ACTION_SCOPE.note).toMatch(/ISS medical-device recommendation/i);
  });
  it('keeps all 16 actions conservative, review-only and free of clinical rules', () => {
    for (const id of groups) {
      for (const state of states) {
        const text = HEALTH_ACTION_REVIEW_MATRIX[id][state].text;
        expect(text, `${id}.${state}`).toMatch(/onboard medical officer/i);
        expect(text, `${id}.${state}`).toMatch(/review/i);
        expect(text, `${id}.${state}`).not.toMatch(bannedAction);
      }
    }
    expect(JSON.stringify(healthActions)).not.toMatch(/NASA[- ]approved/i);
  });
  it('keeps glucose non-equivalent and sleep/mood self-report, not NEWS2', () => {
    const glucose = HEALTH_ACTION_SOURCES.find((source) => source.id === 'glucose')!;
    expect(glucose.scopeNote).toMatch(/not make high and low glucose equivalent/i);
    expect(glucose.scopeNote).toMatch(/normal range/i);
    for (const id of ['sleep', 'mood'] as const) {
      expect(HEALTH_ACTION_REVIEW_MATRIX[id].kind).toBe('self-report');
      const source = HEALTH_ACTION_SOURCES.find((entry) => entry.id === id)!;
      expect(source.scopeNote).toMatch(/self-report.*not a validated clinical measurement.*NEWS2/i);
    }
  });
  it('documents citations, summaries and permission limits within 60 lines', () => {
    for (const source of HEALTH_ACTION_SOURCES) {
      expect(healthActionsDoc).toContain(source.url);
      expect(healthActionsDoc).toContain(source.title);
      expect(healthActionsDoc).toContain(source.checkedAt);
      expect(healthActionsDoc).toContain(source.section);
      expect(healthActionsDoc).toContain(source.supportSummary);
    }
    expect(healthActionsDoc).toMatch(/A\.D\.A\.M\./);
    expect(healthActionsDoc).toMatch(/permission/i);
    expect(healthActionsDoc).toMatch(/not public domain/i);
    expect(healthActionsDoc.trim().split(/\r?\n/).length).toBeLessThanOrEqual(60);
  });
  it('does not misattribute the glucose Medical Test page to A.D.A.M. Medical Encyclopedia', () => {
    // Verified 2026-11-15 against the live pages: /ency/ articles carry the
    // "© A.D.A.M., a business unit of Ebix" footer; /lab-tests/blood-glucose-test/
    // is a MedlinePlus Medical Test page (NLM) with no A.D.A.M. attribution.
    const glucose = HEALTH_ACTION_SOURCES.find((source) => source.id === 'glucose')!;
    expect(glucose.url).toBe('https://medlineplus.gov/lab-tests/blood-glucose-test/');
    expect(glucose.scopeNote).not.toMatch(/Medical Encyclopedia/);
    expect(glucose.scopeNote).not.toMatch(/A\.D\.A\.M\./);
  });
  it('catches mutated missing citations and medication words', () => {
    const sourceIds = new Set<string>(HEALTH_ACTION_SOURCES.map((source) => source.id));
    const audit = (text: string, refs: readonly string[]) => ({
      missingRefs: refs.filter((ref) => !sourceIds.has(ref)),
      banned: bannedAction.test(text),
    });
    expect(audit(HEALTH_ACTION_REVIEW_MATRIX.glucose.alert.text, HEALTH_ACTION_REVIEW_MATRIX.glucose.alert.sourceIds)).toEqual({ missingRefs: [], banned: false });
    expect(audit('Take ibuprofen.', [])).toEqual({ missingRefs: [], banned: true });
    expect(audit(HEALTH_ACTION_REVIEW_MATRIX.glucose.alert.text, ['missing-source'])).toEqual({ missingRefs: ['missing-source'], banned: false });
  });
  it('is data-only with no production imports, functions or runtime bindings', () => {
    for (const value of Object.values(healthActions)) expect(typeof value).not.toBe('function');
    expect(healthActionsSource).not.toMatch(/^\s*import\b/m);
    expect(healthActionsSource).not.toMatch(/(^|\n)\s*(export\s+)?(async\s+)?function\b/);
    expect(healthActionsSource).not.toMatch(/\b(fetch|XMLHttpRequest|addEventListener|localStorage)\b/);
    expect(healthActionsSource).not.toMatch(/from\s+['"][^'"]*(engine|features|store|guides|indicators|protocols|report)/);
  });
  it('publishes links and original summaries, never quotation records', () => {
    for (const source of HEALTH_ACTION_SOURCES) {
      expect(source).not.toHaveProperty('quote');
      expect(Object.keys(source)).not.toContain('quote');
      expect(source.supportSummary).not.toMatch(/["“”]/);
    }
    expect(healthActionsSource).not.toMatch(/\bquote\b/i);
    expect(healthActionsDoc).not.toMatch(/\bquote\b/i);
    expect(healthActionsDoc).not.toMatch(/short quote/i);
  });
  it('keeps summaries source-specific rather than generic licence wording', () => {
    for (const source of HEALTH_ACTION_SOURCES) {
      expect(source.supportSummary, source.id).not.toMatch(/licen[cs]e|public domain|permission/i);
    }
    const bloodPressure = HEALTH_ACTION_SOURCES.find((source) => source.id === 'blood-pressure')!;
    expect(bloodPressure.supportSummary).toMatch(/home/i);
    expect(bloodPressure.supportSummary).toMatch(/office/i);
    expect(bloodPressure.supportSummary).toMatch(/compar/i);
    expect(bloodPressure.supportSummary).toMatch(/provider/i);
    const glucose = HEALTH_ACTION_SOURCES.find((source) => source.id === 'glucose')!;
    expect(glucose.supportSummary).toMatch(/discuss/i);
    expect(glucose.supportSummary).toMatch(/provider/i);
  });
});
