import { effect, init, target } from 'vgpu';
import shader from './toon-ramp.wgsl';

const fallback = new Uint8Array([64, 128, 200, 255]);
let pending: Promise<Uint8Array> | undefined;
let backend: 'pending' | 'webgpu' | 'fallback' = 'pending';
let diagnostic = '';

/** GPU-prepared toon palette; the medical view also works on WebGL-only devices. */
export function getToonRamp() {
  pending ??= (async () => {
    if (!('gpu' in navigator)) { backend = 'fallback'; return fallback; }
    let gpu: Awaited<ReturnType<typeof init>> | undefined;
    try {
      gpu = await init();
      const output = target(gpu, { size: [4, 1] });
      effect(gpu, shader).draw(output);
      const pixels = await output.color.read({ mipLevel: 0, region: 'all' });
      const bands = new Uint8Array([pixels[0], pixels[4], pixels[8], pixels[12]]);
      if (!bands.every((value, i) => Math.abs(value - fallback[i]) <= 1)) throw new Error('Unexpected toon palette');
      backend = 'webgpu';
      return bands;
    } catch (error) {
      diagnostic = String(error);
      backend = 'fallback';
      return fallback;
    } finally { gpu?.dispose(); }
  })();
  return pending;
}

export function toonBackend() { return backend; }
export function toonDiagnostic() { return diagnostic; }
