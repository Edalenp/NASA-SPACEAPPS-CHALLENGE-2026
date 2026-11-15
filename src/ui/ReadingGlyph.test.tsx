import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { indicators, type IndicatorId, type ReadingValue } from '../data/indicators';
import { ReadingGlyph } from './ReadingGlyph';

const draw = (id: IndicatorId, value: ReadingValue | null) =>
  renderToStaticMarkup(<ReadingGlyph id={id} readings={{ [id]: value }} />);

/** Two readings far apart for each indicator: a usual one and an extreme one. */
function pair(id: IndicatorId): [ReadingValue, ReadingValue] {
  const ind = indicators[id];
  if (ind.kind === 'choice') return [ind.options[0].value, ind.options[ind.options.length - 1].value];
  const usual = ind.usual ? (ind.usual[0] + ind.usual[1]) / 2 : ind.scale[0];
  return [usual, ind.scale[1]];
}

describe('ReadingGlyph', () => {
  it.each(Object.keys(indicators) as IndicatorId[])('draws %s from its value', (id) => {
    const [usual, extreme] = pair(id);
    expect(draw(id, usual)).not.toBe(draw(id, extreme));
  });

  it.each(Object.keys(indicators) as IndicatorId[])('draws %s without a reading', (id) => {
    expect(draw(id, null)).toContain('<svg');
  });

  it('beats at the recorded pulse', () => {
    expect(draw('pulse', 120)).toContain('--glyph-period:0.50s');
  });

  it('fires every neuron when alert and none when unresponsive', () => {
    const count = (markup: string) => markup.split('glyph-spark').length - 1;
    expect(count(draw('consciousness', 'alert'))).toBe(6);
    expect(count(draw('consciousness', 'voice'))).toBeLessThan(6);
    expect(count(draw('consciousness', 'unresponsive'))).toBe(0);
  });

  it('fills the mood steps up to the recorded mood', () => {
    expect(draw('mood', 3).split('glyph-fill').length - 1).toBe(3);
  });
});
