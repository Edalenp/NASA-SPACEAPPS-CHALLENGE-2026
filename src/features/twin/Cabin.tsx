import { useMission } from '../../store/mission';
import { useAssessment } from '../../store/derived';
import type { ScenePalette } from './palette';
import HabitatEnvironment from './environments/HabitatEnvironment';

/** Existing integration point; follows the mission selector without changing its contract. */
export default function Cabin({ p, night }: { p: ScenePalette; night: boolean }) {
  const environment = useMission((s) => s.environment);
  const panel = useMission((s) => s.panel);
  const { counts } = useAssessment();
  const status = counts.alert ? 'alert' : counts.watch ? 'watch' : 'normal';
  return <HabitatEnvironment key={environment} environment={environment} p={p} night={night} motion={panel === null} status={status} />;
}
