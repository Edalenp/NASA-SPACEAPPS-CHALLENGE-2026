import type { IndicatorId } from './indicators';
import type { HazardId } from './nasa';

/**
 * Measurement guides, written with AI assistance. Technique steps are paraphrased from the public
 * source named on each guide; pack names and slots come from NASA's ISS medical kit checklist.
 * Onboard procedures and clinical review are still pending, so every guide carries its status.
 */
export interface GuideSource { title: string; url: string; checkedAt: string }
/** An ISS medical kit item, as named in the 2015 checklist (MED CL 3.001). */
export interface KitItem { item: string; pack: string; colour: string; slot: string }
/**
 * cited: technique paraphrased from a checked public source; onboard and clinical review pending.
 * self-report: the reading is the crew member's own record, so there is no technique to cite.
 * draft: no source yet; the guide card withholds its steps.
 */
export type GuideValidation = 'cited' | 'self-report' | 'draft';
export interface Guide {
  instrument: string;
  /** null when the instrument is not an ISS medical kit item; kitNote then says why. */
  kit: KitItem | null;
  kitNote?: string;
  why: string;
  /** NASA's five hazards of human spaceflight that bear on this reading. */
  hazards: HazardId[];
  steps: string[];
  source: GuideSource | null;
  /** Distinguishes the cited technique/research from this prototype's adaptation. */
  sourceScope?: string;
  validation: GuideValidation;
}

export const ISS_KIT_SOURCE: GuideSource = {
  title: 'NASA · ISS medical kit contents and reference (MED CL 3.001, 2015)',
  url: 'https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
  checkedAt: '2026-11-14',
};
const diagnostic = (item: string, slot: string): KitItem => ({ item, pack: 'Medical Diagnostic Pack', colour: 'blue', slot });
const checked = (title: string, url: string, checkedAt = '2026-11-14'): GuideSource => ({ title, url, checkedAt });
const BP_SOURCE = checked('MedlinePlus · Blood pressure measurement', 'https://medlineplus.gov/ency/article/007490.htm', '2026-11-15');
const NOT_IN_KIT = 'Not an item documented in the 2015 ISS medical kit checklist.';
const CMP_SOURCE = checked('MedlinePlus · Comprehensive metabolic panel', 'https://medlineplus.gov/lab-tests/comprehensive-metabolic-panel-cmp/', '2026-11-15');
const LAB_KIT_NOTE = 'Not taken from the 2015 ISS medical kit checklist. Confirm which blood analyzer is aboard.';
const LAB_STEPS = [
  'Take the blood sample the way your analyzer or laboratory instructions say.',
  'Run the panel, then record calcium, sodium and potassium with the time of the sample.',
];

export type VisualGuideId = 'pulse' | 'temperature' | 'spo2';
export interface VisualGuide {
  title: string;
  instrument: string;
  preparation: string;
  note: string;
  source: GuideSource;
  steps: { title: string; detail: string; description: string }[];
}

/** Illustrated demonstrations, with paraphrased primary references. No device data is generated. */
export const visualGuides: Record<VisualGuideId, VisualGuide> = {
  pulse: {
    title: 'Check your wrist pulse', instrument: 'Two fingertips and a timer',
    preparation: 'For a routine resting pulse, rest for at least 10 minutes first.',
    note: 'The illustration shows placement, not your heartbeat. Count the beats you actually feel.',
    source: { title: 'MedlinePlus · Pulse', url: 'https://medlineplus.gov/ency/article/003399.htm', checkedAt: '2026-11-15' },
    steps: [
      { title: 'Turn your palm upward', detail: 'Support your opposite wrist with the palm facing up.', description: 'Outline illustration of a palm-up hand and two fingertips at the inner wrist. The callout identifies the wrist for preparation.' },
      { title: 'Place two fingertips', detail: 'Use your index and middle fingertips below the thumb base. Press gently until you feel the pulse.', description: 'Two fingertips touch the inner wrist, just below the base of the thumb.' },
      { title: 'Count for one full minute', detail: 'Count the beats for 60 seconds. That count is your pulse in beats per minute.', description: 'Two fingertips stay at the wrist. A static label describes counting for 60 seconds; the highlight is a placement cue, not a heartbeat or timer.' },
    ],
  },
  temperature: {
    title: 'Take an oral temperature', instrument: 'Digital oral thermometer',
    preparation: 'For routine measurement: wait 20–30 minutes after eating, smoking or hot/cold drinks; at least 1 hour after heavy exercise or a hot bath. Clean the thermometer.',
    note: 'Follow the thermometer instructions. Record that the measurement was oral; other measurement sites differ.',
    source: { title: 'MedlinePlus · Temperature measurement', url: 'https://medlineplus.gov/ency/article/003400.htm', checkedAt: '2026-11-15' },
    steps: [
      { title: 'Prepare the thermometer', detail: 'Use a clean digital thermometer intended for oral measurement.', description: 'Simple side profile with a digital oral thermometer already positioned between the lips. The callout identifies the instrument for preparation; its display is blank.' },
      { title: 'Position under the tongue', detail: 'Place the probe under your tongue and close your mouth. Breathe through your nose.', description: 'A simplified side-view cutaway of the mouth shows the probe beneath the tongue.' },
      { title: 'Wait for the device signal', detail: 'Hold it in place until the device signals completion, following its instructions. Read and record the temperature.', description: 'The probe stays under the tongue. The display remains blank to avoid suggesting a measured temperature.' },
    ],
  },
  spo2: {
    title: 'Use a fingertip oximeter', instrument: 'Fingertip pulse oximeter',
    preparation: 'Use a warm, relaxed hand below heart level. Remove nail polish from the tested finger and follow the device instructions.',
    note: 'Oximeters estimate oxygen saturation. Skin pigmentation, circulation and other factors can affect accuracy; consider symptoms too.',
    source: { title: 'FDA · Pulse Oximeter Basics', url: 'https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics', checkedAt: '2026-11-15' },
    steps: [
      { title: 'Prepare your finger', detail: 'Keep the hand relaxed and use a bare, warm fingertip.', description: 'Simple outline of a relaxed five-finger hand with the index finger already fitted with a generic oximeter. The callout identifies the tested finger for preparation.' },
      { title: 'Fit the finger clip', detail: 'Place the oximeter on your fingertip as its manufacturer directs.', description: 'The oximeter clip surrounds the fingertip; the drawing is a generic device.' },
      { title: 'Keep still and read the device', detail: 'Remain still. Record the reading when the device numbers settle, along with date and time.', description: 'A fitted oximeter has a blank display. A placement highlight identifies the clip without simulating sensor output or a pulse rate.' },
    ],
  },
};

