## Context

The original isolation worktree was `C:\Users\fabia\AppData\Local\Temp\opencode\vitruvio-nasa-reference`, branch `feat/nasa-reference-data`, based on `ea028ce`. That location and base are historical. The current work runs in the usual root `C:\Users\fabia\NASA2026` after the user-approved relocation and a fast-forward sync to main `2bcfe10`. `openspec init --tools none` and `openspec new change complete-nasa-reference-data` already ran. This document is specification only; no dataset, script, test, or README change is part of this step.

Current state:

- `src/data/nasa/index.ts` is a 76-line barrel that loads `hazards.json` and `risks.json`, validates hazard and zone ids, and exports `getHazards`, `getHazardById`, `getAllRisks`, `getRisksByZone`, and `getRisksByHazard` (loaders at lines 24-49, getters at lines 58-76).
- `src/data/nasa/types.ts` is 20 lines and defines `HazardId`, `SpaceflightHazard`, and `HrpRisk`.
- The module contains exactly 11 curated HRP risks, 5 hazards, `sources.json`, and three existing tests: `dataset.test.ts`, `risks.test.ts`, `sources.test.ts`.
- At the historical base `ea028ce`, a repository search found no production consumer of `src/data/nasa` outside the module and its tests. Current main `2bcfe10` does import the legacy HRP helpers in `src/engine/environment.ts`, `src/features/dashboard/Panels.tsx`, and `src/features/guides/GuideCard.tsx`; those eight files stay byte-intact. The new reference helpers still have test-only consumers.
- `scripts/check-gpu.mjs` is the existing Node ESM pattern: built-in `node:assert/strict`, `node:fs/promises`, top-level await, and no dependencies. It must not be modified.
- `vitest.config.ts` exists and must not be modified.
- The private `defects/regressions.md` is gitignored in the root worktree and already contains one baseline incident. It is not edited, bootstrapped, or duplicated.
- The private local SRS is gitignored in the root worktree at `C:\Users\fabia\NASA2026\VITRUVIO-SRS.md`. It may be read for reconciliation but is not edited or copied into tracked files.

Verified source facts available to the implementation:

| Reference | Verified fact |
|---|---|
| ISS medical kit | `https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf`, 27 pages. Page 9 is the whole `Table 5. Medical Diagnostic Pack (Blue)`. Header reads `MED CL/SpX-6 - ALL/FIN/T`, `09 APR 15`, `3.001_M_26501.doc`. Literal table rows include `Blood Oximeter 1 B1`, `Blood Pressure Cuff - Large 1 B2`, `Blood Pressure Cuff - Small 1 B2`, `Blood Pressure Monitor 1 B4`, `Stethoscope 1 B1`, and `Thermometer 1 B3`. |
| OSD-575 CMP | `https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv` is 8506 bytes with a UTF-8 BOM, 58 columns, and 28 data rows. Sample names encode four crew prefixes, three pre-flight draws, and four post-flight draws. This design records the aggregate shape only and does not reproduce participant identifiers. Four observed analyte columns are `glucose_value_milligram_per_deciliter`, `calcium_value_milligram_per_deciliter`, `sodium_value_millimol_per_liter`, and `potassium_value_millimol_per_liter`. The misspelling `millimol` is in the real header and must be preserved when reading. Study DOI is `10.26030/mc5d-p710`; license is CC0-1.0; study version is 3. |
| NASA-STD-3001 | `https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf`, Revision C, approved 2023-09-15. Requirement `[V1 4030]` is on PDF page 40 and states a career effective dose of less than 600 mSv, universal for all ages and sexes. Requirement `[V1 4031]` is on PDF page 42 and states the design reference SPE proton spectrum must be less than an effective dose of 250 mSv. |
| OCHMO-TB-020 | `https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf`, Rev G, 06/06/2025, 16 pages. Page 1 is the executive summary; `[V1 4030]` with 600 mSv is on page 4; `[V1 4031]` with 250 mSv is on page 6. The brief says it is derived from NASA-STD-3001 and is for reference only. |
| Other catalog sources | The HRP, DONKI, NOAA SWPC, CSA, RCP NEWS2, and NASA 3D Resources URLs are the verified URLs supplied by the architect on 13-14 November 2026. No claim is made that a license is legally settled, that DONKI has no migration issue, or that NASA 3D assets share one license. |

