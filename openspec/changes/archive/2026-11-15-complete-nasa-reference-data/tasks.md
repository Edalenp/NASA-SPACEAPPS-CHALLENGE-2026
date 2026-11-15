## 1. T1 Medical kit reference dataset (completed; net 715 lines)

T1 net LOC after simplification: `medical-kit.json` 163 + `reference-types.ts` 87 + `reference.ts` 216 + `medical-kit.test.ts` 249 = 715. T1 and the later T2..T4 blocks were implemented and are marked complete below with their recorded evidence.

- [x] 1.1 Create `src/data/nasa/reference-types.ts` with the reference-only types from the design: `ReferenceDatasetId`, `ReferenceCurationMethod`, `AnalyteUnit`, `MedicalKitItem`, `MedicalKitGroup`, `MedicalKitDataset`, and the shared provenance shapes. Do not add `mg/dL` or `mmol/L` to `IndicatorType` or `MeasurementUnit`.
- [x] 1.2 Create `src/data/nasa/medical-kit.json` with the historical document metadata (`MED CL/SpX-6 - ALL/FIN/T`, `09 APR 15`, `3.001_M_26501.doc`, page 9, Table 5, Blue pack), the source URL and verification date, the content policy, the optional-reaction exclusion, exactly six literal hardware items, and exactly eight groups.
- [x] 1.3 Keep the item quotes literal page-9 rows: `Blood Oximeter 1 B1`, `Blood Pressure Cuff - Large 1 B2`, `Blood Pressure Cuff - Small 1 B2`, `Blood Pressure Monitor 1 B4`, `Stethoscope 1 B1`, `Thermometer 1 B3`. Record the stethoscope without a measurement-group attribution.
- [x] 1.4 Set group statuses exactly: `blood-pressure` and `temperature` = `documented`; `spo2` = `inferred-editorial` with a mandatory inference note; `heart-rate`, `glucose`, `sleep`, `mood`, `respiratory-rate` = `not-documented` with `items: []` and no fake pack, location, quote, or null placeholder.
- [x] 1.5 Create the first part of `src/data/nasa/reference.ts`: import `medical-kit.json`, validate the eight group ids and order, validate item ids and group references, validate documented groups have items, validate not-documented groups are empty, validate source page and quote presence, and export `getMedicalKit()` returning a deep copy of nested arrays and objects. Add no other dataset getter in this task.
- [x] 1.6 Add `src/data/nasa/medical-kit.test.ts` Vitest coverage: exact eight groups and order; BP/temperature documented items; exact names, locations, pack, table, page, quotes, and document version; SpO2 inference note; five empty groups; stethoscope unmapped; no medications/doses/instructions; optional reaction excluded; source metadata present.
- [x] 1.7 Add a content-policy test that scans the JSON for medication names, dose units, route/side-effect fields, treatment instructions, and medication-table keys. Do not allow exceptions for the word `Medical` in the pack name.
- [x] 1.8 Run `npm run test:run -- src/data/nasa/medical-kit.test.ts`, `npx tsc -p tsconfig.app.json --strict --noEmit`, and `npm run lint`. Fix only T1 files.
- [x] 1.9 Run `git diff -- src/data/nasa/index.ts src/data/nasa/types.ts src/data/nasa/hazards.json src/data/nasa/risks.json src/data/nasa/sources.json src/data/nasa/dataset.test.ts src/data/nasa/risks.test.ts src/data/nasa/sources.test.ts` and confirm it is empty.
- [x] 1.10 Stop and report before starting T2 if any legacy file changed, any test fails, or the net diff exceeds roughly 500 lines.

## 2. T2 OSD-575 parser, bands, and dataset (completed; net 983 lines)

T2 net LOC: `osd575-cmp.mjs` 320 + `osd575-cmp.test.mjs` 204 + `osd575-bands.json` 125 + `osd575-bands.test.ts` 194 + `reference-types.ts` delta 27 + `reference.ts` delta 113 = 983. Under 1000; no split needed.

