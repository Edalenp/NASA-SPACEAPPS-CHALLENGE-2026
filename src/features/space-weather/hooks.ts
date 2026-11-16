import { useEffect, useMemo } from 'react';
import { assessSpaceWeather, type SpaceWeather } from '../../engine/spaceWeather';
import { useMission } from '../../store/mission';
import { useSpaceWeather, useSpaceWeatherInput } from './store';

/** The donki: prefix ties a solar event opened from DONKI to the NASA event that opened it. */
export const donkiEventId = (sepId: string) => `donki:${sepId}`;

export function useSpaceWeatherAssessment(): SpaceWeather {
  const environment = useMission((s) => s.environment);
  const { events, nowIso } = useSpaceWeatherInput();
  // Recomputed once a minute is plenty: the rules work in hours.
  const minute = nowIso.slice(0, 16);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => assessSpaceWeather(events, nowIso, environment), [events, minute, environment]);
}

/** Fetches DONKI when the console opens, when it comes back online, and every three hours. */
export function useSpaceWeatherSync(): void {
  const sync = useSpaceWeather((s) => s.sync);
  useEffect(() => {
    void sync();
    const online = () => void sync();
    window.addEventListener('online', online);
    const timer = window.setInterval(() => void sync(), 15 * 60 * 1000);
    return () => {
      window.removeEventListener('online', online);
      window.clearInterval(timer);
    };
  }, [sync]);
}

