import { describe, expect, it } from 'vitest';
import { previewReading } from './preview';
import type { RecordEntry } from './adapter';
const now = '2026-11-14T18:00:00.000Z';
describe('unsaved reading preview', () => {
  it.each([[72, 'normal', 0], [100, 'watch', 1], [140, 'alert', 3]] as const)('uses the current engine for pulse %s', (value, status, score) => {
    const result = previewReading([], now, 'transit', 'pulse', value);
    expect(result?.deviation.status).toBe(status);
    expect(result?.score).toBe(score);
  });
  it('does not change the original entries and rejects invalid input', () => {
    const entries: RecordEntry[] = [];
    previewReading(entries, now, 'transit', 'pulse', 72);
    expect(entries).toEqual([]);
    expect(previewReading(entries, now, 'transit', 'pulse', 1000)).toBeNull();
  });
});