## Goals / Non-Goals

**Goals:**

- Ship a small, offline, typed reference layer that is honest about what is documented, inferred, historical, aggregated, or merely catalogued.
- Keep the existing HRP dataset and its public contract byte-intact.
- Make the OSD-575 cohort aggregates reproducible from the real public CSV without committing participant-level rows or identifiers.
- Make source retrieval opt-in, allowlisted, bounded, integrity-checked, and atomic so a failed download cannot overwrite curated data.
- Reconcile the SRS's "17 HRP risks" and "download script" promises in `docs/nasa/coverage.md` without pretending the module is a full NASA mirror.
- Give QA a traceable matrix from every requirement to a testable command.

**Non-Goals:**

- Guides, protocols, emergency flows, or the report (SRS points 2, 3, and 4).
- Any change to `src/engine`, the simulator, the store, features, UI, landing, public assets, App/main, or configuration.
- Any new npm dependency, package edit, lockfile edit, or `.gitignore` edit beyond the administrative private-ignore block for `VITRUVIO-SRS.md`, `challenge_context.md`, and `defects/`.
- Any runtime DONKI/NOAA client, API key, live fetch, or mock presented as real data.
- Any clinical decision, diagnosis, alert threshold, recommended treatment, dose, medication list, or operational instruction.
- Any simulator calibration or 180-day prediction from OSD-575. The simulator and RF-27 chart work remain pending with their owners.
- Any claim that the 2015 ISS kit is the current inventory, that an undocumented group does not exist on the ISS, or that the 11 curated HRP risks are the full HRP catalog.
- Committing PDFs, GLBs, raw OSD CSVs, or any participant-level data.
- A commit, push, or pull request before QA and checks. Publication is now authorized by Fabian; the earlier implementation phase was unpublished.

## Decisions

### D1. Four datasets, one new reference module, zero changes to the HRP barrel

Add exactly four JSON files and two TypeScript files under `src/data/nasa/`:

- `medical-kit.json`
- `osd575-bands.json`
- `radiation-reference.json`
- `reference-catalog.json`
- `reference-types.ts`
- `reference.ts`

`reference.ts` imports the four JSON files and exports typed getters. It does not re-export from `index.ts`, and `index.ts` does not import it. This preserves the existing barrel and keeps the new API separate.

Rejected alternative: extend `index.ts`. It would change a byte-intact public module, mix HRP and non-HRP concerns, and make the legacy tests depend on new data.

Rejected alternative: put everything in one `nasa-reference.json`. It would couple unrelated schemas and make validation errors harder to localize.

### D2. Types are local to the reference layer

`reference-types.ts` defines:

- `ReferenceDatasetId = 'medical-kit' | 'osd575-bands' | 'radiation-reference' | 'reference-catalog'`.
- `ReferenceCurationMethod = 'manual' | 'mixed' | 'automated'`.
- `AnalyteUnit = 'mg/dL' | 'mmol/L'`, used only by the OSD reference. Do not add these units to `MeasurementUnit` or `IndicatorType` in `src/engine/types.ts`.
- `MedicalKitItem`, `MedicalKitGroup`, `MedicalKitDataset`.
- `OsdAnalyte`, `OsdBand`, `OsdPhase`, `Osd575BandsDataset`.
- `RadiationLimit`, `RadiationReferenceDataset`.
- `ReferenceCatalogEntry`, `ReferenceCatalogDataset`.
- `SourceManifest`, `SourceManifestEntry` for the CLI, kept in `scripts/nasa/` or shared only if a TypeScript import does not pull Node code into the browser. The manifest is not imported by `reference.ts`.

Keep types structural and small. Use string-literal unions and discriminated unions where they prevent illegal states, not a general validation framework.

