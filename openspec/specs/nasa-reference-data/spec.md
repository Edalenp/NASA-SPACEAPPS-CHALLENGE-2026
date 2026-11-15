# nasa-reference-data Specification

## Purpose
TBD - created by archiving change complete-nasa-reference-data. Update Purpose after archive.
## Requirements
### Requirement: Reference datasets are local, typed, and offline

The NASA reference module SHALL expose four local JSON datasets through typed helpers in `reference.ts`, and it MUST NOT perform network I/O or import Node-only modules at runtime.

The four datasets are `medical-kit.json`, `osd575-bands.json`, `radiation-reference.json`, and `reference-catalog.json`. The new helpers are separate from the existing `index.ts` HRP barrel.

#### Scenario: Successful typed load

- **WHEN** `reference.ts` is imported in Vitest or a browser build
- **THEN** `getMedicalKit()`, `getOsd575Bands()`, `getRadiationReference()`, and `getReferenceCatalog()` return typed objects whose dataset ids match the four expected ids
- **AND** the OSD getter reports 28 unique samples and the catalog getter reports 10 entries

#### Scenario: Runtime has no network dependency

- **WHEN** the new reference modules are statically inspected and executed in tests
- **THEN** they import only local JSON and TypeScript modules
- **AND** they contain no `fetch`, `XMLHttpRequest`, WebSocket, `node:fs`, `node:path`, or `node:http` usage

#### Scenario: Invalid dataset fails fast

- **WHEN** a required dataset has a missing required field, a wrong count, or an unknown id
- **THEN** module load throws an error that names the dataset and the failing field or id
- **AND** the error is not swallowed or replaced with a default value

### Requirement: HRP legacy contract remains byte-intact

The change MUST NOT modify `src/data/nasa/index.ts`, `src/data/nasa/types.ts`, `hazards.json`, `risks.json`, `sources.json`, `dataset.test.ts`, `risks.test.ts`, or `sources.test.ts`, and it SHALL preserve the existing HRP behavior of 5 hazards and 11 curated risks.

#### Scenario: Legacy files are byte-identical

- **WHEN** the implementation change set is compared with `ea028ce`
- **THEN** the eight legacy files listed in this requirement have no diff
- **AND** their checksums match the base revision

#### Scenario: Existing HRP behavior is unchanged

- **WHEN** the three existing HRP test files run
- **THEN** they pass without edits
- **AND** the module still exposes exactly 5 hazards, 11 active curated risks, the same zone distribution, and the same canonical HRP evidence links

#### Scenario: No new production consumers or barrel changes

- **WHEN** the repository import graph is searched outside `src/data/nasa`
- **THEN** no production module imports the new reference helpers or JSON files
- **AND** `src/data/nasa/index.ts` still does not import `reference.ts` or any new dataset
- **AND** the only consumers of the new helpers are the new tests

### Requirement: Historical ISS medical kit is curated with explicit coverage status

`medical-kit.json` SHALL contain exactly the eight VITRUVIO reference groups and only diagnostic hardware from page 9 of the historical 2015 ISS medical kit, and it MUST NOT contain medications, doses, or operational instructions.

The source document is historical. It is not the current ISS inventory, and the dataset must say so.

#### Scenario: Eight reference groups are exact

- **WHEN** `getMedicalKit().groups` is read
- **THEN** it contains exactly these ids in this order: `blood-pressure`, `temperature`, `spo2`, `heart-rate`, `glucose`, `sleep`, `mood`, `respiratory-rate`
- **AND** blood pressure is one group covering systolic and diastolic pressure, not two groups

#### Scenario: Documented blood-pressure and temperature hardware

- **WHEN** the documented groups are read
- **THEN** `blood-pressure` has status `documented` and references the literal items `Blood Pressure Cuff - Large` at B2, `Blood Pressure Cuff - Small` at B2, and `Blood Pressure Monitor` at B4
- **AND** `temperature` has status `documented` and references `Thermometer` at B3
- **AND** each item records the pack `Medical Diagnostic Pack`, pack color `Blue`, table `Table 5. Medical Diagnostic Pack (Blue)`, source page 9, and a literal page-9 quote
- **AND** the document metadata records `MED CL/SpX-6 - ALL/FIN/T`, revision `09 APR 15`, file `3.001_M_26501.doc`, and `historical: true`

