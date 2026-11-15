import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, X, Check, ChevronDown, ArrowUpRight, Settings2 } from 'lucide-react';
import { activeCrew, saveCrewProfiles, useCrew, type CrewProfile } from '../../store/crew';
import { switchCrew } from '../../store/crewActions';
import { useMission } from '../../store/mission';
import './crew.css';

/** A diagram rather than a portrait: only the anatomical model is personalised. */
function CrewFigure({ anatomy }: { anatomy: CrewProfile['anatomy'] }) {
  const female = anatomy === 'female';
  return <svg className="crew-figure" viewBox="0 0 160 220" fill="none" aria-hidden="true">
    <circle cx="80" cy="100" r="67" className="crew-orbit" />
    <path d="M12 100h136M80 12v196" className="crew-axis" />
    <g stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
      <path d="M70 37c0-17 20-17 20 0 0 10-4 16-10 16s-10-6-10-16ZM75 53v7m10-7v7" />
      <path d={female ? 'M75 59 61 65 56 94 51 121 55 125 61 102 66 80 69 103 65 124 68 146 70 184 68 199 76 199 79 151 80 136 81 151 84 199 92 199 90 184 92 146 95 124 91 103 94 80 99 102 105 125 109 121 104 94 99 65 85 59' : 'M75 59 58 65 53 94 47 122 52 125 59 102 64 80 67 111 65 128 69 151 70 184 68 199 76 199 79 150 80 134 81 150 84 199 92 199 90 184 91 151 95 128 93 111 96 80 101 102 108 125 113 122 107 94 102 65 85 59'} />
      <path d="M69 73q11 6 22 0M70 81q10 6 20 0M71 89q9 5 18 0M80 67v48m-11 7q11-9 22 0M72 145l2 35m14-35-2 35" opacity=".5" />
    </g>
    <circle cx="80" cy="79" r="3" fill="currentColor" />
  </svg>;
}

export function CrewControls() {
  const { members, activeId, pending } = useCrew();
  const busy = useMission(s => s.busy);
  const hydrated = useMission(s => s.hydrated);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CrewProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const locked = pending || busy || saving || !hydrated;
  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving && !pending) { setOpen(false); trigger.current?.focus(); }
      if (event.key !== 'Tab') return;
      const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select') ?? [])];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [open, saving, pending, editing]);
  function resize(count: number) {
    if (!Number.isInteger(count) || count < members.length || count > 12) return;
    setDraft(current => Array.from({ length: count }, (_, i) => current[i] ?? { id: crypto.randomUUID(), displayName: '', role: 'crew', environmentId: 'transit', gender: '', anatomy: 'male' }));
  }
  function change(index: number, patch: Partial<CrewProfile>) { setDraft(rows => rows.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  async function save() {
    setSaving(true); setError('');
    try { await saveCrewProfiles(draft); setEditing(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save crew.'); }
    finally { setSaving(false); }
  }
  async function select(id: string) {
    setError('');
    try { await switchCrew(id); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not switch crew member.'); }
  }
  return <>
    <button ref={trigger} className="crew-trigger" type="button" disabled={locked} aria-haspopup="dialog" aria-expanded={open} aria-label={`Switch crew member: ${activeCrew().displayName}`} onClick={() => { setError(''); setOpen(true); }}><Users size={13} aria-hidden="true" /><b>{activeCrew().displayName}</b><ChevronDown size={12} aria-hidden="true" /></button>
    {open && createPortal(<div className="crew-scrim"><section ref={dialog} tabIndex={-1} className="crew-dialog" role="dialog" aria-modal="true" aria-labelledby="crew-title">
      <header><div><span className="micro">VITRUVIO / crew manifest</span><h2 id="crew-title">{editing ? 'Configure your crew' : 'Select an astronaut'}</h2></div><button type="button" aria-label="Close crew selector" disabled={pending || saving} onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={18} /></button></header>
      <p className="crew-description">{editing ? 'Define the people on your mission. Each profile keeps its own lab.' : 'One mission. Independent labs. Select a crew member to enter their workspace.'}</p>
      {editing ? <form onSubmit={e => { e.preventDefault(); void save(); }}>
        <label>Crew size<input aria-label="Crew size" type="number" min={members.length} max={12} value={draft.length} disabled={saving} onChange={e => resize(Number(e.target.value))} /></label>
        <small>Up to 12 crew members. Existing profiles and their readings are preserved.</small>
        <div className="crew-forms">{draft.map((row, index) => <fieldset key={row.id} disabled={saving}><legend>Astronaut {String(index + 1).padStart(2, '0')}</legend>
          <label>Name<input required maxLength={60} aria-label={`Astronaut ${index + 1} name`} value={row.displayName} onChange={e => change(index, { displayName: e.target.value })} /></label>
          <label>Gender (optional)<input maxLength={40} value={row.gender} onChange={e => change(index, { gender: e.target.value })} /></label>
          <label>Anatomical model<select aria-label={`Astronaut ${index + 1} anatomy`} value={row.anatomy} onChange={e => change(index, { anatomy: e.target.value as CrewProfile['anatomy'] })}><option value="male">Male anatomy</option><option value="female">Female anatomy</option></select></label>
          <label>Role<select value={row.role} onChange={e => change(index, { role: e.target.value as CrewProfile['role'] })}><option value="crew">Crew member</option><option value="medicalOfficer">Crew Medical Officer</option></select></label>
        </fieldset>)}</div>
        <footer><button className="btn btn-outline" type="button" disabled={saving} onClick={() => setEditing(false)}><X size={14} aria-hidden="true" /> Cancel</button><button className="btn btn-solid" disabled={saving} type="submit"><Check size={14} aria-hidden="true" /> {saving ? 'Saving…' : 'Save crew'}</button></footer>
      </form> : <><div className="crew-roster-caption"><span className="micro">Crew roster</span><span className="micro">{String(members.length).padStart(2, '0')} / on board</span></div><div className="crew-cards">{members.map((member, index) => <button type="button" className={`crew-card ${member.id === activeId ? 'is-active' : ''}`} key={member.id} disabled={locked} aria-current={member.id === activeId ? 'true' : undefined} onClick={() => void select(member.id)}>
        <span className="crew-card-top"><span className="crew-number">{String(index + 1).padStart(2, '0')}</span><span>{member.role === 'medicalOfficer' ? 'Medical officer' : 'Crew member'}</span></span>
        <span className="crew-portrait"><CrewFigure anatomy={member.anatomy} /><span className="crew-monogram" aria-hidden="true">{member.displayName.split(/\s+/).map(word => word[0]).slice(0, 2).join('')}</span></span>
        <strong>{member.displayName}</strong><span className="crew-model">{member.anatomy === 'female' ? 'Female' : 'Male'} anatomy</span><small className="crew-card-action">{member.id === activeId ? <><Check size={13} /> Active lab</> : <>Enter lab <ArrowUpRight size={14} /></>}</small>
      </button>)}</div><footer><span className="crew-device-note">Readings, trends & reports<br />Saved independently on this device</span><button type="button" className="btn btn-outline" disabled={locked} onClick={() => { setDraft(members.map(p => ({ ...p }))); setEditing(true); }}><Settings2 size={14} aria-hidden="true" /> Configure crew</button></footer></>}
      {error && <p role="alert">{error}</p>}
    </section></div>, document.body)}
  </>;
}