### D3. Medical kit: eight groups, six documented items, explicit honesty

`medical-kit.json` shape:

- `datasetId: 'iss-medical-kit-2015'`
- `title`
- `document`: `id`, `revision`, `fileName`, `sourcePage`, `table`, `pack`, `packColor`, `versionDate`, `historical: true`, `notCurrentInventory: true`
- `source`: `url`, `pdfPageCount`, `verificationDate`
- `contentPolicy`: `diagnosticItemsOnly`, `excludesMedications`, `excludesDoses`, `excludesOperationalInstructions`
- `items`: exactly six literal hardware records, each with `id`, `itemName`, `quantity`, `location`, `pack`, `packColor`, `table`, `sourcePage`, and `quote`.
- `groups`: exactly eight records. Each group's `items` array contains ids from the top-level `items` array, so there is one source of truth for item metadata.
- `optionalReactionTest`: `{ "included": false, "reason": "outside the eight reference groups" }`

The eight groups and statuses are fixed:

| Group id | Label | Status | Items |
|---|---|---|---|
| `blood-pressure` | Blood pressure (systolic and diastolic) | `documented` | Large cuff, small cuff, monitor |
| `temperature` | Temperature | `documented` | Thermometer |
| `spo2` | Peripheral oxygen saturation | `inferred-editorial` | Blood Oximeter |
| `heart-rate` | Heart rate | `not-documented` | empty |
| `glucose` | Glucose | `not-documented` | empty |
| `sleep` | Sleep | `not-documented` | empty |
| `mood` | Mood | `not-documented` | empty |
| `respiratory-rate` | Respiratory rate | `not-documented` | empty |

Rules:

- Only blood pressure and temperature are `documented`.
- `spo2` uses the literal item `Blood Oximeter` and a mandatory `inferenceNote`: the source documents the item, not SpO2 precision or a clinical threshold; the link to SpO2 is VITRUVIO editorial.
- The five not-documented groups have `items: []`, no fake pack, no fake location, no quote, and no claim that the item is absent from the ISS. They may carry a short `note` saying the 2015 page 9 table does not document an instrument for that group.
- A future source used to fill an undocumented group must have its own separate evidence record and review. It must not reuse the 2015 page 9 table or inherit its provenance.
- `Stethoscope` is a documented item but is not mapped to a measurement group. Mapping it to blood pressure or heart rate would be an unsupported clinical attribution.
- `quote` is a literal page-9 row, for example `Blood Pressure Cuff - Large 1 B2`. Do not paraphrase it.
- The document is historical (2015) and not the current inventory. Do not include medication tables, strengths, routes, side effects, doses, or instructions. If the full PDF is downloaded for traceability, it stays in the external cache and never in the repository or app bundle.

Rejected alternative: invent an instrument for heart rate, glucose, sleep, mood, or respiratory rate. Rejected because page 9 does not document one for those groups.

Rejected alternative: use `null` for missing pack fields. Rejected because a discriminated shape with an empty `items` array and no evidence fields is clearer and cannot be misread as "no item exists".

### D4. OSD-575: pure parser, aggregate JSON, strict schema

The pure module `scripts/nasa/osd575-cmp.mjs` exports:

- `parseOsdCmpCsv(text)` returning `{ samples, crews, phases, analytes }` or throwing a typed error with a stable code.
- `deriveOsdBands(samples)` returning counts and min/max per analyte, phase, and all-sample scope.
- `buildOsd575BandsDataset(samples, sourceMetadata)` returning the JSON object written to `src/data/nasa/osd575-bands.json`.

Parsing rules:

- Decode UTF-8, strip one BOM, accept CRLF and LF, and accept blank trailing lines.
- Use a real CSV parser that handles quoted commas. Do not split on commas.
- Reject malformed quoted fields, duplicate headers, missing headers, extra columns, and unknown columns that would change the four target analytes.
- Require the exact four observed value headers, including the source spelling `millimol`:
  - `glucose_value_milligram_per_deciliter`
  - `calcium_value_milligram_per_deciliter`
  - `sodium_value_millimol_per_liter`
  - `potassium_value_millimol_per_liter`
