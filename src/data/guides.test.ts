import { describe, expect, it } from 'vitest';
import { guides, ISS_KIT_SOURCE } from './guides';
import { getHazardById } from './nasa';

const entries = Object.entries(guides);

describe('measurement guides (RF-16, RF-17)', () => {
  it('has at least eight guides, each naming its instrument', () => {
    expect(entries.length).toBeGreaterThanOrEqual(8);
    for (const [, g] of entries) expect(g!.instrument.length).toBeGreaterThan(0);
  });

  it('names an ISS kit pack and slot, or says why there is none', () => {
    for (const [, g] of entries) {
      if (g!.kit) {
        expect(g!.kit.pack).toMatch(/Pack$/);
        expect(g!.kit.slot.length).toBeGreaterThan(0);
      } else {
        expect(g!.kitNote).toBeTruthy();
      }
    }
    expect(ISS_KIT_SOURCE.url).toMatch(/^https:\/\/www\.nasa\.gov\//);
  });

  it('relates every guide to at least one of the five spaceflight hazards', () => {
    for (const [, g] of entries) {
      expect(g!.hazards.length).toBeGreaterThan(0);
      for (const id of g!.hazards) expect(getHazardById(id)).toBeDefined();
    }
  });

  it('only shows technique steps with a source, unless the reading is a self-report', () => {
    for (const [id, g] of entries) {
      if (g!.validation === 'cited') expect(g!.source, id).not.toBeNull();
      if (g!.validation === 'self-report') expect(g!.source, id).toBeNull();
    }
  });

  it('counts breaths for a full minute, as the cited source says', () => {
    expect(guides.respiration!.steps.join(' ')).toContain('60 seconds');
  });
});