export const guides: Partial<Record<IndicatorId, Guide>> = {
  pulse: {
    instrument: 'Fingers and timer',
    kit: null,
    kitNote: 'The historical 2015 checklist does not document a dedicated instrument for this manual pulse method.',
    why: 'The pulse is the number of heartbeats per minute. A change from your normal resting rate can indicate a health problem; a fast pulse may signal infection or dehydration.',
    hazards: ['gravity', 'isolation'],
    steps: [visualGuides.pulse.preparation, ...visualGuides.pulse.steps.map(step => step.detail)],
    source: visualGuides.pulse.source,
    validation: 'cited',
  },
  systolic: {
    instrument: 'Automatic blood pressure monitor and cuff',
    kit: diagnostic('Blood Pressure Monitor and cuff, large or small', 'B4 and B2'),
    why: 'High blood pressure usually has no symptoms, so you may not know your level without a reading.',
    hazards: ['gravity'],
    steps: [
      'Rest for at least 5 minutes. Avoid food, caffeine and exercise in the 30 minutes before.',
      'Sit with your back supported and your legs uncrossed.',
      'Support your arm at heart level. Wrap the cuff snugly on bare skin, its lower edge 2.5 cm above the elbow crease.',
      'Stay still and silent. Take 2 or 3 readings about 1 minute apart and record each with its time.',
    ],
    source: BP_SOURCE,
    validation: 'cited',
  },
  diastolic: {
    instrument: 'Automatic blood pressure monitor and cuff',
    kit: diagnostic('Blood Pressure Monitor and cuff, large or small', 'B4 and B2'),
    why: 'Read together with systolic pressure, from the same measurement.',
    hazards: ['gravity'],
    steps: ['Take it with the systolic reading, from the same measurement.', 'Record the lower of the two numbers.'],
    source: BP_SOURCE,
    validation: 'cited',
  },
  respiration: {
    instrument: 'A watch or timer, ideally a crewmate counting',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'Respiratory rate is the number of breaths you take per minute. Counting it while quiet gives a resting rate.',
    hazards: ['environment'],
    steps: [
      'Sit quietly and relax for a few minutes.',
      'Count breaths for 60 seconds by watching the chest rise and fall.',
      'A crewmate counting is more accurate. It is hard to count your own breaths without changing them.',
    ],
    source: checked('Cleveland Clinic · Vital signs', 'https://my.clevelandclinic.org/health/articles/10881-vital-signs', '2026-11-15'),
    validation: 'cited',
  },
  spo2: {
    instrument: 'Pulse oximeter',
    kit: diagnostic('Blood Oximeter', 'B1'),
    why: 'A pulse oximeter estimates oxygen saturation and pulse rate. The historical 2015 kit checklist lists a blood oximeter (B1); linking that item to SpO₂ is an editorial inference, not a NASA-documented procedure or precision claim.',
    hazards: ['environment'],
    steps: [visualGuides.spo2.preparation, ...visualGuides.spo2.steps.map(step => step.detail)],
    source: visualGuides.spo2.source,
    validation: 'cited',
  },
  temperature: {
    instrument: 'Digital thermometer',
    kit: diagnostic('Thermometer', 'B3'),
    why: 'Body temperature helps detect illness and monitor whether treatment is working; a high temperature is a fever.',
    hazards: ['environment', 'radiation'],
    steps: [visualGuides.temperature.preparation, ...visualGuides.temperature.steps.map(step => step.detail)],
    source: visualGuides.temperature.source,
    validation: 'cited',
  },
  glucose: {
    instrument: 'Glucometer, test strip and lancet',
    kit: null,
    kitNote: 'Not listed in the 2015 ISS medical kit checklist. Confirm which meter is aboard.',
    why: 'A glucose reading records your blood sugar at that moment; logging results helps you see changes over time.',
    hazards: ['gravity', 'isolation'],
    steps: [
      'Wash your hands with soap and warm water, then dry them well.',
      'Prick a fingertip with the lancet.',
      'Place a small drop of blood on the test strip and put the strip in the meter, as its instructions say.',
      'Read the result after a few seconds and record it.',
    ],
    source: checked('CDC · Monitoring your blood sugar', 'https://www.cdc.gov/diabetes/diabetes-testing/monitoring-blood-sugar.html'),
    sourceScope: 'Fingerstick meter technique only. Venous laboratory samples and CGM follow their laboratory or device instructions; this guide does not define their measurement procedure or diagnostic interpretation.',
    validation: 'cited',
  },
  sleep: {
    instrument: 'Sleep log or wearable',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'A personal log of when you slept and for how long. It is your own record, not a validated clinical assessment.',
    hazards: ['isolation', 'distance'],
    steps: ['Note the time you fell asleep and woke up.', 'Record the hours slept since your last check-in.'],
    source: null,
    validation: 'self-report',
  },
  mood: {
    instrument: 'Self-rating',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'A personal rating of how you feel today. It is your own record, not a validated clinical assessment.',
    hazards: ['isolation', 'distance'],
    steps: ['Take a moment before answering.', 'Rate how you feel today from 1, very low, to 5, very good.'],
    source: null,
    validation: 'self-report',
  },
  consciousness: {
    instrument: 'Self-check or a crewmate',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'New confusion scores 3 on NEWS2 on its own. Assume confusion is new until shown otherwise.',
    hazards: ['isolation', 'environment'],
    steps: ['Alert: awake, oriented, responding normally.', 'If a crewmate seems confused or drowsy, record what you see.'],
    source: checked('Royal College of Physicians · NEWS2', 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/', '2026-11-15'),
    validation: 'cited',
  },
  oxygen: {
    instrument: 'Your oxygen supply: cabin air, mask or nasal cannula',
    kit: null,
    kitNote: 'Not taken from the 2015 ISS medical kit checklist; the oxygen supply depends on the vehicle.',
    why: 'NEWS2 adds 2 points for any supplemental oxygen, so the score needs to know whether you breathe cabin air or added oxygen.',
    hazards: ['environment'],
    steps: [
      'Check whether you breathe cabin air or receive oxygen through a mask or nasal cannula.',
      'Record "On supplemental oxygen" for any added oxygen, whatever the flow. Otherwise record cabin air.',
    ],
    source: checked('Royal College of Physicians · NEWS2', 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/', '2026-11-15'),
    validation: 'cited',
  },
  reaction: {
    instrument: 'Reaction-time task on a device',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'Reaction time is how fast you respond to a signal. Slowing against your own usual can come with fatigue or lost sleep; results depend on the task and device.',
    hazards: ['isolation', 'distance'],
    steps: [
      'Test at a similar time of day, rested and somewhere quiet, so results compare.',
      'Run the 60-second test (Measure → Reaction time) and respond as soon as each signal appears, until it ends.',
      'Record the average reaction time in milliseconds and compare it with your own earlier results.',
    ],
    source: checked('Sleep · Response speed measurements on the psychomotor vigilance test (2021)', 'https://pubmed.ncbi.nlm.nih.gov/32556295/'),
    sourceScope: 'The paper studies the standard 10-minute PVT. This app uses a 60-second demonstration; that duration and interface are project choices, not a validated equivalent of the research task.',
    validation: 'cited',
  },
  calcium: {
    instrument: 'Blood chemistry analyzer or laboratory panel',
    kit: null,
    kitNote: LAB_KIT_NOTE,
    why: 'Calcium in the blood, from a lab panel. Weightlessness causes bone loss, so crews follow calcium across a mission.',
    hazards: ['gravity'],
    steps: LAB_STEPS,
    source: CMP_SOURCE,
    validation: 'cited',
  },
  sodium: {
    instrument: 'Blood chemistry analyzer or laboratory panel',
    kit: null,
    kitNote: LAB_KIT_NOTE,
    why: 'Sodium in the blood, from a lab panel. It reflects the balance of salt and water in the body.',
    hazards: ['gravity'],
    steps: LAB_STEPS,
    source: CMP_SOURCE,
    validation: 'cited',
  },
  potassium: {
    instrument: 'Blood chemistry analyzer or laboratory panel',
    kit: null,
    kitNote: LAB_KIT_NOTE,
    why: 'Potassium in the blood, from a lab panel. The heart and muscles depend on it.',
    hazards: ['gravity'],
    steps: LAB_STEPS,
    source: CMP_SOURCE,
    validation: 'cited',
  },
  exercise: {
    instrument: 'Exercise log',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'A personal log of the exercise you completed today. It is your own record, not a validated clinical assessment.',
    hazards: ['gravity'],
    steps: ['Record the minutes of resistance and aerobic exercise completed today.'],
    source: null,
    validation: 'self-report',
  },
};
