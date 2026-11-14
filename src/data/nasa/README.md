# NASA HRP dataset

This folder contains a small, manually curated subset of NASA Human Research Program (HRP) material used for VITRUVIO navigation. It is intentionally not a full copy of the HRP risk catalog.

## Files

- `hazards.json`: the five spaceflight hazard categories used by VITRUVIO.
- `risks.json`: 11 active HRP risks selected for this first dataset iteration.
- `sources.json`: provenance metadata and one evidence entry per selected risk.
- `index.ts`: typed loaders and the public helpers `getHazards`, `getHazardById`, `getAllRisks`, `getRisksByZone`, and `getRisksByHazard`.

## How to read the fields

`description` in `risks.json` is an editorial summary written for VITRUVIO. It is not a quotation and it is not a NASA diagnosis or recommendation.

`officialTitle` and `sourceExcerpt` in `sources.json` come from the linked NASA HRP page. `sourceExcerpt` is a short literal passage from the section named in `sourceSection`; `officialTitle` preserves the NASA title. When changing a risk, compare both fields against the `officialUrl` rather than treating the editorial `description` as source text.

## Editorial choices that are not NASA taxonomy

`hazardId` is VITRUVIO's primary editorial hazard for navigation. NASA risks can involve several hazards at once, so this field is not a complete causal taxonomy.

`targetZones` is also an editorial navigation choice over the six `ZoneId` values in `src/engine/types.ts`. It is not an official NASA organ assignment. Decompression sickness is a systemic risk; its `lungs` entry exists only to place it in the application's anatomy navigation.

The `radiation` hazard remains available even though this curated subset currently has no risk whose primary editorial hazard is radiation. `getRisksByHazard('radiation')` therefore returns an empty array.

## Scope and countermeasures

This is a curated subset of 11 active risks, not the complete HRP catalog and not "all 17" risks mentioned in some project planning material.

`countermeasures` is reserved for a later, separately curated field. For these 11 records it is intentionally an empty string. It must not be filled with recommendations, research summaries, treatments, or operational instructions unless the content has its own provenance and review.

The dataset does not perform diagnostic calculations or generate clinical alerts. It is reference content for navigation and education.

## Provenance and verification

`sources.json` records:

- `curationMethod`: `manual` for this iteration.
- `verifiedAt`: the date the linked pages were checked.
- `files`: source URLs and metadata for `hazards.json` and `risks.json`.
- `riskEvidence`: the HRP numeric id, official title, canonical URL, source section, literal excerpt, verification date, and active status for each risk.

Both risk and hazard URLs must resolve to NASA hosts. Risk pages use the canonical per-risk form `https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=N`, not the shared risks index.

## Honest limitation

The global SRS (section 5.2) describes a future script that would download NASA sources automatically. This first deliverable is manual curation with provenance metadata. It does not implement that script, does not claim a complete NASA data download, and does not include OSDR data.
