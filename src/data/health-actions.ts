/**
 * Draft, source-backed review content for the eight daily measurement groups.
 *
 * RF-18 handoff: this module is content only. UI and engine owners must integrate
 * and test it in a later block. It is not a NASA procedure, not clinical
 * validation and not automatic or operational use.
 */

export const HEALTH_ACTION_STATUS = 'draft-for-medical-review' as const;

export type HealthActionGroupId =
  | 'pulse'
  | 'blood-pressure'
  | 'respiration'
  | 'spo2'
  | 'temperature'
  | 'glucose'
  | 'sleep'
  | 'mood';

export type HealthActionState = 'attention' | 'alert';
export type HealthActionKind = 'measurement' | 'self-report';
export interface HealthActionSource {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly checkedAt: string;
  readonly section: string;
  readonly supportSummary: string;
  readonly scopeNote: string;
}
export interface HealthActionReview {
  readonly text: string;
  readonly sourceIds: readonly string[];
}
export interface HealthActionGroup {
  readonly id: HealthActionGroupId;
  readonly guideIds: readonly string[];
  readonly kind: HealthActionKind;
  readonly attention: HealthActionReview;
  readonly alert: HealthActionReview;
}
export interface HealthActionProviderTranslation {
  readonly from: readonly string[];
  readonly to: string;
  readonly isNasaGuidance: false;
  readonly note: string;
}

export interface HealthActionScope {
  readonly draftForMedicalReview: true;
  readonly notNasaProcedure: true;
  readonly notClinicalValidation: true;
  readonly notAutomaticUse: true;
  readonly medicalReviewRequired: true;
  readonly noNasaAssignment: true;
  readonly noEmergencyEquivalence: true;
  readonly noOperationalUseWithoutClearance: true;
  readonly sourceUse: 'source-links-and-original-summaries';
  readonly editorialProviderTranslation: HealthActionProviderTranslation;
  readonly note: string;
}

/** Public references only. They are not an ISS medical-device recommendation or current inventory. */
export const HEALTH_ACTION_SOURCES = [
  {
    id: 'pulse',
    title: 'MedlinePlus · Pulse',
    url: 'https://medlineplus.gov/ency/article/003399.htm',
    checkedAt: '2026-11-15',
    section: 'What Abnormal Results Mean',
    supportSummary: 'Supports professional advice when a resting pulse stays above a person\'s usual range.',
    scopeNote: 'MedlinePlus Medical Encyclopedia article (A.D.A.M. content). The summary describes a persistently high resting pulse and a prompt to seek provider advice; the review prompt is project editorial wording, not a triage rule. Link and original summary only; no third-party excerpt is reproduced.',
  },
  {
    id: 'blood-pressure',
    title: 'MedlinePlus · Blood pressure measurement',
    url: 'https://medlineplus.gov/ency/article/007490.htm',
    checkedAt: '2026-11-15',
    section: 'Considerations',
    supportSummary: 'Supports comparing home blood-pressure readings with readings taken at a provider\'s office before drawing conclusions.',
    scopeNote: 'MedlinePlus Medical Encyclopedia article (A.D.A.M. content). The summary describes comparing home readings with office readings; it sets no frequency or threshold. Link and original summary only; no third-party excerpt is reproduced.',
  },
  {
    id: 'respiration',
    title: 'Cleveland Clinic · Vital signs',
    url: 'https://my.clevelandclinic.org/health/diagnostics/10881-vital-signs',
    checkedAt: '2026-11-15',
    section: 'A note from Cleveland Clinic',
    supportSummary: 'General vital-sign guidance that supports seeking professional advice when a vital-sign concern arises.',
    scopeNote: 'Cleveland Clinic general vital-sign advice, not respiratory-specific. The summary is a concept-level pointer; no respiratory threshold is added. Link and original summary only; no third-party excerpt is reproduced.',
  },
  {
    id: 'spo2',
    title: 'FDA · Pulse Oximeter Basics',
    url: 'https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics',
    checkedAt: '2026-11-15',
    section: 'Using a pulse oximeter',
    supportSummary: 'Supports professional follow-up when a person is worried about an oximeter reading or feels unwell or worse.',
    scopeNote: 'U.S. FDA consumer update. The summary describes concern about a reading or serious or worsening symptoms; no numeric cutoff is added. Link and original summary only; no third-party excerpt is reproduced.',
  },
  {
    id: 'temperature',
    title: 'MedlinePlus · Temperature measurement',
    url: 'https://medlineplus.gov/ency/article/003400.htm',
    checkedAt: '2026-11-15',
    section: 'What Abnormal Results Mean',
    supportSummary: 'Supports taking unusually high or low body temperature seriously and seeking provider advice.',
    scopeNote: 'MedlinePlus Medical Encyclopedia article (A.D.A.M. content). The summary covers unusually high or low body temperature; no numeric cutoff is added. Link and original summary only; no third-party excerpt is reproduced.',
  },
  {
    id: 'glucose',
    title: 'MedlinePlus · Blood glucose test',
    url: 'https://medlineplus.gov/lab-tests/blood-glucose-test/',
    checkedAt: '2026-11-15',
    section: 'What do the results mean?',
    supportSummary: 'Supports discussing blood glucose results with a provider rather than interpreting them alone.',
    scopeNote: 'MedlinePlus Medical Test page (NLM). The summary supports discussing results with a provider; it does not make high and low glucose equivalent or define a normal range. Link and original summary only; no third-party excerpt is reproduced.',
  },
  {
    id: 'sleep',
    title: 'NHLBI · Insomnia diagnosis',
    url: 'https://www.nhlbi.nih.gov/health/insomnia/diagnosis',
    checkedAt: '2026-11-15',
    section: 'intro',
    supportSummary: 'Supports professional advice when insufficient sleep starts affecting daytime activities.',
    scopeNote: 'NHLBI insomnia diagnosis page. Self-report context; not a validated clinical measurement or NEWS2 score. Link and original summary only; no third-party excerpt is reproduced.',
  },
  {
    id: 'mood',
    title: 'NIMH · Caring for your mental health',
    url: 'https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health',
    checkedAt: '2026-11-15',
    section: 'How can I find help?',
    supportSummary: 'Supports contacting a primary care professional when mental-health concerns arise.',
    scopeNote: 'NIMH mental-health help page. Self-report context; not a validated clinical measurement or NEWS2 score. Link and original summary only; no third-party excerpt is reproduced.',
  },
] as const satisfies readonly HealthActionSource[];

