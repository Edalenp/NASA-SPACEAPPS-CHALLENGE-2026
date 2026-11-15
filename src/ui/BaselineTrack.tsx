import {
  indicators,
  type IndicatorId,
  type ReadingValue,
} from "../data/indicators";
import { useAssessment } from "../store/derived";

/** Static reading against its personal baseline, never a live waveform. The band is the crew
 *  member's own observed range once the engine has enough readings; without one, only the
 *  axis and the real marker are drawn. */
export function BaselineTrack({
  id,
  value,
}: {
  id: IndicatorId;
  value: ReadingValue | null;
}) {
  const { baselines } = useAssessment();
  const ind = indicators[id];
  if (ind.kind !== "number") return null;
  const personal = baselines[id];
  const pct = (n: number) =>
    Math.min(
      100,
      Math.max(0, ((n - ind.scale[0]) / (ind.scale[1] - ind.scale[0])) * 100),
    );
  return (
    <span className="baseline-track" aria-hidden="true">
      {personal && (
        <i
          className="baseline-band"
          style={{
            left: `${pct(personal.lower)}%`,
            width: `${pct(personal.upper) - pct(personal.lower)}%`,
          }}
        />
      )}
      {typeof value === "number" && (
        <i className="baseline-needle" style={{ left: `${pct(value)}%` }} />
      )}
    </span>
  );
}