- Ignore all `*_range_min_*` and `*_range_max_*` columns. They are laboratory ranges, not observed cohort bands.
- Derive phase from the sample name: `_L-` means pre-flight; `_R+` means post-flight; any other phase is an error.
- Require 28 unique sample names, 4 unique crew prefixes, 12 pre-flight samples, and 16 post-flight samples.
- Require finite numeric values for every target analyte in every sample. Empty, `NA`, `NaN`, `inf`, `-inf`, nonnumeric, and duplicate sample rows fail.
- Do not impute, average, normalize, or clip values.

`osd575-bands.json` shape:

- `datasetId: 'osd575-cmp-v3'`
- `study`: `id: 'OSD-575'`, `version: '3'`, `doi: '10.26030/mc5d-p710'`, `license: 'CC0-1.0'`
- `source`: `url`, `retrievedAt`, `verificationDate`, `bytes: 8506`, `sha256`
- `cohort`: `uniqueSamples: 28`, `crewCount: 4`, `preSamples: 12`, `postSamples: 16`
- `analytes`: four records with `id`, `unit`, `phaseCounts`, and `bands` for `pre`, `post`, and `all`.
- `clinicalContext`: explicit notes that the values are observed cohort aggregates, not normal intervals, not in-flight data, not a personal baseline, and not a calibration or prediction input.

The app JSON and any published fixture must contain no real participant identifiers, no real sample names, no sex, no email, and no real per-sample rows. The raw CSV is allowed only in the external cache. Parser tests may use clearly synthetic identifiers and synthetic rows to exercise the format, but they must not publish real observations or real participant identifiers.

Rejected alternative: commit the CSV and parse it in the browser. Rejected because it leaks participant-level rows into the repository and bundle and adds runtime parsing risk.

Rejected alternative: use the CSV's range columns as "normal" bands. Rejected because the contract explicitly distinguishes observed cohort min/max from laboratory ranges.

### D5. Radiation: NASA effective dose only, no engine coupling

`radiation-reference.json` shape:

- `datasetId: 'nasa-radiation-reference'`
- `status: 'reference-only'`
- `limits`: two records:
  - `career-effective-dose`: 600, `unit: 'mSv'`, `doseType: 'NASA effective dose'`, `requirementId: 'V1 4030'`, `standard: 'NASA-STD-3001 Volume 1 Revision C'`, `standardPage: 40`, `brief: 'OCHMO-TB-020 Rev G'`, `briefPage: 4`, `approvedAt: '2023-09-15'`, `briefDate: '2025-06-06'`, plus literal quotes from both sources.
  - `spe-effective-dose`: 250, `unit: 'mSv'`, `doseType: 'NASA effective dose'`, `requirementId: 'V1 4031'`, `standardPage: 42`, `briefPage: 6`, plus literal quotes.
- `semantics`: notes that the values are effective dose, not organ dose; that CSA material may use Sv organ context and must not be substituted; that no conversion to mGy is performed; that no clinical recommendation is implied.
- `engineIntegration`: `{ "included": false, "reason": "engine thresholds and RF-32 remain with the engine owner" }`

Rules:

- Store `mSv` only. Do not add `mGy`, `mGy-Eq`, or a conversion helper.
- Do not import `src/engine` and do not export a threshold constant intended for engine use.
- The engine already owns `DOSE_LIMITS_MSV` with 600/250 in `src/engine/dose.ts`. The numeric coincidence is handled as dataset reference only: no import, no shared function, and no single-source threshold change.
- The OCHMO brief is a reference derived from NASA-STD-3001, not a superseding standard. Record that distinction.
- If a quote, page, or requirement ID cannot be verified, reject the entry and report a blockage. Do not invent a citation.

Rejected alternative: derive the numbers from the CSA page or convert to mGy. Rejected because it mixes organ and effective dose and changes the technical meaning.

### D6. Catalog: ten families, separated from HRP sources

