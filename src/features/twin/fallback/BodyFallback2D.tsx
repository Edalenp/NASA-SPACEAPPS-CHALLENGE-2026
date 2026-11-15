import { useEffect, useRef } from 'react';
import { useIntro } from '../intro';
/**
 * 2D twin for devices without WebGL (RF-15). The same six systems as the 3D pins, each with its
 * code, shape and word, and the same action: selecting a zone opens that system's inspector card.
 * The figure is the front outline of the Open Anatomy skin (CC BY 4.0), traced from Blender.
 */
import { anatomy } from '../../guides/art/anatomy-paths';
import { systems, type SystemId } from '../../../data/mission';
import { useMission } from '../../../store/mission';
import { useAssessment } from '../../../store/derived';
import { StateMark } from '../../../ui/StateMark';
import type { Status } from '../../../engine/status';
import './body-fallback-2d.css';

/** Hit shapes in the figure's own units (216 × 528). */
const zones: Record<SystemId, { d: string; label: [number, number] }> = {
  sleep: { d: 'M108 -2A44 44 0 1 1 107.9 -2ZM108 10A32 32 0 1 0 108.1 10Z', label: [56, 14] },
  head: { d: 'M108 10C124 10 133 24 133 42C133 62 122 76 108 76C94 76 83 62 83 42C83 24 92 10 108 10Z', label: [108, 46] },
  lungs: { d: 'M70 118C70 104 86 104 92 116C98 130 98 166 92 178C86 190 72 186 70 172ZM146 118C146 104 130 104 124 116C118 130 118 166 124 178C130 190 144 186 146 172Z', label: [80, 150] },
  heart: { d: 'M116 142C128 142 130 152 128 162C126 172 118 176 112 172C106 168 104 156 106 150C108 144 112 142 116 142Z', label: [117, 160] },
  immune: { d: 'M108 204C130 204 142 218 142 234C142 252 128 262 108 262C88 262 74 252 74 234C74 218 86 204 108 204Z', label: [108, 238] },
  bones: {
    d: 'M30 176H58V282H30ZM158 176H186V282H158ZM66 322H102V498H66ZM114 322H150V498H114Z',
    label: [84, 410],
  },
};


export function BodyFallback2D({ reason = 'unavailable' }: { reason?: 'unavailable' | 'requested' | 'load-failed' }) {
  const container = useRef<HTMLDivElement>(null);
  const finishIntro = useIntro((s) => s.finish);
  useEffect(() => {
    // R3F also mounts native fallback content inside a working canvas; that must not skip its scan.
    if (container.current && !container.current.closest('canvas')) { useIntro.setState({ ready: true, loading: false }); finishIntro(); }
  }, [finishIntro]);
  const { states } = useAssessment();
  const selected = useMission((s) => s.selected);
  const select = useMission((s) => s.select);
  const byId = Object.fromEntries(systems.map((s) => [s.id, s]));

  const chip = (id: SystemId) => {
    const sys = byId[id];
    const st: Status = states[id];
    return (
      <button
        key={id}
        type="button"
        className={`fallback-chip is-${st} ${selected === id ? 'is-active' : ''}`}
        aria-pressed={selected === id}
        onClick={() => select(id)}
      >
        <span className="fallback-chip-code">{sys.code}</span>
        <span className="fallback-chip-name">{sys.short}</span>
        <StateMark status={st} />
      </button>
    );
  };

  return (
    <div ref={container} className="fallback-2d" role="group" aria-label="Body systems, 2D view">
      <p className="fallback-2d-note micro">
        {reason === 'requested' ? '2D view' : reason === 'load-failed' ? '2D view · the 3D model did not load. Reload to retry' : '2D view · 3D is not available on this device'}
      </p>
      <div className="fallback-2d-grid">
        <svg className="fallback-2d-figure" viewBox={`-10 -10 ${anatomy.front.w + 20} ${anatomy.front.h + 20}`} aria-hidden="true">
          <path className="fallback-body" d={anatomy.front.outline} />
          {systems.map((sys) => {
            const zone = zones[sys.id];
            const st = states[sys.id];
            return (
              <g
                key={sys.id}
                className={`fallback-zone is-${st} ${selected === sys.id ? 'is-active' : ''}`}
                onClick={() => select(sys.id)}
              >
                <path d={zone.d} fillRule="evenodd" />
                <text x={zone.label[0]} y={zone.label[1]} textAnchor="middle">{sys.code}</text>
              </g>
            );
          })}
        </svg>
        <div className="fallback-2d-col">{systems.map((sys) => chip(sys.id))}</div>
      </div>
    </div>
  );
}

export default BodyFallback2D;