#### Scenario: SpO2 is an editorial inference, not a clinical claim

- **WHEN** the `spo2` group is read
- **THEN** it has status `inferred-editorial` and references the literal item `Blood Oximeter` at B1
- **AND** it contains a mandatory note that the source documents the item but not SpO2 precision, a clinical threshold, or a diagnosis
- **AND** the link from the item to SpO2 is labelled as VITRUVIO editorial

#### Scenario: Undocumented groups stay empty without inventing hardware

- **WHEN** the `heart-rate`, `glucose`, `sleep`, `mood`, or `respiratory-rate` groups are read
- **THEN** each has status `not-documented` and `items: []`
- **AND** none has a fabricated pack, location, quote, or null placeholder
- **AND** the dataset does not claim that no such item exists on the ISS; it only states that the 2015 page 9 table does not document an instrument for that group
- **AND** any future evidence for those groups must come from a separate source with its own citation and review, not from the 2015 page 9 table

#### Scenario: Stethoscope is recorded but not attributed to a group

- **WHEN** the documented item list is read
- **THEN** it contains `Stethoscope` at B1 with its page-9 quote and source metadata
- **AND** the stethoscope has no measurement-group attribution, so it is not used to claim a blood-pressure or heart-rate measurement method

#### Scenario: No medications, doses, or instructions

- **WHEN** the medical-kit dataset and its tests are scanned
- **THEN** there are no medication names, strengths, routes, side effects, doses, treatment steps, or operational instructions
- **AND** if the source PDF is downloaded for traceability, it exists only in the external cache and not in the repository or app bundle
- **AND** the optional reaction test is not part of the eight groups

### Requirement: OSD-575 cohort bands are reproducible aggregates, not clinical ranges

`osd575-bands.json` SHALL contain only observed OSD-575 version 3 cohort aggregates for glucose, calcium, sodium, and potassium, with exact units and phase counts, and it MUST NOT contain real participant identifiers, real raw rows, laboratory ranges, imputed values, normal intervals presented as clinical labels, or clinical interpretations.

#### Scenario: Cohort shape is exact

- **WHEN** `getOsd575Bands()` is read
- **THEN** it reports 28 unique samples, 4 crew members, 12 pre-flight samples, and 16 post-flight samples
- **AND** it contains exactly four analytes: glucose in `mg/dL`, calcium in `mg/dL`, sodium in `mmol/L`, and potassium in `mmol/L`
- **AND** each analyte reports `n=12` for pre-flight, `n=16` for post-flight, and `n=28` for all samples

#### Scenario: Observed bounds match the public cohort

- **WHEN** the committed aggregate bands are compared with the public CSV
- **THEN** pre-flight values are glucose 56..100, calcium 9.3..10.3, sodium 138..143, potassium 3.3..4.6
- **AND** post-flight values are glucose 36..103, calcium 9.2..10.1, sodium 136..141, potassium 3.0..5.9
- **AND** all-sample values are glucose 36..103, calcium 9.2..10.3, sodium 136..143, potassium 3.0..5.9

#### Scenario: Min/max are observed bounds, not laboratory ranges

- **WHEN** the dataset schema is inspected
- **THEN** each band exposes only observed `min` and `max` values with phase and sample count
- **AND** no `*_range_min_*` or `*_range_max_*` value from the CSV is copied into the dataset
- **AND** no band is labelled normal, abnormal, reference interval, or clinical threshold

#### Scenario: Participant privacy is preserved

- **WHEN** `osd575-bands.json` and the published repository files are inspected
- **THEN** the app JSON and published fixtures contain no real crew-id strings, no real sample names, no sex, no email, and no real per-sample rows
- **AND** parser tests may use clearly synthetic identifiers and synthetic rows to exercise the format, without publishing real observations
- **AND** no raw OSD CSV with participant identifiers is tracked in the repository
- **AND** the source cache is external and is not part of the app bundle

