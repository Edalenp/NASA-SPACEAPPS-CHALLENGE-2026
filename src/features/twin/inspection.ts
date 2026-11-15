import type { SystemId } from '../../data/mission';
import { Vector3 } from 'three';

interface InspectionView {
  center: [number, number, number];
  radius: [number, number, number];
  distance: number;
  /** Camera envelope can be tighter than the shader selection region. */
  frame?: [number, number];
  yaw: number;
}

export const inspectionViews: Record<SystemId, InspectionView> = {
  head: { center: [0, 1.65, 0], radius: [0.22, 0.23, 0.24], frame: [0.12, 0.13], distance: 0.5, yaw: 0.12 },
  heart: { center: [0.025, 1.36, 0.025], radius: [0.23, 0.24, 0.23], distance: 0.95, yaw: 0.16 },
  lungs: { center: [0, 1.34, 0], radius: [0.31, 0.3, 0.28], distance: 1.2, yaw: -0.13 },
  bones: { center: [0, 0.93, 0], radius: [0.5, 1.05, 0.4], distance: 3.45, yaw: 0.18 },
  immune: { center: [0, 1.17, 0], radius: [0.31, 0.33, 0.28], distance: 1.3, yaw: 0.12 },
  sleep: { center: [0, 1.65, 0], radius: [0.25, 0.34, 0.25], frame: [0.14, 0.16], distance: 0.7, yaw: -0.1 },
};

/** A consistent close-up: preserve the focus height, fill the view, and protect the organ on narrow screens. */
export function inspectionDistance(system: SystemId, aspect: number, fov = 32) {
  const view = inspectionViews[system];
  const frame = view.frame ?? [view.radius[0], view.radius[1]];
  const tangent = Math.tan(fov * Math.PI / 360);
  const horizontalFit = frame[0] / (tangent * Math.max(0.25, Math.min(aspect, 1.1))) * 1.08;
  // Musculoskeletal inspection already frames the whole body rather than a single organ.
  const verticalFit = system === 'bones' ? view.distance : frame[1] / (tangent * 0.9);
  return Math.max(view.distance, horizontalFit, verticalFit);
}

export function focusPoint(system: SystemId | null, rotation: number) {
  return new Vector3(...(system ? inspectionViews[system].center : [0, 0.9, 0] as const))
    .applyAxisAngle(new Vector3(0, 1, 0), rotation);
}

export function systemFor(name: string): SystemId {
  if (/brain|cerebell|skull|cranium|mandible|nerve|pituitary|eye_|tongue|teeth|salivary/i.test(name)) return 'head';
  if (/heart|arter|vein|aorta|vessel|vena_cava|carotid|coronary/i.test(name)) return 'heart';
  // The diaphragm is a muscle sheet; tinted with the airways it shatters into shards, so it stays musculoskeletal.
  if (/lung|trache|bronch|larynx/i.test(name)) return 'lungs';
  if (/liver|kidney|stomach|pancreas|spleen|intestin|bladder|colon|appendix|adrenal|gallbladder|thymus|esophag|ureter|prostate|reproductive/i.test(name)) return 'immune';
  return 'bones';
}

/** A ray hit on the body: the mesh name and the group it sits in (organs, vessels, muscles, skeleton). */
export interface BodyHit { name: string; group: string; visible: boolean }

/** Vessels of the trunk, where a click means the circulation rather than the muscle over it. */
const TRUNK_VESSEL = /aorta|thorax|abdomen|pulmonary|coronary|vena_cava/i;

/**
 * The body reads as translucent, so a click should reach what it shows through: the first organ
 * along the ray wins, then a trunk vessel, and only then the nearest muscle or bone. Skin and
 * hidden meshes never count. Clicking the thigh still picks bones & muscles (only limb vessels
 * lie behind it); clicking over the heart picks circulation.
 */
export function pickHit<T extends BodyHit>(hits: readonly T[]): T | undefined {
  const shown = hits.filter((hit) => hit.visible && !/skin/i.test(hit.name) && !/skin/i.test(hit.group));
  return shown.find((hit) => hit.group === 'organs')
    ?? shown.find((hit) => hit.group === 'vessels' && TRUNK_VESSEL.test(hit.name))
    ?? shown[0];
}
