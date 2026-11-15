import { describe, expect, it } from 'vitest';
import { formatValue, indicators } from './indicators';

describe('formatValue', () => {
  it('gives every choice its own short form', () => {
    for (const ind of Object.values(indicators)) {
      if (ind.kind !== 'choice') continue;
      const shown = ind.options.map((o) => formatValue(ind.id, o.value));
      expect(new Set(shown).size).toBe(shown.length);
    }
  });

  it('reads consciousness and oxygen as words, not the first word of a sentence', () => {
    expect(formatValue('consciousness', 'voice')).toBe('Voice');
    expect(formatValue('consciousness', 'pain')).toBe('Pain');
    expect(formatValue('consciousness', 'newConfusion')).toBe('Confused');
    expect(formatValue('oxygen', 'oxygen')).toBe('Oxygen');
  });

  it('formats numbers and missing readings', () => {
    expect(formatValue('temperature', 36.54)).toBe('36.5');
    expect(formatValue('pulse', null)).toBe('—');
  });
});
