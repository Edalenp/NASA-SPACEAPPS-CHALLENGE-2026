# VITRUVIO

Autonomous crew health prototype for NASA Space Apps Challenge 2026. React, TypeScript, Vite and React Three Fiber with offline storage. Demonstration data only.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test:run
pnpm build
pnpm lint
pnpm preview
```

The production build precaches the model and local textures after the first online load.

## Integration

Santiago's monitoring interface (a270bfc) is integrated with our four complete mission habitats, dynamic inspection camera, subject lighting and translucent x-ray jelly materials. The interface exposes Anatomy and Skeleton. See ENVIRONMENTS.md, VISUAL-REFERENCES.md and VGPU.md.

Public main's engine contracts, tests, physical ranges and persistence APIs are preserved. The console's existing NEWS2 implementation is retained in src/engine/consoleNews2.ts; main's calculateNews2 remains in src/engine/news2.ts. Their existing scoring behavior is preserved independently. This integration does not reconcile clinical rules or switch the console to the newer engine API. IndexedDB version 2 retains both console entries and engine tables, with migration tests for both previous schemas.

## Attribution

Anatomy: Open Anatomy 3D, CC BY 4.0 (public/models). Earth: NASA Blue Marble (public/textures/ATTRIBUTION.md). Remaining habitat geometry is procedural. Design references are described without redistributing their artwork. Code and integration developed with OpenAI Codex assistance; existing attribution is retained.

Mission simulation prototype, not medical advice or a flight-certified clinical system.
