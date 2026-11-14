import {
  indicators,
  type IndicatorId,
  type ReadingValue,
} from "../data/indicators";

/** Static reading against its personal baseline, never a live waveform. */
export function BaselineTrack({
  id,
  value,
}: {
  id: IndicatorId;
  value: ReadingValue | null;
}) {
  const ind = indicators[id];
  if (ind.kind !== "number" || !ind.usual) return null;
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
          left: `${pct(ind.usual[0])}%`,
          width: `${pct(ind.usual[1]) - pct(ind.usual[0])}%`,
        }}
      />
      {typeof value === "number" && (
        <i className="baseline-needle" style={{ left: `${pct(value)}%` }} />
      )}
    </span>
  );
}
