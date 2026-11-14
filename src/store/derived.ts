import { useMemo } from 'react';
import { useMission } from './mission';
import { systems, type SystemId } from '../data/mission';
import { news2 } from '../engine/news2';
import { systemStatus, type Status } from '../engine/status';

/** NEWS2 and per-system states, derived from the current readings. */
export function useAssessment() {
  const readings = useMission((s) => s.readings);
  return useMemo(() => {
    const score = news2(readings);
    const states = Object.fromEntries(systems.map((s) => [s.id, systemStatus(s.id, readings)])) as Record<SystemId, Status>;
    const counts = { normal: 0, watch: 0, alert: 0, missing: 0 } as Record<Status, number>;
    Object.values(states).forEach((st) => counts[st]++);
    return { score, states, counts, readings };
  }, [readings]);
}
