# Lab evidence captures

These four unaltered PNGs are captured from VITRUVIO's real local interface using
`node scripts/capture-nasa-evidence.mjs http://127.0.0.1:4190` against a running
Vite development server. The script uses a new isolated browser context, never
the user's local records. No browser installation or remote data write occurs.

- `hrp.png`: mapped HRP risk records for the musculoskeletal system and mission context.
- `osd575.png`: glucose trends from the built-in mission simulation, alongside
  the observed Inspiration4 cohort band. The mission curve is simulated, not
  NASA observations. The NASA band and the personal baseline are distinct.
- `iss-kit.png`: systolic-pressure guide with Equipment & sources expanded,
  including the Medical Diagnostic Pack and B4/B2 slots from the 2015 checklist.
- `radiation.png`: empty dose log, career comparison and NASA/CSA source links.
  The existing radiation calculation and event-alert behaviour are unchanged.

The landing captions explain what each source supplies and link into the relevant
lab view. Those links never seed simulation data or change recorded measurements.
Anatomy and guide-illustration attribution remains in `/models/ATTRIBUTION.md`.
