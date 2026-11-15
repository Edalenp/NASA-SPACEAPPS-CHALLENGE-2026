// Deep-space sky for the transit cabin, baked once with vgpu into an equirectangular texture
// (rendered by scripts/render-deep-space.mjs). Directions follow three.js's SphereGeometry, so
// the star baked here sits where the scene places its glow. Inspired by a lone ship far from
// home: a distant orange star, a faint red line of light running from it, dust and nebulae.
import { fbmSimplex3d } from "@vgpu/wgsl-std/noise/simplex";
import { pcg2d } from "@vgpu/wgsl-std/hash";

const PI: f32 = 3.14159265;

fn direction(uv: vec2f) -> vec3f {
  let phi = uv.x * 2.0 * PI;
  let theta = uv.y * PI;
  return vec3f(-cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let d = direction(uv);

  // Base: almost black, a touch of blue towards the galactic band.
  var colour = vec3f(0.012, 0.016, 0.026);
  let galaxyNormal = normalize(vec3f(0.35, 1.0, 0.25));
  let band = exp(-pow(dot(d, galaxyNormal) / 0.28, 2.0));
  let dust = fbmSimplex3d(d * 3.2, 6, 2.07, 0.52) * 0.5 + 0.5;
  let lanes = smoothstep(0.42, 0.75, fbmSimplex3d(d * 7.5 + vec3f(3.1), 5, 2.11, 0.55) * 0.5 + 0.5);
  colour += vec3f(0.07, 0.08, 0.1) * band * dust * (1.0 - lanes * 0.8);

  // Nebulae: teal-green clouds with warm amber pockets, still dark enough to keep the cabin the subject.
  let teal = smoothstep(0.45, 0.95, fbmSimplex3d(d * 1.6 + vec3f(8.0), 6, 2.03, 0.5) * 0.5 + 0.5);
  let green = smoothstep(0.5, 0.95, fbmSimplex3d(d * 2.4 + vec3f(1.0, -6.0, 3.0), 6, 2.07, 0.52) * 0.5 + 0.5);
  let amber = smoothstep(0.6, 0.98, fbmSimplex3d(d * 2.1 + vec3f(-4.0, 2.0, 1.0), 6, 2.13, 0.5) * 0.5 + 0.5);
  colour += vec3f(0.02, 0.13, 0.12) * teal + vec3f(0.04, 0.11, 0.03) * green * band + vec3f(0.1, 0.05, 0.015) * amber;

  // The distant star: a warm core and a wide halo.
  let star = normalize(vec3f(-0.42, 0.16, -1.0));
  let angle = acos(clamp(dot(d, star), -1.0, 1.0));
  colour += vec3f(1.0, 0.72, 0.38) * (exp(-angle * 70.0) * 2.2 + exp(-angle * 11.0) * 0.35 + exp(-angle * 3.2) * 0.06);

  // A thin red line of light leaving the star and fading across the sky.
  let lineNormal = normalize(cross(star, normalize(vec3f(0.9, -0.25, -0.55))));
  let along = acos(clamp(dot(normalize(d - lineNormal * dot(d, lineNormal)), star), -1.0, 1.0));
  let side = step(0.0, dot(d, normalize(vec3f(0.9, -0.25, -0.55))) - dot(d, star) * 0.2);
  let thread = exp(-pow(dot(d, lineNormal) / 0.006, 2.0)) * exp(-along * 1.1) * side;
  let threadHaze = exp(-pow(dot(d, lineNormal) / 0.04, 2.0)) * exp(-along * 1.6) * side;
  colour += vec3f(0.85, 0.16, 0.12) * (thread * 0.55 + threadHaze * 0.12);

  // Stars: one per lucky pixel, a few bright, tinted from blue-white to amber.
  let pixel = vec2u(uv * vec2f(2048.0, 1024.0));
  let h = vec2f(pcg2d(pixel)) / 4294967295.0;
  if (h.x > 0.993) {
    let bright = pow((h.x - 0.993) / 0.007, 3.0);
    let tint = mix(vec3f(0.75, 0.85, 1.0), vec3f(1.0, 0.85, 0.65), h.y);
    colour += tint * (0.25 + bright * 0.9) * (0.6 + band * 0.6);
  }

  return vec4f(min(colour, vec3f(1.0)), 1.0);
}
