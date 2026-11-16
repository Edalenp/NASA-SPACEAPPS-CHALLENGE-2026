/**
 * The delay as a blueprint: a technical drawing in outline only. Mars and Earth as wireframe
 * globes with their axial tilt, the crew vehicle in elevation, the message's route out and back,
 * and a dimension line for the distance. Only the outgoing trail carries colour, green to red,
 * because the wait is what turns a reading into an emergency.
 * The signal, the trails and Earth's ring are animated by the section (Delay.tsx).
 */
import { Ship } from './blueprints';

export const OUT_PATH = 'M 282 118 C 480 -8, 800 -12, 986 146';
export const BACK_PATH = 'M 988 238 C 792 354, 472 346, 240 154';

const MARS = { cx: 150, cy: 262, r: 56, tilt: 25.2 };
const EARTH = { cx: 1052, cy: 192, r: 78, tilt: 23.4 };

/** A wireframe globe: outline, meridians, parallels, the axis at its tilt and a centre mark. */
function Globe({ cx, cy, r, tilt, id }: { cx: number; cy: number; r: number; tilt: number; id: string }) {
  const parallels = [-60, -30, 0, 30, 60].map((lat) => {
    const rad = (lat * Math.PI) / 180;
    return { y: cy - r * Math.sin(rad), rx: r * Math.cos(rad), ry: r * Math.cos(rad) * 0.16 };
  });
  return (
    <g>
      <clipPath id={id}><circle cx={cx} cy={cy} r={r} /></clipPath>
      <g transform={`rotate(${tilt} ${cx} ${cy})`}>
        <g clipPath={`url(#${id})`} className="bp-fine">
          {[0.34, 0.68, 0.92].map((k) => <ellipse key={k} cx={cx} cy={cy} rx={r * k} ry={r} />)}
          {parallels.map((p) => <ellipse key={p.y} cx={cx} cy={p.y} rx={p.rx} ry={p.ry} />)}
        </g>
        <path d={`M ${cx} ${cy - r - 22} V ${cy + r + 22}`} className="bp-axis" />
      </g>
      <path d={`M ${cx} ${cy - r - 22} V ${cy + r + 22}`} className="bp-construct" />
      <path d={`M ${cx} ${cy - r - 18} A ${r + 18} ${r + 18} 0 0 1 ${cx + (r + 18) * Math.sin((tilt * Math.PI) / 180)} ${cy - (r + 18) * Math.cos((tilt * Math.PI) / 180)}`} className="bp-thin" />
      <text x={cx + 10} y={cy - r - 24} className="bp-note">{tilt}°</text>
      <circle cx={cx} cy={cy} r={r} className="bp-line" />
      <path d={`M ${cx - 6} ${cy} H ${cx + 6} M ${cx} ${cy - 6} V ${cy + 6}`} className="bp-thin" />
      {[0, 90, 180, 270].map((a) => {
        const rad = (a * Math.PI) / 180;
        const [x1, y1, x2, y2] = [cx + Math.cos(rad) * (r + 4), cy + Math.sin(rad) * (r + 4), cx + Math.cos(rad) * (r + 12), cy + Math.sin(rad) * (r + 12)];
        return <path key={a} d={`M ${x1} ${y1} L ${x2} ${y2}`} className="bp-thin" />;
      })}
    </g>
  );
}

