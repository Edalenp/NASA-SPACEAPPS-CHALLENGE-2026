import { useAssessment } from "../../store/derived";
import { indicators, type IndicatorId } from "../../data/indicators";

export function PersonalRange({
  id,
  compact = false,
}: {
  id: IndicatorId;
  compact?: boolean;
}) {
  const { baselines, readings, sampleCounts } = useAssessment();
  const base = baselines[id];
  const value = readings[id];
  const ind = indicators[id];
  if (ind.kind !== "number" || id === "exercise")
    return (
      <span className="personal-empty">Personal baseline not applicable</span>
    );
  if (base && typeof value !== "number")
    return (
      <span className="personal-empty">
        Personal range ready · record today’s reading
      </span>
    );
  if (compact && (!base || typeof value !== "number"))
    return (
      <svg
        width="100%"
        height="12"
        role="img"
        aria-label="Personal range pending"
      >
        <line
          x1="0"
          x2="100%"
          y1="6"
          y2="6"
          stroke="currentColor"
          strokeDasharray="2 3"
        />
      </svg>
    );
  if (!base || typeof value !== "number")
    return (
      <span className="personal-empty">
        {compact
          ? "Base pending"
          : `Insufficient data · ${sampleCounts[id] ?? 0}/7 prior readings`}
      </span>
    );
  const min = Math.min(base.lower, value),
    max = Math.max(base.upper, value);
  const span = Math.max(max - min, 1);
  const x = (v: number) => 8 + ((v - min) / span) * 184;
  return (
    <span className="personal-range">
      <svg
        viewBox="0 0 200 20"
        role="img"
        aria-label={`Personal range ${base.lower.toFixed(1)} to ${base.upper.toFixed(1)} ${ind.unit}. Current ${value}.`}
      >
        <line
          x1="0"
          x2="200"
          y1="10"
          y2="10"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x={x(base.lower)}
          y="7"
          width={Math.max(1, x(base.upper) - x(base.lower))}
          height="6"
          fill="var(--vt-recess)"
          stroke="currentColor"
          strokeWidth="0.6"
        />
        <line
          x1={x(value)}
          x2={x(value)}
          y1="3"
          y2="17"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      {!compact && (
        <small>
          {base.lower.toFixed(1)}–{base.upper.toFixed(1)} {ind.unit} ·{" "}
          {base.sampleCount} prior readings
        </small>
      )}
    </span>
  );
}
