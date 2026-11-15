/** Builds a finite timeline. The static markup is the final pose, so reverting always lands on it. */
export type ArtMotion = (root: SVGSVGElement) => gsap.core.Timeline | void;

/** Shared entrance for every callout in a plate; call it at the end of a timeline. */
export function revealCallouts(tl: gsap.core.Timeline, root: SVGSVGElement, at: number | string = '>') {
  const rings = root.querySelectorAll('[data-art="ring"]');
  const leads = root.querySelectorAll('[data-art="lead"]');
  const labels = root.querySelectorAll('[data-art="label"]');
  tl.from(rings, { scale: 0.3, opacity: 0, transformOrigin: '50% 50%', duration: 0.45, ease: 'back.out(2)' }, at);
  tl.from(leads, { strokeDashoffset: 1, duration: 0.45, ease: 'power2.out' }, '<0.15');
  tl.from(labels, { opacity: 0, x: -4, duration: 0.35, ease: 'power2.out' }, '<0.25');
  return tl;
}

export const q = (root: Element, name: string) => root.querySelectorAll(`[data-art="${name}"]`);
