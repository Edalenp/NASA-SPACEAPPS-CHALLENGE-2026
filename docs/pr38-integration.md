# Historical PR45 implementation contract

This records the original PR45 contract before the requested medical/aerospace
realism changes. Its universal 200 mg/dL flag and fixed 90/240-minute rest plan
are superseded by [clinical model traceability](clinical-model-traceability.md).
For the current integration and verification, see
[PR43/PR45 integration](pr43-pr45-integration.md).

This note records the verified local contract. OpenSpec remains ignored; this file is the
short operational reference for the integrated branch.
## Glucose context
- `GlucoseContext` is optional on `Measurement` (`glucoseContext`) and on the console/model
  aliases (`ctx` on `ConsoleEntry`, `RecordEntry`, `RecordOptions`). The names are not
  interchangeable: the adapter copies `Measurement.glucoseContext` to `RecordEntry.ctx`.
- Missing, partial or malformed context is normalized to `unknown / unknown` **on read**. Stored
  records are not rewritten, deleted or retroactively labelled fasting.
- Timing: `unknown | fasting | afterMeal | random`; specimen:
  `unknown | capillary | venousPlasma | interstitial`.
- Baselines use only glucose readings with the same normalized tuple, seven **prior readings**
  (not days), strict timestamp, id exclusion and the existing source policy. `unknown` matches
  only `unknown`. No unit conversion and no weekly lab carry-forward.
- Clinical reading policy: `<54` alert and `<70` watch in every context; `126–199` watch only
  for `fasting` + `venousPlasma` (screening, confirmation required); `>=200` inclusive review
  flag in every context, never a self-diagnosis. Unknown `126` is “context needed”, not healthy.
- Citations stay in `src/engine/clinical-limits.json` with `_meta.humanVerified: false`. The
  54 mg/dL basis is the joint ADA/EASD clinical-trial report (DOI 10.2337/dc16-2215,
  PMID 27872155); it is not a treatment protocol.
- Legacy provenance: only a current legacy glucose or diastolic value may contribute auxiliary
  warnings; its row says `legacy` and glucose context stays unknown. The core seven NEWS2 rows
  still treat legacy as invalid/untrusted, so no historical NEWS2 classification is invented.
- Capture validation checks the eight auxiliary engine IDs, finite physically valid values,
  source enums, unique ids, plain valid `glucoseContext` objects and consistent row/root contexts.
  Old captures without auxiliary fields remain valid. Outside a real personal baseline, a glucose
  watch keeps its unknown-context qualification.
## Existing Y render data
Guidance renders only from the current assessment:

- `assessment.zones[*].actions` — `SourcedAction` text, `indicator`, `trigger`, `state`,
  `sourceTitle`, `sourceUrl`. No UI thresholds or re-classification.
- `assessment.plan` — contact role, channel, due time, earliest Earth reply and reason.
- `assessment.score.complete` — NEWS2 completeness stays separate from clinical flags.
- `ZoneActions` keeps its “draft for medical review” disclaimer. When there is no finding,
  incomplete NEWS2 is shown as incomplete; the app does not claim “healthy”.
- Emergency keeps exactly seven NEWS2 `ReadingEvidence` rows. Optional auxiliary readings are
  separate, provenance-checked, and never counted as NEWS2 observations.

## Rest recommendation tuples

Constants: 7 h total daily target, 90 min nap, 240 min full-sleep gate. Inputs are hours slept
in the last 24 h and minutes until the next task. Zero sleep is valid.

Full sleep if `window >= 240` **and** `window >= (7 - sleep) * 60`; otherwise nap if
`window >= 90`; otherwise none with reason `insufficient-window`. There is no minimum window
clip, invented buffer or short nap.

| sleep h | window min | result |
|---:|---:|---|
| 6 | 10 / 60 / 89 | none · insufficient-window |
| 6 | 90 / 239 | nap 90 |
| 6 | 240 | full sleep, target 7 h |
| 0.5 | 250 | nap 90 |
| 0 | 240 / 419 | nap 90 |
| 0 / 3 | 420 / 240 | full sleep, target 7 h |
| 7 | 10 | none · goal-met |
| 6 | 10 (activity sleep) | none · already-sleeping |

The 7 h target is total sleep in 24 h, not 7 h in addition to sleep already taken. The plan is
a planning prototype, not a clinical prescription.

## Canonical local quality gate

Verified runtime: Node `v24.18.0`, pnpm `12.21.0`, Playwright `1.65.1`, Chromium headless shell
cache under `%TEMP%\opencode\playwright-browsers` (reuse the existing cache; do not install a
system browser).

```powershell
# Fresh setup outside this workspace if dependencies are missing
npx pnpm@12.21.0 install --frozen-lockfile --ignore-scripts
npx playwright@1.65.1 install chromium --only-shell

# Every local gate, from the repository root
npm run check:integration
```

`check:integration` runs: integration typecheck (`tsconfig.integration.json`, strict, app +
e2e + config files), ESLint, the full Vitest suite, the four Node NASA 4.3 scripts
(`test:nasa`, 43 CPU-only tests with mocked network), the production build, and Playwright.
Playwright starts its own Vite server with the resolved local Node and Vite binary on
`127.0.0.1:4173`; `reuseExistingServer` is false and no global pnpm shim is used. The port must
be free. The WebGPU/Dawn `gpu:test` is optional and outside the mandatory gate: headless
environments and `--ignore-scripts` installs do not need it.

Individual commands: `npm run typecheck:integration`, `npm run lint`, `npm run test:run`,
`npm run test:nasa`, `npm run build`, `npm run test:e2e`; optional `npm run gpu:test`.

## Browser regression states

`e2e/clinical-integration.spec.ts` covers seven deterministic cases:

1. Empty profile: glucose 40 and DBP 130 preview as alerts with cited actions/contact plan while
   NEWS2 remains incomplete; unknown 130 is “context needed”, then fasting venous watch.
2. Glucose 200 with fasting venous context survives save, reload, report and readout.
3. A legacy glucose row without context reads as unknown and is not rewritten as fasting.
4. `e2e/fixtures/live-figure.html` mounts the real `LiveFigure`; visible text equals the expected
   value across frames and after a reduced-motion flip.
5. Rest planner at 6 h sleep / 10 min / work returns `insufficient-window`, not a nap or a
   “well rested” claim.
6. Baseline labels show 0/6/7 prior readings; the personal band appears only with a real
   baseline, and the glucose reference remains a population reference.
7. The existing record → assessment smoke flow remains green.

Expected local counts after the final gate: **591 unit tests**, **7 browser tests**. Sources and
data remain prototype material with `humanVerified: false`.
