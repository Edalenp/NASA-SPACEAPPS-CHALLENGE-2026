import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { init, effect, target } from 'vgpu/node';
import { prepareShader } from '@vgpu/wgsl/prepare';

const source = await readFile(new URL('../src/gpu/toon-ramp.wgsl', import.meta.url), 'utf8');
const gpu = await init();
try {
  const output = target(gpu, { size: [4, 1] });
  effect(gpu, prepareShader(source)).draw(output);
  const pixels = await output.color.read({ mipLevel: 0, region: 'all' });
  const expected = [64, 128, 200, 255];
  for (let i = 0; i < expected.length; i++) {
    assert.ok(Math.abs(pixels[i * 4] - expected[i]) <= 1, `Toon band ${i} differs from reference`);
    assert.equal(pixels[i * 4 + 3], 255);
  }
  console.log(JSON.stringify({ result: 'pass', bands: expected, renderer: 'WebGPU / Dawn' }));
} finally { gpu.dispose(); }
