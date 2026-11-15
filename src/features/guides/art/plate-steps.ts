import type { IndicatorId } from '../../../data/indicators';
import { guides, visualGuides, type VisualGuideId } from '../../../data/guides';

/**
 * Which illustrated plate goes with each guide step. Kept apart from the plates so the guide card
 * can decide whether to show art without loading the drawings (they are a lazy chunk).
 */
export type RoutinePlateId = 'bloodPressure' | 'respiration' | 'glucose' | 'consciousness' | 'sleep' | 'mood' | 'oxygen' | 'reaction' | 'exercise';
export type PlateId = VisualGuideId | RoutinePlateId;

interface PlateSpec {
  plate: PlateId;
  /** Pose shown for each written step of the guide, by index. */
  poses: readonly number[];
  /** Text alternative per pose. */
  descriptions: readonly string[];
}

const visual = (id: VisualGuideId): PlateSpec => ({
  plate: id,
  // The guide's first step is the preparation line; the three illustrated steps follow it.
  poses: [0, 0, 1, 2],
  descriptions: visualGuides[id].steps.map((step) => step.description),
});

const bloodPressure: Omit<PlateSpec, 'poses'> = {
  plate: 'bloodPressure',
  descriptions: [
    'Front outline of a crew member at rest. A clock face marks the five minutes of rest before measuring.',
    'A cuff wraps the bare upper arm, its lower edge above the elbow crease. A dashed line shows the cuff at heart level.',
    'The cuff tube runs to an automatic monitor with a blank display. Three marks show two or three readings about one minute apart.',
  ],
};

const SPECS: Partial<Record<IndicatorId, PlateSpec>> = {
  pulse: visual('pulse'),
  temperature: visual('temperature'),
  spo2: visual('spo2'),
  systolic: { ...bloodPressure, poses: [0, 0, 1, 2] },
  diastolic: { ...bloodPressure, poses: [2, 2] },
  respiration: {
    plate: 'respiration',
    poses: [0, 1, 2],
    descriptions: [
      'Head and shoulders of a crew member sitting quietly.',
      'Dashed lines show the chest rising and falling, with a sixty-second dial. The motion is a cue to watch, not a breathing rate.',
      'A crewmate’s head in profile looks at the chest from the side: someone else counting is more accurate.',
    ],
  },
  glucose: {
    plate: 'glucose',
    poses: [0, 1, 2, 3],
    descriptions: [
      'Back of a hand with water drops falling on it: wash and dry the hands first.',
      'A lancet pen touches the side of the index fingertip.',
      'A small drop of blood on the fingertip meets the end of a test strip in the meter.',
      'The meter sits beside the hand with a blank display: read the result, then record it.',
    ],
  },
  consciousness: {
    plate: 'consciousness',
    poses: [0, 1],
    descriptions: [
      'Head and shoulders beside the five-level alertness scale: alert, new confusion, voice, pain, unresponsive. The marker sits on alert.',
      'A bracket groups new confusion, voice, pain and unresponsive: any of them scores three points on NEWS2. Assume confusion is new.',
    ],
  },
  sleep: {
    plate: 'sleep',
    poses: [0, 1],
    descriptions: [
      'Side outline of a crew member in a sleeping bag tethered to the wall, with marks for falling asleep and waking.',
      'A bracket between the two marks shows the hours slept since the last check-in.',
    ],
  },
  oxygen: {
    plate: 'oxygen',
    poses: [0, 1],
    descriptions: [
      'Profile of a head with arrows of cabin air toward the nose: check whether you breathe cabin air or added oxygen.',
      'A nasal cannula runs from the nostril along the cheek to an oxygen supply: any added oxygen counts as supplemental oxygen.',
    ],
  },
  reaction: {
    plate: 'reaction',
    poses: [0, 1, 2],
    descriptions: [
      'Head and shoulders with a clock face: test at a similar time of day, rested and somewhere quiet.',
      'A fingertip taps a round signal on a device screen as soon as it appears. The drawing is not a test and records nothing.',
      'Dots for earlier results sit inside a dashed band marked your usual; the latest dot is compared with them. No values are shown.',
    ],
  },
  exercise: {
    plate: 'exercise',
    poses: [0],
    descriptions: [
      'Side outline of a crew member on a treadmill held down by harness bungees, beside a log with blank boxes for resistance and aerobic minutes.',
    ],
  },
  mood: {
    plate: 'mood',
    poses: [0, 1],
    descriptions: [
      'Head and shoulders with a pause mark: take a moment before answering.',
      'A five-box scale from one, very low, to five, very good. No box is chosen in the drawing.',
    ],
  },
};

export interface StepPlate {
  plate: PlateId;
  pose: number;
  /** Number of distinct poses, for the "Fig. n / N" kicker. */
  count: number;
  description: string;
}

/** The plate and pose for one step of a guide, or null when the guide has no illustration. */
export function plateForStep(id: IndicatorId, step: number): StepPlate | null {
  const spec = SPECS[id];
  const guide = guides[id];
  if (!spec || !guide || guide.validation === 'draft') return null;
  const index = Math.min(Math.max(0, step), spec.poses.length - 1);
  const pose = spec.poses[index];
  return { plate: spec.plate, pose, count: spec.descriptions.length, description: spec.descriptions[pose] };
}

export function hasPlate(id: IndicatorId): boolean {
  return plateForStep(id, 0) !== null;
}
