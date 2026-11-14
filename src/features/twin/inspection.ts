import type { SystemId } from '../../data/mission';
import { Vector3 } from 'three';

interface InspectionView {
  center: [number, number, number];
  radius: [number, number, number];
  distance: number;
  yaw: number;
}

export const inspectionViews: Record<SystemId, InspectionView> = {
  head: { center: [0, 1.7, 0], radius: [0.22, 0.23, 0.24], distance: 1.25, yaw: 0.12 },
  heart: { center: [0.025, 1.36, 0.025], radius: [0.23, 0.24, 0.23], distance: 1.25, yaw: 0.16 },
  lungs: { center: [0, 1.34, 0], radius: [0.31, 0.3, 0.28], distance: 1.6, yaw: -0.13 },
  bones: { center: [0, 0.93, 0], radius: [0.5, 1.05, 0.4], distance: 3.45, yaw: 0.18 },
  immune: { center: [0, 1.17, 0], radius: [0.31, 0.33, 0.28], distance: 1.7, yaw: 0.12 },
  sleep: { center: [0, 1.68, 0], radius: [0.25, 0.34, 0.25], distance: 1.65, yaw: -0.1 },
};

export function focusPoint(system: SystemId | null, rotation: number) {
  return new Vector3(...(system ? inspectionViews[system].center : [0, 0.9, 0] as const))
    .applyAxisAngle(new Vector3(0, 1, 0), rotation);
}

export function systemFor(name: string): SystemId {
  if (/brain|cerebell|skull|cranium|mandible|nerve|pituitary|eye_|tongue|teeth|salivary/i.test(name)) return 'head';
  if (/heart|arter|vein|aorta|vessel|vena_cava|carotid|coronary/i.test(name)) return 'heart';
  if (/lung|trache|bronch|diaphragm|larynx/i.test(name)) return 'lungs';
  if (/liver|kidney|stomach|pancreas|spleen|intestin|bladder|colon|appendix|adrenal|gallbladder|thymus|esophag|ureter|prostate|reproductive/i.test(name)) return 'immune';
  return 'bones';
}
