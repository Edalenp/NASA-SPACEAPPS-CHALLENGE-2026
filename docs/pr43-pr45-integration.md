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

## Main PR46 and source audit

Main merge `154eccc` (PR46) was integrated in local merge `570d6d1` after the
clinical integration below. Its label correction, NASA subtitle, external source
links, focus treatment and spacing are retained. The source inventory was then
expanded across the README, landing and laboratory, with contextual citations in
the radiation, equipment, preview and monitoring cards. See the
[source audit](source-credit-audit.md) and [per-URL access log](source-link-validation.json).

The follow-up passes 640 unit tests across 72 files, 43 NASA tests, strict types,
lint, source-inventory consistency, NASA data checks and a production build.
All seven production/PWA tests passed; after the final source-browser mobile
layout and historical-kit wording correction, both source-focused production
tests were repeated and passed. They walk all 20 source groups on the landing
and offline lab, verify local notices without HTTP cache, and inspect radiation
sources and all 16 equipment guides. Captures were visually reviewed for the
landing, desktop/mobile source browser, mission radiation and equipment cards.
Logs: `.impeccable/pwa-sources.log`, `.impeccable/pwa-sources-final.log` and
`.impeccable/build-sources-final.log`.

The eleven development Chromium flows below describe the earlier clinical
integration run; they were not rerun for this citation/layout-only follow-up.
Clinical numeric rules, official NEWS2 scoring, emergency graph actions, NASA
datasets and the simulator are preserved.

## Earlier clinical verification

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
