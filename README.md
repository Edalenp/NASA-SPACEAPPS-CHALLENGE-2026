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

The monitoring console consumes main's `calculateNews2`, `calculateBaseline`, `evaluateZones`, `planEscalation` and `recommendSleep` through an adapter. NEWS2 is a single engine module fed by `news2-scoring.json`; the former console scorer was removed after being merged into it. IndexedDB remains at version 2; canonical measurements and consciousness observations are written to the existing engine tables. Oxygen-support observations and exercise logs remain in the compatibility table because the backend has no corresponding persisted measurement type.

### Engine validity (RNF-11)

- NEWS2 stays unmodified: bands and triggers come from a single source (`src/engine/news2-scoring.json`), transcribed from the RCP observation chart with citation and declared limits in `_meta`, and are regression-tested against the JSON (`humanVerified: false` until the human check against the chart is signed off).
- An independent layer of absolute clinical reference limits (`src/engine/clinical-limits.json` + `clinicalLimits.ts`) complements NEWS2 with cited adult, sex-independent thresholds: AHA blood-pressure categories (severe hypertension above 180/120 mmHg, stage 2 at 140/90), AHA resting heart rate 60–100 bpm, ATS/BTS oxygen saturation (below 90% is hypoxemia, target 94%), fever at 38 °C oral with an above-40 °C red flag, respiration 12–20 breaths/min, ADA glucose bands (54/70/126/200 mg/dL) and NHLBI sleep 7–9 h. The personal baseline is a change detector, never a clinical validator: a value breaching an absolute limit keeps its clinical status even inside a collapsed or chronically elevated personal band (systolic 200 alerts with the AHA citation whether there is history or not).
- Escalation covers every NEWS2 level: `singleRed` now produces a real step (medical officer at 10 minutes plus the environment round-trip delay) per RCP Chart 2, matching the dashboard ladder.
- Radiation dose uses two separate accumulators (600 mSv career, 250 mSv per solar event, NASA-STD-3001 Vol 1 + CSA cited) and the reaction-time test accepts decimal milliseconds from `performance.now()`.

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
- NEWS2 remains incomplete until all seven observations, including oxygen support, exist today. Contact schedules are displayed directly from the backend. NEWS2's own rules are unchanged; the engine adds independent absolute clinical limits with cited sources (see Engine validity), and `singleRed` alerts now produce a scheduled medical-officer step. The current backend returns no scheduled contacts for `low`; that behavior remains a backend limitation, not a claim that contact is unnecessary.
- Routine includes a rest-window planner using the engine's sleep recommendation. Its planning inputs do not save a measurement. Mission brief exports timestamps, units, provenance, baseline context, NEWS2 completeness and the current environment. Mission brief reads Y’s emergency journal at download time and includes confirmed steps and notifications for the active crew member on the report’s UTC date. Case IDs, status, answers and sources are retained; pending instructions, other patients and unassigned cases are excluded. Storage limitations are stated in the report.

The Guides dialog uses Y’s reusable GuidesPanel and GuideCard, including illustrated steps, kit information, hazards, references and the record action. Emergency consumes the same current-day reading selection as the dashboard, preserving explicit source and timestamps instead of inferring provenance from matching values. Simulation timestamps are labelled as simulated, never as manual measurement times. Saved emergency snapshots and care-step timers are not recalculated by this integration.

### NASA reference data (assignment data/nasa)

- Historical ISS 2015 diagnostic kit: six documented items and eight measurement groups with explicit documented, editorial-inference and not-documented states.
- OSD-575 v3 reproducible cohort bands for glucose, calcium, sodium and potassium: aggregate-only, pre/post flight — not clinical normal ranges and not simulated observations.
- NASA radiation reference citations and a ten-family source catalog with licensing notes and owner handoffs (`src/data/nasa/`).
- Opt-in bounded downloads of four pinned source assets with external-only raw cache, SHA-256 verification, offline checking and OSD rederivation (`scripts/nasa/`).
- Scope guard: reference data only — no diagnoses, prescriptions or doses, and no runtime DONKI/NOAA client. The 11 curated HRP risks and all existing engine/UI consumers remain unchanged.

Remaining dependencies: onboard/clinical review of guide and protocol content, human verification of the clinical and NEWS2 sources (then `humanVerified: true`), a Sources-panel entry for the absolute clinical standards plus the missing dose sources, Inspiration4 reference data, and the landing page (Daniel). The 3D mission ring still illustrates the original scenario; it has not been rewired to measurement history in this assignment.

Validation: `pnpm test:run` (341 tests across 32 files, engine and integration), `pnpm build`, `pnpm lint`, and the `e2e/record-to-assessment` Playwright smoke. Integration tests cover persistence/rehydration, legacy import, storage errors, validation, source isolation, incomplete scores, baseline sample counts, absolute-limit overrides, singleRed escalation and report contents. Code for assignment X was developed with OpenAI Codex assistance; the clinical standards layer with OpenCode.

## Attribution

Anatomy: Open Anatomy 3D, CC BY 4.0 (public/models). Earth: NASA Blue Marble (public/textures/ATTRIBUTION.md). Remaining habitat geometry is procedural. Design references are described without redistributing their artwork. Code and integration developed with AI assistance (OpenAI Codex, Anthropic Claude, OpenCode); existing attribution is retained.

Mission simulation prototype, not medical advice or a flight-certified clinical system.
