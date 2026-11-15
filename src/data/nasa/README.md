# NASA reference data

This folder is the approved point 1 reference-data increment: HRP navigation records, historical ISS kit coverage, OSD-575 cohort aggregates, radiation limits, and a source catalog. It is reference material only. It does not diagnose, recommend treatment, calculate a personal dose, or replace the health engine.

## Files

| File | Purpose |
|---|---|
| `hazards.json` | Five HRP spaceflight hazard categories. |
| `risks.json` | 11 manually curated active HRP risks. |
| `sources.json` | NASA-only HRP provenance and one evidence entry per risk. |
| `medical-kit.json` | Historical 2015 ISS Medical Diagnostic Pack (Blue) coverage. |
| `osd575-bands.json` | Observed OSD-575 version 3 cohort aggregates. |
| `radiation-reference.json` | NASA effective-dose references, not engine thresholds. |
| `reference-catalog.json` | Metadata for ten reference families. |
| `index.ts` | Legacy HRP loaders. It is byte-intact and still exports the original five HRP helpers. |
| `reference.ts` | New reference-data getters and validation. |
| `*.test.ts` | Schema, provenance, privacy, copy-isolation, and content-policy tests. |

## How to read it

Import the new getters from `./reference`, not from `./index.ts`:

```ts
import {
  getMedicalKit,
  getOsd575Bands,
  getRadiationReference,
  getReferenceCatalog,
  getReferenceDatasetIds,
} from './reference'

const kit = getMedicalKit()
const cohort = getOsd575Bands()
```

The getters return deep copies. Do not import the JSON files directly in components. `index.ts` remains the old HRP barrel and is not a wrapper around `reference.ts`.

## Curation and limits

- **HRP:** 11 manually curated active risks and 5 hazards. This is not the 17-risk planning list and not the full HRP catalog. Per-risk URLs and excerpts remain in `sources.json`.
- **ISS kit:** 2015 historical PDF, page 9, Table 5. Eight reference groups: blood pressure and temperature are documented; SpO2 is an editorial inference from the literal `Blood Oximeter` item; heart rate, glucose, sleep, mood, and respiratory rate are not documented in that table and keep `items: []`. The stethoscope is recorded but intentionally unmapped. No medications, doses, or instructions are copied.
- **OSD-575:** automated CSV parse plus aggregate derivation. Four crew, 28 samples, 12 pre-flight, 16 post-flight, four analytes. Values are observed cohort min/max, not normal ranges, not in-flight data, not a personal baseline, and not calibration or prediction input.
- **Radiation:** two NASA effective-dose references: less than 600 mSv career and less than 250 mSv for the design-reference SPE spectrum. The values are not a personal dosimeter and are not hardcoded engine thresholds.
- **Catalog:** ten source families with metadata, purposes, SRS references, licensing notes, and owner handoffs. RCP NEWS2 is catalog-only and its thresholds are not transcribed. DONKI and NOAA are catalog metadata only, with no API key, live client, or mock presented as real. NASA 3D licensing needs asset-level review; no GLB is downloaded.

Licensing notes are source references, not legal advice. NASA media guidelines, partner terms, and asset-level restrictions may differ.

## Scripts

The Node scripts are separate developer tools. They are not imported by the browser bundle.

Offline validation, no network and no cache argument:

```powershell
node scripts/nasa/reference-sources.mjs --check
```

Opt-in fetch. Use an external cache; the CLI rejects roots inside the repo or any Git checkout, and rejects symlinks, junctions, traversal, and unsafe filenames. On Windows, prefer a PowerShell variable instead of a machine-specific path:

```powershell
$cache = Join-Path $env:TEMP "vitruvio-nasa-cache"
Test-Path (Split-Path $cache -Parent)
node scripts/nasa/reference-sources.mjs --fetch --cache $cache
```

Verify the four cached assets offline and rederive OSD-575:

```powershell
node scripts/nasa/reference-sources.mjs --verify-cache --cache $cache
node scripts/nasa/reference-sources.mjs --verify-cache --cache $cache --write-osd
```

`--write-osd` has no output path or URL argument. It writes only the fixed `src/data/nasa/osd575-bands.json`, and only after all four assets and the derived OSD JSON validate. If the derived JSON is not byte-identical to the committed file, it fails for review instead of silently changing approved metadata. The current verified state reports `write-osd=unchanged`.

The manifest is `scripts/nasa/source-manifest.json`. It pins the four URLs, hosts, SHA-256 values, byte counts, content types, editions, real retrieval dates, cache filenames, `usedBy` JSON basenames, and extraction methods. Raw PDFs and CSVs stay in the external cache; they are not in the app bundle. Offline validation proves the committed data matches the cache; it does not prove that the remote source is currently available.

PDFs are integrity-checked, not automatically text-extracted. Page-level kit and radiation curation remains manual and quoted, with explicit pages.

## Verification

```powershell
node --test scripts/nasa/osd575-cmp.test.mjs
node --test scripts/nasa/source-download.test.mjs
node --test scripts/nasa/reference-sources.test.mjs
node --test scripts/nasa/acceptance.test.mjs
npm run test:run
```

The four Node suites (43 checks) cover the OSD parser, download/cache security, CLI/offline rederivation, and the contract acceptance scenarios. The Vitest suite covers the typed datasets and the legacy HRP contract.

## Owner boundaries

- `data/nasa` / Fabián: reference JSON, provenance, catalog, tests, and the developer CLI.
- Health engine: RF-32 dose calculation, NEWS2 bands, and clinical alert logic. Nothing here is an engine threshold.
- Simulator / RF-27: OSD cohort calibration, prediction, and UI integration are owned by the simulator/UI owners; this increment does not implement them.
- Guides, protocols, emergency flow, camera, store, and report: owned elsewhere in main; this increment does not implement them.
- 3D scenes: NASA 3D assets and licensing review remain with the 3D owner.

## Known limitations

The HRP set is 11 curated active risks, not 17. The ISS kit is historical and not a current inventory. OSD-575 is observational cohort context, not clinical guidance. The catalog does not grant permissions and is not a full NASA mirror. This increment does not complete RF-14, RF-16, RF-21, RF-27, RF-28, RF-32, or RF-33 as end-to-end application features.

A crash or SIGKILL during a download can leave a `.part` file in the external cache `.tmp`; cleanup is manual and only when no download process is active. The final cache file is published only by atomic rename, so partial data is never presented as a complete asset.
