import { describe, expect, it } from 'vitest';
import { protocols } from '../../data/protocols';
import { abortCase, answerCase, beginCase, currentStep, emergencyReport, formatElapsed, stepSeconds, type EmergencySession } from './workflow';
import { createEmergencyJournal, isEmergencySession, JOURNAL_KEY } from './journal';

const start = '2026-11-14T15:00:00.000Z';
const env = { id: 'transit', name: 'Transit vehicle', communicationDelayMinutes: 11.7 };
const checkedAtByUrl: Record<string, string> = {
  'https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person': '2026-11-15',
  'https://www.redcross.org/take-a-class/resources/learn-first-aid/heart-attack': '2026-11-15',
  'https://ntrs.nasa.gov/citations/19950010359': '2026-11-15',
};
function session(id = 'collapse') { return beginCase(id, 'JL-02', env, start, 'test-record'); }
function answer(s: EmergencySession, label: string, seconds = s.visits.length) {
  const index = currentStep(s)!.answers.findIndex(a => a.label === label);
  expect(index, label).toBeGreaterThanOrEqual(0);
  const result = answerCase(s, s.visits.length - 1, index, new Date(Date.parse(start) + seconds * 1000).toISOString());
  expect(isEmergencySession(result)).toBe(true);
  return result;
}

describe('source-backed emergency graphs', () => {
  it.each(protocols)('$name has reachable, cited steps and a handover exit', protocol => {
    const reachable = new Set<string>();
    const pending = [protocol.start];
    while (pending.length) {
      const id = pending.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      const step = protocol.steps[id];
      expect(step).toBeDefined();
      expect(step.action.text.trim().split(/\s+/).length).toBeLessThanOrEqual(10);
      expect(step.answers.length).toBeGreaterThan(0);
      expect(step.answers.length).toBeLessThanOrEqual(2);
      expect(step.sources.length).toBeGreaterThan(0);
      expect(step.action.sourceUrl).toBe(step.sources[0].url);
      for (const source of step.sources) {
        expect(new URL(source.url).protocol).toBe('https:');
        expect(source.note).not.toBe('');
        expect(source.checkedAt, source.url).toBe(checkedAtByUrl[source.url]);
      }
      for (const choice of step.answers) if (choice.next) pending.push(choice.next);
    }
    expect([...reachable].sort()).toEqual(Object.keys(protocol.steps).sort());
    expect(protocol.steps.handover.answers[0].next).toBeNull();
    // Every node can reach handover; loops never trap a case.
    for (const origin of reachable) {
      const queue = [origin]; const seen = new Set<string>(); let finishes = false;
      while (queue.length) {
        const id = queue.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        for (const choice of protocol.steps[id].answers) {
          if (choice.next === null) finishes = true;
          else queue.push(choice.next);
        }
      }
      expect(finishes, origin).toBe(true);
    }
  });
});

describe('backend execution adapter', () => {
  it('records collapse through CPR without completing unvisited branches', () => {
    let s = session();
    for (const label of ['Help requested', 'No response', 'Not breathing / gasping', 'Medical officer took over', 'Finish handover record']) s = answer(s, label);
    expect(s.execution.status).toBe('completed');
    expect(s.visits.map(v => v.stepId)).toEqual(['call', 'respond', 'breathing', 'cpr', 'handover']);
    expect(s.execution.steps.every(step => step.state === 'done')).toBe(true);
    expect(s.execution.startedAt).toBe(start);
    expect(s.endedAt).not.toBeNull();
  });
  it('records a responsive chest-pain handover', () => {
    let s = session('chest');
    for (const label of ['Continue', 'Help requested', 'They respond', 'Observations shared', 'Medical officer took over', 'Finish handover record']) s = answer(s, label);
    expect(s.execution.status).toBe('completed');
    expect(s.visits.map(v => v.stepId)).toContain('symptoms');
    expect(s.visits.map(v => v.stepId)).not.toContain('cpr');
  });
  it('handles deterioration and repeated visits without overwriting earlier answers', () => {
    let s = session();
    for (const label of ['Help requested', 'They respond', 'Condition changed', 'No response', 'Breathing normally', 'Breathing changed', 'Not breathing / gasping', 'Breathing normally', 'Continue monitoring', 'Medical officer took over', 'Finish handover record']) s = answer(s, label);
    expect(s.execution.status).toBe('completed');
    expect(s.visits.filter(v => v.stepId === 'respond').map(v => v.answer)).toEqual(['They respond', 'No response']);
    expect(s.execution.steps.length).toBe(s.visits.length);
  });
  it('rejects stale double answers and invalid choices or timestamps', () => {
    const s = session(); const next = answer(s, 'Help requested');
    expect(answerCase(next, 0, 0, start)).toBe(next);
    expect(answerCase(s, 0, 99, start)).toBe(s);
    expect(answerCase(s, 0, 0, 'invalid')).toBe(s);
    expect(answerCase(s, 0, 0, '2020-01-01')).toBe(s);
  });
  it('ends early using the backend abort command, leaving pending steps unconfirmed', () => {
    const s = abortCase(answer(session(), 'Help requested'), '2026-11-14T15:00:03Z');
    expect(s.execution.status).toBe('aborted');
    expect(s.execution.steps.at(-1)!.state).toBe('pending');
    expect(isEmergencySession(s)).toBe(true);
    expect(answerCase(s, 1, 0, start)).toBe(s);
  });
});

