# Protocol source crosswalk

Citation metadata for the two emergency graphs. This is an audit of existing wording, not a new clinical algorithm, UI change or validated medical procedure. The three source URLs were checked on 2026-11-15.

## Sources

- ARC-U: [American Red Cross · Unresponsive person](https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person). Headings used: "How do I check a person who appears unresponsive?", "Emergency Steps", "General Care". No HTML ids; headings are section references only.
- ARC-H: [American Red Cross · Heart attack first aid](https://www.redcross.org/take-a-class/resources/learn-first-aid/heart-attack). Headings used: "Emergency Steps", "General Care: Heart Attack", "Heart Attack FAQs".
- NASA: [NTRS 19950010359](https://ntrs.nasa.gov/citations/19950010359), 1992 CPR-in-microgravity research. Used as abstract/results historical context only, not a current procedure, NASA approval or standard.

## Step crosswalk

| Step | Protocol | Source | Section | Scope |
|---|---|---|---|---|
| call | collapse | ARC-U | Emergency Steps | Onboard editorial adaptation: CMO, AED request, no Earth wait |
| respond | both | ARC-U | How do I check a person who appears unresponsive? | Direct clinical source: no more than 10 seconds; countdown widget, timer display and "do not wait" are UI/UX wording |
| breathing | both | ARC-U | How do I check a person who appears unresponsive? | Direct clinical source; "do not repeat the timed check" is UI/UX wording, not a medical rule |
| airway | both | ARC-U | General Care | Direct clinical source; medical officer and training are onboard adaptation |
| cpr | both | ARC-U + NASA | How do I check a person who appears unresponsive?; Abstract/results | Direct CPR/AED source plus historical context; restraint, AED prompts and Earth reply are adaptation |
| monitor | both | ARC-U | General Care | Direct clinical source; reporting and elapsed timer are local process, not a wait period |
| handover | both | ARC-U | General Care | Local process only: the ARC link is retained context and does not clinically source a spacecraft handover |
| stop | chest | ARC-H | General Care: Heart Attack; Heart Attack FAQs | Direct clinical source: rest and get help promptly |
| call | chest | ARC-H | Emergency Steps | Onboard editorial adaptation: CMO and no Earth wait |
| symptoms | chest | ARC-H | Emergency Steps; General Care: Heart Attack | Direct clinical source; "when the pain began" is local documentation wording |

## Journal compatibility

`journal.ts` validates historical sessions against the current `action.text`, `sourceTitle` and `sourceUrl`. All primary source identities, action objects, step keys, answers, timers and graph paths are intentionally unchanged. Only `ProtocolSource.note` and `checkedAt` metadata changed, so old records remain valid. No source arrays were reordered or emptied.

## Limits

- The "Direct clinical source" label means the wording is anchored to the named section; it is not a claim that the full protocol is clinically validated.
- "Onboard editorial adaptation" and "Local process only" label project wording that is not an ARC or NASA instruction.
- The handover step is an app record/team-handover process, not an ARC clinical handover and not proof that care is complete.
- The 1992 NASA item is historical research context only. It is not clearance, a current countermeasure, a NASA standard, or evidence that this app's CPR flow is approved.
- Notes may add "clinical review pending" where existing UI/UX wording is not directly sourced. This is honest labeling, not new medical instruction.
- QA should verify these citations and section references, not reproduce bulk article text.
