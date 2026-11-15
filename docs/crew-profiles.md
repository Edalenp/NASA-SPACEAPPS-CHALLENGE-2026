# Local crew profiles

Open `/lab`, click the active astronaut's name, then **Configure crew**.
The first version supports 1–12 profiles: name, optional gender, role and a
separate anatomical model choice (male or female). Existing profiles cannot be
deleted from this form. Gender does not change clinical limits.

Select a profile card to open its lab. Measurements, consciousness observations,
oxygen support, exercise, assessment, baselines, trends, daily progress, simulator
records, radiation histories and mission briefs use the active crew identity. Emergency cases are
owned by their patient; switching is blocked while the emergency screen or a
write is active. The mission date, environment and display preferences are shared.

Profiles and measurements live in IndexedDB on this browser. The remembered
active profile is a local preference. This is not authentication or cross-device
synchronization. Reloading offline uses the stored profiles and readings; the
production PWA precaches both GLBs. Both anatomical models use the same controls.

The crew manifest uses selectable anatomy diagrams with an active-lab indicator;
the roster scrolls horizontally on small screens. The header keeps the identity
and mission day in two rows. Female anatomy retains the source asset's original
pose: the additional male arm transform uses fixed spatial thresholds that do
not fit its proportions. Split normals are welded and rebuilt for female tissues
to reduce faceted shading without reshaping the anatomy. The source model itself
is a fitted educational model, not a patient-specific anatomical reconstruction.
Female solid tissues write depth so rear folds do not accumulate through their
front surface; surrounding ghost tissues keep depth writes off during inspection.
The original female asset also has coarse, warped muscle sheets protruding at the
hips, thighs and chest. `female-muscles-fit.glb` supplies 14 fitted replacement
muscles, built against the female skin by `scripts/fit-female-muscles.mjs`.
Refinement and bounded fairing precede the exterior-point constraint; lower limbs
cannot snap to the neighbouring hand or opposite leg. The overlay is built offline
(about 1.5 MB), avoiding a geometry fitting computation on every profile switch.
The original GLB is unchanged. Bones, organs and vessels retain their source positions.

## Compatibility

The original Jordan Lee profile keeps the identifier `JL–02`, so existing readings
are preserved. Untagged legacy console rows and unassigned historical emergency
cases belong to that original profile only. New categorical console rows carry
`crewMemberId`; IndexedDB's existing entries table accepts this additive property
without removing stores or rewriting old records. Stable identifiers are separate
from editable names. Canonical engine contracts are unchanged.

Radiation uses `vt-dose-log-v1:<stable crew id>`. The original untagged
`vt-dose-log-v1` is read only for Jordan Lee until their first scoped write and is
retained untouched. A new astronaut starts with an empty dose log. Glucose sample
type, timing, documented fasting duration and reported symptoms also stay with
the corresponding astronaut through reload, emergency snapshots and reports.

## Verification

`src/store/crew.test.ts` covers metric and categorical isolation, legacy ownership,
assessment/report identity, separate simulations and switching guards.
`e2e/crew-profiles.spec.ts` creates a female astronaut, records different pulse
values in two labs, changes models, reloads, and checks both values are restored
under their respective profiles. The female model's provenance is in
`public/models/ATTRIBUTION.md`.
`src/features/twin/modelGeometry.test.ts` loads the real GLBs and checks that female
bones and vessels retain their positions, smoothing does not mutate the cached
model, and the male relaxed pose remains in use.