`reference-catalog.json` has `datasetId: 'nasa-reference-catalog'`, `verificationDate`, `hostAllowlist`, and exactly ten entries with these ids:

1. `hrp`
2. `iss-medical-kit`
3. `osd-575`
4. `nasa-std-3001-vol1`
5. `ochmo-tb-020`
6. `donki`
7. `noaa-swpc`
8. `csa-radiation`
9. `news2`
10. `nasa-3d-resources`

The catalog URL set is pinned to the verified sources:

| Entry | URLs |
|---|---|
| `hrp` | `https://humanresearchroadmap.nasa.gov/` plus the existing per-risk canonical URLs already in `sources.json` |
| `iss-medical-kit` | `https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf` |
| `osd-575` | `https://osdr.nasa.gov/bio/repo/data/studies/OSD-575`, `https://osdr.nasa.gov/osdr/data/osd/files/575.3`, and the pinned CMP CSV URL |
| `nasa-std-3001-vol1` | `https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1` and `https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf` |
| `ochmo-tb-020` | `https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf` |
| `donki` | `https://ccmc.gsfc.nasa.gov/tools/DONKI/`, `https://ccmc.gsfc.nasa.gov/DONKI/api/`, and `https://ccmc.gsfc.nasa.gov/news/major-updates/` |
| `noaa-swpc` | `https://www.swpc.noaa.gov/content/data-access`, the verified official redirect `https://www.spaceweather.gov/content/data-access`, and `https://www.weather.gov/disclaimer` |
| `csa-radiation` | `https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp` and `https://www.asc-csa.gc.ca/eng/terms.asp` |
| `news2` | `https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/`, `https://www.rcp.ac.uk/media/alxev00t/news2-chart-1_the-news-scoring-system_0_0.pdf`, `https://www.rcp.ac.uk/media/2acdezkd/news2-chart-2_news-thresholds-and-triggers_0.pdf`, and `https://www.rcp.ac.uk/terms-and-conditions/` |
| `nasa-3d-resources` | `https://science.nasa.gov/3d-resources/`, `https://www.nasa.gov/nasa-brand-center/images-and-media/`, and the `https://github.com/nasa/NASA-3D-Resources` README |

Each entry has:

- `id`, `title`, `publisher`, `urls`, `purpose`, `srsReferences`, `dataNature`, `curationMethod`, `licenseTerms`, `owner`, `edition`, `verificationDate`, and `notes`.

`licenseTerms` is an object with `label`, `url`, and `notes`. The notes must say the catalog is not legal advice and that asset-level terms can differ. `owner` records the VITRUVIO module owner and the handoff boundary.

Catalog rules:

- Do not add RCP, NOAA, or CSA entries to `src/data/nasa/sources.json`. That file remains the NASA-only HRP evidence file.
- `donki` and `noaa-swpc` are metadata-only catalog entries. Do not add an API key, a live client, a runtime fetch, or a mock presented as real data. The DONKI 2026 migration notice is recorded as a re-verification item, not as a supported endpoint claim.
- `news2` records the RCP source and chart URLs and credit only. Do not transcribe NEWS2 thresholds or duplicate `src/engine` logic.
- `nasa-3d-resources` records the NASA page and GitHub README as catalog sources. Do not download GLBs or claim one uniform license for all assets. The README licensing conflict is a note requiring asset-level review.
- `osd-575` records the study page, file API, and CSV URL, with CC0-1.0 and DOI. It does not imply clinical use.
- The top-level `hostAllowlist` is exact, not wildcarded. Proposed hosts: `www.nasa.gov`, `standards.nasa.gov`, `humanresearchroadmap.nasa.gov`, `osdr.nasa.gov`, `nasa-osdr.s3.us-west-2.amazonaws.com`, `www.rcp.ac.uk`, `www.swpc.noaa.gov`, `www.spaceweather.gov` (verified official SWPC redirect on 2026-11-14), `www.weather.gov`, `www.asc-csa.gc.ca`, `ccmc.gsfc.nasa.gov`, `science.nasa.gov`, and `github.com`. The fetch allowlist is narrower and is defined in the ingestion script; `github.com` is catalog-only unless a later change approves asset download.