- [x] 2.1 Create `scripts/nasa/osd575-cmp.mjs` as a pure Node ESM module using only Node built-ins. Export `parseOsdCmpCsv`, `deriveOsdBands`, and `buildOsd575BandsDataset` (names may be adjusted only before tests are written).
- [x] 2.2 Implement a real CSV reader for quoted commas, UTF-8 BOM, CRLF/LF, and blank trailing lines. Reject malformed quotes, duplicate headers, missing headers, extra columns, and wrong target unit suffixes.
- [x] 2.3 Require the exact four real headers, including the source spelling `millimol`: `glucose_value_milligram_per_deciliter`, `calcium_value_milligram_per_deciliter`, `sodium_value_millimol_per_liter`, `potassium_value_millimol_per_liter`. Ignore every `*_range_min_*` and `*_range_max_*` column.
- [x] 2.4 Derive phase only from sample names: `_L-` = pre-flight, `_R+` = post-flight, anything else = error. Require 28 unique samples, 4 crew prefixes, 12 pre-flight, and 16 post-flight.
- [x] 2.5 Reject empty, `NA`, `NaN`, `inf`, `-inf`, nonnumeric, locale-decimal-comma, duplicate sample, and duplicate header input. Do not impute, average, normalize, or clip.
- [x] 2.6 Create `scripts/nasa/osd575-cmp.test.mjs` using `node:test` and `node:assert/strict`. Use synthetic identifiers and synthetic rows, never real observations. Cover the happy path, quoted commas, CRLF/BOM/blank trailing lines, wrong columns, duplicate header, unit suffix mismatch, duplicate sample, unknown phase, nonnumeric/NaN/inf/empty/NA, malformed quotes, and range-column exclusion.
- [x] 2.7 Assert the oracle: pre glucose 56..100, calcium 9.3..10.3, sodium 138..143, potassium 3.3..4.6; post glucose 36..103, calcium 9.2..10.1, sodium 136..141, potassium 3.0..5.9; all glucose 36..103, calcium 9.2..10.3, sodium 136..143, potassium 3.0..5.9; n 12/16/28 for each analyte.
- [x] 2.8 Download the real public CSV only to the external cache, never to the repository. Use the pinned URL `https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`.
- [x] 2.9 Generate `src/data/nasa/osd575-bands.json` from the cached CSV with the study DOI `10.26030/mc5d-p710`, license `CC0-1.0`, version `3`, source URL, retrieval date, verification date, bytes 8506, SHA-256, cohort counts, four analytes, and an explicit negative notice: not normal intervals, not an in-flight baseline, not calibration input, not a 180-day prediction input. Do not include real participant ids, real sample names, sex, email, or real observation rows in app JSON or published fixtures.
- [x] 2.10 Extend `reference.ts` with `getOsd575Bands()`, validation of analyte units/counts/phase labels, and deep-copy behavior. Keep the medical-kit getter working.
- [x] 2.11 Add `src/data/nasa/osd575-bands.test.ts` Vitest coverage: 28/4/12/16 counts, four analytes and units, oracle min/max, no range fields, explicit negative notice for normal/baseline/calibration/prediction, no positive clinical labels, no real identifiers or real rows. Do not fail merely because the negative notice uses the words normal, baseline, or calibration. Synthetic identifiers are allowed only in parser tests.
- [x] 2.12 Run `node --test scripts/nasa/osd575-cmp.test.mjs`, `npm run test:run -- src/data/nasa/osd575-bands.test.ts`, `npx tsc -p tsconfig.app.json --strict --noEmit`, and `npm run lint`.
- [x] 2.13 Stop and report before T3 if the raw CSV is tracked, any real participant identifier or real observation row appears in app JSON or a published fixture, or the oracle does not match exactly.

## 3. T3 Radiation reference and source catalog (completed; net 996 lines)

T3 net LOC: `radiation-reference.json` 69 + `reference-catalog.json` 269 + `radiation-reference.test.ts` 183 + `reference-catalog.test.ts` 213 + `reference-types.ts` delta 77 + `reference.ts` delta 185 = 996. Under 1000; no split needed.

