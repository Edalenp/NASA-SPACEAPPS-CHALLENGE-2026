/**
 * VITRUVIO lockup v0.2. The mark is Leonardo's construction: a square (the
 * cabin) and a circle (the orbit) on one ground line, circle radius 0.607 of
 * the side, the person as a dot at the circle's centre. The wordmark carries
 * the overline from the console prototype. No ® symbol: the name is not registered.
 */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="vt-mark" width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth={size < 32 ? 8 : 6}>
        <rect x="14" y="24" width="100" height="100" />
        <circle cx="64" cy="63.34" r="60.66" />
      </g>
      <circle cx="64" cy="63.34" r={size < 32 ? 10 : 8} fill="var(--vt-alert)" />
    </svg>
  );
}

export function Lockup() {
  return (
    <span className="vt-lockup">
      <Mark size={30} />
      <span className="vt-lockup-text">
        <b>VITRUVIO</b>
        <small>Autonomous crew health</small>
      </span>
    </span>
  );
}
