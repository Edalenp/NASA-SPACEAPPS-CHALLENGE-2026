# Clinical and aerospace model traceability

Reviewed on 2026-11-15 for the PR43/PR45 integration. This document supersedes
the original PR45 universal high-glucose flag and fixed rest recommendation.
Clinical references, application monitoring labels and engineering assumptions
are different layers. No automatic diagnosis, drug instruction or fitness clearance
is produced. `humanVerified` remains false: technical checks do not constitute
clinical validation.

The later [credit and link audit](source-credit-audit.md) consolidates the same
sources across the README, landing and laboratory. In measurement previews,
alerts and exports, multi-source thresholds now cite the authority of the rule
shown: BTS for its oxygen target, ATS for its low-saturation reference, Cleveland
Clinic for the fever reference and AMBOSS for its above-40 °C red flag. These are
citation corrections; their existing numerical rules are unchanged. The source
access log distinguishes readable pages from automated-access restrictions.

## Sources consulted

The local SRS (RF06–11, RF18, RF32), `docs/health-actions-sources.md`,
`docs/guide-content-sources.md`, `docs/protocol-source-crosswalk.md`,
`docs/nasa/coverage.md`, and the versioned NASA data/manifest were consulted.
The private SRS is retained in its existing worktree and is not republished.

| Authority | Primary reference | Use and limits |
| --- | --- | --- |
| ADA 2026 | [Section 2, Tables 2.1 and 2.2](https://doi.org/10.2337/dc26-S002) | Laboratory glucose criteria and confirmation; CGM is not an independent diagnostic test. Publisher full-page/PDF requests returned 403 during verification; the publisher's indexed text and its official patient diagnostic page were readable. |
| ADA 2026 | [Section 6](https://doi.org/10.2337/dc26-S006) | Low-glucose monitoring categories and individualized monitoring context; no universal high-glucose triage grade. |
| RCP | [NEWS2 scoring chart](https://www.rcp.ac.uk/media/alxev00t/news2-chart-1_the-news-scoring-system_0_0.pdf), [triggers](https://www.rcp.ac.uk/media/2acdezkd/news2-chart-2_news-thresholds-and-triggers_0.pdf) | Existing chart and score thresholds remain byte-identical. Spaceflight use is an unvalidated extrapolation. |
| NASA | [NASA-STD-3001 Vol. 1 Rev. C](https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf), V1 4030/4031, printed pp. 40/42 | Individual career dose versus protection design for the reference SPE spectrum. No organ-dose or shielding calculation. |
| NASA | [V1 6001, Medical Operations §6.1](https://www.nasa.gov/reference/6-0-medical-operations/) | Circadian alignment, work/rest and task-load assessment. Its rationale is scheduling guidance, not a validated recovery formula. |
| NHLBI | [Adult sleep duration](https://www.nhlbi.nih.gov/health/sleep/how-much-sleep) | Earth adult 7–9-hour reference; does not validate the app's fatigue model. |

## Glucose

All numbers below are in mg/dL; no unit conversion occurs. The machine-readable
thresholds and citations live in `src/engine/clinical-limits.json`.

| Reference condition | Source value | Application behavior |
| --- | --- | --- |
| Low glucose | ADA section 6: below 54; 54 to below 70 | Monitoring alert / watch respectively. These app labels are not ADA triage grades. CGM remains monitoring data. |
| Documented fasting laboratory venous plasma | ADA section 2: at least 8 hours without calories; 100–125 screening range; at least 126 laboratory criterion | Watch for clinician interpretation; confirmation is required unless a clinician establishes unequivocal hyperglycemia. No diagnosis. |
| Standardized laboratory OGTT | 2 hours after a 75-g glucose load; at least 200 | Laboratory criterion for clinician review. An ordinary post-meal measurement does not qualify. |
| Random laboratory venous plasma | At least 200 with classic hyperglycemic symptoms, or clinician-established crisis | The app records classic symptoms, not a crisis diagnosis. Symptomatic qualifying samples prompt review; isolated values do not diagnose. |
| Fingerstick, CGM, unknown sample or insufficient timing | Not independent laboratory diagnostic evidence | No universal high-glucose alert at 200. Show the measurement, source, context and descriptive trend; do not imply normality from an absent flag. |

Classic symptoms are reported excess thirst, frequent urination or unexplained
weight loss. Missing symptom assessment stays unknown. Reported symptoms prompt
clinical review independently of assigning a cause. This routing and all onboard
contact deadlines are project adaptations, not ADA/NASA-prescribed protocols.

Context is additive: `fastingHours` and `symptoms` travel through recording,
IndexedDB, hydration, preview, dashboard, emergency captures and reports. Old
records are not rewritten or assigned an assumed fasting duration. The 0–72-hour
entry bound is a software sanity limit, not a clinical recommendation.

Trend calculation is `last comparable value - first comparable value`, with an
observed direction and count. It is descriptive arithmetic, not an ADA diagnostic
test or prediction. Draw timing/sample and fasting qualification must match;
symptoms remain separate finding metadata. Manual/legacy history is not mixed
with simulator history. Future points are excluded. Personal baselines retain
the SRS seven-prior-reading rule and existing mean ±2 SD calculation: these are
project change detectors, not validated clinical normality or NASA calibration.

The glucose input ruler is neutral outside applicable monitoring flags; an absent
flag is not painted as a healthy range. Inapplicable fasting intervals are not
drawn over CGM/unknown samples. Low-glucose flag links point to ADA section 6;
laboratory criterion links point to section 2.

Historical emergency scores and plans are preserved. Newly displayed glucose
reference interpretation is explicitly distinguished from the saved plan.

## Fatigue

The engine reviews reported sleep over 24/48 hours, continuous time awake,
workload in the last 24 hours, biological time at the next task and circadian
alignment. Biological phase is never inferred from UTC, a destination's daylight
or an illustrative 3D environment. Unknown inputs remain visible as missing.

V1 6001's rationale describes an 8.5-hour sleep opportunity, 2-hour pre-sleep and
1.5-hour post-sleep scheduling periods, and a typical biological nadir around
01:00–07:00 relative to the habitual schedule. These are reference considerations,
not proof that a particular astronaut is recovered.

| Model parameter/formula | Default | Attribution |
| --- | --- | --- |
| Assumed sleep need `S` | 8 h/day, configurable | Engineering assumption within the general Earth adult reference; no NASA prescription of this model value. |
| Modeled shortfall | `max(0, S - sleep24)` and `max(0, 2*S - sleep48)` | Project arithmetic; not measured physiological sleep debt. |
| Continuous wake review marker | 16 h, configurable | Simulation assumption, not an institutional safe/unsafe boundary. |
| Daily workload review marker | 10 h, configurable | Simulation assumption, not a NASA work limit. |
| Biological-night indicator | `1 <= reported hour < 7` | Discrete representation of NASA's approximate rationale; no circadian oscillator or performance prediction. |
| Nap scenario / reassessment horizon | 90 / 240 min, configurable | Simulation settings only. They do not select a recovery recommendation or determine fatigue status. |

Flags remain individual factors with their provenance. There is no weighted
fatigue score, automatic countermeasure, medication recommendation, operational
clearance or recovery time. No configured flag does not mean well rested. Input
bounds and consistency checks are software validation, not health thresholds.
Planning inputs are exploratory and do not save measurements.

## Radiation, evidence and mission context

`career = prior career dose + sum(all recorded mission doses)`, including solar
events; `active event = sum(doses tagged with the active event identifier)`.
Closing an event preserves its entries and career contribution. NASA V1 4030's
600 mSv career reference is individual. V1 4031's 250 mSv value concerns the
design-reference SPE spectrum from October 1989; the comparison does not establish
a personal exposure limit or spacecraft shielding performance. The legacy
`solarEventExceeded` API name is retained but denotes this reference comparison.

Dose histories are keyed by stable astronaut ID. Untagged legacy doses are read
only for original `JL–02`; the old key remains intact. New writes affect only the
selected astronaut. Storage failures are displayed; unreadable history is not
overwritten by a new empty record.

OSD-575 bands remain observed cohort aggregates, separate from personal history
and simulated mission points. The ISS kit remains the historical 2015 checklist.
NASA HRP records remain the selected 11-risk subset. Fixed Earth-link delays and
procedural environments are mission scenarios, not live ephemerides, telemetry,
solar forecasts or astronomical measurements.
