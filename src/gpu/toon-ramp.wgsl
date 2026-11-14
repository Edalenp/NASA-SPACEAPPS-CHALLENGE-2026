// Four discrete light bands shared with the selected anatomical material.
@fragment fn main(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let levels = array<f32, 4>(64.0 / 255.0, 128.0 / 255.0, 200.0 / 255.0, 1.0);
  let index = min(u32(pixel.x), 3u);
  return vec4f(vec3f(levels[index]), 1.0);
}
