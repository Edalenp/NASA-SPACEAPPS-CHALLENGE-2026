import { describe, expect, it } from 'vitest';
import { causeOf } from './cause';
import type { IndicatorId } from '../../data/indicators';
import type { Status } from '../../engine/status';

const devs = (map: Partial<Record<IndicatorId, Status>>) =>
  new Proxy({} as Record<IndicatorId, { status: Status }>, { get: (_, id) => ({ status: map[id as IndicatorId] ?? 'normal' }) });

describe('the cause of a system state', () => {
  it('points at the reading that made the system red', () => {
    expect(causeOf(['pulse', 'systolic', 'diastolic'], devs({ systolic: 'alert' }))).toBe('systolic');
  });
  it('keeps the first reading when all are well', () => {
    expect(causeOf(['pulse', 'systolic', 'diastolic'], devs({}))).toBe('pulse');
  });
  it('prefers alert over watch', () => {
    expect(causeOf(['pulse', 'systolic', 'diastolic'], devs({ pulse: 'watch', diastolic: 'alert' }))).toBe('diastolic');
  });
});
