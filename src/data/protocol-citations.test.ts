import { describe, expect, it } from 'vitest';
import { protocols } from './protocols';
import { beginCase } from '../features/emergency/workflow';
import { isEmergencySession } from '../features/emergency/journal';

/** SHA-256 captured from the pre-metadata protocols.ts on 2026-11-15 (10,632-byte JSON shape). */
const BASELINE_SHA256 = '86f4443b4607cea232f1f42c94d1b7b2b13958efbdc0664850491caeef41680b';
const checkedAt = '2026-11-15';

function fingerprint() {
  return protocols.map(protocol => ({
    id: protocol.id,
    name: protocol.name,
    start: protocol.start,
    steps: Object.fromEntries(Object.entries(protocol.steps).map(([stepId, step]) => [stepId, {
      action: { text: step.action.text, sourceTitle: step.action.sourceTitle, sourceUrl: step.action.sourceUrl },
      detail: step.detail,
      sources: step.sources.map(source => ({ title: source.title, url: source.url })),
      timer: step.timer ?? null,
      answers: step.answers.map(answer => ({ label: answer.label, next: answer.next })),
    }])),
  }));
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function step(protocolId: string, stepId: string) {
  return protocols.find(protocol => protocol.id === protocolId)!.steps[stepId];
}

describe('protocol citation metadata', () => {
  it('keeps the pre-metadata flow and primary-source identity hash byte-identical', async () => {
    expect(await sha256(JSON.stringify(fingerprint()))).toBe(BASELINE_SHA256);
  });

  it('keeps two protocols, seven collapse steps, nine chest steps and eleven unique fingerprints', () => {
    expect(protocols.map(protocol => protocol.id)).toEqual(['collapse', 'chest']);
    expect(Object.keys(protocols[0].steps)).toHaveLength(7);
    expect(Object.keys(protocols[1].steps)).toHaveLength(9);
    const unique = new Set(protocols.flatMap(protocol => Object.values(protocol.steps).map(entry => JSON.stringify({
      action: entry.action,
      detail: entry.detail,
      sources: entry.sources.map(source => ({ title: source.title, url: source.url })),
      timer: entry.timer ?? null,
      answers: entry.answers,
    }))));
    expect(unique.size).toBe(11);
  });

  it('keeps primary sources first, non-empty, anchor-free and rechecked on 2026-11-15', () => {
    const primaryIdentities = new Set<string>();
    for (const protocol of protocols) {
      for (const entry of Object.values(protocol.steps)) {
        expect(entry.sources.length).toBeGreaterThan(0);
        expect(entry.action.sourceTitle).toBe(entry.sources[0].title);
        expect(entry.action.sourceUrl).toBe(entry.sources[0].url);
        primaryIdentities.add(`${entry.sources[0].title}\n${entry.sources[0].url}`);
        for (const source of entry.sources) {
          expect(source.checkedAt).toBe(checkedAt);
          expect(new URL(source.url).hash).toBe('');
        }
      }
    }
    expect(primaryIdentities).toEqual(new Set([
      'American Red Cross · Unresponsive person\nhttps://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person',
      'American Red Cross · Heart attack first aid\nhttps://www.redcross.org/take-a-class/resources/learn-first-aid/heart-attack',
    ]));
  });

  it('labels direct, adapted, local and historical notes without inventing current NASA clearance', () => {
    const allSources = protocols.flatMap(protocol => Object.values(protocol.steps).flatMap(entry => entry.sources));
    for (const source of allSources) {
      expect(source.note).toMatch(/Section: .+/);
      expect(source.note).toMatch(/Direct clinical source:|Onboard editorial adaptation:|Local process only:|Historical context only:/);
    }
    const nasa = allSources.find(source => source.url === 'https://ntrs.nasa.gov/citations/19950010359')!;
    expect(nasa.note).toMatch(/Historical context only/);
    expect(nasa.note).toMatch(/not a current procedure/i);
    expect(nasa.note).toMatch(/not NASA approval/i);
    expect(nasa.note).not.toMatch(/current flight procedure is/i);

    expect(step('collapse', 'respond').sources[0].note).toMatch(/How do I check a person who appears unresponsive\?/);
    expect(step('collapse', 'respond').sources[0].note).toMatch(/UI\/UX wording/i);
    expect(step('collapse', 'breathing').sources[0].note).toMatch(/Do not repeat the timed check/i);
    expect(step('collapse', 'breathing').sources[0].note).toMatch(/not a medical rule/i);
    expect(step('collapse', 'handover').sources[0].note).toMatch(/Local process only/i);
    expect(step('collapse', 'handover').sources[0].note).toMatch(/does not clinically source/i);
    expect(step('chest', 'symptoms').sources[0].note).toMatch(/documentation wording/i);
  });

  it('keeps the frame graph complete, limit timers <=10s, elapsed timers unnumbered and handover sourced', () => {
    for (const protocol of protocols) {
      const reachable = new Set<string>();
      const queue = [protocol.start];
      while (queue.length) {
        const id = queue.pop()!;
        if (reachable.has(id)) continue;
        reachable.add(id);
        for (const answer of protocol.steps[id].answers) if (answer.next) queue.push(answer.next);
      }
      expect([...reachable].sort()).toEqual(Object.keys(protocol.steps).sort());

      const timers = Object.values(protocol.steps).map(entry => entry.timer);
      const limits = timers.filter((timer): timer is { mode: 'limit'; seconds: number; label: string } => timer?.mode === 'limit');
      const elapsed = timers.filter((timer): timer is { mode: 'elapsed'; label: string } => timer?.mode === 'elapsed');
      expect(limits.length).toBeGreaterThan(0);
      expect(limits.every(timer => timer.seconds <= 10)).toBe(true);
      expect(elapsed.length).toBeGreaterThan(0);
      expect(elapsed.every(timer => !('seconds' in timer))).toBe(true);

      expect(protocol.steps.handover.sources[0].title).toBe(protocol.steps.handover.action.sourceTitle);
      expect(protocol.steps.handover.sources[0].url).toBe(protocol.steps.handover.action.sourceUrl);
      expect(protocol.steps.handover.answers[0].next).toBeNull();
    }
  });

  it('rejects a historical record when a primary source URL or title changes', () => {
    const environment = { id: 'transit', name: 'Transit vehicle', communicationDelayMinutes: 11.7 };
    const session = beginCase('collapse', 'JL-02', environment, '2026-11-15T15:00:00.000Z', 'baseline-record');
    expect(isEmergencySession(session)).toBe(true);
    const changeFirstSource = (patch: { sourceTitle?: string; sourceUrl?: string }) => ({
      ...session,
      execution: {
        ...session.execution,
        steps: session.execution.steps.map((entry, index) => index === 0 ? { ...entry, action: { ...entry.action, ...patch } } : entry),
      },
    });
    expect(isEmergencySession(changeFirstSource({ sourceUrl: 'https://example.invalid/changed' }))).toBe(false);
    expect(isEmergencySession(changeFirstSource({ sourceTitle: 'Changed source' }))).toBe(false);
  });
});
