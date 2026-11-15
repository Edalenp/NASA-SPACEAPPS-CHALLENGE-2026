import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Baseline } from '../engine';
import type { IndicatorId } from '../data/indicators';

const store = vi.hoisted(() => ({
  baselines: {} as Partial<Record<IndicatorId, Baseline>>,
}));
vi.mock('../store/derived', () => ({ useAssessment: () => store }));

import { BaselineTrack } from './BaselineTrack';

const render = (baselines: Partial<Record<IndicatorId, Baseline>>) => {
  store.baselines = baselines;
  return renderToStaticMarkup(<BaselineTrack id="glucose" value={100} />);
};

describe('BaselineTrack personal band', () => {
  it('omits the personal band at zero prior readings but keeps the real marker', () => {
    const markup = render({});
    expect(markup).not.toContain('baseline-band');
    expect(markup).toContain('baseline-needle');
  });

  it('draws the band only when an actual baseline exists', () => {
    const markup = render({
      glucose: { mean: 100, sd: 5, lower: 90, upper: 110, sampleCount: 7 },
    });
    expect(markup).toContain('baseline-band');
    expect(markup).toContain('baseline-needle');
  });
});