Rejected alternative: merge everything into `sources.json`. Rejected because it would mix NASA-only HRP evidence with partner agencies and break the existing NASA-host test assumptions.

### D7. Ingestion: opt-in, allowlisted, bounded, atomic, integrity-first

Create a developer-only Node ESM CLI under `scripts/nasa/` using only Node built-ins. Proposed entry point: `scripts/nasa/reference-sources.mjs`.

Commands and flags:

- Default: `node scripts/nasa/reference-sources.mjs --check --cache <dir>` runs offline schema and manifest checks.
- `--fetch` is required to make network requests.
- `--cache <dir>` is mandatory for fetch and optional for check. The path is resolved and must stay inside the explicit cache root.
- `--verify-cache` re-derives OSD bands from the cached CSV and compares them to the committed JSON.
- `--write-osd` writes `src/data/nasa/osd575-bands.json` atomically.
- No positional URL argument and no arbitrary URL flag. The manifest is the only source of truth.

Fetch rules:

- Exact host allowlist, with `nasa-osdr.s3.us-west-2.amazonaws.com` allowed only for the manifest's OSD entry.
- Reject credentials in URLs, non-HTTPS URLs, fragments, and hosts not in the allowlist.
- Follow at most two redirects, and only to allowlisted hosts. Reject cross-host redirects outside the allowlist.
- Set a per-request timeout and a per-response byte cap. Reject non-2xx responses, unexpected content types, oversized bodies, and short bodies.
- Compute SHA-256 over the raw bytes before parsing. Compare against the pinned manifest entry. A mismatch is an `upstream-review-required` error; do not accept it silently.
- Download to `<cache>/.tmp/<id>.<random>.part`, fsync if practical, then rename atomically to the final cache path. On any failure, remove the temporary file and leave any existing curated file byte-identical.
- Never write to `src/data/nasa/*.json` on a failed download, hash check, or parse. Never overwrite the curated PDF/manual source.
- PDFs are downloaded for integrity and traceability only. Do not promise automatic PDF-to-JSON extraction; page-9 curation remains manual and quoted.

Manifest:

- `scripts/nasa/source-manifest.json` is a developer artifact, not a browser import.
- Each entry pins `id`, `sourceUrl`, `host`, `sha256`, `bytes`, `contentType`, `edition`, `retrievedAt`, `cacheFile`, `usedBy`, and `extraction`.
- The manifest must not include DONKI/NOAA API keys, NASA 3D GLBs, or unselected sources.
- RCP chart PDFs are catalog-only. The download selection is exactly four assets: ISS medical-kit PDF, OSD-575 CMP CSV, NASA-STD-3001 PDF, and OCHMO-TB-020 PDF. Do not add RCP chart entries to the manifest or cache in this change.

Rejected alternative: use `npm` packages such as `undici`, `csv-parse`, or `pdf-parse`. Rejected because the contract forbids new dependencies and PDF extraction is intentionally manual.

Rejected alternative: write directly to the final path during download. Rejected because a failure would leave a partial file and could overwrite curated input.

### D8. Offline verification is the default

`--check` must work with no network:

- Parse the manifest and validate its schema.
- Read the committed JSON datasets and validate their counts, ids, units, provenance, and cross-references.
- Confirm every manifest `usedBy` dataset exists.
- In `--verify-cache` mode, parse the cached OSD CSV and re-derive the aggregate JSON; compare counts and values exactly.
- Do not fetch, do not import the CLI from browser code, and do not add any app runtime network call.

Rejected alternative: make the app download on first load. Rejected by RNF-01 and RNF-10 and by the offline-first requirement.

### D9. Runtime helpers: small, validated, non-mutating

`reference.ts` exports one getter per dataset and, only if needed, a single dataset-id lookup:

