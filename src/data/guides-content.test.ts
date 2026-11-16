import { describe, expect, it } from 'vitest';
import type { Guide } from './guides';
import { guides, ISS_KIT_SOURCE, visualGuides } from './guides';
import guideContentDoc from '../../docs/guide-content-sources.md?raw';

const techniqueCheckedAt = '2026-11-15';
const preservedCheckedAt = '2026-11-14';

const expectedGuideKeys = [
  'pulse',
  'systolic',
  'diastolic',
  'respiration',
  'spo2',
  'temperature',
  'glucose',
  'sleep',
  'mood',
  'consciousness',
  'oxygen',
  'reaction',
  'calcium',
  'sodium',
  'potassium',
  'exercise',
] as const;

const dailyGroups = ['pulse', 'systolic', 'respiration', 'spo2', 'temperature', 'glucose', 'sleep', 'mood'] as const;

const requiredPublicFields: (keyof Guide)[] = ['instrument', 'kit', 'why', 'hazards', 'steps', 'source', 'validation'];
const publicFields: (keyof Guide)[] = [...requiredPublicFields, 'kitNote', 'sourceScope'];

const visualStepDetails = {
  pulse: [
    'Support your opposite wrist with the palm facing up.',
    'Use your index and middle fingertips below the thumb base. Press gently until you feel the pulse.',
    'Count the beats for 60 seconds. That count is your pulse in beats per minute.',
  ],
  temperature: [
    'Use a clean digital thermometer intended for oral measurement.',
    'Place the probe under your tongue and close your mouth. Breathe through your nose.',
    'Hold it in place until the device signals completion, following its instructions. Read and record the temperature.',
  ],
  spo2: [
    'Keep the hand relaxed and use a bare, warm fingertip.',
    'Place the oximeter on your fingertip as its manufacturer directs.',
    'Remain still. Record the reading when the device numbers settle, along with date and time.',
  ],
} as const;

const nonVisualIds = ['systolic', 'diastolic', 'respiration', 'glucose', 'sleep', 'mood', 'consciousness', 'exercise'] as const;

const expectedNonVisualSteps: Record<(typeof nonVisualIds)[number], string[]> = {
  systolic: [
    'Rest for at least 5 minutes. Avoid food, caffeine and exercise in the 30 minutes before.',
    'Sit with your back supported and your legs uncrossed.',
    'Support your arm at heart level. Wrap the cuff snugly on bare skin, its lower edge 2.5 cm above the elbow crease.',
    'Stay still and silent. Take 2 or 3 readings about 1 minute apart and record each with its time.',
  ],
  diastolic: ['Take it with the systolic reading, from the same measurement.', 'Record the lower of the two numbers.'],
  respiration: [
    'Sit quietly and relax for a few minutes.',
    'Count breaths for 60 seconds by watching the chest rise and fall.',
    'A crewmate counting is more accurate. It is hard to count your own breaths without changing them.',
  ],
  glucose: [
    'Wash your hands with soap and warm water, then dry them well.',
    'Prick a fingertip with the lancet.',
    'Place a small drop of blood on the test strip and put the strip in the meter, as its instructions say.',
    'Read the result after a few seconds and record it.',
  ],
  sleep: ['Note the time you fell asleep and woke up.', 'Record the hours slept since your last check-in.'],
  mood: ['Take a moment before answering.', 'Rate how you feel today from 1, very low, to 5, very good.'],
  consciousness: ['Alert: awake, oriented, responding normally.', 'If a crewmate seems confused or drowsy, record what you see.'],
  exercise: ['Record the minutes of resistance and aerobic exercise completed today.'],
};

describe('guide content contract', () => {
  it('distinguishes the fingerstick technique and short reaction demo from other measurement protocols', () => {
    expect(guides.glucose?.sourceScope).toContain('Fingerstick meter technique only');
    expect(guides.reaction?.sourceScope).toContain('standard 10-minute PVT');
    expect(guides.reaction?.sourceScope).toContain('60-second demonstration');
  });
  it('keeps exactly the sixteen guide keys and covers all eight daily-check groups', () => {
    expect(Object.keys(guides).sort()).toEqual([...expectedGuideKeys].sort());
    for (const id of dailyGroups) expect(guides[id], id).toBeDefined();
    // Every reading a body system shows has a guide, so "How to measure" is never empty.
    expect(guides.oxygen?.validation).toBe('cited');
    expect(guides.reaction?.validation).toBe('cited');
  });

  it('keeps the public Guide fields and adds no whySource field', () => {
    const allowed = new Set<string>(publicFields);
    for (const id of expectedGuideKeys) {
      const guide = guides[id];
      if (!guide) throw new Error(`Missing guide: ${id}`);
      for (const field of requiredPublicFields) expect(guide, id).toHaveProperty(field);
      if (!guide.kit) expect(guide.kitNote, id).toBeTruthy();
      for (const key of Object.keys(guide)) expect(allowed.has(key), `${id}.${key}`).toBe(true);
      expect(Object.keys(guide), id).not.toContain('whySource');
    }
  });

  it('keeps self-report readings source-free and neutral, not clinical', () => {
    for (const id of ['sleep', 'mood', 'exercise'] as const) {
      const guide = guides[id];
      if (!guide) throw new Error(`Missing guide: ${id}`);
      expect(guide.validation, id).toBe('self-report');
      expect(guide.source, id).toBeNull();
      expect(guide.why, id).toMatch(/personal/i);
      expect(guide.why, id).toMatch(/own record/i);
      expect(guide.why, id).toMatch(/not a validated clinical assessment/i);
      expect(guide.why, id).not.toMatch(/linked hazards prove|validated clinical technique|clinical assessment shows/i);
    }
  });
});

