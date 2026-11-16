# Source and credit audit

Reviewed 2026-11-15 (America/Bogota) on the local integration branch. Main's
PR [#46](https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/pull/46), merge
`154eccc`, is included along with #43, updated #45 and the local clinical work.
The integration preserves #46's MARS–EARTH label correction, NASA subtitle,
individual external source links, keyboard focus and source-card spacing.

## Findings and changes

The earlier landing named 11 categories; its list was a summary, not a complete
inventory of the citations used in the laboratory. The README also omitted
several guide and review sources and linked some generic or different documents.
The laboratory's source browser covered the ten-family NASA catalog but omitted
the independent clinical, guide, health-review and visual-source collections.

| Gap | Result |
| --- | --- |
| ADA 2026 sections 2/6 and NASA V1 6001 absent from the public summary | Explicit glucose and fatigue citations, with clinical/model boundaries. |
| MedlinePlus/A.D.A.M., FDA, CDC, Cleveland Clinic, AMBOSS, StatPearls, AASM/SRS, NIMH, WHO and PVT research incompletely credited | Actual URLs are drawn from the measurement, guide, engine and review-prompt records. WHO-5 is context only; the mood input does not implement that instrument. |
| Red Cross and historical NASA CPR research missing from the main credits | Both prototype graphs supply their source records. The 1992 research is historical context, not a current flight protocol. |
| Model, imagery, typography and copied effects incompletely credited | MervinR07/open-anatomy-3d plus DBCLS, HRA/HuBMAP and MakeHuman; NASA/GSFC SVS, Reto Stockli and Earth Observatory; React Bits/David Haz, IBM Plex/Fontsource and vgpu utilities are identified. |
| Future catalog resources could be mistaken for live inputs | DONKI, NOAA SWPC and NASA 3D Resources explicitly say catalog only. The used Blue Marble image is credited separately. |
| README asserted completed human review while engine metadata says false | Review remains pending. Technical tests are not clinical validation. Contact timing and simulation assumptions are identified as project decisions. |

## One inventory

`src/features/sources/catalog.ts` combines the existing clinical citation table,
measurement reference records, guide sources, health-action sources, emergency
graph sources, fatigue constants and the validated NASA catalog. Asset credits
add their original sources and local notices. Software entries use the direct
dependencies and version specifications in `package.json`.

The landing and the laboratory render the same source browser. The README's
marked reference block is generated from those exact records:

```sh
npm run credits:sync
npm run credits:check
```

The sync command writes only that README block. Check is read-only and is part
of `check:integration`. Citation coverage tests compare the inventory with the
URLs actually declared by the source consumers and verify local notice paths.
Per-reading sources and the NASA evidence section remain at their points of use.

## Verification boundaries

The [per-URL access log](source-link-validation.json) covers **127 distinct
external URLs**, including software and catalog-only references. Direct bounded
GETs returned 76 readable responses. Five additional institutional URLs were
readable through the web tool after direct 403/connection failures: the two AHA
pages, CDC monitoring, and the two CSA pages. This leaves 44 URLs restricted by
HTTP 403, one NCBI CAPTCHA and one PubMed response without article content.
No direct check returned 404 or 410. A restricted response is not described as a
working or broken link; access remains unconfirmed by that method.

| Laboratory card or section | Confirmed access and contextual corrections |
| --- | --- |
| Mission environment / radiation | NASA standard landing page and Rev. C PDF, OCHMO-TB-020 PDF and CSA original page. The card now links the requirement pages, supporting brief and complementary Canadian context separately. |
| Equipment & sources / measurement guides | The 2015 NASA checklist, FDA, MedlinePlus and Cleveland Clinic pages were readable; CDC was readable through the web tool. Technique and inventory are separate citations. CGM/laboratory collection is not represented by a fingerstick technique. |
| NEWS2 / emergencies | RCP report, both scoring/trigger PDFs, additional guidance, both Red Cross pages and NASA NTRS CPR record were readable. Source access does not validate the adapted spacecraft workflow. |
| Clinical monitoring | AHA pages were readable through the web tool; ATS, Cleveland Clinic, AMBOSS and NHLBI responded directly. BTS/BMJ, AASM and ADA journal requests had access restrictions. A complete original BTS guideline was separately readable on the [BTS publisher site](https://www.brit-thoracic.org.uk/document-library/guidelines/emergency-oxygen/bts-guideline-for-oxygen-use-in-adults-in-healthcare-and-emergency-settings/). |
| Fatigue / trends / system risks | NASA V1 6001, NHLBI, OSD-575 DOI/data/API links and the 11 individual HRP risk records responded correctly. The PVT PubMed response did not expose its article; the title/authors were confirmed through indexed publisher records. |

The preview, alert and exported report now select the citation for the actual
rule shown: BTS for its oxygen target, ATS for low-saturation context, Cleveland
Clinic for fever and AMBOSS for the above-40 °C red flag. Numerical thresholds,
score tables, stored emergency plans and graph actions are unchanged.

The inventory audit checks the actual local code and documents; it does not
claim that every external source was freshly downloaded or that clinical content
has been validated. Original citation verification dates are preserved. ADA 2026
publisher-indexed text, NASA Medical Operations, FDA, CDC, WHO, NTRS and original
asset/notice pages were also inspected during this review. Direct publisher
requests for ADA and some journal/PubMed pages were restricted; those access
limitations do not justify inventing a replacement reference or approval.

The [React Bits notice](../public/credits/README.md) records the retrieved licence
revision. The initial Ghost Fibers adaptation did not pin its code revision.
No new medical thresholds, protocol steps or scoring rules were introduced by
this credit review. External challenge submissions and deployed sites were not
modified. See [clinical traceability](clinical-model-traceability.md) for the
source/model distinction and [integration report](pr43-pr45-integration.md) for
the earlier clinical integration evidence.

## Local validation

640 unit tests in 72 files and 43 NASA tests pass, along with strict types,
lint, inventory consistency, NASA data checks and the production build. All
seven production/PWA tests passed. Both source-specific browser tests passed
again after correcting the mobile source layout and historical-kit wording.
They compare all 20 groups across the landing and offline laboratory, fetch all
locally linked notices without the network/HTTP cache, inspect radiation
requirement links, and visit each of the 16 guide equipment/source sections.
Desktop/mobile source, radiation and equipment captures were visually reviewed.
