import { create } from 'zustand';

export interface TourStep {
  /** CSS selector of the part of the console to light up. */
  target: string;
  /** Light only part of the target: [left, top, right, bottom] as fractions of its box. */
  crop?: [number, number, number, number];
  title: string;
  body: string;
  /** The line drawing that goes with the step. */
  art: string;
}

/** The console, one part at a time, in the order a first-time user meets it. */
export const tourSteps: TourStep[] = [
  { art: 'twin', target: '.three-stage', crop: [0.34, 0.06, 0.66, 0.97], title: 'Your body twin', body: 'A 3D twin coloured by your own readings: grey when there is no data, green when a selected system is well, amber or red when it needs a look. Click a part of the body to inspect it; drag to turn it.' },
  { art: 'dock', target: '.telemetry', title: 'Six body systems', body: 'Each tile shows a system’s latest reading and its state. Pick one to inspect it on the twin.' },
  { art: 'inspector', target: '.stage-left', title: 'System detail', body: 'Readings, what to do next, and the spaceflight context of the selected system. Measure again or open a step-by-step guide from here.' },
  { art: 'score', target: '.stage-right', title: 'Early warning score', body: 'NEWS2 adds seven observations into a risk score out of 20 and says who to tell. Open it for the full assessment and the mission brief.' },
  { art: 'check', target: '.action-bar', title: 'Daily check-in', body: 'Your progress towards today’s seven observations. Record a measurement or continue the guided check from here.' },
  { art: 'camera', target: '.camera', title: 'Views and camera', body: 'Switch between anatomy and skeleton, turn the body, reset the view or give the twin the whole screen.' },
  { art: 'nav', target: '.main-nav', title: 'Trends, guides and routine', body: 'Trends charts the mission so far, Guides shows how to measure each reading, and Routine walks you through the daily check.' },
  { art: 'emergency', target: '.emergency-door', title: 'Emergency', body: 'One tap opens step-by-step emergency protocols with timers and a handover record. Act on board first: Earth is minutes away.' },
  { art: 'help', target: '.tour-button', title: 'Back any time', body: 'Press ? to take this tour again.' },
];

const KEY = 'vt-tour-seen';
export function tourSeen() {
  try { return localStorage.getItem(KEY) === 'seen'; } catch { return false; }
}

export const useTour = create<{ step: number | null; start: () => void; go: (step: number) => void; end: () => void }>((set) => ({
  step: null,
  start: () => set({ step: 0 }),
  go: (step) => set({ step }),
  end: () => {
    try { localStorage.setItem(KEY, 'seen'); } catch { /* Optional preference. */ }
    set({ step: null });
  },
}));