describe('guide technique provenance', () => {
  it('keeps the illustrated steps unchanged and wired into the guides', () => {
    for (const id of ['pulse', 'temperature', 'spo2'] as const) {
      const visual = visualGuides[id];
      expect(visual.steps.map((step) => step.detail), id).toEqual([...visualStepDetails[id]]);
      expect(guides[id]!.steps, id).toEqual([visual.preparation, ...visualStepDetails[id]]);
    }
  });

  it('keeps non-visual technique steps unchanged, except the BP postural wording', () => {
    for (const id of nonVisualIds) expect(guides[id]!.steps, id).toEqual(expectedNonVisualSteps[id]);
    expect(guides.systolic!.steps.join(' ')).not.toMatch(/restrained/i);
    expect(guides.systolic!.steps[1]).toBe('Sit with your back supported and your legs uncrossed.');
  });

  it('treats pulse as a manual fingertip method with no dedicated kit item', () => {
    const pulse = guides.pulse!;
    expect(pulse.kit).toBeNull();
    expect(pulse.kitNote).toMatch(/2015/i);
    expect(pulse.kitNote).toMatch(/does not document/i);
    expect(pulse.kitNote).not.toMatch(/not (on|aboard) (the )?ISS/i);
    expect(pulse.instrument).toMatch(/fingers?/i);
    expect(pulse.instrument).toMatch(/timer/i);
    expect(pulse.instrument).not.toMatch(/oximeter/i);
    const steps = pulse.steps.join(' ');
    expect(steps).toMatch(/index and middle fingertips/i);
    expect(steps).toMatch(/60 seconds/i);
    expect(steps).toMatch(/10 minutes/i);
    expect(pulse.source!.url).toBe('https://medlineplus.gov/ency/article/003399.htm');
  });

  it('keeps the literal oximeter kit entry and makes the SpO2 link editorial, not NASA procedure', () => {
    const spo2 = guides.spo2!;
    expect(spo2.kit).toEqual({ item: 'Blood Oximeter', pack: 'Medical Diagnostic Pack', colour: 'blue', slot: 'B1' });
    expect(spo2.why).toMatch(/historical 2015/i);
    expect(spo2.why).toMatch(/editorial inference/i);
    expect(spo2.why).toMatch(/not a NASA-documented procedure or precision claim/i);
    expect(spo2.why).not.toMatch(/2015 inventory is current/i);
    expect(spo2.why).not.toMatch(/NASA[- ](approved|endorsed|classified|validated)/i);
    expect(spo2.source!.url).toBe('https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics');
  });

  it('removes unsupported spaceflight causes from measurement why copy', () => {
    expect(guides.pulse!.why).not.toMatch(/fluid shift|poor sleep|dehydration or illness/i);
    expect(guides.systolic!.why).not.toMatch(/gravity|landing|fluid/i);
    expect(guides.respiration!.why).not.toMatch(/first vital/i);
    expect(guides.temperature!.why).not.toMatch(/immune response|in flight/i);
    expect(guides.glucose!.why).not.toMatch(/reduced activity|sleep/i);
  });

  it('updates only the re-verified technique source dates', () => {
    for (const id of ['pulse', 'systolic', 'diastolic', 'respiration', 'spo2', 'temperature', 'consciousness'] as const) {
      expect(guides[id]!.source!.checkedAt, id).toBe(techniqueCheckedAt);
    }
    expect(guides.glucose!.source!.checkedAt).toBe(preservedCheckedAt);
    expect(ISS_KIT_SOURCE.checkedAt).toBe(preservedCheckedAt);
    for (const id of ['pulse', 'temperature', 'spo2'] as const) {
      expect(visualGuides[id].source.checkedAt, id).toBe(techniqueCheckedAt);
    }
  });
});

describe('guide content documentation', () => {
  it('records URL and section provenance, the editorial caveat, and the CDC limit honestly', () => {
    const urls = [
      'https://medlineplus.gov/ency/article/003399.htm',
      'https://medlineplus.gov/ency/article/007490.htm',
      'https://medlineplus.gov/ency/article/003400.htm',
      'https://my.clevelandclinic.org/health/articles/10881-vital-signs',
      'https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics',
      'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/',
      'https://www.cdc.gov/diabetes/diabetes-testing/monitoring-blood-sugar.html',
      'https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
    ];
    for (const url of urls) expect(guideContentDoc, url).toContain(url);

    for (const section of [
      'How the Test is Performed',
      'How to Prepare for the Test',
      'How do I check my respiratory rate?',
      'Using a pulse oximeter',
    ]) {
      expect(guideContentDoc, section).toContain(section);
    }

    expect(guideContentDoc).toMatch(/editorial inference/i);
    expect(guideContentDoc).toMatch(/not a NASA-documented procedure/i);
    expect(guideContentDoc).not.toMatch(/NASA[- ](approved|endorsed|classified|validated)/i);
    expect(guideContentDoc).toMatch(/HRP risks 99 .* 100/i);
    expect(guideContentDoc).toMatch(/403/);
    expect(guideContentDoc).toContain(preservedCheckedAt);
    expect(guideContentDoc).toContain(techniqueCheckedAt);
    expect(guideContentDoc.trim().split(/\r?\n/).length).toBeLessThanOrEqual(60);
  });
});
