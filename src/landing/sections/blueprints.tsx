/**
 * Blueprint parts: technical drawings in outline only, one ink in three weights (bp-line,
 * bp-thin, bp-fine), styled by .bp in sections.css.
 */

/** The crew vehicle in elevation: solar wing, habitat, service module and dish. Origin at its centre. */
export function Ship({ light = true }: { light?: boolean }) {
  return (
    <g>
      <rect x="-62" y="-14" width="34" height="28" className="bp-line" />
      <path d="M -53.5 -14 V 14 M -45 -14 V 14 M -36.5 -14 V 14 M -62 0 H -28" className="bp-fine" />
      <path d="M -28 0 H -20" className="bp-line" />
      <rect x="-20" y="-11" width="30" height="22" className="bp-line" />
      <path d="M -12 -11 V 11 M 2 -11 V 11" className="bp-fine" />
      <rect x="10" y="-7" width="14" height="14" className="bp-line" />
      <circle cx="17" cy="0" r="3" className="bp-fine" />
      <path d="M 24 0 H 34 M 34 -16 Q 50 0 34 16 M 34 -16 L 46 0 L 34 16" className="bp-line" />
      {light && <circle cx="-5" cy="0" r="2" className="delay-light" />}
    </g>
  );
}
