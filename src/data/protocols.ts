import type { SourcedAction } from '../engine/types';

/** Source-backed prototype content. Onboard adaptations are explicit, not NASA clinical procedures. */
export const PROTOCOL_VERSION = '2026-11-14.1';
export interface ProtocolSource {
  title: string;
  url: string;
  checkedAt: string;
  /** A short local paraphrase remains available offline. */
  note: string;
}
export interface Step {
  id: string;
  action: SourcedAction;
  detail: string;
  sources: ProtocolSource[];
  timer?: { mode: 'limit'; seconds: number; label: string } | { mode: 'elapsed'; label: string };
  answers: { label: string; next: string | null }[];
}
export interface Protocol { id: string; name: string; start: string; steps: Record<string, Step> }

const assessment: ProtocolSource = {
  title: 'American Red Cross · Unresponsive person',
  url: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person',
  checkedAt: '2026-11-14',
  note: 'Check response and breathing within 10 seconds. Gasping is not normal breathing. Seek emergency help and continue care within your training.',
};
const chest: ProtocolSource = {
  title: 'American Red Cross · Heart attack first aid',
  url: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/heart-attack',
  checkedAt: '2026-11-14',
  note: 'Seek emergency help promptly for suspected heart attack. Rest comfortably and monitor breathing and responsiveness.',
};
const microgravity: ProtocolSource = {
  title: 'NASA NTRS · CPR in microgravity (1992)',
  url: 'https://ntrs.nasa.gov/citations/19950010359',
  checkedAt: '2026-11-14',
  note: 'This research identifies restraint and technique as factors in effective microgravity CPR. It is context, not a current flight procedure.',
};

function step(id: string, text: string, detail: string, sources: ProtocolSource[], answers: Step['answers'], timer?: Step['timer']): Step {
  return { id, action: { text, sourceTitle: sources[0].title, sourceUrl: sources[0].url }, detail, sources, answers, ...(timer ? { timer } : {}) };
}

const common = {
  respond: step('respond', 'Check response and normal breathing.',
    'Shout, tap a shoulder, then shout again. Check breathing at the same time. Do not wait for the timer.',
    [assessment], [{ label: 'They respond', next: 'monitor' }, { label: 'No response', next: 'breathing' }],
    { mode: 'limit', seconds: 10, label: 'Response and breathing check · maximum 10 seconds' }),
  breathing: step('breathing', 'Are they breathing normally?',
    'Use what you just observed. Gasping is not normal breathing. Do not repeat the timed check.',
    [assessment], [{ label: 'Breathing normally', next: 'airway' }, { label: 'Not breathing / gasping', next: 'cpr' }]),
  airway: step('airway', 'Protect their airway using your onboard training.',
    'Keep checking breathing. Follow the medical officer’s instructions for positioning and possible injury.',
    [assessment], [{ label: 'Breathing changed', next: 'breathing' }, { label: 'Continue monitoring', next: 'monitor' }]),
  cpr: step('cpr', 'Start CPR and use the AED as trained.',
    'Follow your mission-trained restraint technique and AED prompts. Do not delay care for an Earth reply.',
    [assessment, microgravity], [{ label: 'Breathing normally', next: 'airway' }, { label: 'Medical officer took over', next: 'handover' }],
    { mode: 'elapsed', label: 'Time on this step · continue care as trained' }),
  monitor: step('monitor', 'Stay with them. Watch breathing and responsiveness.',
    'Report any change to the medical officer. This timer records elapsed time; it does not set a waiting period.',
    [assessment], [{ label: 'Condition changed', next: 'respond' }, { label: 'Medical officer took over', next: 'handover' }],
    { mode: 'elapsed', label: 'Monitoring time' }),
  handover: step('handover', 'Give your observations to the medical officer.',
    'Share the responses and times recorded here. Finishing this record does not mean care is complete.',
    [assessment], [{ label: 'Finish handover record', next: null }]),
};

export const protocols: Protocol[] = [
  {
    id: 'collapse', name: 'A crewmate collapsed', start: 'call',
    steps: {
      ...common,
      call: step('call', 'Call the Crew Medical Officer now.',
        'Onboard adaptation: summon medical help and ask a crewmate to bring the AED. Continue care without waiting for Earth.',
        [assessment], [{ label: 'Help requested', next: 'respond' }]),
    },
  },
  {
    id: 'chest', name: 'Chest pain', start: 'stop',
    steps: {
      ...common,
      stop: step('stop', 'Stop activity. Rest in a comfortable position.',
        'Get help promptly; do not wait for pain to become severe.',
        [chest], [{ label: 'Continue', next: 'call' }]),
      call: step('call', 'Call the Crew Medical Officer now.',
        'Onboard adaptation: request medical help for chest pain. Do not wait for an Earth reply.',
        [chest], [{ label: 'Help requested', next: 'respond' }]),
      respond: { ...common.respond, answers: [{ label: 'They respond', next: 'symptoms' }, { label: 'No response', next: 'breathing' }] },
      symptoms: step('symptoms', 'Tell the medical officer when the pain began.',
        'Describe the pain and any breathing difficulty or other changes.',
        [chest], [{ label: 'Observations shared', next: 'monitor' }]),
    },
  },
];

export function findProtocol(id: string) { return protocols.find(p => p.id === id); }
