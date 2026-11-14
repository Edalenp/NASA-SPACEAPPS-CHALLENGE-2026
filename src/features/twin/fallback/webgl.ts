/** True when this device can create a WebGL context. Checked once; the 3D twin needs it (RF-15). */
let cached: boolean | undefined;
export function hasWebGL(): boolean {
  if (cached !== undefined) return cached;
  try {
    const canvas = document.createElement('canvas');
    cached = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}

/** `?twin=2d` forces the 2D view, for demos and for testing the fallback on capable devices. */
export function twinMode(): '3d' | '2d-requested' | '2d-unavailable' {
  if (typeof window === 'undefined') return '3d';
  if (new URLSearchParams(window.location.search).get('twin') === '2d') return '2d-requested';
  return hasWebGL() ? '3d' : '2d-unavailable';
}