export function DelayScene() {
  const { cx: ex, cy: ey, r: er } = EARTH;
  const { cx: mx, cy: my, r: mr } = MARS;
  return (
    <svg className="bp delay-scene" viewBox="0 0 1200 400" role="img" aria-label="Blueprint: a message travels from the crew vehicle near Mars to Earth and back.">
      <defs>
        <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 H 0 V 20" className="bp-grid-minor" /></pattern>
        <pattern id="bp-grid-major" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 H 0 V 100" className="bp-grid-major" /></pattern>
        <linearGradient id="bp-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.12" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.88" stopColor="#fff" stopOpacity="1" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="bp-grid-mask"><rect width="1200" height="400" fill="url(#bp-fade)" /></mask>
        <linearGradient id="delay-out" gradientUnits="userSpaceOnUse" x1="282" x2="986" y1="0" y2="0">
          <stop offset="0" stopColor="#8fcf5c" /><stop offset="0.55" stopColor="#f99a35" /><stop offset="1" stopColor="#f2526c" />
        </linearGradient>
      </defs>

      <g mask="url(#bp-grid-mask)">
        <rect width="1200" height="400" fill="url(#bp-grid)" />
        <rect width="1200" height="400" fill="url(#bp-grid-major)" />
      </g>

      {/* Title block, as on a drawing sheet. */}
      <g className="bp-titleblock">
        <path d="M 8 8 H 220 V 44 H 8 Z M 8 26 H 220 M 120 26 V 44" className="bp-thin" />
        <text x="16" y="21" className="bp-note">VITRUVIO · FIG. 01</text>
        <text x="16" y="39" className="bp-note">COMMS DELAY</text>
        <text x="128" y="39" className="bp-note">MARS–EARTH</text>
      </g>

      {/* The route: dashed guides, the trails drawn over them, and the peak's annotation. */}
      <path d={OUT_PATH} className="bp-route" />
      <path d={BACK_PATH} className="bp-route" />
      <path d={OUT_PATH} className="delay-out" stroke="url(#delay-out)" />
      <path d={BACK_PATH} className="delay-back" />
      <text x="634" y="12" className="bp-note" textAnchor="middle">QUESTION · 3 TO 22 MIN ONE WAY</text>
      <path d="M 614 342 V 362" className="bp-thin" />
      <text x="622" y="360" className="bp-note">ANSWER · AS LONG AGAIN</text>

      {/* Mars and the crew vehicle's orbit. */}
      <Globe {...MARS} id="bp-mars" />
      <g className="bp-fine">
        <ellipse cx={mx - 18} cy={my + 14} rx="9" ry="6" /><ellipse cx={mx + 22} cy={my - 18} rx="6" ry="4" /><ellipse cx={mx + 10} cy={my + 32} rx="4" ry="3" />
      </g>
      <ellipse cx={mx} cy={my} rx="110" ry="30" transform={`rotate(-22 ${mx} ${my})`} className="bp-route" />
      <path d={`M ${mx - mr * 0.7} ${my + mr * 0.7} L ${mx - 96} ${my + 96} H ${mx - 40}`} className="bp-thin" />
      <text x={mx - 92} y={my + 90} className="bp-label">MARS</text>
      <text x={mx - 92} y={my + 108} className="bp-note">R 3,389.5 KM</text>

      {/* Crew vehicle, in elevation: solar wing, habitat, service module, dish. */}
      <g className="delay-ship" transform="translate(230 136) rotate(-14)"><Ship /></g>
      <path d="M 196 128 L 176 104 H 40" className="bp-thin" />
      <text x="40" y="98" className="bp-label">CREW VEHICLE</text>
      <text x="40" y="120" className="bp-note">VITRUVIO ON BOARD</text>

      {/* Earth. */}
      <circle cx={ex} cy={ey} r={er + 12} className="bp-atmosphere" />
      <Globe {...EARTH} id="bp-earth" />
      <g clipPath="url(#bp-earth)" className="bp-land">
        <path d={`M ${ex - 46} ${ey - 52} C ${ex - 24} ${ey - 70}, ${ex + 8} ${ey - 64}, ${ex + 14} ${ey - 46} C ${ex + 20} ${ey - 30}, ${ex} ${ey - 26}, ${ex - 10} ${ey - 12} C ${ex - 20} ${ey}, ${ex - 40} ${ey - 6}, ${ex - 48} ${ey - 22} C ${ex - 54} ${ey - 34}, ${ex - 54} ${ey - 44}, ${ex - 46} ${ey - 52} Z`} />
        <path d={`M ${ex + 22} ${ey - 4} C ${ex + 40} ${ey - 12}, ${ex + 62} ${ey - 2}, ${ex + 66} ${ey + 18} C ${ex + 70} ${ey + 38}, ${ex + 52} ${ey + 58}, ${ex + 36} ${ey + 60} C ${ex + 22} ${ey + 62}, ${ex + 16} ${ey + 46}, ${ex + 18} ${ey + 30} C ${ex + 20} ${ey + 16}, ${ex + 12} ${ey + 2}, ${ex + 22} ${ey - 4} Z`} />
        <path d={`M ${ex - 30} ${ey + 22} C ${ex - 18} ${ey + 16}, ${ex - 4} ${ey + 26}, ${ex - 8} ${ey + 42} C ${ex - 12} ${ey + 56}, ${ex - 28} ${ey + 60}, ${ex - 34} ${ey + 48} C ${ex - 40} ${ey + 38}, ${ex - 40} ${ey + 28}, ${ex - 30} ${ey + 22} Z`} />
      </g>
      <circle cx={ex} cy={ey} r={er + 6} className="delay-earth-ring" />
      <path d={`M ${ex + er * 0.7} ${ey + er * 0.7} L ${ex + 96} ${ey + 112} H ${ex + 140}`} className="bp-thin" />
      <text x={ex + 140} y={ey + 106} className="bp-label" textAnchor="end">EARTH</text>
      <text x={ex + 140} y={ey + 124} className="bp-note" textAnchor="end">R 6,371 KM</text>

      {/* Distance between the two, as a dimension line. */}
      <g className="bp-dimension">
        <path d={`M ${mx} ${my + mr + 26} V 392 M ${ex} ${ey + er + 26} V 392`} className="bp-construct" />
        <path d={`M ${mx} 384 H 540 M 760 384 H ${ex}`} className="bp-thin" />
        <path d={`M ${mx + 10} 379 L ${mx} 384 L ${mx + 10} 389 M ${ex - 10} 379 L ${ex} 384 L ${ex - 10} 389`} className="bp-thin" />
        <text x="650" y="388" className="bp-note" textAnchor="middle">54.6 TO 401 MILLION KM</text>
      </g>

      {/* The message: a reticle carried along the route. */}
      <g className="delay-signal" transform="translate(240 154)">
        <circle r="12" className="delay-signal-ping" />
        <circle r="7" className="bp-line" />
        <path d="M -13 0 H -9 M 9 0 H 13 M 0 -13 V -9 M 0 9 V 13" className="bp-line" />
        <circle r="2.5" className="delay-signal-core" />
      </g>
    </svg>
  );
}
