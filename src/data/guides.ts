import type { IndicatorId } from './indicators';

/**
 * Measurement guides. DRAFT written with AI assistance: generic
 * self-measurement steps, pending review against the onboard medical kit.
 * The three visual guides include cited technique sources; the other entries
 * still require source review.
 */
export interface Guide { instrument: string; why: string; steps: string[] }

export type VisualGuideId = 'pulse' | 'temperature' | 'spo2';
export interface VisualGuide {
  title: string;
  instrument: string;
  preparation: string;
  note: string;
  source: { title: string; url: string; checkedAt: string };
  steps: { title: string; detail: string; description: string }[];
}

/** Original vector demonstrations, with paraphrased primary references. No device data is generated. */
export const visualGuides: Record<VisualGuideId, VisualGuide> = {
  pulse: {
    title: 'Check your wrist pulse', instrument: 'Two fingertips and a timer',
    preparation: 'For a routine resting pulse, rest for at least 10 minutes first.',
    note: 'The illustration shows placement, not your heartbeat. Count the beats you actually feel.',
    source: { title: 'MedlinePlus · Pulse', url: 'https://medlineplus.gov/ency/article/003399.htm', checkedAt: '2026-11-14' },
    steps: [
      { title: 'Turn your palm upward', detail: 'Support your opposite wrist with the palm facing up.', description: 'Palm-up hand with the wrist and the base of the thumb identified.' },
      { title: 'Place two fingertips', detail: 'Use your index and middle fingertips below the thumb base. Press gently until you feel the pulse.', description: 'Two fingertips touch the inner wrist, just below the base of the thumb.' },
      { title: 'Count for one full minute', detail: 'Count the beats for 60 seconds. That count is your pulse in beats per minute.', description: 'Two fingertips stay at the wrist. A static 60-second symbol indicates the counting period; it is not a running timer.' },
    ],
  },
  temperature: {
    title: 'Take an oral temperature', instrument: 'Digital oral thermometer',
    preparation: 'For routine measurement: wait 20–30 minutes after eating, smoking or hot/cold drinks; at least 1 hour after heavy exercise or a hot bath. Clean the thermometer.',
    note: 'Follow the thermometer instructions. Record that the measurement was oral; other measurement sites differ.',
    source: { title: 'MedlinePlus · Temperature measurement', url: 'https://medlineplus.gov/ency/article/003400.htm', checkedAt: '2026-11-14' },
    steps: [
      { title: 'Prepare the thermometer', detail: 'Use a clean digital thermometer intended for oral measurement.', description: 'Digital oral thermometer with its probe tip and blank display identified.' },
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
      { title: 'Prepare your finger', detail: 'Keep the hand relaxed and use a bare, warm fingertip.', description: 'A relaxed hand with an uncovered fingertip ready for the oximeter.' },
      { title: 'Fit the finger clip', detail: 'Place the oximeter on your fingertip as its manufacturer directs.', description: 'The oximeter clip surrounds the fingertip; the drawing is a generic device.' },
      { title: 'Keep still and read the device', detail: 'Remain still. Record the reading when the device numbers settle, along with date and time.', description: 'A fitted oximeter has separate blank oxygen-percent and pulse-rate display areas. No sample reading is shown.' },
    ],
  },
};

export const guides: Partial<Record<IndicatorId, Guide>> = {
  pulse: {
    instrument: 'Pulse oximeter, or two fingers and a timer',
    why: 'A resting pulse above your usual range can follow fluid shifts, poor sleep, dehydration or illness.',
    steps: [visualGuides.pulse.preparation, ...visualGuides.pulse.steps.map(step => step.detail)],
  },
  systolic: {
    instrument: 'Automatic blood pressure cuff',
    why: 'Gravity changes move fluid toward the head. Pressure can drift below your usual range, most of all on landing.',
    steps: ['Sit restrained with your arm resting at heart level.', 'Wrap the cuff on bare skin, two fingers above the elbow.', 'Stay still and silent until the cuff deflates. Record both numbers.'],
  },
  diastolic: {
    instrument: 'Automatic blood pressure cuff',
    why: 'Read together with systolic pressure, from the same measurement.',
    steps: ['Take it with the systolic reading.', 'Record the lower of the two numbers.'],
  },
  respiration: {
    instrument: 'Timer, ideally a crewmate counting',
    why: 'Breathing rate is often the first vital sign to change when something is wrong.',
    steps: ['Rest for 5 minutes.', 'Count breaths for 30 seconds without changing how you breathe.', 'Double the count. A crewmate counting is more accurate.'],
  },
  spo2: {
    instrument: 'Pulse oximeter',
    why: 'Cabin air quality and lung function both show in oxygen saturation.',
    steps: [visualGuides.spo2.preparation, ...visualGuides.spo2.steps.map(step => step.detail)],
  },
  temperature: {
    instrument: 'Digital thermometer',
    why: 'A raised temperature is an early sign of infection, and immune response changes in flight.',
    steps: [visualGuides.temperature.preparation, ...visualGuides.temperature.steps.map(step => step.detail)],
  },
  glucose: {
    instrument: 'Glucometer, strip and lancet',
    why: 'Diet, sleep and reduced activity change how your body handles sugar.',
    steps: ['Wash and dry your hands.', 'Prick the side of a fingertip and capture the drop.', 'Touch the drop to the strip and read the meter.'],
  },
  sleep: {
    instrument: 'Sleep log or wearable',
    why: 'Light, noise and shifting schedules make sleep loss common on missions.',
    steps: ['Note the time you fell asleep and woke up.', 'Record the hours slept since your last check-in.'],
  },
  mood: {
    instrument: 'Self-rating',
    why: 'Isolation and confinement affect mood. Small daily changes are easier to act on.',
    steps: ['Take a moment before answering.', 'Rate how you feel today from 1, very low, to 5, very good.'],
  },
  consciousness: {
    instrument: 'Self-check or a crewmate',
    why: 'New confusion scores 3 on NEWS2 on its own. Assume confusion is new until shown otherwise.',
    steps: ['Alert: awake, oriented, responding normally.', 'If a crewmate seems confused or drowsy, record what you see.'],
  },
  exercise: {
    instrument: 'Exercise log',
    why: 'Daily exercise is the main countermeasure against bone and muscle loss.',
    steps: ['Record the minutes of resistance and aerobic exercise completed today.'],
  },
};
