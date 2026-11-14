import { Pause, Play } from 'lucide-react';
import { useMission } from '../../../store/mission';
import { useHabitatMotion, useReducedMotion } from './motion';
import './environment.css';

export default function MotionControl() {
  const playing = useHabitatMotion((s) => s.playing);
  const toggle = useHabitatMotion((s) => s.toggle);
  const reduced = useReducedMotion();
  const environment = useMission((s) => s.environment);
  return (
    <>
    <button type="button" className="habitat-motion" onClick={toggle} disabled={reduced}
      aria-label={reduced ? 'Environment motion disabled by your device preference' : playing ? 'Pause environment motion' : 'Play environment motion'}
      title={reduced ? 'Reduced motion is enabled on your device' : undefined}>
      {playing && !reduced ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
      <span>{reduced ? 'Motion reduced' : playing ? 'Pause motion' : 'Play motion'}</span>
    </button>
    {environment === 'station' && (
      <a className="habitat-credit" href="https://svs.gsfc.nasa.gov/2915/" target="_blank" rel="noreferrer">
        Earth imagery: NASA / GSFC
      </a>
    )}
    </>
  );
}
