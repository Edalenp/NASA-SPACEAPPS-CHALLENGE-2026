# VITRUVIO

Autonomous crew health prototype for NASA Space Apps Challenge 2026. React, TypeScript, Vite and React Three Fiber with offline storage. Manual records stay on-device; optional simulation data is labelled.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test:run
pnpm build
pnpm lint
pnpm preview
pnpm test:e2e
```

`pnpm test:e2e` installs nothing on its own: run `pnpm exec playwright install chromium` once before the first browser test.

The production build precaches the model and local textures after the first online load.

## Integration

Santiago's monitoring interface (a270bfc) is integrated with our four complete mission habitats, dynamic inspection camera, subject lighting and translucent x-ray jelly materials. The interface exposes Anatomy and Skeleton. See ENVIRONMENTS.md, VISUAL-REFERENCES.md and VGPU.md.

The monitoring console now consumes main's `calculateNews2`, `calculateBaseline`, `evaluateZones`, `planEscalation` and `recommendSleep` through an adapter. The old console scorer remains for historical code, but no longer drives the dashboard. IndexedDB remains at version 2; canonical measurements and consciousness observations are written to the existing engine tables. Oxygen-support observations and exercise logs remain in the compatibility table because the backend has no corresponding persisted measurement type.

### Record -> assessment flow

- `useHealthStore` is the single derived assessment store. Hydration, the mission clock, a new reading, a simulation load and an environment change all refresh it; `useAssessment` reads it instead of recomputing in every component.
- `assess()` delegates NEWS2, baselines and zone states to `buildAlert`, so the dashboard and the engine share one bridge. Missing oxygen support is no longer inferred as cabin air: NEWS2 remains incomplete until the oxygen flag is recorded.
- The simulator mood profile uses the same 1–5 scale as the UI (mean 3.8, standard deviation 0.6).
- `e2e/record-to-assessment.spec.ts` records a high pulse, checks that the heart system becomes an alert and that the recommendation is reachable. It is a smoke test for the record -> assessment path, not a full E2E suite.

### Measurements, trends and routine (assignment X)

- Record values with backend units, physical ranges and decimal validation; mood uses 1–5 (current main contract). Blood-pressure pairs are checked before save. Storage failures remain visible and never produce a success message.
- Earlier console numeric records and consciousness observations are imported additively with stable IDs. Original records remain intact. Original console mood records use the same 1–5 scale and can be imported. Values above the current backend range remain visible in history and are excluded from assessment and baseline.
- The mission clock uses UTC days, starting at day 42 on the first visit; its epoch is saved as a device preference. Previous-day and future readings do not complete today's assessment. Baselines use at least seven earlier readings, excluding the reading being assessed. Manual and simulated baselines remain separate.
- Trends provide all indicators, 30/90/180-day windows, source filters and exact timestamped history. **Load mission simulation** explicitly loads the seeded 180-day generator without replacing manual measurements. Only readings up to the current clock enter charts and assessment. Simulated readings do not complete the person's daily check-in.
- NEWS2 remains incomplete until all seven observations, including oxygen support, exist today. Contact schedules are displayed directly from the backend. No new clinical rules were introduced. The current backend returns no scheduled contacts for `low` or `singleRed`; that behavior remains a backend limitation, not a claim that contact is unnecessary.
- Routine includes a rest-window planner using the engine's sleep recommendation. Its planning inputs do not save a measurement. Mission brief exports timestamps, units, provenance, baseline context, NEWS2 completeness and the current environment. Mission brief reads Y’s emergency journal at download time and includes confirmed steps and notifications for the active crew member on the report’s UTC date. Case IDs, status, answers and sources are retained; pending instructions, other patients and unassigned cases are excluded. Storage limitations are stated in the report.

The Guides dialog uses Y’s reusable GuidesPanel and GuideCard, including illustrated steps, kit information, hazards, references and the record action. Emergency consumes the same current-day reading selection as the dashboard, preserving explicit source and timestamps instead of inferring provenance from matching values. Simulation timestamps are labelled as simulated, never as manual measurement times. Saved emergency snapshots and care-step timers are not recalculated by this integration.

Remaining dependencies: onboard/clinical review of guide and protocol content, Inspiration4 reference data, and the landing page (Daniel). The 3D mission ring still illustrates the original scenario; it has not been rewired to measurement history in this assignment.

Validation: `pnpm test:run`, `pnpm build`, `pnpm lint`. Integration tests cover persistence/rehydration, legacy import, storage errors, validation, source isolation, incomplete scores, baseline sample counts and report contents. Code for assignment X was developed with OpenAI Codex assistance.

## Attribution

Anatomy: Open Anatomy 3D, CC BY 4.0 (public/models). Earth: NASA Blue Marble (public/textures/ATTRIBUTION.md). Remaining habitat geometry is procedural. Design references are described without redistributing their artwork. Code and integration developed with OpenAI Codex assistance; existing attribution is retained.

Mission simulation prototype, not medical advice or a flight-certified clinical system.