describe('timers and handover evidence', () => {
  it('counts down from recorded entry time across sleep/reload without changing the step', () => {
    const s = answer(session(), 'Help requested', 1);
    expect(stepSeconds(s, Date.parse(start) + 4000)).toEqual({ elapsed: 3, remaining: 7 });
    expect(stepSeconds(s, Date.parse(start) + 120000)).toEqual({ elapsed: 119, remaining: 0 });
    expect(s.execution.status).toBe('inProgress');
    expect(s.visits.at(-1)!.answer).toBeNull();
  });
  it('allows immediate answers without waiting for a timer', () => {
    let s = answer(session(), 'Help requested', 0);
    s = answer(s, 'No response', 0);
    expect(currentStep(s)!.id).toBe('breathing');
  });
  it('reports elapsed care time, not an invented CPR deadline', () => {
    let s = session();
    for (const label of ['Help requested', 'No response', 'Not breathing / gasping']) s = answer(s, label);
    expect(stepSeconds(s, Date.parse(start) + 123000)).toEqual({ elapsed: 120, remaining: null });
  });
  it('exports timestamps, user confirmations, sources and an explicit unfinished status', () => {
    const text = emergencyReport(answer(session(), 'Help requested'));
    expect(text).toContain('Status: inProgress');
    expect(text).toContain('User response: Help requested');
    expect(text).toContain('Confirmed: 2026-11-14T15:00:01.000Z');
    expect(text).toContain('Not yet answered');
    expect(text).toContain('https://www.redcross.org/');
    expect(text).toContain('No message has been sent');
  });
  it('formats durations beyond an hour and clamps negative values', () => {
    expect(formatElapsed(3601)).toBe('60:01');
    expect(formatElapsed(-2)).toBe('00:00');
  });
});

describe('local emergency journal', () => {
  function memory() {
    const values = new Map<string, string>();
    return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  }
  it('persists the case and restores the same pending step and entry time', () => {
    const storage = memory(); const first = createEmergencyJournal(storage);
    first.save(answer(session(), 'Help requested'));
    const restored = createEmergencyJournal(storage);
    expect(restored.getSnapshot().sessions).toEqual(first.getSnapshot().sessions);
    expect(currentStep(restored.getSnapshot().sessions[0])!.id).toBe('respond');
    expect(restored.getSnapshot().persistence).toBe('device');
  });
  it('keeps completed and aborted history when another case starts', () => {
    const journal = createEmergencyJournal(memory());
    journal.save(abortCase(session(), start));
    journal.save(beginCase('chest', 'JL-02', env, start, 'other-record'));
    expect(journal.getSnapshot().sessions).toHaveLength(2);
  });
  it('keeps stable snapshots and notifies subscribers only when saving', () => {
    const journal = createEmergencyJournal(memory()); let changes = 0;
    const before = journal.getSnapshot(); const unsubscribe = journal.subscribe(() => changes++);
    expect(journal.getSnapshot()).toBe(before);
    journal.save(session()); expect(changes).toBe(1);
    unsubscribe(); journal.save(session()); expect(changes).toBe(1);
  });
  it('survives storage denial and quota errors with a session-only record', () => {
    const journal = createEmergencyJournal({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    journal.save(session());
    expect(journal.getSnapshot().persistence).toBe('session');
    expect(journal.getSnapshot().sessions).toHaveLength(1);
    expect(createEmergencyJournal().getSnapshot().persistence).toBe('session');
  });
  it('preserves unreadable stored bytes instead of overwriting them', () => {
    const storage = memory(); storage.values.set(JOURNAL_KEY, 'old or damaged bytes');
    const journal = createEmergencyJournal(storage); journal.save(session());
    expect(journal.getSnapshot().problem).toBe('unreadable');
    expect(journal.getSnapshot().sessions).toHaveLength(1);
    expect(storage.values.get(JOURNAL_KEY)).toBe('old or damaged bytes');
  });
  it('rejects corrupted or incompatible records before rendering them', () => {
    const original = session();
    expect(isEmergencySession({ ...original, version: 'old' })).toBe(false);
    expect(isEmergencySession({ ...original, visits: [] })).toBe(false);
    expect(isEmergencySession({ ...original, execution: { ...original.execution, steps: [] } })).toBe(false);
    expect(isEmergencySession({ ...original, environment: { ...env, communicationDelayMinutes: -1 } })).toBe(false);
  });
});