- [x] 3.1 Create `src/data/nasa/radiation-reference.json` with the two NASA effective-dose limits, exact requirement ids, pages, edition dates, literal quotes, and the `reference-only` context. Use only `mSv`; do not add `mGy`, `mGy-Eq`, or a conversion helper.
- [x] 3.2 Record the career limit as 600 mSv, `[V1 4030]`, NASA-STD-3001 Volume 1 Revision C page 40, OCHMO-TB-020 Rev G page 4, standard date 2023-09-15, brief date 2025-06-06, with literal quotes from both sources.
- [x] 3.3 Record the SPE limit as 250 mSv, `[V1 4031]`, NASA-STD-3001 Volume 1 Revision C page 42, OCHMO-TB-020 Rev G page 6, with the literal design-reference SPE quote. State that the OCHMO brief derives from the standard and is for reference only.
- [x] 3.4 Create `src/data/nasa/reference-catalog.json` with exactly ten entries: `hrp`, `iss-medical-kit`, `osd-575`, `nasa-std-3001-vol1`, `ochmo-tb-020`, `donki`, `noaa-swpc`, `csa-radiation`, `news2`, `nasa-3d-resources`. Add the exact host allowlist and the per-entry metadata required by the spec.
- [x] 3.5 Keep partner agencies out of `src/data/nasa/sources.json`. Record DONKI and NOAA as metadata-only, with no API key, no live client, no runtime fetch, and no mock presented as real. Record the DONKI 2026 migration as a re-verification note.
- [x] 3.6 Record NEWS2 source and chart URLs with credit only. Do not transcribe thresholds and do not import or duplicate engine logic.
- [x] 3.7 Record NASA 3D Resources with the NASA page, GitHub README, and an asset-level licensing note that refuses a uniform-license claim. Do not download GLBs.
- [x] 3.8 Extend `reference.ts` with `getRadiationReference()`, `getReferenceCatalog()`, and `getReferenceDatasetIds()`. Validate exactly two limits, exactly ten catalog ids, unique ids, allowed hosts, required provenance fields, and deep-copy behavior.
- [x] 3.9 Add `src/data/nasa/radiation-reference.test.ts` covering exact 600/250 values, requirement ids, pages, quotes, mSv-only semantics, no CSA organ Sv substitution, no mGy conversion, no engine import, and no recommendations.
- [x] 3.10 Add `src/data/nasa/reference-catalog.test.ts` covering the ten ids, required fields, exact host allowlist, rejection of lookalike hosts, separation from HRP `sources.json`, DONKI/NOAA metadata-only rules, NEWS2 no-threshold rule, NASA 3D no-uniform-license rule, and no GLB.
- [x] 3.11 Run `npm run test:run -- src/data/nasa/radiation-reference.test.ts src/data/nasa/reference-catalog.test.ts`, `npx tsc -p tsconfig.app.json --strict --noEmit`, and `npm run lint`.
- [x] 3.12 Stop and report before T4 if a quote, page, or requirement id cannot be verified, or if any partner source leaked into `sources.json`.

## 4. T4a split: manifest/download helpers and offline CLI

### 4A. T4a-1 Source manifest and download helpers (completed; net 995 lines)

T4a-1 net LOC: `source-manifest.json` 58 + `source-download.mjs` 550 + `source-download.test.mjs` 445 = 1053. The initial block was 995; the increase is the QA-mandated source-id diagnostics and QA-added gap tests, which were not removed.

