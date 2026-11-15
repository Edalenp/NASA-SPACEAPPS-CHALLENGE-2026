import { describe, expect, it } from 'vitest';
import { guides } from '../../../data/guides';
import { systems } from '../../../data/mission';
import { checkSequence } from '../../routine/checkSequence';
import { hasPlate, plateForStep } from './plate-steps';

describe('guide plates', () => {
  // Every reading a body system shows, plus the daily check: "How to measure" is never empty.
  const illustrated = [...new Set([...checkSequence, ...systems.flatMap((system) => system.readings)])];

  it.each(illustrated)('%s has a guide and an illustrated plate for every written step', (id) => {
    expect(guides[id], id).toBeDefined();
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
