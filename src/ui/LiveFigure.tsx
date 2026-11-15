/**
 * A figure that always shows the value it was given. No digits are invented between
 * frames: an unavailable value is the caller's placeholder, rendered as-is.
 */
export function LiveFigure({ value }: { value: string }) {
  return (
    <span className="live-figure" data-live-figure style={{ minWidth: `${value.length}ch` }}>
      {value}
    </span>
  );
}
