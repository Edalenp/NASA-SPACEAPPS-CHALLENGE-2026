import { advanceProtocol, createProtocol, type EmergencyProtocol } from '../../engine/emergency';
import { findProtocol, PROTOCOL_VERSION, type Step } from '../../data/protocols';

export interface StepVisit {
  stepId: string;
  enteredAt: string;
  answeredAt: string | null;
  answer: string | null;
}
export interface EmergencySession {
  version: typeof PROTOCOL_VERSION;
  protocolId: string;
  environment: { id: string; name: string; communicationDelayMinutes: number };
  execution: EmergencyProtocol;
  visits: StepVisit[];
  endedAt: string | null;
}

export function beginCase(protocolId: string, crewMemberId: string, environment: EmergencySession['environment'], at: string, id: string = crypto.randomUUID()): EmergencySession {
  const definition = findProtocol(protocolId);
  if (!definition) throw new Error('Unknown emergency protocol');
  const first = definition.steps[definition.start];
  const execution = advanceProtocol(createProtocol(id, crewMemberId, definition.name, [first.action]), { type: 'start', at });
  return { version: PROTOCOL_VERSION, protocolId, environment: { ...environment }, execution, visits: [{ stepId: first.id, enteredAt: at, answeredAt: null, answer: null }], endedAt: null };
}

export function currentStep(session: EmergencySession): Step | undefined {
  return findProtocol(session.protocolId)?.steps[session.visits.at(-1)?.stepId ?? ''];
}

/** Extend the backend's linear execution with the next *visited* node, then complete the current node.
 * Unvisited branches are never marked done. Repeated nodes remain separate timestamped visits. */
export function answerCase(session: EmergencySession, visitIndex: number, answerIndex: number, at: string): EmergencySession {
  if (session.execution.status !== 'inProgress' || visitIndex !== session.visits.length - 1 || !Number.isFinite(Date.parse(at))) return session;
  const definition = findProtocol(session.protocolId);
  const step = currentStep(session);
  const choice = step?.answers[answerIndex];
  if (!definition || !choice || Date.parse(at) < Date.parse(session.visits[visitIndex].enteredAt)) return session;
  const next = choice.next ? definition.steps[choice.next] : undefined;
  if (choice.next && !next) return session;
  const pending = next ? { ...session.execution, steps: [...session.execution.steps, { action: next.action, state: 'pending' as const, completedAt: null }] } : session.execution;
  const execution = advanceProtocol(pending, { type: 'completeStep', stepIndex: visitIndex, at });
  const visits = session.visits.map((visit, i) => i === visitIndex ? { ...visit, answeredAt: at, answer: choice.label } : visit);
  if (next) visits.push({ stepId: next.id, enteredAt: at, answeredAt: null, answer: null });
  return { ...session, execution, visits, endedAt: next ? null : at };
}

export function abortCase(session: EmergencySession, at: string): EmergencySession {
  if (session.execution.status !== 'inProgress') return session;
  return { ...session, execution: advanceProtocol(session.execution, { type: 'abort', at }), endedAt: at };
}

/** Wall-clock timestamps survive background throttling and reload; expiry never makes a clinical decision. */
export function stepSeconds(session: EmergencySession, now: number) {
  const elapsed = Math.max(0, Math.floor((now - Date.parse(session.visits.at(-1)!.enteredAt)) / 1000));
  const timer = currentStep(session)?.timer;
  return { elapsed, remaining: timer?.mode === 'limit' ? Math.max(0, timer.seconds - elapsed) : null };
}

export function formatElapsed(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function emergencyReport(session: EmergencySession) {
  return [
    'VITRUVIO / EMERGENCY HANDOVER RECORD',
    `Record: ${session.execution.id}`, `Case: ${session.execution.title}`, `Crew member: ${session.execution.crewMemberId}`,
    `Environment: ${session.environment.name}`, `Earth delay: ${session.environment.communicationDelayMinutes} min one way (scenario)`,
    `Status: ${session.execution.status}`, `Started: ${session.execution.startedAt}`, `Ended: ${session.endedAt ?? 'Not ended'}`, '',
    ...session.visits.flatMap((visit, index) => [
      `${index + 1}. ${session.execution.steps[index].action.text}`,
      `Entered: ${visit.enteredAt}`, `User response: ${visit.answer ?? 'Not yet answered'}`, `Confirmed: ${visit.answeredAt ?? 'Not yet confirmed'}`,
      `Source: ${session.execution.steps[index].action.sourceTitle} — ${session.execution.steps[index].action.sourceUrl}`, '',
    ]),
    'Times and actions reflect user confirmations, not independently verified care.',
    'Adapted training prototype; not a validated flight medical procedure. No message has been sent.',
  ].join('\n');
}
