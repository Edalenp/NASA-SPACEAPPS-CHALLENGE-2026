import { useHealthStore } from "./healthStore";

/** NEWS2 and per-system states, derived once in the health store. */
export function useAssessment() {
  return useHealthStore((s) => s.assessment);
}