- [x] 4.1 Create `scripts/nasa/source-manifest.json` with pinned entries for exactly four assets: ISS medical-kit PDF, OSD-575 CMP CSV, NASA-STD-3001 PDF, and OCHMO-TB-020 PDF. Include source URL, exact host, SHA-256, bytes, content type, edition/version, retrieval date, cache filename, `usedBy`, and extraction mode. RCP chart PDFs are catalog-only and must not be manifest entries. Do not add DONKI/NOAA API keys, NASA 3D GLBs, or unselected sources.
- [x] 4.3 Implement exact host allowlist validation, HTTPS-only URLs, no credentials, no fragments, no positional URL argument, and no arbitrary URL flag. Allow `nasa-osdr.s3.us-west-2.amazonaws.com` only for the OSD entry.
- [x] 4.4 Implement at most two redirects, with every hop checked against the allowlist. Reject cross-host redirects outside the allowlist before any file write.
- [x] 4.5 Implement per-request timeout, per-response byte cap, non-2xx rejection, unexpected content-type rejection, short-body rejection, and SHA-256/byte-length verification on raw bytes before parsing.
- [x] 4.6 Implement download to `<cache>/.tmp/<id>.<random>.part`, validation before rename, same-volume atomic rename, and cleanup of the temp file on every failure. Never overwrite the destination on failure.
- [x] 4.9 Create `scripts/nasa/reference-sources.test.mjs` with Node built-in tests and an injectable fetch implementation. Cover untrusted URL/host, credentials, fragment, redirect escape, timeout, byte cap, non-2xx, wrong MIME, short body, hash mismatch, byte-length mismatch, default no-fetch, missing cache path, unsafe cache path, existing destination preserved on failure, temp cleanup, and atomic success. T4a-1 covers the helper-side suite in `source-download.test.mjs`; T4a-2 adds the CLI/cache/output suite in `reference-sources.test.mjs`.
- [x] 4.10 Add manifest tests: pinned URL/host/hash/bytes/version fields, no API keys, no GLBs, no unselected sources, RCP catalog-only, exactly four download assets, and exact OSD host mapping.
- [x] 4.12 Split T4a into T4a-1 (manifest/URL/budget checks) and T4a-2 (atomic write/verify-cache/tests) if the net diff exceeds roughly 700 lines. Do not mix docs into this task.

### 4B. T4a-2 Offline CLI, cache verification, and output writes (completed; net 784 lines)

T4a-2 net LOC: `reference-check.mjs` 384 + `reference-sources.mjs` 216 + `reference-sources.test.mjs` 275 = 875. The initial block was 784; the increase is the QA-required OSD path/analyte/phase diagnostics and source-id propagation.

- [x] 4.2 Create `scripts/nasa/reference-sources.mjs` using only Node built-ins. Support `--check` (default offline), `--fetch` (opt-in), `--cache <dir>` (required for fetch), `--verify-cache`, and `--write-osd` (opt-in, atomic).
- [x] 4.7 Implement `--check` so it validates the manifest schema, dataset schemas, counts, ids, provenance, and every `usedBy` reference without network access.
- [x] 4.8 Implement `--verify-cache` so it parses the cached OSD CSV, rederives counts and min/max, and compares them exactly with `osd575-bands.json`. Implement `--write-osd` so it writes only after all checks pass.
- [x] 4.11 Run `node --test scripts/nasa/reference-sources.test.mjs`, `node --test scripts/nasa/osd575-cmp.test.mjs`, `npx tsc -p tsconfig.app.json --strict --noEmit`, and `npm run lint`.

## 5. T4b Coverage documentation and README (completed; concise docs)

T4b is concise English documentation without a hardcoded line count. The module README lists the acceptance suite in addition to the other Node suites.

- [x] 5.1 Create `docs/nasa/coverage.md` with sections for HRP 11-versus-17, the 2015 kit and eight groups, OSD-575 cohort and non-clinical limits, radiation 600/250 and effective-dose semantics, the ten-family catalog, manual-versus-automated curation, source privacy, owner boundaries, and the SRS 5.1/5.2/5.4 reconciliation.
- [x] 5.2 State in the coverage document that the ingestion is a selected-source workflow, not a full NASA mirror, and that PDFs are integrity-only with manual page curation.
- [x] 5.3 State in the coverage document that the raw OSD CSV is external, the app JSON is aggregate-only, and no user health data is sent over the network.
- [x] 5.4 Update only `src/data/nasa/README.md` to explain the new files, the offline check command, the manual/automated split, and the honest limits. Do not hide the HRP 11-versus-17 limitation or the historical kit limitation.
- [x] 5.5 Do not copy `VITRUVIO-SRS.md` into this worktree and do not edit any other owner's documentation.
- [x] 5.6 Add a traceability matrix in the QA report or final delivery message mapping every spec requirement and scenario to a test file or command. Do not add a second README or a new docs tree.
- [x] 5.7 Run `npm run test:run`, `npm run build`, `npm run lint`, and `npx tsc -p tsconfig.app.json --strict --noEmit`.

