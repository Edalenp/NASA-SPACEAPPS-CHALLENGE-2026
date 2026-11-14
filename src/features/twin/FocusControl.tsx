import { Scan } from 'lucide-react';
import { useEffect } from 'react';
import { useMission } from '../../store/mission';
import { useReducedMotion } from './environments/motion';

export default function FocusControl() {
  const focus = useMission((s) => s.focus);
  const revision = useMission((s) => s.focusRevision);
  const resetView = useMission((s) => s.resetView);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (focus && window.innerWidth <= 760) {
      document.querySelector('.stage-scene')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    }
  }, [focus, revision, reduced]);
  return focus ? (
    <button className="focus-overview" type="button" onClick={resetView}>
      <Scan size={14} aria-hidden="true" /> Show full body
    </button>
  ) : null;
}
