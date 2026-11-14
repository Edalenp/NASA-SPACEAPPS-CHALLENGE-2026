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
  validation: GuideValidation;
}

export const ISS_KIT_SOURCE: GuideSource = {
  title: 'NASA · ISS medical kit contents and reference (MED CL 3.001, 2015)',
  url: 'https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf',
  checkedAt: '2026-11-14',
};
const diagnostic = (item: string, slot: string): KitItem => ({ item, pack: 'Medical Diagnostic Pack', colour: 'blue', slot });
const checked = (title: string, url: string): GuideSource => ({ title, url, checkedAt: '2026-11-14' });
const BP_SOURCE = checked('MedlinePlus · Blood pressure measurement', 'https://medlineplus.gov/ency/article/007490.htm');
const NOT_IN_KIT = 'Not an item of the ISS medical kit checklist.';

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
    source: { title: 'MedlinePlus · Pulse', url: 'https://medlineplus.gov/ency/article/003399.htm', checkedAt: '2026-11-14' },
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
    source: { title: 'MedlinePlus · Temperature measurement', url: 'https://medlineplus.gov/ency/article/003400.htm', checkedAt: '2026-11-14' },
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
    source: { title: 'FDA · Pulse Oximeter Basics', url: 'https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics', checkedAt: '2026-11-14' },
    steps: [
      { title: 'Prepare your finger', detail: 'Keep the hand relaxed and use a bare, warm fingertip.', description: 'Simple outline of a relaxed five-finger hand with the index finger already fitted with a generic oximeter. The callout identifies the tested finger for preparation.' },
      { title: 'Fit the finger clip', detail: 'Place the oximeter on your fingertip as its manufacturer directs.', description: 'The oximeter clip surrounds the fingertip; the drawing is a generic device.' },
      { title: 'Keep still and read the device', detail: 'Remain still. Record the reading when the device numbers settle, along with date and time.', description: 'A fitted oximeter has a blank display. A placement highlight identifies the clip without simulating sensor output or a pulse rate.' },
    ],
  },
};

export const guides: Partial<Record<IndicatorId, Guide>> = {
  pulse: {
    instrument: 'Two fingertips and a timer, or the blood oximeter',
    kit: diagnostic('Blood Oximeter', 'B1'),
    why: 'A resting pulse above your usual range can follow fluid shifts, poor sleep, dehydration or illness.',
    hazards: ['gravity', 'isolation'],
    steps: [visualGuides.pulse.preparation, ...visualGuides.pulse.steps.map(step => step.detail)],
    source: visualGuides.pulse.source,
    validation: 'cited',
  },
  systolic: {
    instrument: 'Automatic blood pressure monitor and cuff',
    kit: diagnostic('Blood Pressure Monitor and cuff, large or small', 'B4 and B2'),
    why: 'Gravity changes move fluid toward the head. Pressure can drift below your usual range, most of all on landing.',
    hazards: ['gravity'],
    steps: [
      'Rest for at least 5 minutes. Avoid food, caffeine and exercise in the 30 minutes before.',
      'Sit restrained with your back supported and your legs uncrossed.',
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
    why: 'Breathing rate is often the first vital sign to change when something is wrong.',
    hazards: ['environment'],
    steps: [
      'Sit quietly and relax for a few minutes.',
      'Count breaths for 60 seconds by watching the chest rise and fall.',
      'A crewmate counting is more accurate. It is hard to count your own breaths without changing them.',
    ],
    source: checked('Cleveland Clinic · Vital signs', 'https://my.clevelandclinic.org/health/articles/10881-vital-signs'),
    validation: 'cited',
  },
  spo2: {
    instrument: 'Pulse oximeter',
    kit: diagnostic('Blood Oximeter', 'B1'),
    why: 'Cabin air quality and lung function both show in oxygen saturation.',
    hazards: ['environment'],
    steps: [visualGuides.spo2.preparation, ...visualGuides.spo2.steps.map(step => step.detail)],
    source: visualGuides.spo2.source,
    validation: 'cited',
  },
  temperature: {
    instrument: 'Digital thermometer',
    kit: diagnostic('Thermometer', 'B3'),
    why: 'A raised temperature is an early sign of infection, and immune response changes in flight.',
    hazards: ['environment', 'radiation'],
    steps: [visualGuides.temperature.preparation, ...visualGuides.temperature.steps.map(step => step.detail)],
    source: visualGuides.temperature.source,
    validation: 'cited',
  },
  glucose: {
    instrument: 'Glucometer, test strip and lancet',
    kit: null,
    kitNote: 'Not listed in the 2015 ISS medical kit checklist. Confirm which meter is aboard.',
    why: 'Diet, sleep and reduced activity change how your body handles sugar.',
    hazards: ['gravity', 'isolation'],
    steps: [
      'Wash your hands with soap and warm water, then dry them well.',
      'Prick a fingertip with the lancet.',
      'Place a small drop of blood on the test strip and put the strip in the meter, as its instructions say.',
      'Read the result after a few seconds and record it.',
    ],
    source: checked('CDC · Monitoring your blood sugar', 'https://www.cdc.gov/diabetes/diabetes-testing/monitoring-blood-sugar.html'),
    validation: 'cited',
  },
  sleep: {
    instrument: 'Sleep log or wearable',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'Light, noise and shifting schedules make sleep loss common on missions.',
    hazards: ['isolation', 'distance'],
    steps: ['Note the time you fell asleep and woke up.', 'Record the hours slept since your last check-in.'],
    source: null,
    validation: 'self-report',
  },
  mood: {
    instrument: 'Self-rating',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'Isolation and confinement affect mood. Small daily changes are easier to act on.',
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
    source: checked('Royal College of Physicians · NEWS2', 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/'),
    validation: 'cited',
  },
  exercise: {
    instrument: 'Exercise log',
    kit: null,
    kitNote: NOT_IN_KIT,
    why: 'Daily exercise is the main countermeasure against bone and muscle loss.',
    hazards: ['gravity'],
    steps: ['Record the minutes of resistance and aerobic exercise completed today.'],
    source: null,
    validation: 'self-report',
  },
};
