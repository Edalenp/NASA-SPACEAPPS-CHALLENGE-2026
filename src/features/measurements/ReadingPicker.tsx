import { Activity, ArrowUpRight, ArrowDownRight, Wind, Droplet, AirVent, Brain, Thermometer, Droplets, Moon, Smile, Dumbbell, Timer, type LucideIcon } from 'lucide-react';
import { indicators, type IndicatorId } from '../../data/indicators';
import { stateShape, type Status } from '../../engine/status';
import { requiredCheck } from '../routine/checkSequence';

const icons: Record<IndicatorId, LucideIcon> = { pulse: Activity, systolic: ArrowUpRight, diastolic: ArrowDownRight, respiration: Wind, spo2: Droplet, oxygen: AirVent, consciousness: Brain, temperature: Thermometer, glucose: Droplets, sleep: Moon, mood: Smile, exercise: Dumbbell, reaction: Timer };
const all = Object.keys(indicators) as IndicatorId[];

interface PickerProps {
  value: IndicatorId;
  onChange: (id: IndicatorId) => void;
  ids?: IndicatorId[];
  disabled?: boolean;
  /** Split into the seven NEWS2 observations and the routine readings, each under its label. */
  grouped?: boolean;
  /** Watch and alert readings carry their state mark, so the tile says which one needs a look. */
  statuses?: Partial<Record<IndicatorId, Status>>;
}

export function ReadingPicker({ value, onChange, ids = all, disabled = false, grouped = false, statuses }: PickerProps) {
  const tiles = (list: IndicatorId[]) => list.map((id) => {
    const Icon = icons[id];
    const status = statuses?.[id];
    const flagged = status === 'watch' || status === 'alert';
    return (
      <button type="button" key={id} disabled={disabled} className="reading-choice" aria-pressed={value === id} aria-label={`${indicators[id].name}${flagged ? `, ${status}` : ''}`} title={indicators[id].name} onClick={() => onChange(id)}>
        <Icon size={18} aria-hidden="true" />
        <span className="reading-choice-name">{id === 'respiration' ? 'Breathing' : indicators[id].short}</span>
        {flagged && <span className={`reading-choice-mark is-${status}`} aria-hidden="true">{stateShape[status]}</span>}
      </button>
    );
  });
  if (!grouped) {
    return <div className={`reading-mosaic ${ids.length <= 3 ? 'is-small' : ''}`} role="group" aria-label="Select reading">{tiles(ids)}</div>;
  }
  const news = requiredCheck.filter((id) => ids.includes(id));
  const routine = ids.filter((id) => !news.includes(id));
  return (
    <div className="reading-groups">
      <div className="reading-group">
        <span className="micro">NEWS2 · {news.length} observations</span>
        <div className="reading-mosaic" role="group" aria-label="NEWS2 observations">{tiles(news)}</div>
      </div>
      <div className="reading-group">
        <span className="micro">Routine readings</span>
        <div className="reading-mosaic" role="group" aria-label="Routine readings">{tiles(routine)}</div>
      </div>
    </div>
  );
}
