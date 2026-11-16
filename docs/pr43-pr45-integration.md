# PR43 / PR45 local integration

Base: local app at `43c0cfe`, already containing PR43 and the crew/visual changes.
PR45 original implementation: `cab583c`; updated PR45: `888187d`.
The integration branch is `integrate/pr43-pr45-local`.

The current behavior follows the requested source-based refinements documented in
[clinical model traceability](clinical-model-traceability.md): contextual ADA 2026
glucose monitoring, explicit fatigue model assumptions, unchanged official NEWS2,
and separate radiation histories with the correct SPE-reference meaning.

The three original Git conflicts were additive: keep both sets of package scripts,
the per-astronaut onboarding key, and both crew-scoped emergency records and
auxiliary glucose evidence. The latest PR45 revision also adds a second-crew
emergency reload regression. Existing profile/anatomy, landing, evidence and
installation work is retained. The separate documentation worktree is untouched.

## Reproduction

Use the installed dependencies and Chromium from the project. Run:

```powershell
npm run check:integration
```

If port 4173 is already serving the local app, preserve that server and select a
free test port; the tests still start their own server:

```powershell
$env:E2E_PORT = '4175'
npm run check:integration
```

This runs strict types for app/development/production browser tests, lint, unit
tests, 43 mocked NASA Node tests, offline data validation, a production build,
development browser flows and production/PWA flows. Ports are strict and an
unrelated server is never reused. Production preview uses port 4180.

The downloader deadline stays referenced until its pending transfer settles;
otherwise a stalled mock stream could let Node 22 exit before reporting timeout.
Existing timeout/integrity tests exercise the correction.

## Verification

All verification stages passed on the integrated application. The production
suite was rerun after making its motion test wait for the loading plate to leave;
the plate deliberately blocks scrolling while assets load. The test now also
asserts real document movement before checking the parallax transform.

- 630 unit tests across 71 files; 43 NASA Node tests, with zero cancellations.
- 11 Chromium browser flows, including ADA sample/fasting/symptom distinctions,
  CGM monitoring, baseline 0/6/7 states, real numeric frames, fatigue factors,
  two crew-profile flows and cross-profile radiation/emergency isolation.
- 5 production/PWA flows passed. The offline flow clears HTTP cache, disconnects the
  browser, saves and reloads both pulse and contextual glucose, checks cached
  evidence/anatomy, and verifies that evidence links do not seed simulated data.
- Strict integration types, lint, production build and offline-data integrity.
  Strict types/lint were also repeated after the final browser-test additions.
- Official NEWS2 scoring/table, protocol identities, reaction runner/session,
  simulator, NASA datasets and raw-source manifest remain unchanged from `43c0cfe`.

Local evidence is under `.impeccable/integration-final.log`,
`.impeccable/pwa-final.log` and `test-results/`. The production report records
`5 passed` and `test-results/pwa/.last-run.json` has no failed tests.
Visually reviewed captures cover clinical score/report controls, contextual
glucose and fatigue on mobile, and astronaut-specific radiation. Automated
browser checks also cover crew models, NASA evidence and installation layouts.
The landing radiation capture was refreshed from an
isolated empty profile. Browser tests use separate contexts and do not touch
the user's browser records. The pre-existing development server is preserved.

Technical QA is not clinical validation, operational clearance or proof of
hardware frame rate. Official source attribution and prototype assumptions are
listed separately in the traceability document.
