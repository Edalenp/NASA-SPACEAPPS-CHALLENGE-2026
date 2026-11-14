// Bakes the transit cabin's deep-space sky with vgpu (WebGPU / Dawn, headless) into
// public/textures/deep-space.png. The app shows it with WebGL, so every device sees it,
// including those without WebGPU. Run: node scripts/render-deep-space.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { resolveShader } from '@vgpu/wgsl/runtime';
import { prepareShader } from '@vgpu/wgsl/prepare';
import { effect, init, target } from 'vgpu/node';

const [width, height] = [2048, 1024];

/** A minimal RGB PNG writer (no dependency): filter 0 scanlines, deflated, with CRC'd chunks. */
function png(rgba, w, h) {
  const rows = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const from = (y * w + x) * 4, to = y * (w * 3 + 1) + 1 + x * 3;
      rows[to] = rgba[from]; rows[to + 1] = rgba[from + 1]; rows[to + 2] = rgba[from + 2];
    }
  }
  const chunk = (type, data) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
    const tail = Buffer.alloc(4); tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, tail]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const entry = fileURLToPath(new URL('./gpu/deep-space.wgsl', import.meta.url));
const resolved = await resolveShader({ entry });
const gpu = await init();
try {
  const output = target(gpu, { size: [width, height] });
  effect(gpu, prepareShader(resolved, entry)).draw(output);
  const pixels = await output.color.read({ mipLevel: 0, region: 'all' });
  const file = fileURLToPath(new URL('../public/textures/deep-space.png', import.meta.url));
  writeFileSync(file, png(pixels, width, height));
  console.log(JSON.stringify({ file, width, height }));
} finally {
  gpu.dispose();
}
