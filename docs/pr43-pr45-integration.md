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

Verification results and artifacts are recorded after the final combined run.
Technical QA is not clinical validation, operational clearance or proof of
hardware frame rate. Official source attribution and prototype assumptions are
listed separately in the traceability document.
