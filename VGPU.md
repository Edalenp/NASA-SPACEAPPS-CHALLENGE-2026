# vGPU setup

Installed `vgpu@0.6.0` and matching `@vgpu/wgsl@0.6.0` after executing the requested `npx vgpu` command. The version-bundled CLI documentation is the API authority for this project.

Vite loads `.wgsl` imports with `wgslVitePlugin()`; TypeScript declarations live in `src/wgsl-env.d.ts`. The browser receives a prepared shader, without a runtime WGSL parser.

## Use in VITRUVIO

`src/gpu/toon-ramp.wgsl` renders the four light bands used by the selected anatomy's cel material. `src/gpu/toonRamp.ts` creates a small offscreen WebGPU target, reads its palette and disposes the GPU context. It runs once on demand and caches the resulting bytes. The anatomy scene continues to support WebGL devices: when WebGPU is unavailable, the exact same deterministic palette is used.

No health readings enter this shader. It makes no network request and adds no continuous GPU loop. The local WGSL is compiled into the app and included in the offline build.

```sh
pnpm gpu:doctor
pnpm gpu:check
pnpm gpu:test
```

- `gpu:doctor` acquires a device and renders/readbacks a real target.
- `gpu:check` requires device-backed validation of the WGSL source.
- `gpu:test` renders the palette through Dawn and compares its pixels with `[64, 128, 200, 255]`.

Validated on Windows/D3D12 on 2026-11-14: doctor returned `healthy`, WGSL validation passed, and the pixel assertions passed. Browser verification also exercised both the WebGPU palette and fallback paths. This machine's managed Chromium can fail to load `dxcompiler.dll`; the test browser used `--disable-dawn-features=use_dxc` to exercise the native WebGPU path. That development flag is not required by the application and is not set for users. The normal browser fallback remains functional.

## Documentation

```sh
pnpm exec vgpu docs cat getting-started.md
pnpm exec vgpu docs find "topic"
pnpm exec vgpu docs cat nextjs.md
```

The `nextjs.md` guide also contains the supported Vite integration. Future upgrades should keep `vgpu` and `@vgpu/wgsl` on matching versions and rerun all three GPU checks.