#### Scenario: The cohort is not a clinical or predictive tool

- **WHEN** the dataset context and tests are inspected
- **THEN** the data is described as pre-flight and post-flight observational context only
- **AND** the dataset contains an explicit negative notice that the values are not normal intervals, not an in-flight baseline, not a simulator calibration input, and not a 180-day prediction input
- **AND** tests require that negative notice and reject positive clinical or predictive labels, without failing merely because the words normal, baseline, or calibration appear in the negative notice
- **AND** no simulator or UI file is changed by this capability

### Requirement: Radiation reference preserves NASA effective-dose semantics

`radiation-reference.json` SHALL record the 600 mSv career limit and the 250 mSv solar particle event limit as NASA effective dose, with exact requirement ids, pages, edition dates, and literal quotes, and it MUST NOT convert to mGy, mix CSA organ dose in Sv, hardcode engine thresholds, or provide recommendations.

#### Scenario: Career limit is cited exactly

- **WHEN** the career limit record is read
- **THEN** it contains 600 mSv, dose type `NASA effective dose`, requirement `[V1 4030]`, NASA-STD-3001 Volume 1 Revision C page 40, OCHMO-TB-020 Rev G page 4, and the literal requirement quote
- **AND** it records the standard approval date 2023-09-15 and the brief date 2025-06-06

#### Scenario: Solar particle event limit is cited exactly

- **WHEN** the SPE limit record is read
- **THEN** it contains 250 mSv, dose type `NASA effective dose`, requirement `[V1 4031]`, NASA-STD-3001 Volume 1 Revision C page 42, OCHMO-TB-020 Rev G page 6, and the literal requirement quote
- **AND** the quote preserves the design reference SPE context, including the sum of the October 1989 events

#### Scenario: Units and dose type are not mixed

- **WHEN** the radiation dataset and its tests are inspected
- **THEN** every stored limit is in `mSv` and is explicitly an effective dose
- **AND** there is no `mGy`, `mGy-Eq`, or organ-dose conversion helper
- **AND** CSA material is catalogued as separate contextual reference and is not substituted for the NASA effective-dose limits

#### Scenario: No engine threshold or medical recommendation

- **WHEN** the radiation dataset is imported
- **THEN** it does not import `src/engine` and does not export a constant for engine use
- **AND** it contains no recommendation, diagnosis, treatment, or operational instruction
- **AND** the dataset states that RF-32 calculation and the simulator remain with their owners

#### Scenario: Unverifiable citation is rejected

- **WHEN** a quote, page, or requirement id cannot be verified against the named source
- **THEN** the entry is rejected during implementation review and reported as a blockage
- **AND** no citation is invented or inferred to fill the gap

### Requirement: Reference catalog covers ten families with provenance

`reference-catalog.json` SHALL contain exactly ten reference-family entries with source, purpose, curation, license-term notes, owner handoff, edition, and verification metadata, and it MUST keep partner and non-HRP sources out of the NASA-only HRP `sources.json`.

#### Scenario: Ten family ids are present

- **WHEN** `getReferenceCatalog().entries` is read
- **THEN** it contains exactly these ids: `hrp`, `iss-medical-kit`, `osd-575`, `nasa-std-3001-vol1`, `ochmo-tb-020`, `donki`, `noaa-swpc`, `csa-radiation`, `news2`, `nasa-3d-resources`

#### Scenario: Every entry has the required provenance fields

- **WHEN** each catalog entry is validated
- **THEN** it has non-empty `id`, `title`, `publisher`, `urls`, `purpose`, `srsReferences`, `dataNature`, `curationMethod`, `licenseTerms`, `owner`, `edition`, `verificationDate`, and `notes`
- **AND** `licenseTerms` has a label, a URL, and a note that the catalog is not legal advice

#### Scenario: Catalog is separated from HRP sources

- **WHEN** `src/data/nasa/sources.json` is inspected
- **THEN** it still contains only the NASA HRP sources and the 11 curated risks
- **AND** RCP, NOAA, and CSA entries are not added to it
- **AND** the catalog is the only place where partner agencies are recorded

