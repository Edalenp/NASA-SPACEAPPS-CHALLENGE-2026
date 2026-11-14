# Emergency guidance

This extends the existing VITRUVIO emergency screen for two cases: **A crewmate collapsed** and **Chest pain**. It is a training prototype with clinical review pending.

## Workflow and records

`Emergency.tsx` presents one instruction and at most two answers per care step. `../../data/protocols.ts` defines the branches, source summaries and timer labels. `workflow.ts` uses the existing backend `EmergencyProtocol`, `createProtocol` and `advanceProtocol` APIs. Each answer appends only the next visited step before completing the current one. Unvisited branches are never completed; repeated steps receive separate visits.

The record stores step entry times, response times, user answers, case status and the starting environment. These timestamps represent user confirmations, not independently verified care. Finishing the handover record does not establish that care is complete. Downloading creates a text record; it sends no message.

The response and breathing check has a 10-second countdown. Answers remain available immediately. Expiry displays a prompt without choosing an answer or changing the step. CPR and monitoring show elapsed time. Timers use recorded wall-clock timestamps, so they continue across backgrounding and reload.

Leaving keeps an unfinished case. Reopen the existing **Emergency** button to resume its pending step and timer, including after reload. The app does not automatically reopen Emergency. Starting another case first requires the explicit **End record** action, which records an abort and leaves the pending step unconfirmed.

## Local storage and integration

`journal.ts` owns the localStorage key `vt-emergency-journal-v1`. It validates stored records before use and preserves unreadable stored bytes. There are no Dexie schema changes or changes to the shared mission store, app shell or shared types.

If storage is unavailable, unreadable or full, new records remain in memory for the current session. The screen explains this and offers a download before leaving. Reload loses session-only records.

`readEmergencyRecords()` exposes the journal's current records for X's reporting integration. It reads a snapshot; it does not subscribe a consumer, copy records into shared state or rewrite that integration.

## Sources and visual scope

Every step includes a local source summary available offline once the app is cached. **Open original source** links require a network connection. References were checked on 2026-11-14.

American Red Cross guidance provides first-aid context. The NASA 1992 microgravity CPR research provides restraint and technique context. The onboard adaptations are not validated flight medical procedures. Clinical validity remains outside this implementation's review verdict.

The screen follows the incumbent [design system](../../../DESIGN.md): fixed emergency palette, Plex type, large answers, visible Exit, plain instructions and no decorative animation. `emergency.css` scopes the extension and reuses existing tokens. The root design file and tokens remain unchanged. Existing product context informs the work; its acknowledged stale name/team metadata was not refreshed.

## Verification and manual entry

From `vitruvio-app`, run:

```sh
pnpm dev --host 127.0.0.1
pnpm test:run
pnpm build
pnpm lint
```

Open `http://localhost:5173` and use the existing **Emergency** button. Check both cases, changed-condition loops, countdown expiry, resume after reload, explicit early ending, record download and storage failure fallback. For offline checks, first load the production app online so its service worker can cache it, then reload offline.

Recorded verification after synchronizing with public main `7ffe0c5`: build and lint passed; 138 unit tests passed, including 18 emergency tests. Nineteen browser checks and eight production offline checks passed without errors. Fourteen captures are in `.impeccable/review/emergency` at the project root.

The fresh review disposition was **SHIP**, scoped to prototype UI and workflow, with no material findings. Clinical validity and full visual keyboard-focus coverage were outside that verdict. `workflow.test.ts` covers graph reachability, visited-path execution, repeat visits, stale answers, aborts, timers, export and journal persistence/failure behavior.

## Main synchronization

The branch includes PR #9 (180-day simulator), PR #10 (updated NEWS2 bands and separate supplemental oxygen score), and PR #11 (curated NASA HRP references). The emergency backend contract is unchanged, so its adapter and existing local records remain compatible. Emergency does not calculate NEWS2 and does not need a scoring adapter change.

The new HRP dataset supplies educational risk context; its countermeasures are intentionally empty. It does not replace the step-specific first-aid sources above. No dashboard, shared-store or schema changes were made by this emergency synchronization.
