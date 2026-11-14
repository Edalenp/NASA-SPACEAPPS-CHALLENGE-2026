/**
 * Emergency protocols as one-instruction-per-screen trees.
 * DRAFT written with AI assistance (Claude) from generic first-aid steps.
 * Pending clinical review and a cited source per step. Names no drug or dose.
 */
export interface Step {
  id: string;
  say: string;
  /** Up to two answers. One answer means "Done". */
  answers: { label: string; next: string | null }[];
}

export interface Protocol { id: string; name: string; start: string; steps: Record<string, Step> }

export const protocols: Protocol[] = [
  {
    id: 'collapse',
    name: 'A crewmate collapsed',
    start: 'respond',
    steps: {
      respond: { id: 'respond', say: 'Tap their shoulders. Ask loudly: are you OK?', answers: [{ label: 'They respond', next: 'side' }, { label: 'No response', next: 'call' }] },
      call: { id: 'call', say: 'Call the Crew Medical Officer now.', answers: [{ label: 'Done', next: 'breathing' }] },
      breathing: { id: 'breathing', say: 'Look for normal breathing for 10 seconds.', answers: [{ label: 'Breathing', next: 'side' }, { label: 'Not breathing', next: 'cpr' }] },
      cpr: { id: 'cpr', say: 'Restrain them. Start chest compressions now.', answers: [{ label: 'CMO has taken over', next: 'log' }] },
      side: { id: 'side', say: 'Turn them on their side. Stay with them.', answers: [{ label: 'Done', next: 'vitals' }] },
      vitals: { id: 'vitals', say: 'Measure pulse, oxygen and blood pressure.', answers: [{ label: 'Done', next: 'log' }] },
      log: { id: 'log', say: 'Record the time and what you saw.', answers: [{ label: 'Finish', next: null }] },
    },
  },
  {
    id: 'chest',
    name: 'Chest pain',
    start: 'stop',
    steps: {
      stop: { id: 'stop', say: 'Stop all work. Rest, restrained, upper body raised.', answers: [{ label: 'Done', next: 'severe' }] },
      severe: { id: 'severe', say: 'Is the pain severe, or spreading to arm or jaw?', answers: [{ label: 'Yes', next: 'call' }, { label: 'No', next: 'vitals' }] },
      call: { id: 'call', say: 'Call the Crew Medical Officer now.', answers: [{ label: 'Done', next: 'vitals' }] },
      vitals: { id: 'vitals', say: 'Measure pulse, oxygen and blood pressure.', answers: [{ label: 'Done', next: 'worse' }] },
      worse: { id: 'worse', say: 'Is the pain getting worse?', answers: [{ label: 'Yes', next: 'call2' }, { label: 'No', next: 'log' }] },
      call2: { id: 'call2', say: 'Tell the CMO. Prepare to contact the flight surgeon.', answers: [{ label: 'Done', next: 'log' }] },
      log: { id: 'log', say: 'Record the time and what you felt.', answers: [{ label: 'Finish', next: null }] },
    },
  },
];