#### Scenario: URL hosts are allowlisted exactly

- **WHEN** catalog and ingestion URLs are validated
- **THEN** every host matches an exact allowlist entry and lookalike hosts or subdomains are rejected
- **AND** the OSD CSV host `nasa-osdr.s3.us-west-2.amazonaws.com` is allowed only for the OSD entry
- **AND** the catalog allowlist and fetch allowlist are separate, with `github.com` catalog-only for NASA 3D Resources

#### Scenario: Licensing is described without false certainty

- **WHEN** the NASA 3D Resources entry is read
- **THEN** it says the catalog does not assert one uniform license for every asset
- **AND** it records the NASA 3D page and GitHub README as sources requiring asset-level review
- **AND** no GLB is downloaded or committed

#### Scenario: DONKI and NOAA are metadata-only

- **WHEN** the DONKI and NOAA SWPC entries are read
- **THEN** they contain URLs, purpose, fallback context, and terms notes only
- **AND** they contain no API key, no live runtime client, and no mock presented as real data
- **AND** the DONKI migration notice is recorded for re-verification rather than asserted as a supported endpoint

#### Scenario: NEWS2 credit does not duplicate engine logic

- **WHEN** the NEWS2 entry is read
- **THEN** it records the RCP landing page and chart URLs with credit
- **AND** it does not transcribe NEWS2 thresholds or duplicate the engine's scoring implementation
- **AND** the RCP chart PDFs remain catalog-only and are not added to the fetch manifest or external cache

### Requirement: Source ingestion is opt-in, allowlisted, and bounded

The ingestion CLI SHALL use only Node built-ins, SHALL require an explicit opt-in for network access, and MUST reject untrusted URLs, oversized responses, timeouts, non-2xx responses, wrong content types, and unallowlisted redirects.

#### Scenario: Offline check is the default

- **WHEN** the CLI runs with `--check` and no `--fetch`
- **THEN** it validates the manifest and datasets without opening a network connection
- **AND** it reports success or a schema error with a non-zero exit code only for a real failure

#### Scenario: Fetch requires explicit consent and a cache path

- **WHEN** the CLI runs with `--fetch`
- **THEN** it requires an explicit `--cache <dir>` path and resolves it inside the allowed cache root
- **AND** it refuses to run if the cache path is missing, relative in an unsafe way, or escapes the root

#### Scenario: Untrusted URLs and redirects are rejected

- **WHEN** a manifest URL has a non-HTTPS scheme, credentials, a fragment, an unallowlisted host, or a redirect to an unallowlisted host
- **THEN** the CLI fails before writing any file
- **AND** the error names the offending URL and the rejected host or redirect

#### Scenario: Budget and response checks fail closed

- **WHEN** a source exceeds the byte cap, times out, returns a non-2xx status, or returns an unexpected content type
- **THEN** the download is aborted, the temporary file is removed, and no curated data is written
- **AND** the error identifies the source id and the failed check

#### Scenario: No arbitrary URL or API key path

- **WHEN** the CLI arguments and manifest are inspected
- **THEN** there is no positional URL input and no arbitrary URL flag
- **AND** the only URLs come from the pinned manifest
- **AND** no API key, token, or client secret is read or stored

### Requirement: Source integrity failures fail closed and preserve curated files

The ingestion flow SHALL verify SHA-256 and byte length on raw bytes before parsing, SHALL write through a temporary file and atomic rename, and MUST NOT overwrite curated input or publish partial output when any check fails.

#### Scenario: Hash mismatch requires upstream review

- **WHEN** the downloaded bytes do not match the pinned SHA-256 or byte length
- **THEN** the CLI exits with an `upstream-review-required` error
- **AND** it does not accept the new file silently, does not parse it, and does not update the manifest

#### Scenario: Failed download leaves the existing file intact

- **WHEN** a destination cache file already exists and a new download fails at hash, size, timeout, MIME, or parse
- **THEN** the existing file remains byte-identical
- **AND** the temporary `.part` file is removed

#### Scenario: Writes are atomic and opt-in

