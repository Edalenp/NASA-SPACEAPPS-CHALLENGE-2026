## Why

The `src/data/nasa` module shipped only the 11-risk HRP subset at the historical implementation base. The SRS promises ISS medical-kit references, OSD-575 cohort context, radiation limits, a source catalog, and reproducible ingestion, but the repository has no typed offline datasets for those sources. That gap creates two unacceptable outcomes for an educational product: invented "complete" NASA data and accidental clinical claims. This change closes only point 1 (NASA reference data); guides, protocols, and the report are explicitly out of scope.

## What Changes

- Add four local JSON reference datasets under `src/data/nasa/`:
  - `medical-kit.json`: the historical 2015 ISS Medical Diagnostic Pack (Blue), limited to diagnostic hardware on page 9, with eight reference groups and explicit documented / inferred / not-documented status.
  - `osd575-bands.json`: observed OSD-575 version 3 Comprehensive Metabolic Panel aggregates for glucose, calcium, sodium, and potassium, with pre-flight, post-flight, and all-sample counts and min/max values only.
  - `radiation-reference.json`: NASA effective-dose references for the 600 mSv career limit and the 250 mSv solar particle event limit, with requirement IDs, pages, literal quotes, and edition dates.
  - `reference-catalog.json`: metadata for the ten reference families, separated from the NASA-only HRP `sources.json`.
- Add `reference-types.ts` and `reference.ts` as a new typed, browser-safe access layer. The existing `index.ts` barrel and `types.ts` stay byte-intact.
- Add a pure Node ESM OSD-575 CSV parser/generator under `scripts/nasa/` and a separate opt-in download/cache/check CLI with a pinned manifest, exact host allowlist, bounded downloads, SHA-256 integrity checks, and atomic writes.
- Add `docs/nasa/coverage.md` to reconcile the SRS 11-versus-17 HRP difference, the historical kit, the non-clinical OSD cohort reference, and the manual/automated curation split.
- Update only `src/data/nasa/README.md` to explain the new delivery and its limits; do not hide the HRP manual curation limits.
- Add Vitest coverage under `src/data/nasa/` and Node built-in test coverage under `scripts/nasa/`.

**BREAKING**: none. The existing HRP loaders, public helpers, JSON files, and tests are not modified.

## Capabilities

### New Capabilities

- `nasa-reference-data`: typed offline NASA reference datasets, provenance metadata, source catalog, and reproducible opt-in ingestion with strict non-clinical limits.

### Modified Capabilities

- None. No existing OpenSpec capability requirements change; the HRP public contract remains unchanged.

## Impact

Affected code and data:

- New allowed paths: `src/data/nasa/{medical-kit.json,osd575-bands.json,radiation-reference.json,reference-catalog.json,reference-types.ts,reference.ts,*.test.ts}`, `scripts/nasa/**`, `docs/nasa/**`, and `openspec/**`.
- Updated path: `src/data/nasa/README.md` only.
- Must remain byte-intact: `src/data/nasa/index.ts`, `src/data/nasa/types.ts`, `hazards.json`, `risks.json`, `sources.json`, `dataset.test.ts`, `risks.test.ts`, and `sources.test.ts`.
- Must not be touched: `src/engine/**`, `src/data/{ranges,indicators,mission,guides,protocols}.ts`, `src/data/simulator/**`, `src/store/**`, `src/features/**`, `src/ui/**`, `src/landing/**`, `src/public/**`, `src/App*`, `src/main*`, build/lint/TypeScript/Vite/Vitest configuration, `package.json`, and lockfiles. `.gitignore` receives only the administrative private-ignore block for `VITRUVIO-SRS.md`, `challenge_context.md`, and `defects/`; all baseline patterns are preserved.
- The original isolation happened in a temporary worktree at `ea028ce` (historical). The current work runs in the usual root `C:\Users\fabia\NASA2026` after the user-approved relocation and a fast-forward sync to main `2bcfe10`. The original worktree location is not forbidden forever. The private local SRS and defect log are gitignored and are not edited or copied into tracked files.

Dependencies and runtime:

- No new npm dependencies and no lockfile edits.
- No runtime network I/O and no Node imports in browser code.
- The new reference helpers have no production consumers; this is verified, not assumed. The legacy HRP helpers do have production consumers from main (`src/engine/environment.ts`, `src/features/dashboard/Panels.tsx`, and `src/features/guides/GuideCard.tsx`), so their eight files stay byte-intact. The earlier "HRP has no consumers" finding is dated history, not the current main state.
- Ingestion is opt-in, developer-only, and writes only to an explicit external cache. No raw OSD CSV with participant identifiers is committed.
- The private `defects/regressions.md` is gitignored in the root worktree and already contains one baseline incident. Do not bootstrap, edit, or duplicate it.

Verification in the implementation phase:

- `node --test scripts/nasa/<name>.test.mjs`
- `npm run test:run`
- `npm run build`
- `npm run lint`
- `npx tsc -p tsconfig.app.json --strict --noEmit`
- `openspec validate complete-nasa-reference-data --strict --no-interactive`

Publication is now authorized by Fabian after QA and the verification suite. Do not commit the private ignore targets; merge only after QA plus checks. The earlier implementation phase was unpublished.
