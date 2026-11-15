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
  checkedAt: '2026-11-15',
  note: 'Check response and breathing within 10 seconds. Gasping is not normal breathing. Seek emergency help and continue care within your training.',
};
const chest: ProtocolSource = {
  title: 'American Red Cross · Heart attack first aid',
  url: 'https://www.redcross.org/take-a-class/resources/learn-first-aid/heart-attack',
  checkedAt: '2026-11-15',
  note: 'Seek emergency help promptly for suspected heart attack. Rest comfortably and monitor breathing and responsiveness.',
};
const microgravity: ProtocolSource = {
  title: 'NASA NTRS · CPR in microgravity (1992)',
  url: 'https://ntrs.nasa.gov/citations/19950010359',
  checkedAt: '2026-11-15',
  note: 'This research identifies restraint and technique as factors in effective microgravity CPR. It is context, not a current flight procedure.',
};

function note(source: ProtocolSource, section: string, scope: string): ProtocolSource {
  return { ...source, note: `${source.note} Section: ${section}. ${scope}` };
}

function step(id: string, text: string, detail: string, sources: ProtocolSource[], answers: Step['answers'], timer?: Step['timer']): Step {
  return { id, action: { text, sourceTitle: sources[0].title, sourceUrl: sources[0].url }, detail, sources, answers, ...(timer ? { timer } : {}) };
}

const common = {
  respond: step('respond', 'Check response and normal breathing.',
    'Shout, tap a shoulder, then shout again. Check breathing at the same time. Do not wait for the timer.',
    [note(assessment, 'How do I check a person who appears unresponsive?', 'Direct clinical source: shout, tap and check breathing for no more than 10 seconds. Local process only: the countdown widget, timer display and "Do not wait for the timer" are UI/UX wording, not quoted source; clinical review pending.')],
    [{ label: 'They respond', next: 'monitor' }, { label: 'No response', next: 'breathing' }],
    { mode: 'limit', seconds: 10, label: 'Response and breathing check · maximum 10 seconds' }),
  breathing: step('breathing', 'Are they breathing normally?',
    'Use what you just observed. Gasping is not normal breathing. Do not repeat the timed check.',
    [note(assessment, 'How do I check a person who appears unresponsive?', 'Direct clinical source: not breathing or only gasping. Local process only: "Do not repeat the timed check" is UI/UX wording, not a medical rule; clinical review pending.')],
    [{ label: 'Breathing normally', next: 'airway' }, { label: 'Not breathing / gasping', next: 'cpr' }]),
  airway: step('airway', 'Protect their airway using your onboard training.',
    'Keep checking breathing. Follow the medical officer’s instructions for positioning and possible injury.',
    [note(assessment, 'General Care', 'Direct clinical source: recovery position, possible injury and continued breathing checks. Onboard editorial adaptation: follow the onboard medical officer and mission training; not a NASA procedure.')],
    [{ label: 'Breathing changed', next: 'breathing' }, { label: 'Continue monitoring', next: 'monitor' }]),
  cpr: step('cpr', 'Start CPR and use the AED as trained.',
    'Follow your mission-trained restraint technique and AED prompts. Do not delay care for an Earth reply.',
    [note(assessment, 'How do I check a person who appears unresponsive?', 'Direct clinical source: CPR and AED for cardiac arrest. Onboard editorial adaptation: mission-trained restraint, AED prompts and continuing without an Earth reply are local procedure context, not verified article quotes.'),
      note(microgravity, 'Abstract/results', 'Historical context only: 1992 microgravity CPR research identifies restraint and technique factors; it is not a current procedure and is not NASA approval or a standard.')],
    [{ label: 'Breathing normally', next: 'airway' }, { label: 'Medical officer took over', next: 'handover' }],
    { mode: 'elapsed', label: 'Time on this step · continue care as trained' }),
  monitor: step('monitor', 'Stay with them. Watch breathing and responsiveness.',
    'Report any change to the medical officer. This timer records elapsed time; it does not set a waiting period.',
    [note(assessment, 'General Care', 'Direct clinical source: continue checking breathing and responsiveness. Local process only: reporting changes, the elapsed timer and "does not set a waiting period" are app tracking wording, not a medical wait period.')],
    [{ label: 'Condition changed', next: 'respond' }, { label: 'Medical officer took over', next: 'handover' }],
    { mode: 'elapsed', label: 'Monitoring time' }),
  handover: step('handover', 'Give your observations to the medical officer.',
    'Share the responses and times recorded here. Finishing this record does not mean care is complete.',
    [note(assessment, 'General Care', 'Local process only: ARC does not clinically source a spacecraft medical handover. Recording responses, timestamps and team handover are app process, not approved medical care complete.')],
    [{ label: 'Finish handover record', next: null }]),
};

export const protocols: Protocol[] = [
  {
    id: 'collapse', name: 'A crewmate collapsed', start: 'call',
    steps: {
      ...common,
      call: step('call', 'Call the Crew Medical Officer now.',
        'Onboard adaptation: summon medical help and ask a crewmate to bring the AED. Continue care without waiting for Earth.',
        [note(assessment, 'Emergency Steps', 'Onboard editorial adaptation: calling the Crew Medical Officer, asking for the AED and continuing without waiting for Earth are project adaptations, not ARC or NASA instructions.')],
        [{ label: 'Help requested', next: 'respond' }]),
    },
  },
  {
    id: 'chest', name: 'Chest pain', start: 'stop',
    steps: {
      ...common,
      stop: step('stop', 'Stop activity. Rest in a comfortable position.',
        'Get help promptly; do not wait for pain to become severe.',
        [note(chest, 'General Care: Heart Attack; Heart Attack FAQs', 'Direct clinical source: stop activity, rest in a comfortable position and get help promptly. Local process only: "Do not wait for pain to become severe" adds no timing and is not a new clinical rule.')],
        [{ label: 'Continue', next: 'call' }]),
      call: step('call', 'Call the Crew Medical Officer now.',
        'Onboard adaptation: request medical help for chest pain. Do not wait for an Earth reply.',
        [note(chest, 'Emergency Steps', 'Onboard editorial adaptation: calling the Crew Medical Officer and continuing without an Earth reply are project adaptations, not ARC or NASA instructions.')],
        [{ label: 'Help requested', next: 'respond' }]),
      respond: { ...common.respond, answers: [{ label: 'They respond', next: 'symptoms' }, { label: 'No response', next: 'breathing' }] },
      symptoms: step('symptoms', 'Tell the medical officer when the pain began.',
        'Describe the pain and any breathing difficulty or other changes.',
        [note(chest, 'Emergency Steps; General Care: Heart Attack', 'Direct clinical source: signs of a heart attack and changes to report. Local process only: "when the pain began" is documentation wording, not a literal article instruction or a new clinical rule.')],
        [{ label: 'Observations shared', next: 'monitor' }]),
    },
  },
];

export function findProtocol(id: string) { return protocols.find(p => p.id === id); }
