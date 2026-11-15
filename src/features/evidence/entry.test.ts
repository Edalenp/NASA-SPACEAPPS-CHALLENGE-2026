import { describe, expect, it } from 'vitest';
import { evidenceFromSearch } from './entry';
describe('landing evidence links', () => {
  it('accepts only the four supported evidence destinations', () => {
    for (const id of ['hrp', 'radiation', 'osd575', 'iss-kit']) expect(evidenceFromSearch(`?evidence=${id}`)).toBe(id);
    for (const search of ['', '?evidence=emergency', '?evidence=https://example.com', '?evidence=unknown']) expect(evidenceFromSearch(search)).toBeNull();
  });
});
