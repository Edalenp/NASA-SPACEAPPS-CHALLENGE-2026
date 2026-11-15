import { Activity, ArrowUpRight, ArrowDownRight, Wind, Droplet, AirVent, Brain, Thermometer, Droplets, Moon, Smile, Dumbbell, Timer, type LucideIcon } from 'lucide-react';
import { indicators, type IndicatorId } from '../../data/indicators';

const icons: Record<IndicatorId, LucideIcon> = { pulse: Activity, systolic: ArrowUpRight, diastolic: ArrowDownRight, respiration: Wind, spo2: Droplet, oxygen: AirVent, consciousness: Brain, temperature: Thermometer, glucose: Droplets, sleep: Moon, mood: Smile, exercise: Dumbbell, reaction: Timer };
const all = Object.keys(indicators) as IndicatorId[];

export function ReadingPicker({ value, onChange, ids = all, disabled = false }: { value: IndicatorId; onChange: (id: IndicatorId) => void; ids?: IndicatorId[]; disabled?: boolean }) {
  return (
    <div className={`reading-mosaic ${ids.length <= 3 ? 'is-small' : ''}`} role="group" aria-label="Select reading">
      {ids.map((id) => {
        const Icon = icons[id];
        return <button type="button" key={id} disabled={disabled} className="reading-choice" aria-pressed={value === id} aria-label={indicators[id].name} title={indicators[id].name} onClick={() => onChange(id)}>
          <Icon size={18} aria-hidden="true" />
          <span className="reading-choice-name">{id === 'respiration' ? 'Breathing' : indicators[id].short}</span>
        </button>;
      })}
    </div>
  );
}
