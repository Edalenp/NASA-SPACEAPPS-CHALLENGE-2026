import {
  indicators,
  type IndicatorId,
  type ReadingValue,
} from "../data/indicators";
import { useAssessment } from "../store/derived";

/** Static reading against its personal baseline, never a live waveform. The band is the crew
 *  member's own range from their history once the engine has enough readings for one, and the
 *  indicator's usual range until then. */
export function BaselineTrack({
  id,
  value,
}: {
  id: IndicatorId;
  value: ReadingValue | null;
}) {
  const { baselines } = useAssessment();
  const ind = indicators[id];
  if (ind.kind !== "number" || !ind.usual) return null;
  const personal = baselines[id];
  const band: [number, number] = personal ? [personal.lower, personal.upper] : ind.usual;
  const pct = (n: number) =>
    Math.min(
      100,
      Math.max(0, ((n - ind.scale[0]) / (ind.scale[1] - ind.scale[0])) * 100),
    );
  return (
    <span className="baseline-track" aria-hidden="true">
      <i
        className="baseline-band"
        style={{
          left: `${pct(band[0])}%`,
          width: `${pct(band[1]) - pct(band[0])}%`,
        }}
      />
      {typeof value === "number" && (
        <i className="baseline-needle" style={{ left: `${pct(value)}%` }} />
      )}
    </span>
  );
}
