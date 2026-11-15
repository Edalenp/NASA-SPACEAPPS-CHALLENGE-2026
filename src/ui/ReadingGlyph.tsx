import type { CSSProperties } from "react";
import {
  consciousnessActivity,
  indicators,
  type IndicatorId,
  type ReadingValue,
} from "../data/indicators";

type Readings = Partial<Record<IndicatorId, ReadingValue | null>>;

/** Position of a reading on its ruler scale, 0 to 1. */
function along(id: IndicatorId, value: ReadingValue | null | undefined) {
  const ind = indicators[id];
  if (ind.kind !== "number" || typeof value !== "number") return null;
  return Math.min(1, Math.max(0, (value - ind.scale[0]) / (ind.scale[1] - ind.scale[0])));
}

/** How far a reading sits from the middle of its usual range, 0 inside it, up to 1. */
function strain(id: IndicatorId, value: ReadingValue | null | undefined) {
  const ind = indicators[id];
  if (ind.kind !== "number" || typeof value !== "number" || !ind.usual) return 0;
  const half = (ind.usual[1] - ind.usual[0]) / 2;
  const off = Math.abs(value - (ind.usual[0] + half)) - half;
  return Math.min(1, Math.max(0, off / (half * 4)));
}

const point = (cx: number, cy: number, r: number, t: number) => {
  const a = Math.PI * (1 - t);
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
};

/**
 * Line drawing that accompanies a reading. Decorative, never a live signal:
 * each one is set by the recorded value (the beat at the recorded rate, the
 * arcs at the recorded pressures). Motion stops under reduced motion.
 */
