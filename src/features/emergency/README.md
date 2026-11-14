# Emergency guidance

This extends the existing VITRUVIO emergency screen for two cases: **A crewmate collapsed** and **Chest pain**. It is a training prototype with clinical review pending.

## Workflow and records

`Emergency.tsx` presents one instruction and at most two answers per care step. `../../data/protocols.ts` defines the branches, source summaries and timer labels. `workflow.ts` uses the existing backend `EmergencyProtocol`, `createProtocol` and `advanceProtocol` APIs. Each answer appends only the next visited step before completing the current one. Unvisited branches are never completed; repeated steps receive separate visits.

The record stores step entry times, response times, user answers, case status and the starting environment. These timestamps represent user confirmations, not independently verified care. Finishing the handover record does not establish that care is complete. Downloading creates a text record; it sends no message.

The response and breathing check has a 10-second countdown. Answers remain available immediately. Expiry displays a prompt without choosing an answer or changing the step. CPR and monitoring show elapsed time. Timers use recorded wall-clock timestamps, so they continue across backgrounding and reload.

Leaving keeps an unfinished case. Reopen the existing **Emergency** button to resume its pending step and timer, including after reload. The app does not automatically reopen Emergency. Starting another case first requires the explicit **End record** action, which records an abort and leaves the pending step unconfirmed.

## Linked readings and escalation

New cases start with backend `crewMemberId: 'unassigned'` and use no console readings. The user must explicitly link **Jordan Lee's readings** only if Jordan is the patient. Linking updates the Y-owned local record; it does not change the shared mission store.

`assessment.ts` is a pure adapter to the latest backend `calculateNews2`, `evaluateZones` and `planEscalation` functions. Reading names, units and numeric validation come from the backend range definitions. React does not reproduce scoring rules, thresholds or contact deadlines.

The snapshot distinguishes manually recorded readings with measurement timestamps, untimed simulated readings, missing values and invalid values. Unknown oxygen status remains unavailable rather than silently assuming cabin air. Changed console readings require **Update from latest readings**. Each update appends an assessment, preserving previous evidence, plans and notification receipts. Linking or updating does not advance the care step or reset its timer. Reload restores saved deadlines without recalculating them.

The backend returns no scheduled contacts for low, single-red and incomplete results. The UI preserves that result as **no scheduled contacts returned**; it does not interpret it as no care needed. Scheduled future follow-ups remain separate from the immediate instruction to request onboard Crew Medical Officer help and continue care.

`EscalationPanel` exports presentation that consumes `assessment`, `plan`, `receipts`, `now` and optional `onConfirm`. It displays the supplied deadlines and records user confirmations. Contact receipts are manual records, not network delivery confirmations. The handover download includes all assessment snapshots, engine plans and notification receipts.

## Local storage and integration

`journal.ts` owns the localStorage key `vt-emergency-journal-v1`. It validates stored records before use and preserves unreadable stored bytes. There are no Dexie schema changes or changes to the shared mission store, app shell or shared types.

Optional `assessments` and `notifications` fields keep older emergency records compatible. The journal and protocol versions remain unchanged.

If storage is unavailable, unreadable or full, new records remain in memory for the current session. The screen explains this and offers a download before leaving. Reload loses session-only records.

`readEmergencyRecords()` exposes the journal's current records for X's reporting integration. It reads a snapshot; it does not subscribe a consumer, copy records into shared state or rewrite that integration.

## Sources and visual scope

Every step includes a local source summary available offline once the app is cached. **Open original source** links require a network connection. References were checked on 2026-11-14.

American Red Cross guidance provides first-aid context. The NASA 1992 microgravity CPR research provides restraint and technique context. The escalation panel links [RCP guidance on NEWS2 limits and clinical judgement](https://www.rcp.ac.uk/media/umzn4ntq/news2_additional-guidance-002-_0.pdf). These original references require network access. The onboard adaptations are not validated flight medical procedures. Clinical review remains pending.

The screen extends the incumbent [design system](../../../DESIGN.md): dark olive ground, Plex type, large answers, visible Exit, plain instructions and no decorative animation. Local pink and amber state accents echo the supplied UI references. `emergency.css` scopes these additions; shared tokens and the root design file remain unchanged. Existing product context informs the work; its acknowledged stale name/team metadata was not refreshed.

## Verification and manual entry

From `vitruvio-app`, run:

```sh
pnpm dev --host 127.0.0.1
pnpm test:run
pnpm build
pnpm lint
```

Open `http://localhost:5173` and use the existing **Emergency** button. Check both cases, changed-condition loops, countdown expiry, resume after reload, explicit early ending, record download and storage failure fallback. For offline checks, first load the production app online so its service worker can cache it, then reload offline.

For escalation, verify that a new case has no linked readings. Explicitly link Jordan's readings, inspect evidence and engine follow-ups, record a notification, then change a console reading and refresh the snapshot. Confirm that reload preserves plans and the current care step, and that download retains assessment history. Check missing, invalid and simulated evidence and results with no scheduled contacts.

Recorded verification: build and lint passed; 159 unit tests passed, including 21 new context/escalation tests. Nineteen base browser checks plus 13 escalation checks passed without errors. Eight base production offline checks plus eight escalation offline checks also passed without errors. Captures are at the project root: 14 in `.impeccable/review/emergency` and 10 fresh captures in `.impeccable/review/escalation`.

Independent full review after fresh captures returned **SHIP**, with no material findings in the prototype UI and integration scope. Clinical validity was excluded from that verdict. Tests cover visited-path execution, timers, aborts, persistence failure, explicit patient association, evidence provenance, backend assessment, preserved plan history, notification receipts and export.

## Main synchronization

The branch includes PR #9 (180-day simulator), PR #10 (updated NEWS2 bands and separate supplemental oxygen score), and PR #11 (curated NASA HRP references). The emergency execution adapter remains compatible; the new assessment adapter delegates scoring and escalation to these backend APIs.

The new HRP dataset supplies educational risk context; its countermeasures are intentionally empty. It does not replace the step-specific first-aid sources above. No dashboard, shared-store or schema changes were made by this emergency synchronization.
