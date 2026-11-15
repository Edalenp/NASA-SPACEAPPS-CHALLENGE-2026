import { describe, expect, it } from 'vitest';
import { guides } from '../../../data/guides';
import { checkSequence } from '../../routine/checkSequence';
import { hasPlate, plateForStep } from './plate-steps';

describe('guide plates', () => {
  // Oxygen support is a yes/no observation with no technique to show.
  const illustrated = checkSequence.filter((id) => id !== 'oxygen');

  it.each(illustrated)('%s has an illustrated plate for every written step', (id) => {
    expect(hasPlate(id)).toBe(true);
    const steps = guides[id]!.steps;
    for (let step = 0; step < steps.length; step++) {
      const plate = plateForStep(id, step)!;
      expect(plate.pose, `${id} step ${step}`).toBeGreaterThanOrEqual(0);
      expect(plate.pose, `${id} step ${step}`).toBeLessThan(plate.count);
      expect(plate.description.length, `${id} step ${step}`).toBeGreaterThan(20);
    }
  });

  it('ends each guide on its last pose', () => {
    for (const id of illustrated) {
      const last = plateForStep(id, guides[id]!.steps.length - 1)!;
      if (id !== 'diastolic') expect(last.pose, id).toBe(last.count - 1);
    }
  });

  it('shares one blood-pressure plate between systolic and diastolic', () => {
    expect(plateForStep('systolic', 0)!.plate).toBe('bloodPressure');
    expect(plateForStep('diastolic', 0)!.plate).toBe('bloodPressure');
  });
});