- **WHEN** `--write-osd` is supplied and all checks pass
- **THEN** the JSON is written to a temporary file in the destination directory and atomically renamed over the target
- **AND** without `--write-osd` the committed dataset is never modified
- **AND** a failed write leaves no partial target file

#### Scenario: PDFs are integrity-only

- **WHEN** a PDF is downloaded
- **THEN** it is cached for integrity and traceability only
- **AND** the CLI does not claim to extract or publish JSON from the PDF automatically
- **AND** page-level curation remains manual and quoted

### Requirement: OSD-575 CSV parsing is strict and robust

The pure OSD-575 parser SHALL accept the real CSV formatting, SHALL validate the exact four target value headers and phase counts, and MUST reject malformed structure, unknown phases, duplicate samples, and invalid numeric values.

#### Scenario: Real-world CSV formatting is accepted

- **WHEN** the parser receives UTF-8 with a BOM, CRLF or LF line endings, quoted commas, and blank trailing lines
- **THEN** it parses all 28 data rows and preserves the quoted content
- **AND** it reads the exact header spelling `millimol` for sodium and potassium

#### Scenario: Wrong columns or header problems fail

- **WHEN** a required target column is missing, renamed, duplicated, or has the wrong unit suffix
- **THEN** the parser throws a column/header error before producing aggregates
- **AND** no partial dataset is written

#### Scenario: Duplicate samples and unknown phases fail

- **WHEN** the parser sees a duplicate sample name or a sample name that is neither `_L-` nor `_R+`
- **THEN** it throws a sample/phase error
- **AND** it does not guess a phase from row order

#### Scenario: Invalid numbers fail without imputation

- **WHEN** a target analyte value is empty, `NA`, `NaN`, `inf`, `-inf`, nonnumeric, or contains a locale-specific decimal comma
- **THEN** the parser throws a numeric error for that sample and column
- **AND** it does not impute, average, clip, or coerce the value

#### Scenario: Malformed quotes fail

- **WHEN** a CSV field has an unclosed quote or an invalid quote escape
- **THEN** the parser rejects the file
- **AND** it does not attempt a best-effort split that could shift columns

#### Scenario: Range columns are ignored

- **WHEN** the parser builds bands
- **THEN** it reads only the four `*_value_*` columns
- **AND** it ignores every `*_range_min_*` and `*_range_max_*` column
- **AND** the output contains observed `min`/`max` only

### Requirement: Offline verification rederives OSD without network

The offline check SHALL validate schemas and manifest references without network access, and the cache-verify mode SHALL rederive the committed OSD-575 aggregates from the cached CSV and compare them exactly.

#### Scenario: No-network check passes

- **WHEN** the CLI runs `--check` with network access disabled
- **THEN** it validates the four datasets, the manifest schema, and every `usedBy` reference
- **AND** it exits successfully without attempting a request

#### Scenario: Cache verification rederives the OSD dataset

- **WHEN** the CLI runs `--verify-cache` with the cached CSV present
- **THEN** it parses the CSV, derives counts and min/max, and compares them with `osd575-bands.json`
- **AND** any difference is reported as an error with the analyte and phase

#### Scenario: Application runtime remains offline

- **WHEN** the application bundle is built
- **THEN** it contains no ingestion CLI, no Node built-in imports, and no runtime network call for these datasets
- **AND** the datasets are available from local JSON only

### Requirement: Reference helpers validate inputs and do not share mutable state

`reference.ts` SHALL validate counts, domains, ids, and provenance at load time and SHALL return deep copies of nested arrays and objects so callers cannot mutate shared dataset state through an inner reference.

#### Scenario: Returned collections are deep copies

- **WHEN** a caller mutates an array, a group, an item, or another nested object returned by a reference getter
- **THEN** a subsequent call returns the original data unchanged
- **AND** the shared module import and its nested objects are not mutated

#### Scenario: Invalid counts, domains, ids, or provenance fail

- **WHEN** a dataset has a wrong group count, analyte unit, duplicate id, unresolved item id, unknown catalog host, missing source date, or missing quote page
- **THEN** load throws a clear error naming the dataset and the failed value
- **AND** the module does not silently drop the record or substitute a default