- `getMedicalKit(): MedicalKitDataset`
- `getOsd575Bands(): Osd575BandsDataset`
- `getRadiationReference(): RadiationReferenceDataset`
- `getReferenceCatalog(): ReferenceCatalogDataset`
- `getReferenceDatasetIds(): ReferenceDatasetId[]`

Each getter returns a deep copy of the dataset, including nested arrays and nested objects, so callers cannot mutate the shared import through an inner reference. The datasets are small (well under 10 KB each), so deep copies are cheap.

Validation happens once at module load:

- Required counts and exact ids.
- Same-unit constraints for each analyte.
- No duplicate item ids, group ids, catalog ids, or requirement ids.
- Every group `items` entry resolves to an item id.
- Every documented group has at least one item; every not-documented group has none.
- Every catalog URL host is in the catalog allowlist.
- Every source has a verification date and every quote has a source page.

Errors name the dataset and the failing field/id. Do not catch and ignore. Do not add I/O, `node:fs`, `node:path`, or `fetch` to `reference.ts`.

Rejected alternative: expose the raw imported objects directly. Rejected because a caller could mutate shared data and affect other callers.

### D10. Tests are split by runtime

- Node built-in tests under `scripts/nasa/*.test.mjs` cover pure CSV parsing, aggregate derivation, URL/host validation, response limits, hash checks, and atomic write behavior. They use `node:test`, `node:assert/strict`, `node:fs/promises`, and `node:os`.
- Vitest tests under `src/data/nasa/*.test.ts` cover the JSON schemas, counts, provenance, catalog allowlist, freshness copies, and the byte-intact HRP contract.
- Do not modify `vitest.config.ts`.
- Do not modify the three existing HRP tests. If they fail because a new file changes a shared assumption, stop and report the conflict.

### D11. Documentation is part of the deliverable, but only in allowed paths

`docs/nasa/coverage.md` is new and records:

- HRP: 11 curated active risks, not 17; the difference and the editorial subset are intentional.
- ISS kit: 2015 historical document, eight groups, two documented groups plus one inferred-editorial SpO2 link, five not-documented groups, no medications or doses.
- OSD-575: 28 samples, 4 crew, 12 pre / 16 post, four analytes; observed aggregates only, not clinical ranges, not in-flight, not a simulator calibration.
- Radiation: 600 mSv career and 250 mSv SPE as NASA effective dose, with requirement ids and pages; no CSA organ Sv mixing, no mGy conversion, no engine threshold.
- Catalog: ten families, metadata only for DONKI/NOAA/CSA/RCP/NASA 3D; no API key or live client; no legal certainty.
- SRS 5.2: manual and automated curation are mixed and documented; the ingestion is not a full NASA mirror and does not replace PDF curation.
- Owner boundaries and the list of files that remain with engine, simulator, UI, guides, and protocols owners.

