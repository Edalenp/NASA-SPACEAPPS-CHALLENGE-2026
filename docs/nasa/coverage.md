# NASA reference data coverage

## Status

Point 1 (NASA reference data) is **closed with the approved scope** described below. This closes the approved data layer only; UI integration is a different deliverable. This is not a complete NASA mirror, not a clinical decision system, and not an implementation of every SRS requirement that mentions these sources.

The HRP set is the approved 11-risk manual subset, not the 17-risk planning list. The local `VITRUVIO-SRS.md` is private working material in this root worktree, is gitignored, and is not edited by this change.

Sources and licenses were checked on **2026-11-14**. Raw asset retrieval and verification timestamps are recorded from actual retrievals in `scripts/nasa/source-manifest.json`; the manifest `generatedAt` identifies the snapshot.

## SRS reconciliation matrix

| SRS reference | Delivered by point 1 | Not done / owner |
|---|---|---|
| RF-14, RF-17: HRP hazards and risks | 5 hazards and 11 manually curated active risks with NASA-only evidence in `sources.json`. | Full 17-risk catalog, countermeasures, and UI integration are not delivered. Data owner: `data/nasa`. |
| RF-16, RF-21: ISS medical kit | Historical 2015 page 9/Table 5 only. 8 groups: blood pressure and temperature documented; SpO2 inferred-editorial from `Blood Oximeter`; heart rate, glucose, sleep, mood, respiratory rate not documented and empty; stethoscope recorded but unmapped. No medications, doses, or instructions. | Current inventory claims, medication guidance, kit UI, and emergency pack search are not delivered. Guides/emergency owners. |
| RF-27, RF-28: OSD-575 | OSD-575 version 3, 4 crew, 28 samples, 12 pre-flight, 16 post-flight. Glucose/calcium in `mg/dL`; sodium/potassium in `mmol/L`. Observed min/max only. DOI `10.26030/mc5d-p710`, CC0-1.0. | Cohort is not normal ranges, not in-flight, not a personal baseline, not calibration, and not 180-day prediction. Simulator calibration, RF-27 chart, and UI integration remain with simulator/UI owners. |
| RF-32: radiation | Two NASA effective-dose references: less than 600 mSv career (`V1 4030`) and less than 250 mSv design-reference SPE (`V1 4031`), with pages and literal quotes. | No personal dose gauge, no organ-dose substitution, no mGy/Sv conversion, no engine threshold or clinical action. Engine owner retains RF-32 calculation. |
| RF-33: DONKI / NOAA | Catalog metadata and future fallback context only. | No live DONKI client, API key, mock-as-real, or NOAA runtime fallback. Runtime owner. |
| RF-06, RF-07: NEWS2 | Catalog credit, landing page, chart URLs, and RCP reuse notes. | No NEWS2 thresholds or bands transcribed; engine logic unchanged. Engine owner. |
| RF-31: NASA 3D | Catalog metadata for NASA 3D Resources and license review note. | No GLB download, no uniform license claim, no scene integration. 3D owner. |
| SRS 5.1, 5.2, 5.4 | Selected-source ingestion, offline app data, mixed manual/automated curation, explicit limits, and privacy documentation. | Not a full NASA mirror. T4b documents the workflow; T5 QA handoff remains. Data owner: `data/nasa`. |

This increment does **not** claim that RF-14, RF-16, RF-21, RF-27, RF-28, RF-32, or RF-33 are complete end-to-end features. It delivers the approved reference-data layer they can consume later.

## Point boundaries

- Point 2 (guides), point 3 (protocols/emergency flow), and point 4 (report) are owned elsewhere in main; this increment does not implement them.
- No live DONKI integration, camera pipeline, store, or user-health network request is added.
- Existing guide placeholders in the app belong to their owners and are not changed here.
- No engine, simulator, UI, store, landing, public, App/main, package, lock, or config file is changed.
- No new production consumer imports the new getters; current consumers are tests only. The legacy HRP helpers do have production consumers from main (`src/engine/environment.ts`, `src/features/dashboard/Panels.tsx`, and `src/features/guides/GuideCard.tsx`); their eight files remain byte-intact.

## Data and privacy facts

- OSD app JSON is aggregate-only: no crew ids, sample names, sex, email, or per-sample rows.
- The raw OSD CSV remains in the external cache; it is not committed and not in the app bundle.
- The unsupported HRP groups keep `items: []` and do not claim that no such item exists on the ISS.
- The SpO2 link is marked VITRUVIO editorial, not a NASA clinical precision claim.
- The catalog is metadata, not a license grant and not legal advice. NASA insignia/identifiers, third-party material, RCP material, CSA terms, NOAA terms, and NASA 3D asset-level terms may add restrictions. RCP is catalog-only and is not fetched.

## Integrity and changelog

The eight legacy HRP files are byte-identical to current main (`2bcfe10`; the historical implementation base was `ea028ce`):

```powershell
git diff --exit-code -- src/data/nasa/index.ts src/data/nasa/types.ts src/data/nasa/hazards.json src/data/nasa/risks.json src/data/nasa/sources.json src/data/nasa/dataset.test.ts src/data/nasa/risks.test.ts src/data/nasa/sources.test.ts
```

No new commit was created for this documentation. The private defects log is gitignored in this root worktree; its outdated 16-pin note is administrative and is not a source-data change. It is not edited and no duplicate defect log is created here.

## Owner boundaries

| Area | Owner / handoff |
|---|---|
| Reference JSON, provenance, catalog, tests, developer CLI | `data/nasa` / Fabián |
| RF-32 calculation, NEWS2 bands, clinical alerts | Health engine owner |
| OSD calibration, prediction, RF-27 chart/UI | Simulator and UI owners |
| Guides, emergency flow, camera, store, report | Their existing owners |
| NASA 3D asset licensing and scene integration | 3D owner |

## QA handoff

T1-T4a are implemented. T4b documentation is this file plus the module README. Final QA passed on main `2bcfe10`: Vitest 313/313 across 31 files, Node 43/43, E2E smoke 1/1 (3.5 s), build, lint, strict TypeScript, default offline check, and cache byte-identical for all four assets; the eight legacy HRP files are hash-intact, protected paths are unchanged, `.gitignore` remains 4 additions/0 deletions, and the three stashes are retained. The architect ran `openspec validate complete-nasa-reference-data --strict --no-interactive` and it passed after these docs. E2E caveat: `npm run test:e2e` initially failed on the webServer `pnpm` dev command with `CommandNotFound` from the nvm global pnpm shim; the session reused a manual `npm run dev -- --host 127.0.0.1 --port 4173` server (already configured `reuseExistingServer`), installed Chromium headless into temporary caches under a session `PLAYWRIGHT_BROWSERS_PATH`, made no code/config edits, and cleaned processes with the port freed. Do not claim the bare `npm run test:e2e` works without environment repair; the pnpm shim issue pre-exists outside this feature and was not fixed in git config or by a permanent pnpm install.