#### Scenario: Browser safety is preserved

- **WHEN** the new TypeScript modules are inspected for imports
- **THEN** they import no Node built-ins, no `scripts/nasa` module, and no engine module
- **AND** they are safe to include in a Vite browser bundle

#### Scenario: Consumers remain within the module and tests

- **WHEN** the production import graph is searched
- **THEN** no file outside `src/data/nasa` imports `reference.ts` or the new JSON datasets
- **AND** the only consumers are the new tests

### Requirement: Documentation reconciles SRS scope and mixed curation

`docs/nasa/coverage.md` and the NASA module README SHALL document what is curated, inferred, aggregated, catalogued, manual, and automated, and they MUST NOT present the module as a complete NASA mirror or hide the HRP limitation.

#### Scenario: Coverage document records the SRS reconciliation

- **WHEN** `docs/nasa/coverage.md` is read
- **THEN** it explains the 11 curated HRP risks versus the 17 referenced in project planning
- **AND** it explains the 2015 historical kit and its eight groups
- **AND** it explains the OSD-575 cohort shape and its non-clinical limits
- **AND** it explains the 600 mSv and 250 mSv radiation references and their NASA effective-dose semantics
- **AND** it explains that DONKI, NOAA, CSA, RCP, and NASA 3D are catalogued, not fully ingested

#### Scenario: Source citations and mixed curation are explicit

- **WHEN** a dataset or catalog entry is inspected
- **THEN** every source has a URL and a verification date
- **AND** every quoted item or radiation limit has a page and a literal quote
- **AND** the curation method is recorded as manual, mixed, or automated
- **AND** the SRS 5.2 manual/automated split is reconciled in the coverage document

#### Scenario: Only the module README is updated

- **WHEN** the change set is inspected
- **THEN** the only existing documentation file changed is `src/data/nasa/README.md`
- **AND** the local SRS file is not copied into the worktree
- **AND** no other owner's documentation is edited

#### Scenario: Source privacy is documented and tested

- **WHEN** the privacy rules are reviewed
- **THEN** the OSD dataset contains only aggregates and the raw CSV remains in the external cache
- **AND** no real participant id, sex, email, or real observation row is committed or published in a fixture
- **AND** synthetic identifiers and rows are allowed only in parser tests
- **AND** no user health data is sent to a network endpoint

### Requirement: Change boundaries and non-goals are enforced

The change MUST limit edits to the approved reference-data paths, MUST leave all other owners' modules byte-intact, and MUST exclude guides, protocols, the report, runtime DONKI, simulator calibration, and clinical decision logic.

#### Scenario: Only approved paths change

- **WHEN** the final diff is inspected
- **THEN** changes are limited to `openspec/**`, `src/data/nasa` reference files, `scripts/nasa/**`, `docs/nasa/**`, and `src/data/nasa/README.md`
- **AND** the original worktree and its dirty `.gitignore` are not touched

#### Scenario: Prohibited modules remain untouched

- **WHEN** the diff is checked against the prohibited list
- **THEN** `src/engine/**`, `src/data/{ranges,indicators,mission,guides,protocols}.ts`, `src/data/simulator/**`, `src/store/**`, `src/features/**`, `src/ui/**`, `src/landing/**`, `src/public/**`, App/main, and all build/test configuration files have no changes

#### Scenario: No dependency or configuration drift

- **WHEN** the diff and lockfiles are inspected
- **THEN** `package.json`, package manager lockfiles, `.gitignore`, `vitest.config.ts`, ESLint, TypeScript, and Vite configuration are unchanged
- **AND** the implementation adds no new runtime or development dependency

#### Scenario: Non-goals stay excluded

- **WHEN** the delivered files are reviewed
- **THEN** there are no guides, emergency protocols, report content, DONKI live client, NOAA live client, API key, GLB, raw PDF, raw OSD CSV, simulator calibration, or clinical recommendation
- **AND** the HRP 11-versus-17 limitation and the historical kit limitation are not hidden in the README or coverage document