Update `src/data/nasa/README.md` only. It should explain the new files, how to run the offline check, what is manual versus automated, and the honest limits. It must not hide the HRP 11-versus-17 limitation.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| A 2015 PDF contains medication tables and someone copies them into JSON. | Dataset allows only six diagnostic hardware items from page 9; content-policy tests scan for medication/dose fields and instructions; PDFs stay in external cache. |
| SpO2 is presented as a clinically precise measurement. | Group status is `inferred-editorial`; the Blood Oximeter item is literal; the inference note is mandatory and tested. |
| Heart rate, glucose, sleep, mood, or respiratory rate gets a fake pack. | Groups are `not-documented` with `items: []`; no pack/location/quote fields; no claim that the item is absent from the ISS. |
| OSD-575 aggregates are mistaken for normal ranges or a prediction model. | JSON uses `min`/`max`, phase labels, and an explicit negative notice: not normal intervals, not in-flight baseline, not calibration, not a prediction input. Tests require that notice and reject positive clinical labels instead of banning the words in correct negations. |
| Participant identifiers leak into the repo. | App JSON and published fixtures contain only counts and min/max; raw CSV stays in external cache; parser tests may use synthetic ids and rows, never real observations. |
| CSA organ Sv is mixed with NASA effective mSv. | Radiation dataset stores only NASA effective dose; catalog notes the CSA context; tests reject `Sv`, `mGy`, and CSA substitution. |
| A hash mismatch is silently accepted because a source changed. | Fetch fails closed with `upstream-review-required`; no write, no rename, no overwrite. |
| A failed download overwrites a curated file. | Download to a temp path, validate, then atomic rename; failure removes temp and leaves the destination unchanged. |
| PDF extraction is unreliable. | PDFs are integrity-only; page quotes are manual; no automatic extractor is promised. |
| The catalog implies legal clearance. | Every `licenseTerms` includes "not legal advice" and an asset-level review note; NASA 3D specifically has no uniform-license claim. |
| DONKI/NOAA are treated as live integrations. | Catalog and manifest are metadata-only; no API key, no runtime client, no mock presented as real. |
| NEWS2 logic is duplicated. | Catalog records sources and credit only; no thresholds in JSON; engine remains the owner. |
| A new helper accidentally becomes a production dependency. | Import-graph search and tests confirm the new reference helpers have no consumers outside `src/data/nasa` tests; the legacy HRP consumers from main are expected and their files stay byte-intact; `index.ts` unchanged. |
| Windows atomic rename or path handling fails. | Use a same-volume temp file inside the cache root and `rename`; tests cover existing destination and failure cleanup. |
| The source host allowlist is too broad or too narrow. | Exact host strings only; catalog allowlist separate from fetch allowlist; tests reject lookalike hosts and untrusted redirects. |
| New tests modify `vitest.config.ts`. | Explicitly forbidden; Node tests use `node --test`; Vitest tests use the existing config. |

## Migration Plan

1. Implement T1 (medical kit) and run its Vitest test plus typecheck. Do not touch legacy files.
2. Implement T2 (OSD parser, aggregate JSON, tests) using the cached CSV. Do not commit the raw CSV.
3. Implement T3 (radiation and catalog JSON, typed getters, tests).
4. Implement T4a (manifest, CLI, adversarial Node tests) and T4b (coverage doc, README, QA matrix).
5. Run the full verification suite. If any legacy file changes, stop and revert that change.
6. If rollback is needed, delete only the new files and revert the README change. The HRP dataset and all other owners' modules are untouched, so no data migration or runtime rollback is required.

The earlier implementation phase was unpublished. Publication is now authorized by Fabian after QA and checks. Do not commit the private ignore targets; merge only after QA plus checks.

## Signed Decisions / No Blocking Open Questions

All six implementation choices were approved by the architect. There are no blocking open questions, and the settled points stay settled: HRP is 11 curated, not 17; the kit is historical and not current inventory; the five undocumented groups stay empty; OSD-575 is not clinical; radiation is effective dose only.

Signed decisions:

1. Helper names and exact JSON field names proposed in D1-D5 are approved. `groups[].items` is an array of item ids, not `itemIds`.
2. Manifest location is `scripts/nasa/source-manifest.json` (developer artifact, not app data).
3. CLI entry point is `scripts/nasa/reference-sources.mjs` and pure parser is `scripts/nasa/osd575-cmp.mjs`.
4. Phase derivation uses sample names `_L-` and `_R+`. The source has no separate phase column; this is the only reproducible signal in the CSV.
5. Stethoscope is documented as an item but unmapped to a measurement group. This avoids an unsupported clinical attribution.
6. Catalog license terms for DONKI, NOAA, CSA, RCP, and NASA 3D must be re-verified at implementation; the catalog records notes, not legal conclusions.

Additional signed clarifications:

- All getters return deep copies, including nested arrays and objects.
- App JSON and published fixtures must not contain real rows or identifiers. Parser tests may use synthetic identifiers and synthetic rows, but must describe formats without publishing real observations.
- Tests must not fail merely because the words "normal", "baseline", or "calibration" appear in a correct negative notice. Tests must require an explicit negative notice and reject positive clinical claims.
- The download selection is minimal: exactly ISS, CMP, STD, and TB. RCP remains catalog-only for licensing reasons.
