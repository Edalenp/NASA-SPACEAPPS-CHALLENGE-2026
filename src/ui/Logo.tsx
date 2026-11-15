import './logo.css';
/**
 * VITRUVIO lockup v0.3, "pulse in orbit". The orbit is a circle; a heartbeat crosses it from
 * outside and leaves through the other side, ending in a square in the normal state's green:
 * the crew's health, read in space, still well. The wordmark is set light and wide, like the
 * display type. No ® symbol: the name is not registered.
 */
export function Mark({ size = 28 }: { size?: number }) {
  // Small marks need heavier strokes to survive at 16 to 30 px.
  const small = size < 32;
  return (
    <svg className="vt-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth={small ? 4.5 : 3} />
      <path d="M3 35 H18 L22.5 28 L27.5 45 L32.5 13 L37.5 39 L41.5 35 H52" fill="none" stroke="currentColor" strokeWidth={small ? 4.5 : 3.2} strokeLinejoin="miter" strokeLinecap="square" />
      <rect x="54" y="31" width="8" height="8" fill="var(--vt-normal, #8fcf5c)" />
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
