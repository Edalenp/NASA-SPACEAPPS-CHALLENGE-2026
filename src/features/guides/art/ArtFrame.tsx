import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { gsap } from 'gsap';
import './line-art.css';
import type { AnatomyView } from './anatomy-paths';

const QUERY = '(prefers-reduced-motion: reduce)';
const readReduced = () => typeof window === 'undefined' || window.matchMedia(QUERY).matches;
function subscribeReduced(listener: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

import type { ArtMotion } from './art-motion';

/**
 * One drawing plate. Plays its motion once when it appears or its pose changes,
 * offers a replay, and stays static for reduced-motion users.
 */
export function ArtFrame({
  title,
  description,
  kicker,
  viewBox = '0 0 480 320',
  motion,
  poseKey,
  children,
  note = 'Illustration only. Not a reading or a timer.',
}: {
  title: string;
  description: string;
  kicker?: string;
  viewBox?: string;
  motion?: ArtMotion;
  /** Changing it replays the motion. */
  poseKey: string;
  children: ReactNode;
  note?: string;
}) {
  const uid = useId();
  const svg = useRef<SVGSVGElement>(null);
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, () => true);
  const [run, setRun] = useState(0);

  useLayoutEffect(() => {
    const node = svg.current;
    if (!node || reduced || !motion) return;
    const ctx = gsap.context(() => {
      motion(node);
    }, node);
    return () => ctx.revert();
  }, [motion, poseKey, run, reduced]);

  return (
    <figure className="art-frame">
      <div className="art-plate">
        {kicker && <span className="art-plate-kicker" aria-hidden="true">{kicker}</span>}
        <svg ref={svg} className="line-art" viewBox={viewBox} role="img" aria-labelledby={`${uid}-t ${uid}-d`}>
          <title id={`${uid}-t`}>{title}</title>
          <desc id={`${uid}-d`}>{description}</desc>
          {children}
        </svg>
      </div>
      <figcaption className="art-foot">
        <span>{note} Line drawing made with AI assistance.</span>
        {motion && !reduced && (
          <button type="button" className="art-replay" onClick={() => setRun((n) => n + 1)}>
            Replay
          </button>
        )}
      </figcaption>
    </figure>
  );
}

/** Callout: a target ring on the spot, a hairline leader and a mono label. */
export function Callout({
  x,
  y,
  tx,
  ty,
  label,
  anchor = 'start',
}: {
  x: number;
  y: number;
  tx: number;
  ty: number;
  label: string;
  anchor?: 'start' | 'end';
}) {
  const len = Math.hypot(tx - x, ty - y) || 1;
  const sx = x + ((tx - x) / len) * 12;
  const sy = y + ((ty - y) / len) * 12;
  /** The leader ends on a short level shoulder so it never crosses the label. */
  const elbow = anchor === 'start' ? 14 : -14;
  return (
    <g data-art="callout">
      <circle className="cue" data-art="ring" cx={x} cy={y} r={11} />
      <circle className="cue-fill" cx={x} cy={y} r={3.5} />
      <path className="lead" data-art="lead" d={`M${sx} ${sy}L${tx - elbow} ${ty}H${tx}`} pathLength={1} />
      <text className="lbl" data-art="label" x={tx + (anchor === 'start' ? 6 : -6)} y={ty + 4.5} textAnchor={anchor}>
        {label}
      </text>
    </g>
  );
}

/** A traced Open Anatomy view: one clean outline, filled with the plate ground so it occludes. */
export function Anatomy({ view, transform, part, scale = 1 }: { view: AnatomyView; transform?: string; part?: string; scale?: number }) {
  return (
    <g transform={transform} data-art={part}>
      <path className="b" d={view.outline} strokeWidth={2 / scale} />
    </g>
  );
}
