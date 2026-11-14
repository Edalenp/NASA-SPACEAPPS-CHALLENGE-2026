import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMission } from './mission';

describe('select', () => {
  beforeEach(() => useMission.setState({ selected: 'heart', focus: null, rotation: 0 }));

  it('inspects the picked system', () => {
    useMission.getState().select('lungs');
    expect(useMission.getState()).toMatchObject({ selected: 'lungs', focus: 'lungs' });
  });

  it('returns to the whole body when the inspected system is picked again', () => {
    const { select } = useMission.getState();
    select('lungs');
    useMission.setState({ rotation: 1 });
    const reset = useMission.getState().reset;
    select('lungs');
    expect(useMission.getState()).toMatchObject({ selected: 'lungs', focus: null, rotation: 0, reset: reset + 1 });
  });

  it('inspects again after returning to the whole body', () => {
    const { select } = useMission.getState();
    select('head');
    select('head');
    select('head');
    expect(useMission.getState().focus).toBe('head');
  });
});