export function ReadingGlyph({ id, readings }: { id: IndicatorId; readings: Readings }) {
  const value = readings[id];
  return (
    <svg className={`glyph glyph-${id}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {id === "pulse" || id === "respiration" ? (
        <Rhythm id={id} value={value} />
      ) : id === "systolic" || id === "diastolic" ? (
        <Pressure readings={readings} />
      ) : id === "spo2" ? (
        <Globe t={along(id, value)} />
      ) : id === "temperature" ? (
        <Waves strain={strain(id, value)} />
      ) : id === "glucose" ? (
        <Cone t={along(id, value)} />
      ) : id === "consciousness" ? (
        <Neurons state={typeof value === "string" ? value : null} />
      ) : id === "exercise" ? (
        <Effort t={along(id, value)} />
      ) : id === "sleep" ? (
        <Moon t={along(id, value)} />
      ) : id === "mood" ? (
        <Level value={typeof value === "number" ? value : null} />
      ) : (
        <Orbit supplemental={value === "oxygen"} />
      )}
    </svg>
  );
}

/** Rings for the pulse, ellipses for breathing, at the recorded rate. */
function Rhythm({ id, value }: { id: "pulse" | "respiration"; value: ReadingValue | null | undefined }) {
  const rate = typeof value === "number" && value > 0 ? value : id === "pulse" ? 72 : 14;
  const style = { "--glyph-period": `${(60 / rate).toFixed(2)}s` } as CSSProperties;
  if (id === "respiration") {
    return (
      <g className="glyph-breath" style={style}>
        {[40, 30, 20].map((r) => <ellipse key={r} cx="50" cy="50" rx={r} ry={r * 0.62} />)}
        <circle className="glyph-dot" cx="50" cy="50" r="2.6" />
      </g>
    );
  }
  return (
    <g>
      {[16, 28, 40].map((r) => <circle key={r} className="glyph-faint" cx="50" cy="50" r={r} />)}
      <circle className="glyph-beat" style={style} cx="50" cy="50" r="44" />
      <circle className="glyph-beat is-late" style={style} cx="50" cy="50" r="44" />
      <circle className="glyph-dot" cx="50" cy="50" r="3" />
    </g>
  );
}

/** Systolic on the outer arc, diastolic on the inner, each drawn up to its reading. */
function Pressure({ readings }: { readings: Readings }) {
  const arcs = [
    { id: "systolic" as const, r: 40 },
    { id: "diastolic" as const, r: 28 },
  ];
  return (
    <g transform="translate(0 18)">
      {arcs.map(({ id, r }) => {
        const t = along(id, readings[id]);
        const length = Math.PI * r;
        const [x, y] = point(50, 62, r, t ?? 0);
        return (
          <g key={id}>
            <path className="glyph-faint" d={`M ${50 - r} 62 A ${r} ${r} 0 0 1 ${50 + r} 62`} />
            {Array.from({ length: 7 }, (_, i) => {
              const [tx, ty] = point(50, 62, r, i / 6);
              return <circle key={i} className="glyph-tick" cx={tx} cy={ty} r="1.1" />;
            })}
            {t !== null && (
              <>
                <path
                  className="glyph-draw"
                  d={`M ${50 - r} 62 A ${r} ${r} 0 0 1 ${50 + r} 62`}
                  style={{ strokeDasharray: length, "--glyph-len": `${length}`, "--glyph-gap": `${length * (1 - t)}` } as CSSProperties}
                  key={`${id}-${t}`}
                />
                <circle className="glyph-dot" cx={x} cy={y} r="2.8" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** A turning wire globe; the dot rides at the saturation's height. */
function Globe({ t }: { t: number | null }) {
  return (
    <g>
      <circle cx="50" cy="50" r="40" />
      {[13, 27].map((ry) => <ellipse key={ry} className="glyph-faint" cx="50" cy="50" rx="40" ry={ry} />)}
      {[0, 1, 2].map((i) => (
        <ellipse key={i} className="glyph-meridian" cx="50" cy="50" rx="40" ry="40" style={{ animationDelay: `${-i * 3}s` }} />
      ))}
      <circle className="glyph-dot" cx="50" cy={90 - (t ?? 0.5) * 80} r="3" />
    </g>
  );
}

/** Three slow waves; they swell as the temperature leaves its usual range. */
function Waves({ strain }: { strain: number }) {
  const amp = 5 + strain * 10;
  // Half-waves 25 wide from -100 to 200, so a 50-unit drift loops seamlessly.
  const wave = (y: number, a: number) => {
    let d = `M -100 ${y}`;
    for (let i = 0; i < 12; i++) d += ` q 12.5 ${i % 2 ? a : -a} 25 0`;
    return d;
  };
  return (
    <g>
      {[34, 50, 66].map((y, i) => (
        <path key={y} className={`glyph-wave ${i === 1 ? "" : "glyph-faint"}`} d={wave(y, amp * (i === 1 ? 1 : 0.6))} style={{ animationDelay: `${-i * 1.6}s` }} />
      ))}
      <circle className="glyph-dot" cx="50" cy="50" r="2.8" />
    </g>
  );
}

/** A spiralling cone of rings; the dot sits at the reading's height. */
function Cone({ t }: { t: number | null }) {
  return (
    <g className="glyph-spin">
      {Array.from({ length: 7 }, (_, i) => {
        const rx = 40 - i * 5.5;
        return <ellipse key={i} className={i % 2 ? "glyph-faint" : undefined} cx="50" cy={22 + i * 9} rx={rx} ry={rx * 0.22} />;
      })}
      <circle className="glyph-dot" cx="50" cy={78 - (t ?? 0.5) * 56} r="2.8" />
    </g>
  );
}

/** A few neurons wired together, firing as the ACVPU level says: all six in turn when alert,
 *  out of order and faster with new confusion, fewer and slower down the scale, none when
 *  unresponsive or not yet recorded. */
function Neurons({ state }: { state: string | null }) {
  const nodes = [[24, 34], [52, 20], [78, 38], [66, 72], [32, 70], [50, 48]] as const;
  const wires = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [5, 0], [5, 2], [5, 3]] as const;
  const rate = state ? consciousnessActivity[state] ?? 1 : 0;
  const firing = Math.round(Math.min(rate, 1) * nodes.length);
  const period = 2.7 / Math.max(rate, 0.1);
  const order = rate > 1 ? [0, 4, 1, 5, 3, 2] : [0, 1, 2, 3, 4, 5];
  return (
    <g>
      {wires.map(([a, b]) => (
        <line key={`${a}-${b}`} className="glyph-faint" x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={i}
          className={i < firing ? "glyph-dot glyph-spark" : "glyph-dot glyph-faint"}
          cx={x}
          cy={y}
          r={i === 5 ? 3.4 : 2.6}
          style={i < firing ? { animationDuration: `${period.toFixed(2)}s`, animationDelay: `${((order[i] * period) / nodes.length).toFixed(2)}s` } : undefined}
        />
      ))}
    </g>
  );
}

/** A ring that fills with the day's exercise, along its scale. */
function Effort({ t }: { t: number | null }) {
  const length = 2 * Math.PI * 38;
  const [x, y] = [50 + 38 * Math.sin((t ?? 0) * Math.PI * 2), 50 - 38 * Math.cos((t ?? 0) * Math.PI * 2)];
  return (
    <g>
      <circle className="glyph-faint" cx="50" cy="50" r="38" />
      <circle className="glyph-faint" cx="50" cy="50" r="24" />
      {t !== null && (
        <>
          <circle
            className="glyph-draw"
            cx="50" cy="50" r="38"
            transform="rotate(-90 50 50)"
            style={{ strokeDasharray: length, "--glyph-len": `${length}`, "--glyph-gap": `${length * (1 - t)}`, transformBox: "view-box" } as CSSProperties}
            key={t}
          />
          <circle className="glyph-dot" cx={x} cy={y} r="3" />
        </>
      )}
    </g>
  );
}

/** The moon waxes with the night's sleep, from a sliver to nearly full, among stars that come and go. */
function Moon({ t }: { t: number | null }) {
  const lit = 0.12 + 0.83 * (t ?? 0);
  const r = 34;
  const terminator = Math.abs(1 - 2 * lit) * r;
  return (
    <g>
      <circle className="glyph-faint" cx="50" cy="50" r={r} />
      {t !== null && (
        <path
          className="glyph-moon"
          d={`M 50 ${50 - r} A ${r} ${r} 0 0 1 50 ${50 + r} A ${terminator.toFixed(2)} ${r} 0 0 ${lit > 0.5 ? 1 : 0} 50 ${50 - r} Z`}
        />
      )}
      {[[30, 24], [20, 52], [44, 40]].map(([x, y], i) => (
        <circle key={i} className="glyph-dot glyph-spark" cx={x} cy={y} r="2" style={{ animationDelay: `${i * 1.1}s` }} />
      ))}
    </g>
  );
}

/** Mood on a five-step scale: the steps up to the recorded mood are filled. */
function Level({ value }: { value: number | null }) {
  return (
    <g>
      {[1, 2, 3, 4, 5].map((step) => (
        <rect
          key={step}
          className={value !== null && step <= value ? "glyph-fill" : "glyph-faint"}
          x={13 + (step - 1) * 16}
          y={78 - step * 11}
          width="10"
          height={8 + step * 11}
        />
      ))}
    </g>
  );
}

/** Air or oxygen: one body in orbit on cabin air, a second, inner one on supplemental oxygen. */
function Orbit({ supplemental = false }: { supplemental?: boolean }) {
  return (
    <g>
      <circle className="glyph-faint" cx="50" cy="50" r="40" />
      <ellipse className="glyph-faint" cx="50" cy="50" rx="40" ry="14" />
      <circle cx="50" cy="50" r="14" />
      <g className="glyph-orbit">
        <circle className="glyph-dot" cx="90" cy="50" r="2.8" />
      </g>
      {supplemental && (
        <g className="glyph-orbit is-inner">
          <circle className="glyph-dot" cx="50" cy="24" r="2.8" />
        </g>
      )}
    </g>
  );
}
