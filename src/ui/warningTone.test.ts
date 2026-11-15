import { describe, expect, it } from 'vitest';
import { warningTone } from './warningTone';

const none = { alert: 0, watch: 0 };
describe('warningTone follows the NEWS2 level, like the NEWS2 panel', () => {
  it('is amber for a low–medium (single red) or medium score, even with a system in alert', () => {
    expect(warningTone({ complete: true, escalation: 'cmo' }, { alert: 1, watch: 2 })).toBe('watch');
  });
  it('is red only for a high score', () => {
    expect(warningTone({ complete: true, escalation: 'surgeon' }, none)).toBe('alert');
  });
  it('is green for a low score with every system within limits, neutral when one is off', () => {
    expect(warningTone({ complete: true, escalation: 'self' }, none)).toBe('good');
    expect(warningTone({ complete: true, escalation: 'self' }, { alert: 1, watch: 0 })).toBe('calm');
  });
  it('is neutral while the score is incomplete', () => {
    expect(warningTone({ complete: false, escalation: 'cmo' }, none)).toBe('calm');
  });
});
