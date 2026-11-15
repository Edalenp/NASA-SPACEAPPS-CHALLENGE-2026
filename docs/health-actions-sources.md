# Health action sources

Draft content for medical review only. `src/data/health-actions.ts` records review prompts; it is not a NASA procedure or NASA approval, not clinical validation, not automatic or operational use, and not an ISS medical-device recommendation or current inventory. RF-18 remains open until UI/engine owners integrate and test in a later block.

## Sources (verified 2026-11-15)

| Group | Source | Section | Support summary | Checked |
|---|---|---|---|---|
| pulse | [MedlinePlus · Pulse](https://medlineplus.gov/ency/article/003399.htm) | What Abnormal Results Mean | Supports professional advice when a resting pulse stays above a person's usual range. | 2026-11-15 |
| blood-pressure | [MedlinePlus · Blood pressure measurement](https://medlineplus.gov/ency/article/007490.htm) | Considerations | Supports comparing home blood-pressure readings with readings taken at a provider's office before drawing conclusions. | 2026-11-15 |
| respiration | [Cleveland Clinic · Vital signs](https://my.clevelandclinic.org/health/diagnostics/10881-vital-signs) | A note from Cleveland Clinic | General vital-sign guidance that supports seeking professional advice when a vital-sign concern arises. | 2026-11-15 |
| spo2 | [FDA · Pulse Oximeter Basics](https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics) | Using a pulse oximeter | Supports professional follow-up when a person is worried about an oximeter reading or feels unwell or worse. | 2026-11-15 |
| temperature | [MedlinePlus · Temperature measurement](https://medlineplus.gov/ency/article/003400.htm) | What Abnormal Results Mean | Supports taking unusually high or low body temperature seriously and seeking provider advice. | 2026-11-15 |
| glucose | [MedlinePlus · Blood glucose test](https://medlineplus.gov/lab-tests/blood-glucose-test/) | What do the results mean? | Supports discussing blood glucose results with a provider rather than interpreting them alone. | 2026-11-15 |
| sleep | [NHLBI · Insomnia diagnosis](https://www.nhlbi.nih.gov/health/insomnia/diagnosis) | intro | Supports professional advice when insufficient sleep starts affecting daytime activities. | 2026-11-15 |
| mood | [NIMH · Caring for your mental health](https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health) | How can I find help? | Supports contacting a primary care professional when mental-health concerns arise. | 2026-11-15 |

## Editorial and legal notes

- We link to the public source pages and publish our own brief support summaries. This file does not reproduce third-party page text or claim that any source endorses this project.
- App text maps "provider" or "doctor" to "onboard medical officer" as declared editorial wording only; this is not NASA guidance or a NASA-assigned role.
- The respiration source is general vital-sign advice, not respiratory-specific. The pulse summary refers to a persistently high resting pulse; the generic review prompt is project editorial wording, not a triage rule.
- Glucose high and low are not equivalent; no normal range or threshold is implied. Sleep and mood are self-report context, not validated clinical measurements or NEWS2 scores.
- Attention and alert are app review labels, not official source grades. Both states request review; neither declares an emergency or selects treatment. No timers, urgency grades, medication names, doses, physical interventions, triage or diagnosis are added.
- Three MedlinePlus Medical Encyclopedia articles are third-party A.D.A.M. content and are not public domain; do not infer a reusable licence or claim permission we have not obtained. The glucose page is a MedlinePlus Medical Test page. Review of links and summaries by the group is appropriate; this is a review draft, not an operational publication.
- Citations were checked on 2026-11-15. QA should verify the citations, not reproduce bulk article pages.
