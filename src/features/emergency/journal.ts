import { PROTOCOL_VERSION, findProtocol } from '../../data/protocols';
import { type EmergencySession } from './workflow';
import { contactNames, isEmergencyAssessment } from './assessment';

export const JOURNAL_KEY = 'vt-emergency-journal-v1';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
export interface EmergencyJournal {
  sessions: EmergencySession[];
  persistence: 'device' | 'session';
  problem: 'unavailable' | 'unreadable' | null;
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Fail closed on an incompatible record. Never overwrite an unreadable journal. */
export function isEmergencySession(value: unknown): value is EmergencySession {
  if (!object(value) || value.version !== PROTOCOL_VERSION || typeof value.protocolId !== 'string') return false;
  const definition = findProtocol(value.protocolId);
  const run = value.execution;
  const env = value.environment;
  if (!definition || !object(run) || !object(env) || !Array.isArray(run.steps) || !Array.isArray(value.visits) || !value.visits.length) return false;
  if (typeof run.id !== 'string' || typeof run.crewMemberId !== 'string' || typeof run.title !== 'string' || !date(run.startedAt)) return false;
  if (!['inProgress', 'completed', 'aborted'].includes(String(run.status)) || run.steps.length !== value.visits.length) return false;
  if (typeof env.id !== 'string' || typeof env.name !== 'string' || typeof env.communicationDelayMinutes !== 'number' || !Number.isFinite(env.communicationDelayMinutes) || env.communicationDelayMinutes < 0) return false;
  if (run.status === 'inProgress' ? value.endedAt !== null : !date(value.endedAt)) return false;
  if (value.assessments !== undefined && (!Array.isArray(value.assessments) || !value.assessments.every(isEmergencyAssessment))) return false;
  if (value.notifications !== undefined) {
    if (!Array.isArray(value.notifications)) return false;
    for (const item of value.notifications) {
      if (!object(item) || typeof item.assessmentId !== 'string' || typeof item.contactRole !== 'string' || !Object.hasOwn(contactNames, item.contactRole) || !date(item.confirmedAt)) return false;
      if (!Array.isArray(value.assessments) || !value.assessments.some(a => a.id === item.assessmentId && a.plan?.steps.some((step: { contactRole: string }) => step.contactRole === item.contactRole))) return false;
    }
  }
  const first: unknown = value.visits[0];
  if (!object(first) || first.stepId !== definition.start || first.enteredAt !== run.startedAt) return false;
  for (let i = 0; i < value.visits.length; i++) {
    const visit: unknown = value.visits[i];
    const step: unknown = run.steps[i];
    if (!object(visit) || typeof visit.stepId !== 'string' || !date(visit.enteredAt) || !object(step) || !object(step.action)) return false;
    const node = definition.steps[visit.stepId];
    if (!node || step.action.text !== node.action.text || step.action.sourceTitle !== node.action.sourceTitle || step.action.sourceUrl !== node.action.sourceUrl) return false;
    const last = i === value.visits.length - 1;
    if (last && run.status !== 'completed') {
      if (step.state !== 'pending' || visit.answer !== null || visit.answeredAt !== null || step.completedAt !== null) return false;
    } else {
      if (step.state !== 'done' || !date(visit.answeredAt) || step.completedAt !== visit.answeredAt || typeof visit.answer !== 'string') return false;
      const answer = node.answers.find(a => a.label === visit.answer);
      if (!answer || Date.parse(visit.answeredAt) < Date.parse(visit.enteredAt)) return false;
      const next: unknown = value.visits[i + 1];
      if (last ? answer.next !== null : !object(next) || answer.next !== next.stepId || next.enteredAt !== visit.answeredAt) return false;
    }
  }
  return true;
}

export function createEmergencyJournal(storage?: StorageAccess) {
  let snapshot: EmergencyJournal = { sessions: [], persistence: storage ? 'device' : 'session', problem: storage ? null : 'unavailable' };
  let canWrite = Boolean(storage);
  const listeners = new Set<() => void>();
  if (storage) {
    try {
      const raw = storage.getItem(JOURNAL_KEY);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (!object(parsed) || parsed.version !== 1 || !Array.isArray(parsed.sessions) || !parsed.sessions.every(isEmergencySession)) throw new Error('Incompatible journal');
        snapshot = { ...snapshot, sessions: parsed.sessions };
      }
    } catch {
      snapshot = { sessions: [], persistence: 'session', problem: 'unreadable' };
      canWrite = false;
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    save(session: EmergencySession) {
      if (!isEmergencySession(session)) throw new Error('Invalid emergency record');
      const sessions = snapshot.sessions.filter(s => s.execution.id !== session.execution.id).concat(session);
      let problem = snapshot.problem;
      if (canWrite && storage) {
        try { storage.setItem(JOURNAL_KEY, JSON.stringify({ version: 1, sessions })); }
        catch { canWrite = false; problem = 'unavailable'; }
      }
      snapshot = { sessions, persistence: canWrite ? 'device' : 'session', problem };
      listeners.forEach(listener => listener());
    },
  };
}

function localStorageAccess() {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}
export const emergencyJournal = createEmergencyJournal(localStorageAccess());
/** Read-only integration point for X's report. Does not touch the mission store or Dexie schema. */
export const readEmergencyRecords = () => emergencyJournal.getSnapshot().sessions;
