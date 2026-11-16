import { useEffect, useRef } from 'react';
import { ArrowUpRight, History, RefreshCw } from 'lucide-react';
import { SPACE_WEATHER_SOURCES, type SpaceWeatherLevel } from '../../engine/spaceWeather';
import { DONKI_REPLAY, DONKI_SNAPSHOT } from '../../data/nasa/donki';
import { useMission } from '../../store/mission';
import { startEvent, type DoseLog } from '../environment/doseLog';
import { useSpaceWeather } from './store';
import { donkiEventId, useSpaceWeatherAssessment, useSpaceWeatherSync } from './hooks';
import './space-weather.css';

const MARK: Record<SpaceWeatherLevel, string> = { quiet: '●', watch: '▲', alert: '◆' };
const WORD: Record<SpaceWeatherLevel, string> = { quiet: 'Quiet', watch: 'Watch', alert: 'Alert' };

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/**
 * The top bar's space weather tag: always visible, opens the mission panel where the full card and
 * the radiation meter live. A new alert also raises the console's toast once.
 */
export function SpaceWeatherTag() {
  useSpaceWeatherSync();
  const weather = useSpaceWeatherAssessment();
  const replay = useSpaceWeather((s) => s.replay);
  const open = useMission((s) => s.open);
  const notify = useMission((s) => s.notify);
  const told = useRef<string | null>(null);
  useEffect(() => {
    if (weather.level !== 'alert' || !weather.event || replay) return;
    if (told.current === weather.event.id) return;
    told.current = weather.event.id;
    notify(`Solar particle event (NASA DONKI). ${weather.actions[0]}`);
  }, [weather, replay, notify]);
  return (
    <button
      type="button"
      className={`sw-tag is-${weather.level}`}
      onClick={() => open('mission')}
      title={`${weather.headline} ${weather.detail}`}
    >
      <i aria-hidden="true">{MARK[weather.level]}</i>
      <span>Space weather <b>{WORD[weather.level]}</b>{replay ? ' · replay' : ''}</span>
    </button>
  );
}

/** The full card, shown above the radiation meter. It can open the meter's solar event for the crew. */
export function SpaceWeatherCard({ log, onChange }: { log: DoseLog; onChange: (next: DoseLog) => void }) {
  const weather = useSpaceWeatherAssessment();
  const { cache, origin, syncing, error, replay, sync, setReplay } = useSpaceWeather();
  const linked = weather.event ? log.activeEventId === donkiEventId(weather.event.id) : false;
  const otherOpen = !!log.activeEventId && !linked;

  const status = replay
    ? `Replay of a real NASA DONKI record: ${DONKI_REPLAY.label}. Nothing here is happening now.`
    : origin === 'live'
      ? `Live from NASA DONKI · checked ${ago(cache.fetchedAt)}`
      : origin === 'saved'
        ? `Saved copy on this device · checked ${ago(cache.fetchedAt)}`
        : `Built-in copy of NASA DONKI · ${DONKI_SNAPSHOT.fetchedAt.slice(0, 10)}`;

  return (
    <section className={`sw-card aura is-${weather.level === 'quiet' ? 'normal' : weather.level}`} aria-labelledby="sw-head" aria-live="polite">
      <div className="sw-main">
        <header className="sw-head">
          <span className="micro" id="sw-head">Space weather · NASA DONKI</span>
          <span className={`sw-chip is-${weather.level}`}>{MARK[weather.level]} {WORD[weather.level]}</span>
        </header>
        <h3 className="sw-headline">{weather.headline}</h3>
        <p className="sw-detail">
          {weather.detail}{' '}
          {weather.event?.link && (
            <a href={weather.event.link} target="_blank" rel="noreferrer">DONKI record <ArrowUpRight size={11} aria-hidden="true" /></a>
          )}
        </p>
        {weather.actions.length > 0 && (
          <ol className="sw-actions">
            {weather.actions.map((a) => <li key={a}>{a}</li>)}
          </ol>
        )}
        {weather.level === 'alert' && weather.event && (
          <div className="sw-link-event">
            {linked ? (
              <p className="micro">Dose readings now count toward this event · {weather.event.id}</p>
            ) : otherOpen ? (
              <p className="dialog-fine">A solar event is already open in the meter below; readings count toward it.</p>
            ) : (
              <button type="button" className="btn btn-solid" onClick={() => onChange(startEvent(log, donkiEventId(weather.event!.id)))}>
                Log my dose to this event
              </button>
            )}
          </div>
        )}
      </div>
      <aside className="sw-side" aria-label="Data source">
        <span className="micro">{replay ? 'Replay' : origin === 'live' ? 'Live feed' : origin === 'saved' ? 'Saved on this device' : 'Built-in copy'}</span>
        <p className="sw-status">{status}{!replay && error ? ` · ${error}` : ''}</p>
        <span className="sw-controls">
          {!replay && (
            <button type="button" className="btn btn-ghost" onClick={() => void sync({ force: true })} disabled={syncing}>
              <RefreshCw size={13} aria-hidden="true" className={syncing ? 'sw-spin' : ''} /> {syncing ? 'Checking…' : 'Check now'}
            </button>
          )}
          <button type="button" className="btn btn-ghost" aria-pressed={replay} onClick={() => setReplay(!replay)}>
            <History size={13} aria-hidden="true" /> {replay ? 'Back to live' : 'Replay May 2024 storm'}
          </button>
        </span>
        <p className="sw-location">{weather.locationNote}</p>
        <p className="sw-sources">
          {cache.startDate === DONKI_SNAPSHOT.startDate && origin === 'built-in' ? 'Built-in window' : 'Last 30 days'} · VITRUVIO suggests; your dosimeter measures.
          <span>
            {SPACE_WEATHER_SOURCES.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title.split(' · ')[0]} <ArrowUpRight size={10} aria-hidden="true" /></a>
            ))}
          </span>
        </p>
      </aside>
    </section>
  );
}
