import { describe, it, expect } from 'vitest';
import { focusPoint, inspectionDistance, inspectionViews } from './inspection';
import type { SystemId } from '../../data/mission';

describe('organ close-up framing', () => {
  it('selects closer desktop details without changing their vertical target', () => {
    for (const id of ['head', 'heart', 'lungs', 'immune', 'sleep'] as SystemId[]) {
      const old = { head: 1.25, heart: 1.25, lungs: 1.6, immune: 1.7, sleep: 1.65, bones: 3.45 };
      expect(inspectionDistance(id, 2)).toBeLessThan(old[id]);
      expect(focusPoint(id, Math.PI / 3).y).toBe(inspectionViews[id].center[1]);
    }
  });
  it('leaves room for the organ on narrow viewports', () => {
    for (const id of ['head', 'heart', 'lungs', 'immune', 'sleep'] as SystemId[]) {
      const distance = inspectionDistance(id, 0.5);
      expect(distance * Math.tan(16 * Math.PI / 180) * 0.5).toBeGreaterThan((inspectionViews[id].frame?.[0] ?? inspectionViews[id].radius[0]));
    }
  });
});