/**
 * Attention and alert are app review labels, not official source grades.
 * Both states request review; neither declares an emergency or selects a treatment.
 */
export const HEALTH_ACTION_REVIEW_MATRIX = {
  pulse: {
    id: 'pulse',
    guideIds: ['pulse'],
    kind: 'measurement',
    attention: { text: 'Record the pulse reading and ask the onboard medical officer to review it with you.', sourceIds: ['pulse'] },
    alert: { text: 'Record the pulse reading and any symptoms or context you noted, then ask the onboard medical officer to review them.', sourceIds: ['pulse'] },
  },
  'blood-pressure': {
    id: 'blood-pressure',
    guideIds: ['systolic', 'diastolic'],
    kind: 'measurement',
    attention: { text: 'Record the blood pressure reading and ask the onboard medical officer to review it with you.', sourceIds: ['blood-pressure'] },
    alert: { text: 'Record the blood pressure reading and any symptoms or context you noted, then ask the onboard medical officer to review them.', sourceIds: ['blood-pressure'] },
  },
  respiration: {
    id: 'respiration',
    guideIds: ['respiration'],
    kind: 'measurement',
    attention: { text: 'Record the breathing rate and ask the onboard medical officer to review it with you.', sourceIds: ['respiration'] },
    alert: { text: 'Record the breathing rate and any symptoms or context you noted, then ask the onboard medical officer to review them.', sourceIds: ['respiration'] },
  },
  spo2: {
    id: 'spo2',
    guideIds: ['spo2'],
    kind: 'measurement',
    attention: { text: 'Record the oxygen saturation reading and ask the onboard medical officer to review it with you.', sourceIds: ['spo2'] },
    alert: { text: 'Record the oxygen saturation reading and any symptoms or context you noted, then ask the onboard medical officer to review them.', sourceIds: ['spo2'] },
  },
  temperature: {
    id: 'temperature',
    guideIds: ['temperature'],
    kind: 'measurement',
    attention: { text: 'Record the temperature and ask the onboard medical officer to review it with you.', sourceIds: ['temperature'] },
    alert: { text: 'Record the temperature and any symptoms or context you noted, then ask the onboard medical officer to review them.', sourceIds: ['temperature'] },
  },
  glucose: {
    id: 'glucose',
    guideIds: ['glucose'],
    kind: 'measurement',
    attention: { text: 'Record the glucose reading and ask the onboard medical officer to review it with you.', sourceIds: ['glucose'] },
    alert: { text: 'Record the glucose reading and any symptoms or context you noted, then ask the onboard medical officer to review them.', sourceIds: ['glucose'] },
  },
  sleep: {
    id: 'sleep',
    guideIds: ['sleep'],
    kind: 'self-report',
    attention: { text: 'Record your sleep log and ask the onboard medical officer to review it with you.', sourceIds: ['sleep'] },
    alert: { text: 'Record your sleep log and any concerns or context you noted, then ask the onboard medical officer to review them.', sourceIds: ['sleep'] },
  },
  mood: {
    id: 'mood',
    guideIds: ['mood'],
    kind: 'self-report',
    attention: { text: 'Record your mood rating and ask the onboard medical officer to review it with you.', sourceIds: ['mood'] },
    alert: { text: 'Record your mood rating and any concerns or context you noted, then ask the onboard medical officer to review them.', sourceIds: ['mood'] },
  },
} as const satisfies Readonly<Record<HealthActionGroupId, HealthActionGroup>>;

export const HEALTH_ACTION_SCOPE = {
  draftForMedicalReview: true,
  notNasaProcedure: true,
  notClinicalValidation: true,
  notAutomaticUse: true,
  medicalReviewRequired: true,
  noNasaAssignment: true,
  noEmergencyEquivalence: true,
  noOperationalUseWithoutClearance: true,
  sourceUse: 'source-links-and-original-summaries',
  editorialProviderTranslation: {
    from: ['provider', 'doctor'],
    to: 'onboard medical officer',
    isNasaGuidance: false,
    note: 'Editorial wording only: source pages discuss a provider or doctor, while app text says onboard medical officer. This is not NASA guidance or a NASA-assigned role.',
  },
  note: 'Draft content for a named medical professional to review the values and context. We link to public sources and publish our own brief summaries, not third-party page excerpts. It is not a NASA procedure, not clinical validation and not an automatic or operational action. Attention and alert are app review labels, not official source grades or emergency declarations. These sources are public references, not an ISS medical-device recommendation or current inventory.',
} as const satisfies HealthActionScope;
