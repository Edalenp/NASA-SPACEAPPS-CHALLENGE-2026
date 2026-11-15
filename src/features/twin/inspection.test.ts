import { describe, it, expect } from 'vitest';
import { focusPoint, inspectionDistance, inspectionViews, pickHit, systemFor } from './inspection';
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

describe('picking through the translucent body', () => {
  const hit = (name: string, group: string, visible = true) => ({ name, group, visible });
  it('reaches the heart behind the chest muscles', () => {
    const picked = pickHit([hit('chest_muscles_l', 'muscles'), hit('ribs_l', 'skeleton'), hit('heart', 'organs')]);
    expect(picked && systemFor(picked.name)).toBe('heart');
  });
  it('prefers a trunk vessel over the muscle in front of it', () => {
    expect(pickHit([hit('chest_muscles_r', 'muscles'), hit('arteries_thorax', 'vessels')])?.name).toBe('arteries_thorax');
  });
  it('keeps limb clicks on bones and muscles', () => {
    const picked = pickHit([hit('thigh_muscles_l', 'muscles'), hit('arteries_leg_l', 'vessels'), hit('femur_l', 'skeleton')]);
    expect(picked && systemFor(picked.name)).toBe('bones');
  });
  it('ignores skin and hidden meshes', () => {
    expect(pickHit([hit('skin', 'body'), hit('liver', 'organs', false), hit('abdominal_muscles', 'muscles')])?.name).toBe('abdominal_muscles');
  });
});
