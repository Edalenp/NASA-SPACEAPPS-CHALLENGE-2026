import { useMemo } from "react";
import { useMission } from "./mission";
import { assess } from "../features/measurements/assessment";

/** NEWS2 and per-system states, derived from the current readings. */
export function useAssessment() {
  const entries = useMission((s) => s.entries);
  const now = useMission((s) => s.now);
  const environment = useMission((s) => s.environment);
  return useMemo(
    () => assess(entries, now, environment),
    [entries, now, environment],
  );
}
