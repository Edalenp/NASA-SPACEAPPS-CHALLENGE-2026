# Visual measurement guides

Routine wrist pulse, oral temperature and fingertip oximeter guides combine local instructions with original SVG diagrams. These are training aids; onboard kit-specific and clinical review remain pending. They do not select an emergency response or establish that a measurement is accurate.

## Entry and integration handoff

The current entry is the collapsed **Measurement visuals** help within Emergency care. Opening it lazily loads `VisualGuidesPanel`; closing it unmounts the guide. Emergency does not supply a recording callback.

`VisualGuidesPanel({ initialGuide?, onRecord? })` exports a selector for `pulse`, `temperature` and `spo2`, defaulting to `pulse`. `initialGuide` initializes local selection. `VisualMeasurementGuide({ guide, onRecord? })` exports an individual guide. The optional callback receives the selected `VisualGuideId` when the user presses **Record this measurement**; the host must implement measurement entry and persistence. Neither component writes readings or shared state.

These exports are available for X's future integration. The existing private `GuidesPanel` in `Panels.tsx` continues to present text guidance. This feature does not replace its UI or change app-shell navigation.

## Artwork and playback

`MeasurementIllustration.tsx` contains AI-assisted original SVG code with shaded sage and ivory surfaces, accessible titles and step descriptions. Its dimensional appearance comes from vector layers, gradients and shadows; it is not a 3D render. No external artwork or raster assets are used. `visual-guides.css` scopes presentation to this feature.

GSAP 3.15.1 powers a manually started, finite three-second placement demonstration. Controls support pause, resume and replay. Changing the selected step resets playback; steps never advance automatically. Reduced-motion users receive the static illustration. Leaving the viewport or hiding the document pauses active playback; returning does not resume it automatically. Unmounting reverts the timeline and removes observers and listeners.

The illustrations generate no readings, heartbeat simulation or measurement countdown. Device displays remain blank. The pulse guide's **60 s** symbol explains the actual counting period; its three-second animation is not that timer.

## Content and sources

`../../data/guides.ts` owns `visualGuides`, source metadata and step descriptions. The routine pulse, temperature and oximeter text guidance also uses these preparation and step summaries. Other text guides retain their draft status.

References were checked on 2026-11-14: [MedlinePlus pulse](https://medlineplus.gov/ency/article/003399.htm), [MedlinePlus temperature measurement](https://medlineplus.gov/ency/article/003400.htm) and [FDA Pulse Oximeter Basics](https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics). Paraphrased summaries are bundled locally and can be available offline after the app is cached; original-source links require network access. The generic device diagrams do not replace manufacturer or onboard kit instructions. Oximeter limitations are stated alongside its steps.

## Verification

Verified on 2026-11-14 with build, ESLint and the existing 159 unit tests passing. Chromium checks cover all nine illustrated steps, accessible descriptions, finite playback, pause/resume/replay, reduced-motion restoration of the static SVG pose, offscreen pause, mobile overflow, source access, unmounting and independent care progression (24 checks). Eight production checks cover service-worker caching, first opening of the lazy-loaded guides offline, all three guides and their playback/source summaries, reduced motion and continued care. Emergency offline regression (8 checks) and escalation regression (13 checks) also pass.

Independent visual review inspected desktop and sequential mobile captures at 1440 × 1100 and 390 × 844 and accepted this component scope. The images read as shaded vector diagrams, not sculpted 3D jelly; review does not establish user acceptance or clinical validation. Manual keyboard and document-background behavior should be included when X integrates these exports into another host. Local QA captures and reports are kept under the ignored `.impeccable/review/visual-guides/` directory.
