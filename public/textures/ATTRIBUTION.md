# Environment imagery

`earth-blue-marble.png` is the unmodified 2048 × 1024 Blue Marble map from NASA.

- Source and credit: [NASA/Goddard Space Flight Center Scientific Visualization Studio](https://svs.gsfc.nasa.gov/2915/).
- Original file: https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png
- Additional credit requested by the source: Reto Stockli (NASA/GSFC), NASA Earth Observatory.
- Downloaded: 2026-11-14. Stored locally; no NASA request occurs at runtime.

Rendering uses restrained colour, illustrative procedural clouds and illustrative rotation. These are visual treatments, not live observations or orbital telemetry. The other environment geometry, terrain, dust, stars and planet markings are authored procedurally with AI assistance and require no external asset service. The outpost and spacecraft are conceptual, not replicas of NASA hardware. No NASA endorsement is implied.

## deep-space.png

Generated for VITRUVIO, no third-party imagery: a procedural sky rendered once with vgpu
(WebGPU / Dawn, headless) from `scripts/gpu/deep-space.wgsl` by `scripts/render-deep-space.mjs`,
using simplex fBM from `@vgpu/wgsl-std`. Re-bake with `node scripts/render-deep-space.mjs`.

## planet.png

Generated for VITRUVIO, no third-party imagery: a gas world with a marbled atmosphere (domain-warped
simplex fBM from `@vgpu/wgsl-std`), rendered once with vgpu from `scripts/gpu/planet.wgsl` by
`scripts/render-deep-space.mjs`.

## semillero-logo.svg

The logo of the UTB Astronomy and Data Science seedbed (Semillero de Astronomía y Ciencia de Datos),
used with the team's permission as the emblem on the planetary base.
