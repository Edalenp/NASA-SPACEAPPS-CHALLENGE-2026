// Bakes the transit cabin's view with vgpu (WebGPU / Dawn, headless) into static images:
// public/textures/deep-space.png (equirectangular sky) and public/textures/planet.png (the gas
// world, RGBA). The app shows them with WebGL, so every device sees them, including those without
// WebGPU. Run: node scripts/render-deep-space.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { resolveShader } from '@vgpu/wgsl/runtime';
import { prepareShader } from '@vgpu/wgsl/prepare';
import { effect, init, target } from 'vgpu/node';

/** A minimal PNG writer (no dependency): RGB or RGBA, filter 0 scanlines, deflated, CRC'd chunks. */
function png(rgba, w, h, alpha) {
  const channels = alpha ? 4 : 3;
  const rows = Buffer.alloc((w * channels + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const from = (y * w + x) * 4, to = y * (w * channels + 1) + 1 + x * channels;
      for (let c = 0; c < channels; c++) rows[to + c] = rgba[from + c];
    }
  }
  const chunk = (type, data) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
    const tail = Buffer.alloc(4); tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, tail]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, alpha ? 6 : 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const bakes = [
  { shader: './gpu/deep-space.wgsl', out: '../public/textures/deep-space.png', size: [2048, 1024], alpha: false },
  { shader: './gpu/planet.wgsl', out: '../public/textures/planet.png', size: [1024, 1024], alpha: true },
];

const gpu = await init();
try {
  for (const bake of bakes) {
    const entry = fileURLToPath(new URL(bake.shader, import.meta.url));
    const resolved = await resolveShader({ entry });
    const output = target(gpu, { size: bake.size });
    effect(gpu, prepareShader(resolved, entry)).draw(output);
    const pixels = await output.color.read({ mipLevel: 0, region: 'all' });
    const file = fileURLToPath(new URL(bake.out, import.meta.url));
    writeFileSync(file, png(pixels, bake.size[0], bake.size[1], bake.alpha));
    console.log(JSON.stringify({ file, size: bake.size }));
  }
} finally {
  gpu.dispose();
}
