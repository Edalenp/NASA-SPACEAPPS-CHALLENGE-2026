import type { IndicatorId } from "./indicators";
import type { IndicatorType } from "../engine/types";

/** UI aliases only; clinical ranges and units come from the backend catalog. */
export const indicatorTypes: Partial<Record<IndicatorId, IndicatorType>> = {
  pulse: "heartRate",
  systolic: "systolicBloodPressure",
  diastolic: "diastolicBloodPressure",
  respiration: "respiratoryRate",
  spo2: "oxygenSaturation",
  temperature: "temperature",
  glucose: "glucose",
  sleep: "sleepHours",
  mood: "mood",
  reaction: "reactionTime",
};
