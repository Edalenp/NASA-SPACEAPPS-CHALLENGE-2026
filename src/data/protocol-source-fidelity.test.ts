import { describe, expect, it } from 'vitest';
import { protocols } from './protocols';

function note(protocolId: string, stepId: string, sourceIndex = 0): string {
  const step = protocols.find(p => p.id === protocolId)!.steps[stepId];
  return step.sources[sourceIndex].note;
}

/**
 * QA3 source-fidelity pins. Section headings and quotes were verified against the
 * live Red Cross pages on 2026-11-15. These tests pin the two spot-check defects
 * found in the citation metadata and are permanent regressions that stay green
 * because the metadata now classifies sourced content correctly. No clinical wording is asserted.
 */
describe('protocol citation source fidelity (QA3 spot checks)', () => {
  it('respond note keeps the source-quoted 10-second bound out of the unsupported bucket', () => {
    // ARC "Unresponsive & Breathing Person" > "How do I check a person who appears
    // unresponsive?": "Check for responsiveness for no more than 10 seconds using
    // shout-tap-shout ..." plus "Note: Check for no more than 10 seconds." The
    // 10-second bound IS a quoted care rule; only the countdown widget and the
    // "Do not wait for the timer" phrasing are local UI/UX wording.
    const text = note('collapse', 'respond');
    expect(text).not.toMatch(/the 10-second timer and "Do not wait for the timer" are UI\/UX wording, not a quoted care rule/);
    expect(text).not.toMatch(/10-second timer[^.]*not a quoted care rule/);
  });

  it('cpr note cites the visible heading that contains the direct CPR/AED paragraph', () => {
    // ARC "Unresponsive & Breathing Person": the sentence "For a person who is
    // unresponsive and not breathing or only gasping (cardiac arrest), start CPR and
    // use an AED immediately." is under the heading "How do I check a person who
    // appears unresponsive?", NOT under "Emergency Steps" (which only lists scene
    // safety, signs/symptoms, calling 9-1-1 + AED equipment, and "Give Care").
    const text = note('collapse', 'cpr');
    expect(text).toMatch(/Section: How do I check a person who appears unresponsive\?/);
    expect(text).not.toMatch(/Section: Emergency Steps\./);
  });
});
