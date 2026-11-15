# Report acceptance (RF25)

`buildReport` in `src/features/measurements/report.ts` is unchanged. This document records the existing behavior accepted by the new content-only tests.

## Caller and evidence

- Caller: `src/features/dashboard/Chrome.tsx:272-299` builds the report and downloads a local `text/plain` Blob with `URL.createObjectURL` and `a.click`.
- There is no network transmission in the report path. No `callChrome` function exists in the repository; that earlier label was approximate.
- Sources shown for actions are the caller-supplied `ReportAction.source` values. The report does not filter crew, date or case; `emergencyActionsForReport` owns that filtering before calling the report.
- Generated `now`, per-reading `measured` timestamps and plan `dueAt` values are canonical caller/assess inputs. No new logging or developer telemetry is added.

## Acceptance fields and tests

| RF25 field / boundary | Test |
|---|---|
| All 13 current indicator IDs, names, values and units | `renders all 13 current indicator IDs with canonical values and units` |
| Complete NEWS2 `0 / 20 · Low`; falsy zero is not blank | `renders a complete NEWS2 zero as 0 / 20, not blank` |
| Missing oxygen is not imputed; `6/7`, partial `0`, not complete | `does not impute cabin air when oxygen is missing` |
| Empty day is `0/7`, not low risk; missing values get no unit | `renders an empty day as incomplete, with no units assigned to missing values` |
| Legitimate `sleep 0 h` and `exercise 0 min`; invalid `mood 0` discarded | `keeps legitimate zero values and discards an invalid mood zero` |
| Generated now vs measured timestamps, mission day and transit delay | `uses generated now, per-reading timestamps and mission context` |
| Plan recipients/deadlines match `assess.plan` and stay anchored | `prints the assess plan recipients and keeps deadlines anchored across display clocks` |
| Full/minimal action fields, caller order, no input mutation | `renders caller actions in order with full and minimal fields without mutating input` |
| Conservative no-actions fallback and `actionRecordNote` | `uses the conservative no-actions fallback and includes the caller note` |
| Default empty actions, deterministic string, unchanged assessment | `defaults actions to empty, returns deterministic text and leaves the assessment unchanged` |
| Abnormal pulse uses the assess classification, not report math | `uses the assess NEWS2 classification for a single abnormal pulse` |
| No fetch/broker hooks in the report source | `has no network or broker hooks in the report source` |

## Limitations

- The report is a prototype handover record, not clinical validation, medical advice or an end-to-end NASA-approved procedure.
- NEWS2 is the existing Earth-validated engine output; it is not validated for spaceflight and is not recalculated by `report.ts`.
- The report trusts prevalidated canonical inputs from the caller. It does not parse or repair malformed health data.
- Boundary cases are covered at the report string level; clinical interpretation, delivery and transmission remain out of scope.
