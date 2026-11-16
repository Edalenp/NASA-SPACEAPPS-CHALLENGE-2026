# Guide content sources

Provenance for the copy in `src/data/guides.ts`. Technique text is a short paraphrase of the named public source; it is not an onboard procedure. Clinical review and pack-specific adaptation remain pending.

## Technique sources

| Guide keys | Source | Section used | Checked |
|---|---|---|---|
| `pulse` | [MedlinePlus · Pulse](https://medlineplus.gov/ency/article/003399.htm) | How the Test is Performed; How to Prepare for the Test | 2026-11-15 |
| `systolic`, `diastolic` | [MedlinePlus · Blood pressure measurement](https://medlineplus.gov/ency/article/007490.htm) | How the Test is Performed; How to Prepare for the Test | 2026-11-15 |
| `respiration` | [Cleveland Clinic · Vital signs](https://my.clevelandclinic.org/health/articles/10881-vital-signs) | How do I check my respiratory rate? | 2026-11-15 |
| `temperature` | [MedlinePlus · Temperature measurement](https://medlineplus.gov/ency/article/003400.htm) | How the Test is Performed; How to Prepare for the Test | 2026-11-15 |
| `spo2` | [FDA · Pulse Oximeter Basics](https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics) | Using a pulse oximeter | 2026-11-15 |
| `consciousness`, `oxygen` | [RCP · NEWS2](https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/) | Existing scoring context; scoring is unchanged (supplemental oxygen scores 2) | 2026-11-15 |
| `calcium`, `sodium`, `potassium` | [MedlinePlus · Comprehensive metabolic panel](https://medlineplus.gov/lab-tests/comprehensive-metabolic-panel-cmp/) | What is it used for?; reference intervals from the MedlinePlus calcium, sodium and potassium test pages | 2026-11-15 |
| `reaction` | [Sleep · PVT response speed (2021)](https://pubmed.ncbi.nlm.nih.gov/32556295/) | Task-specific reference; compare with your own results. PubMed blocks automated checks | 2026-11-14 |

The FDA page is the technical source for oximeter use and accuracy limits. It does not document an ISS procedure.

Both guide presentations now retain the equipment citation: where a pack or a
2015 inventory claim is shown, **Equipment & sources** links the NASA checklist
separately from the technique source. Optional `sourceScope` copy states that the
CDC technique is for a fingerstick meter and that this project's 60-second
reaction demonstration is not the paper's standard 10-minute PVT. The original
steps and source verification dates are preserved.

## ISS kit mapping

The kit names and slots are literal entries from [NASA's 2015 ISS medical kit checklist](https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf) (MED CL 3.001), page 9, table 5: `Blood Oximeter` is in the Medical Diagnostic Pack, blue, slot `B1`. The checklist is historical context, not a current inventory.

The `pulse` guide uses a manual wrist method, so it has no dedicated kit item; its note says the 2015 checklist does not document one. The `spo2` guide keeps the literal `Blood Oximeter` entry, but linking that item to SpO₂ is an editorial inference, not a NASA-documented procedure or precision claim.

## Self-report guides

`sleep`, `mood`, and `exercise` have `source: null` and `validation: 'self-report'`. They are personal logs or ratings, not validated clinical assessments. NASA HRP risks 99 (cognitive/behavioral) and 100 (sleep/circadian/workload), recorded in `src/data/nasa/sources.json`, are background context only; they do not validate a self-report technique.

## Verification limits

The six technique URLs above returned HTTP 200 on 2026-11-15, and their `checkedAt` dates were updated. The CDC glucose URL (https://www.cdc.gov/diabetes/diabetes-testing/monitoring-blood-sugar.html) returned HTTP 403 to automated checks; its 2026-11-14 date, URL, steps and validation are preserved rather than re-stamped.
