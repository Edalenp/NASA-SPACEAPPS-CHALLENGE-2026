import { describe, expect, it } from 'vitest';
import { crewBand, crewBandNotices } from './osd575';

describe('Inspiration4 crew bands (RF-27)', () => {
  it('gives the OSD-575 band for the four analytes the app records', () => {
    expect(crewBand('glucose')).toMatchObject({ min: 36, max: 103, samples: 28, crewCount: 4 });
    expect(crewBand('calcium', 'pre')).toMatchObject({ min: 9.3, max: 10.3, samples: 12 });
    expect(crewBand('sodium', 'post')).toMatchObject({ min: 136, max: 141, samples: 16 });
    expect(crewBand('potassium')).toMatchObject({ min: 3, max: 5.9 });
  });

  it('draws nothing for readings the study did not measure', () => {
    expect(crewBand('pulse')).toBeNull();
    expect(crewBand('consciousness')).toBeNull();
  });

  it('carries the study notices: not a normal interval, not in-flight data', () => {
    expect(crewBandNotices().join(' ')).toMatch(/not normal intervals/i);
    expect(crewBandNotices().join(' ')).toMatch(/not in-flight data/i);
  });
});
