import type { IndicatorId } from './indicators';

/**
 * Measurement guides. DRAFT written with AI assistance (Claude): generic
 * self-measurement steps, pending review against the ISS medical kit
 * procedures and a cited source for each step.
 */
export interface Guide { instrument: string; why: string; steps: string[] }

export const guides: Partial<Record<IndicatorId, Guide>> = {
  pulse: {
    instrument: 'Pulse oximeter, or two fingers and a timer',
    why: 'A resting pulse above your usual range can follow fluid shifts, poor sleep, dehydration or illness.',
    steps: ['Sit restrained and rest for 5 minutes.', 'Place two fingers on the inside of your wrist, below the thumb.', 'Count the beats for 30 seconds, then double the count.'],
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
    steps: ['Warm your hand. Remove any nail coating.', 'Clip the oximeter on a fingertip and keep the hand still.', 'Read when the number holds steady for 10 seconds.'],
  },
  temperature: {
    instrument: 'Digital thermometer',
    why: 'A raised temperature is an early sign of infection, and immune response changes in flight.',
    steps: ['Wait 15 minutes after eating, drinking or exercise.', 'Place the tip under your tongue and close your mouth.', 'Read after the beep.'],
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