## 6. T5 QA, adversarial review, and handoff (completed; QA PASSED on main `2bcfe10`)

- [x] 6.1 Verified the eight legacy HRP files are byte-identical to current main (`2bcfe10`; the historical base was `ea028ce`) with intact hashes and checksums; `git diff --exit-code` was clean. QA reported no protected-path changes.
- [x] 6.2 Verified the allowed-path boundary: no changes to `src/engine/**`, `src/data/{ranges,indicators,mission,guides,protocols}.ts`, `src/data/simulator/**`, `src/store/**`, `src/features/**`, `src/ui/**`, `src/landing/**`, `src/public/**`, App/main, configs, `package.json`, or lockfiles. `.gitignore` contains only the administrative private-ignore block (4 additions, 0 deletions) for `VITRUVIO-SRS.md`, `challenge_context.md`, and `defects/`; all baseline patterns are intact and the three stashes are retained.
- [x] 6.3 Verified no production consumer imported the new reference helpers; their consumers stay test-only. `src/data/nasa/index.ts` remains unchanged and the legacy HRP consumers from main (`environment.ts`, `Panels.tsx`, `GuideCard.tsx`) still resolve against the byte-intact eight-file API.
- [x] 6.4 Passed the OSD privacy scan: no real crew-id strings, real sample names, sex, email, or real observation rows in app JSON or published fixtures; synthetic identifiers appear only in parser tests; no raw CSV or PDF is in the repository.
- [x] 6.5 Passed the medical-kit scan: no medication names, doses, routes, side effects, treatment instructions, or medication-table keys.
- [x] 6.6 Ran the complete verification suite: Vitest 313/313 across 31 files, Node 43/43, E2E smoke 1/1 (3.5 s), build, lint, strict TypeScript, default offline check, and cache byte-identical for all four assets. E2E caveat: the initial `npm run test:e2e` webServer `pnpm` shim failed with `CommandNotFound`; the session reused a manual `npm run dev -- --host 127.0.0.1 --port 4173` (existing `reuseExistingServer`) with a temporary `PLAYWRIGHT_BROWSERS_PATH`, made no code/config edits, and cleaned processes/freed the port. The bare command is not claimed to work without environment repair.
- [x] 6.7 The architect ran `openspec validate complete-nasa-reference-data --strict --no-interactive` and it passed after the current docs were finalized. This session did not run the OpenSpec CLI (permission denied); the architect owns the archive CLI step.
- [x] 6.8 Did not edit or duplicate the private `defects/regressions.md`; it remains gitignored in the root worktree with its one baseline incident.
- [x] 6.9 Publication is authorized by Fabian after QA plus checks; do not stage/commit the private ignore targets, and merge only after QA plus checks. The earlier implementation phase was unpublished, and the prior "no commit" constraint was temporary, not permanent. This records evidence-gated readiness for authorized publication only; no push, merge, or PR was executed here.
- [x] 6.10 Delivered the final matrix mapping each task criterion to `file:line`, the exact command run, and the result; no criterion remains in `BLOQUEO`. OpenSpec implementation is complete and the PR is pending authorized publication.

Implementation note: if dependencies are missing in the temp worktree during the later implementation phase, `pnpm install --frozen-lockfile --ignore-scripts` is permitted only there. Do not edit `package.json` or the lockfile. Do not install anything during this specification phase.
