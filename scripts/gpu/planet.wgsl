// A gas world seen from the transit cabin, baked once with vgpu into a square RGBA texture
// (scripts/render-deep-space.mjs). Swirling green atmosphere with orange veins, from domain-warped
// fBM on the sphere, lit from one side with a soft terminator and a green limb. Transparent outside
// the disc, apart from a thin atmospheric glow.
import { fbmSimplex3d } from "@vgpu/wgsl-std/noise/simplex";

fn warp(n: vec3f) -> vec4f {
  // Large, smooth swirls: low-frequency fields warped twice, stretched along the bands.
  let s = n * vec3f(0.5, 1.0, 0.5);
  let q = vec3f(
    fbmSimplex3d(s + vec3f(0.0, 0.0, 1.7), 3, 2.0, 0.42),
    fbmSimplex3d(s + vec3f(5.2, 1.3, 2.8), 3, 2.0, 0.42),
    fbmSimplex3d(s + vec3f(2.4, 7.1, 0.6), 4, 2.0, 0.5));
  let r = vec3f(
    fbmSimplex3d(s + q * 2.2 + vec3f(1.7, 9.2, 0.0), 3, 2.0, 0.42),
    fbmSimplex3d(s + q * 2.2 + vec3f(8.3, 2.8, 4.1), 3, 2.0, 0.42),
    fbmSimplex3d(s + q * 2.2 + vec3f(3.9, 0.4, 6.6), 4, 2.0, 0.5));
  let f = fbmSimplex3d(s * 1.1 + r * 2.6, 3, 2.0, 0.42);
  return vec4f(f, r.x, r.y, q.x);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  let radius = length(p);
  let light = normalize(vec3f(-0.45, 0.3, 0.85));

  if (radius > 1.0) {
    // Thin atmospheric glow beyond the limb, only on the lit side.
    let edge = vec3f(p / radius, 0.0);
    let lit = smoothstep(-0.3, 0.6, dot(edge, light));
    let glow = exp(-(radius - 1.0) * 38.0) * lit;
    return vec4f(vec3f(0.55, 0.95, 0.3), glow * 0.75);
  }

  // Surface point, slightly tilted so the bands run at an angle.
  var n = vec3f(p, sqrt(max(1.0 - radius * radius, 0.0)));
  let tilt = 0.32;
  n = vec3f(n.x * cos(tilt) - n.y * sin(tilt), n.x * sin(tilt) + n.y * cos(tilt), n.z);

  let w = warp(n);
  let f = w.x * 0.5 + 0.5;
  var colour = mix(vec3f(0.16, 0.48, 0.07), vec3f(0.5, 0.92, 0.16), smoothstep(0.25, 0.7, f));
  colour = mix(colour, vec3f(0.86, 1.0, 0.42), smoothstep(0.62, 0.9, f) * 0.75);
  // Orange veins flow along iso-lines of the warped field, with a warm haze around them.
  // Broad warm regions, with thin orange filaments flowing through them.
  let region = smoothstep(0.05, 0.4, w.w);
  let line = 1.0 - smoothstep(0.0, 0.05, abs(w.y - 0.1));
  colour = mix(colour, vec3f(0.92, 0.45, 0.1) * (0.75 + 0.5 * f), region * 0.75);
  colour = mix(colour, vec3f(1.0, 0.58, 0.16), clamp(line * (0.35 + region * 0.6), 0.0, 0.9));

  // Day side, soft terminator, a faint green night side and a bright limb.
  let surface = vec3f(p, sqrt(max(1.0 - radius * radius, 0.0)));
  let day = smoothstep(-0.35, 0.4, dot(surface, light));
  let limb = pow(1.0 - surface.z, 3.0);
  colour = colour * (0.14 + 0.86 * day) + vec3f(0.45, 0.9, 0.25) * limb * (0.2 + 0.6 * day);
  let alpha = smoothstep(1.0, 0.985, radius);
  return vec4f(min(colour, vec3f(1.0)), alpha);
}
