<a id="readme-top"></a>
<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026">
    <img src="images/vitruvio-logo.png" alt="VITRUVIO logo: a heartbeat crossing an orbit" width="80" height="80">
  </a>

<h3 align="center">VITRUVIO</h3>

  <p align="center">
    Crew health monitoring prototype for NASA Space Apps Challenge 2026. An offline-capable PWA with unmodified NEWS2 scoring, contextual monitoring references and simulated mission contact plans, with citations and declared limits.
    <br />
    <a href="https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://vitruviox.vercel.app/">View Demo</a>
    ·
    <!-- TODO: replace with the presentation video URL once uploaded -->
    <a href="#" title="Presentation video — URL pending">Presentation Video</a>
    ·
    <a href="https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/issues/new?labels=bug">Report Bug</a>
    ·
    <a href="https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#nasa-data-used">NASA Data Used</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#key-features">Key Features</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#use-of-artificial-intelligence">Use of Artificial Intelligence</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#references">References</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

VITRUVIO is a crew health monitoring prototype for the NASA Space Apps Challenge 2026. A crew member records a daily check-in of vital signs; the engine scores it with the **unmodified NEWS2 chart** from the Royal College of Physicians, compares readings against a personal baseline and contextual clinical references, and simulates contact escalation across transit, station, rover and base environments, including an assumed communication round-trip delay. It does not send medical notifications.

Manual records stay on-device (IndexedDB), simulated data is labelled, and monitoring references and guide steps cite their sources. Project assumptions are identified separately. The NEWS2 transcription and clinical thresholds still have `humanVerified: false`; passing technical tests is not clinical validation. NEWS2 use in spaceflight is an unvalidated extrapolation. This is a mission simulation prototype, not medical advice or a flight-certified clinical system.

### NASA Data Used

In one sentence: **VITRUVIO is informed by documented NASA health-research resources** — the five hazards of human spaceflight from the NASA Human Research Program, a curated set of 11 HRP human-research risks that drive the emergency guides, the NASA-STD-3001 Vol 1 career-dose limit and SPE design reference (with complementary Canadian Space Agency information), the historical 2015 ISS diagnostic kit that informs the measurement groups, and NASA Open Science Data Repository study OSD-575, whose reproducible cohort bands provide reference context for glucose, calcium, sodium and potassium. NASA material supplies research context, cohort aggregates, documented requirements and credited Earth imagery; research values are never substituted for personal observations — and every item keeps its citation inside the app. Details: [Engine validity](#documentation) and [NASA reference data](#documentation).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- BUILT WITH -->
## Built With

* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Vite][Vite]][Vite-url]
* [![React Three Fiber][Three.js]][Three-url]
* [![Zustand][Zustand]][Zustand-url]
* [![Dexie][Dexie]][Dexie-url]
* [![Radix UI][Radix]][Radix-url]
* [![Vitest][Vitest]][Vitest-url]
* [![Playwright][Playwright]][Playwright-url]
* [![pnpm][Pnpm]][Pnpm-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- KEY FEATURES -->
## Key Features

- **Unmodified NEWS2 scoring:** bands and triggers come from a single cited source (`src/engine/news2-scoring.json`), transcribed from the RCP observation chart.
- **Absolute clinical safety net:** an independent cited layer (AHA blood pressure, ATS/BTS oxygen, ADA glucose, NHLBI sleep…) flags clinically abnormal values even without personal history.
- **Personal baselines with honesty:** baselines need at least 7 earlier readings and act as change detectors, never as clinical validators.
- **Escalation across environments:** review plans, including `singleRed`, use project contact timings adjusted by an assumed mission communication delay. They simulate escalation and do not send notifications or implement an official NASA response protocol.
- **Radiation context:** individual career dose compared with the NASA 600 mSv limit; event dose compared with the 250 mSv design-reference SPE requirement. Event doses also count toward career dose. Histories are separate per astronaut.
- **Offline first:** IndexedDB storage, PWA precaching, and legacy console data imported additively.
- **Four mission habitats:** React Three Fiber scene with dynamic inspection camera and labelled simulation data.
- **Emergency guides with sources:** illustrated steps, kit information and every action citing its source, reused from the guides system.
- **Mission brief export:** timestamps, units, provenance, baseline context, NEWS2 completeness and confirmed emergency steps on one report.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* Node.js 20.19+ or 22.12+ (Vite requirement; this integration was checked with Node 22.15)
* pnpm (`npm install -g pnpm`)
* For the browser E2E smoke: `pnpm exec playwright install chromium` (once, before the first `pnpm test:e2e`)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026.git
   cd NASA-SPACEAPPS-CHALLENGE-2026
   ```
2. Install dependencies:
   ```sh
   pnpm install --frozen-lockfile
   ```
3. Start the development server:
   ```sh
   pnpm dev
   ```
4. Other scripts:
   ```sh
   pnpm test:run   # unit + integration tests
   pnpm build      # production PWA build
   pnpm lint       # eslint
   pnpm preview    # serve the production build
   pnpm test:e2e   # record-to-assessment Playwright smoke
   ```

The production build precaches the model and local textures after the first online load.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->
## Usage

After starting the dev server (or opening the demo), the crew member can:

- Record the daily check-in with backend units, physical ranges and decimal validation.
- See the NEWS2 score and classification only once all seven observations — including oxygen support — exist today.
- Explore trends (30/90/180-day windows, source filters, exact timestamped history) and personal baselines.
- Load the labelled 180-day mission simulation without replacing manual measurements.
- Follow emergency guides and care steps with cited sources and journal snapshots.
- Download a mission brief that states provenance, limitations and current environment.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DOCUMENTATION -->
## Documentation

### Integration

<details>
<summary>Monitoring interface, store bridge and record -> assessment flow</summary>

Santiago's monitoring interface (a270bfc) is integrated with our four complete mission habitats, dynamic inspection camera, subject lighting and translucent x-ray jelly materials. The interface exposes Anatomy and Skeleton. See ENVIRONMENTS.md, VISUAL-REFERENCES.md and VGPU.md.

The monitoring console consumes main's `calculateNews2`, `calculateBaseline`, `evaluateZones`, `planEscalation` and the contextual fatigue-factor model through an adapter. NEWS2 is a single engine module fed by `news2-scoring.json`; the former console scorer was removed after being merged into it. IndexedDB remains at version 2; canonical measurements and consciousness observations are written to the existing engine tables. Oxygen-support observations and exercise logs remain in the compatibility table because the backend has no corresponding persisted measurement type.

#### Record -> assessment flow

- `useHealthStore` is the single derived assessment store. Hydration, the mission clock, a new reading, a simulation load and an environment change all refresh it; `useAssessment` reads it instead of recomputing in every component.
- `assess()` delegates NEWS2, baselines and zone states to `buildAlert`, so the dashboard and the engine share one bridge. Missing oxygen support is no longer inferred as cabin air: NEWS2 remains incomplete until the oxygen flag is recorded.
- The simulator mood profile uses the same 1–5 scale as the UI (mean 3.8, standard deviation 0.6).
- `e2e/record-to-assessment.spec.ts` records a high pulse, checks that the heart system becomes an alert and that the recommendation is reachable. It is a smoke test for the record -> assessment path, not a full E2E suite.

</details>

### Measurements, trends and routine (assignment X)

<details>
<summary>Records, mission clock, baselines, trends and mission brief</summary>

- Record values with backend units, physical ranges and decimal validation; mood uses 1–5 (current main contract). Blood-pressure pairs are checked before save. Storage failures remain visible and never produce a success message.
- Earlier console numeric records and consciousness observations are imported additively with stable IDs. Original records remain intact. Original console mood records use the same 1–5 scale and can be imported. Values above the current backend range remain visible in history and are excluded from assessment and baseline.
- The mission clock uses UTC days, starting at day 42 on the first visit; its epoch is saved as a device preference. Previous-day and future readings do not complete today's assessment. Baselines use at least seven earlier readings, excluding the reading being assessed. Manual and simulated baselines remain separate.
- Trends provide all indicators, 30/90/180-day windows, source filters and exact timestamped history. **Load mission simulation** explicitly loads the seeded 180-day generator without replacing manual measurements. Only readings up to the current clock enter charts and assessment. Simulated readings do not complete the person's daily check-in.
- NEWS2 remains incomplete until all seven observations, including oxygen support, exist today. Contact schedules are displayed directly from the backend. NEWS2's own rules are unchanged; the engine adds independent absolute clinical limits with cited sources (see Engine validity), and `singleRed` alerts now produce a scheduled medical-officer step. The current backend returns no scheduled contacts for `low`; that behavior remains a backend limitation, not a claim that contact is unnecessary.
- Routine reviews cumulative sleep, continuous wakefulness, workload and circadian context with explicit configurable simulation assumptions. It does not infer a recovery duration or fitness for duty. Its exploratory inputs do not save a measurement. Mission brief exports timestamps, units, provenance, baseline context, NEWS2 completeness and the current environment. Mission brief reads Y's emergency journal at download time and includes confirmed steps and notifications for the active crew member on the report's UTC date. Case IDs, status, answers and sources are retained; pending instructions, other patients and unassigned cases are excluded. Storage limitations are stated in the report.

The Guides dialog uses Y's reusable GuidesPanel and GuideCard, including illustrated steps, kit information, hazards, references and the record action. Emergency consumes the same current-day reading selection as the dashboard, preserving explicit source and timestamps instead of inferring provenance from matching values. Simulation timestamps are labelled as simulated, never as manual measurement times. Saved emergency snapshots and care-step timers are not recalculated by this integration.

</details>

### Engine validity (RNF-11)

<details>
<summary>Single-source NEWS2, absolute clinical limits, dose and reaction</summary>

- NEWS2 stays unmodified: bands and triggers come from a single source (`src/engine/news2-scoring.json`), transcribed from the RCP observation chart with citation and declared limits in `_meta`, and are regression-tested against the JSON (`humanVerified: false` until the human check against the chart is signed off).
- An independent layer of absolute clinical reference limits (`src/engine/clinical-limits.json` + `clinicalLimits.ts`) complements NEWS2 with cited adult, sex-independent thresholds: AHA blood-pressure categories (severe hypertension above 180/120 mmHg, stage 2 at 140/90), AHA resting heart rate 60–100 bpm, ATS/BTS oxygen saturation (below 90% is hypoxemia, target 94%), fever at 38 °C oral with an above-40 °C red flag, respiration 12–20 breaths/min, ADA 2026 contextual glucose criteria (sample, documented fasting interval and symptoms; CGM is monitoring only) and NHLBI sleep 7–9 h. The personal baseline is a change detector, never a clinical validator: a value breaching an absolute limit keeps its clinical status even inside a collapsed or chronically elevated personal band (systolic 200 alerts with the AHA citation whether there is history or not).
- Escalation includes a `singleRed` review step (medical officer at 10 minutes plus the assumed environment round-trip delay). The 10-minute deadline and spacecraft roles are project adaptations; RCP Chart 2 supplies the underlying terrestrial escalation context.
- Radiation dose keeps individual career and event accumulations separate. All event doses also enter the career total; 600 mSv is the NASA career reference and 250 mSv is the SPE design-reference comparison. The reaction-time test accepts decimal milliseconds from `performance.now()`.

</details>

### NASA reference data (assignment data/nasa)

<details>
<summary>ISS 2015 kit, OSD-575 bands, radiation citations and pinned downloads</summary>

- Historical ISS 2015 diagnostic kit: six documented items and eight measurement groups with explicit documented, editorial-inference and not-documented states.
- OSD-575 v3 reproducible cohort bands for glucose, calcium, sodium and potassium: aggregate-only, pre/post flight — not clinical normal ranges and not simulated observations.
- NASA radiation reference citations and a ten-family source catalog with licensing notes and owner handoffs (`src/data/nasa/`).
- Opt-in bounded downloads of four pinned source assets with external-only raw cache, SHA-256 verification, offline checking and OSD rederivation (`scripts/nasa/`).
- Scope guard: reference data only — no diagnoses, prescriptions or doses, and no runtime DONKI/NOAA client. The 11 curated HRP risks and all existing engine/UI consumers remain unchanged.

</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USE OF AI -->
## Use of Artificial Intelligence

This declaration describes the repository. Updating a local README does not update an external project submission.

- **AI tools used:** OpenAI Codex and Anthropic Claude, orchestrated through the OpenCode coding agent, were used to scaffold code, write and run tests, draft documentation, and speed up research tasks during the hackathon.
- **Review status:** AI assisted source research, transcription, implementation, documentation and tests. Team decisions and prototype assumptions are documented in [clinical model traceability](docs/clinical-model-traceability.md). NEWS2 and clinical-limit metadata still state `humanVerified: false`; human chart verification and clinical validation are pending. Automated checks verify implementation behavior, not medical approval.
- **Generated content:** guide line drawings, procedural environments and interface work used AI assistance. Derived anatomical drawings retain the upstream model credits. Generated visuals and simulated readings are illustrative, not measured mission data.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- PROJECT STRUCTURE -->
## Project Structure

```
NASA-SPACEAPPS-CHALLENGE-2026/
├── public/
│   ├── models/            # anatomy model
│   ├── textures/          # earth textures + attribution
│   └── icon-*.png         # PWA icons
├── src/
│   ├── engine/            # NEWS2, baselines, zones, escalation, dose,
│   │                      # clinical limits, sleep, reaction (pure TS, tested)
│   ├── data/
│   │   ├── nasa/          # HRP risks, reference catalog, kit, OSD bands
│   │   ├── indicators.ts  # console indicators and usual ranges
│   │   └── mission.ts     # crew, environments, scenarios
│   ├── store/             # Zustand + IndexedDB (Dexie) persistence
│   ├── features/          # dashboard, measurements, trends, emergency, guides, twin
│   └── ui/                # shared UI primitives
├── e2e/                   # record-to-assessment Playwright smoke
├── scripts/nasa/          # reference downloads, SHA-256 checks, OSD rederivation
├── docs/                  # project documentation
└── README.md
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

**Contributions are welcome!** Please open an issue with the tag `enhancement` or submit a Pull Request.

To keep reviews fast, changes follow an owner map — one owner per folder:

- `src/engine/` — Isabella
- `src/data/nasa/` — Fabián
- `src/store/`, `src/data/`, `src/data/simulator/` — Eduardo
- `src/features/` — José, Santiago and Daniel

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a Pull Request

Validation: `npm run check:integration` runs strict types, lint, source-inventory consistency, unit and NASA tests, data checks, production build and browser/PWA tests. See [integration evidence](docs/pr43-pr45-integration.md) for the recorded run and `E2E_PORT` configuration.

### Top contributors:

<a href="https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Edalenp/NASA-SPACEAPPS-CHALLENGE-2026" alt="contrib.rocks image" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- REFERENCES -->
## References

The inventory below is generated from the same citation records used by the landing's **Browse all sources and credits** and the laboratory's **Sources and credits**. Each entry states what the source supports and its limits. Per-reading citations and the NASA evidence section remain available at the point of use.

The inventory includes clinical references, measurement techniques, health-review prompts, historical research, anatomical and visual assets, fonts and direct software dependencies. DONKI, NOAA SWPC and NASA 3D Resources are explicitly **catalog only**: this build has no live space-weather clients or assets downloaded from that 3D catalog. Procedural mission scenes and fixed communication delays are simulation assumptions.

Update this section with `npm run credits:sync`; `npm run credits:check` detects drift. [Clinical model traceability](docs/clinical-model-traceability.md) explains thresholds, formulas and adaptations; [source audit](docs/source-credit-audit.md) records the review scope. This local inventory does not assert that an external challenge submission has been updated.

<!-- project-source-credits:start -->

<details>
<summary>Clinical thresholds · AHA, ATS/BTS, ADA, NHLBI and others · Used reference</summary>

The independent monitoring layer cites AHA, ATS/BTS, ADA 2026 sections 2 and 6, NHLBI, Cleveland Clinic, AMBOSS and StatPearls.

App watch/alert labels are project adaptations. Laboratory glucose criteria require context; CGM is monitoring only. Human verification remains pending, and no automatic diagnosis or spaceflight validation is claimed.

- [American Heart Association - Understanding Blood Pressure Readings (Blood Pressure Categories)](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings)
- [American Heart Association - All About Heart Rate (resting 60-100 bpm)](https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse)
- [American Thoracic Society - Pulse Oximetry patient sheet (cells need at least 89%; hypoxemia below 90%)](https://www.thoracic.org/patients/patient-resources/resources/pulse-oximetry.pdf)
- [British Thoracic Society guideline for oxygen use in adults (target saturation 94-98%; significant desaturation below 90%)](https://bmjopenrespres.bmj.com/content/4/1/e000170)
- [Cleveland Clinic - Fever (100.4 F / 38 C oral)](https://my.clevelandclinic.org/health/diseases/10880-fever)
- [AMBOSS - Fever knowledge entry (temperature above 40.0 C is a red-flag feature)](https://library.amboss.com/us/knowledge/fever)
- [StatPearls - Vital Sign Assessment (adult respiratory rate 12-20 breaths/min)](https://www.ncbi.nlm.nih.gov/books/NBK553213/)
- [American Diabetes Association - Diabetes Diagnosis and Tests (fasting plasma 126 mg/dL after at least 8 hours; random 200 mg/dL with symptoms; confirmation in a healthcare setting; not a universal self-diagnosis)](https://diabetes.org/about-diabetes/diagnosis)
- [American Diabetes Association - Hypoglycemia (below 70 mg/dL)](https://diabetes.org/living-with-diabetes/treatment-care/hypoglycemia)
- [Joint ADA/EASD clinical-trial report: Glucose Concentrations Less Than 3 mmol/L (54 mg/dL) Should Be Reported in Clinical Trials. DOI 10.2337/dc16-2215; PMID 27872155. Clinical-trial reporting standard, not a treatment protocol.](https://doi.org/10.2337/dc16-2215)
- [NHLBI, NIH - How Much Sleep Is Enough (adults 7-9 hours)](https://www.nhlbi.nih.gov/health/sleep/how-much-sleep)
- [ADA Standards of Care 2026 section 2: diagnostic context, Tables 2.1 and 2.2](https://doi.org/10.2337/dc26-S002)
- [ADA Standards of Care 2026 section 6: hypoglycemia and individualized monitoring](https://doi.org/10.2337/dc26-S006)

</details>

<details>
<summary>Displayed ranges · MedlinePlus, AASM/SRS, WHO and PVT research · Used reference</summary>

Population intervals, laboratory references, sleep consensus, exercise context and task-specific reaction-time research shown with measurements.

A displayed population interval is separate from NEWS2 and a personal baseline. The single mood rating does not implement WHO-5. The generic reaction task is not the cited 10-minute PVT. NASA exercise is ISS context, not an individual prescription.

- [MedlinePlus · Vital signs (reviewed 2025)](https://medlineplus.gov/ency/article/002341.htm)
- [MedlinePlus · Pulse oximetry](https://medlineplus.gov/lab-tests/pulse-oximetry/)
- [MedlinePlus · Blood sugar test](https://medlineplus.gov/ency/article/003482.htm)
- [AASM/SRS · Adult sleep duration consensus (2015)](https://aasm.org/resources/pdf/adultsleepdurationconsensus.pdf)
- [Sleep · Response speed measurements on the psychomotor vigilance test (2021)](https://pubmed.ncbi.nlm.nih.gov/32556295/)
- [NASA · Astronaut exercise (2024)](https://www.nasa.gov/general/astronaut-exercise/)
- [MedlinePlus · Calcium blood test](https://medlineplus.gov/ency/article/003477.htm)
- [MedlinePlus · Sodium blood test](https://medlineplus.gov/ency/article/003481.htm)
- [MedlinePlus · Potassium test](https://medlineplus.gov/ency/article/003484.htm)
- [WHO · WHO-5 instrument context](https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01)

</details>

<details>
<summary>Measurement guides · MedlinePlus, FDA, CDC, Cleveland Clinic and RCP · Used reference</summary>

Technique summaries and illustrated placement guides name their public sources. NASA kit locations come from the historical 2015 checklist.

Clinical and onboard procedure review remain pending. Sleep, mood and exercise logs are self-report. The original CDC link is retained; automated access has varied. External originals require a connection.

- [MedlinePlus · Pulse](https://medlineplus.gov/ency/article/003399.htm)
- [MedlinePlus · Blood pressure measurement](https://medlineplus.gov/ency/article/007490.htm)
- [Cleveland Clinic · Vital signs](https://my.clevelandclinic.org/health/articles/10881-vital-signs)
- [FDA · Pulse Oximeter Basics](https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics)
- [MedlinePlus · Temperature measurement](https://medlineplus.gov/ency/article/003400.htm)
- [CDC · Monitoring your blood sugar](https://www.cdc.gov/diabetes/diabetes-testing/monitoring-blood-sugar.html)
- [Royal College of Physicians · NEWS2](https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/)
- [Sleep · Response speed measurements on the psychomotor vigilance test (2021)](https://pubmed.ncbi.nlm.nih.gov/32556295/)
- [MedlinePlus · Comprehensive metabolic panel](https://medlineplus.gov/lab-tests/comprehensive-metabolic-panel-cmp/)
- [NASA · ISS medical kit contents and reference (MED CL 3.001, 2015)](https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf)

</details>

<details>
<summary>Review prompts · MedlinePlus, FDA, NHLBI and NIMH · Used reference</summary>

Public health references support the original summaries shown when a reading or self-report needs professional review.

Draft for medical review. Translating provider to onboard medical officer is project wording, not a NASA-assigned role or institutional triage rule. MedlinePlus encyclopedia articles include third-party A.D.A.M. content.

- [MedlinePlus · Pulse](https://medlineplus.gov/ency/article/003399.htm)
- [MedlinePlus · Blood pressure measurement](https://medlineplus.gov/ency/article/007490.htm)
- [Cleveland Clinic · Vital signs](https://my.clevelandclinic.org/health/diagnostics/10881-vital-signs)
- [FDA · Pulse Oximeter Basics](https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics)
- [MedlinePlus · Temperature measurement](https://medlineplus.gov/ency/article/003400.htm)
- [MedlinePlus · Blood glucose test](https://medlineplus.gov/lab-tests/blood-glucose-test/)
- [NHLBI · Insomnia diagnosis](https://www.nhlbi.nih.gov/health/insomnia/diagnosis)
- [NIMH · Caring for your mental health](https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health)

</details>

<details>
<summary>Emergency guidance · American Red Cross and NASA NTRS · Used reference</summary>

Red Cross unresponsive-person and heart-attack guidance supports the two prototype graphs. Barratt and Billica (1992), NTRS 19950010359, supplies historical microgravity CPR context.

Onboard roles, handover and contact timing are declared project adaptations. The 1992 research is not a current flight procedure; clinical validation is pending.

- [American Red Cross · Unresponsive person](https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person)
- [NASA NTRS · CPR in microgravity (1992)](https://ntrs.nasa.gov/citations/19950010359)
- [American Red Cross · Heart attack first aid](https://www.redcross.org/take-a-class/resources/learn-first-aid/heart-attack)

</details>

<details>
<summary>Fatigue context · NASA V1 6001 and NHLBI · Used reference</summary>

NASA medical operations provides work/rest, sleep opportunity and circadian context; NHLBI supplies the general Earth adult sleep reference.

The factor model, shortfall arithmetic and configurable markers are simulation assumptions. They do not determine a recovery duration, validated fatigue score or fitness for duty.

- [NASA-STD-3001 V1 6001 · Medical Operations §6.1](https://www.nasa.gov/reference/6-0-medical-operations/)
- [NHLBI · How much sleep is enough?](https://www.nhlbi.nih.gov/health/sleep/how-much-sleep)

</details>

<details>
<summary>NASA Human Research Program (HRP) hazards and risks · Used reference</summary>

Reference for the five spaceflight hazards and curated risk records used by VITRUVIO navigation.

Approved subset: 5 hazards and 11 active curated risks, not the full 17-risk planning list. Per-risk URLs and excerpts remain in sources.json, which is NASA-only. Source metadata checked 2026-11-14; this does not certify the application.

- [NASA Human Research Program (HRP) hazards and risks](https://humanresearchroadmap.nasa.gov/)
- [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [NASA · Human Research Program](https://www.nasa.gov/hrp/)
- [NASA · Five hazards of human spaceflight](https://www.nasa.gov/hrp/hazards/)
- [NASA · The human body in space](https://www.nasa.gov/humans-in-space/the-human-body-in-space/)
- [Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105)
- [Risk of Adverse Cognitive or Behavioral Changes and Psychiatric Disorders Leading to In-mission Health and Performance and Long-term Health Effects](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=99)
- [Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=179)
- [Risk of Adverse In-Mission Health and Performance Effects and Long-Term Health Effects Due to Celestial Dust Exposure](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=82)
- [Risk of Mission Impacts and Long-Term Health Issues due to Decompression Sickness](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=168)
- [Risk of Bone Fracture due to Spaceflight-induced Changes to Bone](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=77)
- [Risk of Mission Performance Decrements and Adverse Health Outcomes Resulting from Reduced Cardiorespiratory and Musculoskeletal Fitness](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=180)
- [Risk of In Mission Impacts, Adverse Health Events or Long-Term Health Impacts due to Altered Immune Response](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=85)
- [Risk of Renal Stone Formation](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=81)
- [Risk of Performance Decrement and Crew Illness Due to Inadequate Food and Nutrition](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=176)
- [Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100)

</details>

<details>
<summary>ISS Medical Kit - Medical Diagnostic Pack (Blue), 2015 historical checklist · Historical context</summary>

Historical reference for naming diagnostic hardware and packs in the ISS medical kit.

The 2015 kit is historical and not a current inventory. Only page 9 diagnostic hardware is curated; medications, doses, and instructions are not copied. Source metadata checked 2026-11-14; this does not certify the application.

- [ISS Medical Kit - Medical Diagnostic Pack (Blue), 2015 historical checklist](https://www.nasa.gov/wp-content/uploads/2015/03/medical_kit_checklist_-_full_release.pdf)
- [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)

</details>

<details>
<summary>NASA OSDR OSD-575 version 3 SpaceX Inspiration4 blood serum metabolic panel · Used reference</summary>

Reference cohort aggregates for glucose, calcium, sodium, and potassium; no clinical or simulator calibration use.

28 samples, 4 crew, 12 pre-flight and 16 post-flight. App JSON is aggregate-only; no participant rows or ids. Not in-flight data, not a personal baseline, and not calibration or 180-day prediction input. Source metadata checked 2026-11-14; this does not certify the application.

- [CC0-1.0](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)
- [NASA OSDR OSD-575 version 3 SpaceX Inspiration4 blood serum metabolic panel · reference 2](https://osdr.nasa.gov/osdr/data/osd/files/575.3)
- [NASA OSDR OSD-575 version 3 SpaceX Inspiration4 blood serum metabolic panel · reference 3](https://nasa-osdr.s3.us-west-2.amazonaws.com/OSD-575/version-3/Comprehensive_Metabolic_Panel/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv)
- [OSD-575 · dataset DOI used by trends](https://doi.org/10.26030/mc5d-p710)

</details>

<details>
<summary>NASA-STD-3001 Volume 1 Revision C - Crew Health · Used reference</summary>

Source for career and SPE NASA effective-dose requirements V1 4030 and V1 4031.

Pages 40 and 42 verified: less than 600 mSv career effective dose and less than 250 mSv design-reference SPE effective dose. No engine threshold is hardcoded here. Source metadata checked 2026-11-14; this does not certify the application.

- [NASA-STD-3001 Volume 1 Revision C - Crew Health](https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1)
- [NASA-STD-3001 Volume 1 Revision C - Crew Health · reference 2](https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf)
- [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)

</details>

<details>
<summary>OCHMO-TB-020 Rev G - Design for Ionizing Radiation Protection · Used reference</summary>

NASA technical brief cross-check for V1 4030 and V1 4031.

Pages 4 and 6 verified. The brief is derived from NASA-STD-3001 and is reference-only; it does not supersede the standard. Source metadata checked 2026-11-14; this does not certify the application.

- [OCHMO-TB-020 Rev G - Design for Ionizing Radiation Protection](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf)
- [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)

</details>

<details>
<summary>NASA CCMC DONKI space weather notifications · Catalog only</summary>

Catalog reference for future space-weather notifications; no runtime client in this change.

2026 migration notice: new UI /DONKI/ and API base /DONKI-API/get/... are announced for 2026-09-30. No API key or live client is added. This catalog does not promise or test an endpoint; re-verify before integration. Source metadata checked 2026-11-14; this does not certify the application.

- [NASA CCMC DONKI space weather notifications](https://ccmc.gsfc.nasa.gov/tools/DONKI/)
- [NASA media guidelines and CCMC API documentation](https://ccmc.gsfc.nasa.gov/DONKI/api/)
- [NASA CCMC DONKI space weather notifications · reference 3](https://ccmc.gsfc.nasa.gov/news/major-updates/)

</details>

<details>
<summary>NOAA Space Weather Prediction Center data access · Catalog only</summary>

Catalog reference for future fallback space-weather data; no runtime client in this change.

Original SWPC URL redirects to www.spaceweather.gov/content/data-access (verified 2026-11-14). Fallback prepared, not live; no API key or mock-as-real. Source metadata checked 2026-11-14; this does not certify the application.

- [NOAA Space Weather Prediction Center data access](https://www.swpc.noaa.gov/content/data-access)
- [NOAA Space Weather Prediction Center data access · reference 2](https://www.spaceweather.gov/content/data-access)
- [NOAA/NWS disclaimer](https://www.weather.gov/disclaimer)

</details>

<details>
<summary>Canadian Space Agency - Space medicine and radiation · Used reference</summary>

Complementary agency context for radiation; not used for NASA effective-dose values.

CSA material may use organ-dose/Sv context. It is not substituted for NASA effective-dose mSv values. No engine change. Source metadata checked 2026-11-14; this does not certify the application.

- [Canadian Space Agency - Space medicine and radiation](https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/radiation.asp)
- [CSA Terms - personal/educational non-commercial use](https://www.asc-csa.gc.ca/eng/terms.asp)

</details>

<details>
<summary>Royal College of Physicians - National Early Warning Score (NEWS) 2 · Used reference</summary>

RCP NEWS2 scoring chart and triggers used by the unmodified engine. Spaceflight use is an unvalidated extrapolation.

Human transcription check pending. Onboard contact timing is a project adaptation, not an RCP spacecraft protocol. Source metadata checked 2026-11-14; this does not certify the application.

- [RCP NEWS2 reuse conditions](https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/)
- [Royal College of Physicians - National Early Warning Score (NEWS) 2 · reference 2](https://www.rcp.ac.uk/media/alxev00t/news2-chart-1_the-news-scoring-system_0_0.pdf)
- [Royal College of Physicians - National Early Warning Score (NEWS) 2 · reference 3](https://www.rcp.ac.uk/media/2acdezkd/news2-chart-2_news-thresholds-and-triggers_0.pdf)
- [Royal College of Physicians - National Early Warning Score (NEWS) 2 · reference 4](https://www.rcp.ac.uk/terms-and-conditions/)
- [RCP · Additional guidance and clinical judgement](https://www.rcp.ac.uk/media/umzn4ntq/news2_additional-guidance-002-_0.pdf)

</details>

<details>
<summary>NASA 3D Resources · Catalog only</summary>

Catalog reference for future 3D scene assets; no asset is downloaded in this change.

Licensing conflict/review note: README versus media guidelines/meta.json. No uniform license; asset-level review required. No GLB is downloaded or committed. Source metadata checked 2026-11-14; this does not certify the application.

- [NASA 3D Resources](https://science.nasa.gov/3d-resources/)
- [NASA Images and Media Usage Guidelines; NASA 3D README](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [NASA 3D Resources · reference 3](https://github.com/nasa/NASA-3D-Resources)

</details>

<details>
<summary>Anatomy · DBCLS, HuBMAP/HRA, MakeHuman and open-anatomy-3d · Assets and adaptations</summary>

BodyParts3D © DBCLS (CC BY 4.0); female organs from HuBMAP Human Reference Atlas (CC BY 4.0); female body from MakeHuman (CC0). Adapted by open-anatomy-3d and VITRUVIO.

Runtime materials, shading, male pose, female muscle fitting and derived line art are described in the local attribution. Educational visualization; not a validated anatomical or diagnostic model.

- [Model source · MervinR07/open-anatomy-3d](https://github.com/MervinR07/open-anatomy-3d)
- [Upstream model credits](https://github.com/MervinR07/open-anatomy-3d/blob/main/ATTRIBUTION.md)
- [BodyParts3D · DBCLS](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/)
- [HRA · United female v1.10](https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/)
- [MakeHuman](https://github.com/makehumancommunity/makehuman)
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- [Full model attribution and modifications](public/models/ATTRIBUTION.md)
- [Model licence](public/models/LICENSE-MODELS.md)

</details>

<details>
<summary>Environment imagery · NASA Blue Marble and procedural scenes · Assets and adaptations</summary>

NASA/GSFC Scientific Visualization Studio, Reto Stockli and NASA Earth Observatory supply the Blue Marble texture. Other scenes and markings are illustrative procedural work with AI assistance.

The generated skies and planet use vgpu and @vgpu/wgsl-std. The UTB seedbed emblem is credited with team permission. No live imagery, ephemerides or NASA hardware replica is implied.

- [NASA SVS · Blue Marble](https://svs.gsfc.nasa.gov/2915/)
- [Environment attribution and generation](public/textures/ATTRIBUTION.md)
- [@vgpu/wgsl-std](https://www.npmjs.com/package/@vgpu/wgsl-std)
- [vgpu shader utilities · included MIT notice](public/credits/vgpu-wgsl-std-LICENSE.txt)

</details>

<details>
<summary>Interface assets · React Bits and IBM Plex · Assets and adaptations</summary>

Ghost Fibers by David Haz / React Bits is adapted to plain CSS and a VITRUVIO animation controller. IBM Plex Sans and Mono are distributed through Fontsource.

React Bits publishes MIT + Commons Clause conditions; its adapted code is not covered by the project MIT licence. IBM Plex uses SIL OFL 1.1. Original notices are included locally.

- [React Bits · Ghost Fibers](https://reactbits.dev/backgrounds/ghost-fibers)
- [React Bits · upstream licence](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md)
- [React Bits · included notice](public/credits/react-bits-LICENSE.txt)
- [IBM Plex](https://github.com/IBM/plex)
- [IBM Plex Sans · included OFL notice](public/credits/ibm-plex-sans-LICENSE.txt)
- [IBM Plex Mono · included OFL notice](public/credits/ibm-plex-mono-LICENSE.txt)

</details>

<details>
<summary>Software · runtime libraries and development tools · Software</summary>

React, Three.js / React Three Fiber / Drei, GSAP, Zustand, Dexie, Radix, Lucide, Vite PWA and the remaining direct dependencies are listed from the project manifest.

OpenAI Codex and Anthropic Claude assisted code, documentation, research and illustrations. Tests do not establish clinical validation. Each dependency retains its own licence; version specifications below come from package.json.

- [@fontsource/ibm-plex-mono ^5.3.0](https://www.npmjs.com/package/@fontsource/ibm-plex-mono)
- [@fontsource/ibm-plex-sans ^5.3.0](https://www.npmjs.com/package/@fontsource/ibm-plex-sans)
- [@radix-ui/react-dialog ^1.3.1](https://www.npmjs.com/package/@radix-ui/react-dialog)
- [@react-three/drei ^10.7.9](https://www.npmjs.com/package/@react-three/drei)
- [@react-three/fiber ^9.8.2](https://www.npmjs.com/package/@react-three/fiber)
- [dexie ^4.4.7](https://www.npmjs.com/package/dexie)
- [gsap ^3.15.1](https://www.npmjs.com/package/gsap)
- [lucide-react 1.72.0](https://www.npmjs.com/package/lucide-react)
- [react ^19.3.1](https://www.npmjs.com/package/react)
- [react-dom ^19.3.1](https://www.npmjs.com/package/react-dom)
- [three ^0.187.0](https://www.npmjs.com/package/three)
- [three-stdlib ^2.36.1](https://www.npmjs.com/package/three-stdlib)
- [vgpu 0.6.0](https://www.npmjs.com/package/vgpu)
- [zustand ^5.1.0](https://www.npmjs.com/package/zustand)
- [@babel/core ^7.29.7](https://www.npmjs.com/package/@babel/core)
- [@eslint/js ^10.0.1](https://www.npmjs.com/package/@eslint/js)
- [@playwright/test ^1.65.1](https://www.npmjs.com/package/@playwright/test)
- [@rolldown/plugin-babel ^0.3.0](https://www.npmjs.com/package/@rolldown/plugin-babel)
- [@types/babel__core ^7.20.5](https://www.npmjs.com/package/@types/babel__core)
- [@types/node ^24.19.2](https://www.npmjs.com/package/@types/node)
- [@types/react ^19.3.0](https://www.npmjs.com/package/@types/react)
- [@types/react-dom ^19.3.0](https://www.npmjs.com/package/@types/react-dom)
- [@types/three ^0.187.0](https://www.npmjs.com/package/@types/three)
- [@vgpu/wgsl 0.6.0](https://www.npmjs.com/package/@vgpu/wgsl)
- [@vitejs/plugin-react ^6.1.2](https://www.npmjs.com/package/@vitejs/plugin-react)
- [babel-plugin-react-compiler ^1.0.0](https://www.npmjs.com/package/babel-plugin-react-compiler)
- [eslint ^10.14.0](https://www.npmjs.com/package/eslint)
- [eslint-config-prettier ^10.1.8](https://www.npmjs.com/package/eslint-config-prettier)
- [eslint-plugin-react-hooks ^7.1.1](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [eslint-plugin-react-refresh ^0.5.7](https://www.npmjs.com/package/eslint-plugin-react-refresh)
- [fake-indexeddb ^6.2.8](https://www.npmjs.com/package/fake-indexeddb)
- [globals ^17.13.0](https://www.npmjs.com/package/globals)
- [prettier ^3.10.1](https://www.npmjs.com/package/prettier)
- [typescript ~6.0.3](https://www.npmjs.com/package/typescript)
- [typescript-eslint ^8.72.1](https://www.npmjs.com/package/typescript-eslint)
- [vite ^8.3.6](https://www.npmjs.com/package/vite)
- [vite-plugin-pwa ^2.0.0](https://www.npmjs.com/package/vite-plugin-pwa)
- [vitest ^5.1.0](https://www.npmjs.com/package/vitest)

</details>

<!-- project-source-credits:end -->

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

VITRUVIO-authored code is distributed under the MIT License; see [LICENSE.txt](LICENSE.txt). Third-party code, models, fonts, source documents and imagery retain their own terms. In particular, React Bits has MIT + Commons Clause conditions, anatomical derivatives use CC BY 4.0 (with MakeHuman CC0), and IBM Plex uses SIL OFL 1.1. See the inventory above and the [included notices](public/credits/README.md). The project MIT licence does not relicense those materials.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

- José Gonzalez - joseortiz@utb.edu.co
- Fabian Quintero - parejaf@utb.edu.co
- Santiago Quintero - squintero@utb.edu.co
- Eduardo Negrin - enegrin@utb.edu.co
- Daniel Herrera - acevedod@utb.edu.co
- Isabella Arrieta - arrietai@utb.edu.co

Project Link: [https://vitruviox.vercel.app/](https://vitruviox.vercel.app/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

We would like to express our gratitude to:

* **NASA Space Apps Challenge 2026** — for the platform and inspiration.
* **Semillero de Astronomía y Ciencia de Datos de la Universidad Tecnológica de Bolívar** — for their continuous support and encouragement in our astronomical and data science endeavors.
* **Royal College of Physicians** — NEWS2 bands and triggers, reproduced with acknowledgement and unaltered as the RCP requires for digital implementations.
* **AHA, ATS, BTS, ADA, NHLBI, Cleveland Clinic, AMBOSS and StatPearls** — the clinical reference sources named by the engine.
* **MedlinePlus/NLM and A.D.A.M., FDA, CDC, AASM/SRS, NIMH, WHO, Basner and colleagues, and the American Red Cross** — measurement, sleep, well-being, reaction-time and emergency guidance, with their specific limits stated in the inventory.
* **NASA HRP, OSDR/Inspiration4, NASA-STD-3001 and Medical Operations, the historical ISS checklist, NASA NTRS, and the Canadian Space Agency** — the spaceflight references and research context identified above.
* **[Open Anatomy 3D — MervinR07](https://github.com/MervinR07/open-anatomy-3d)** — anatomical models based on BodyParts3D / DBCLS, HuBMAP and MakeHuman, under CC BY 4.0 / CC0; see [model credits](public/models/ATTRIBUTION.md).
* **NASA/GSFC SVS, Reto Stockli and NASA Earth Observatory** — the Blue Marble Earth texture.
* **David Haz / React Bits, IBM Plex / Fontsource, vgpu and the software maintainers listed above** — interface effects, typography, shader utilities and software infrastructure.

Clinical validation is not claimed: this is a mission simulation prototype, not medical advice or a flight-certified clinical system.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026.svg?style=for-the-badge
[contributors-url]: https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/graphs/contributors

[forks-shield]: https://img.shields.io/github/forks/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026.svg?style=for-the-badge
[forks-url]: https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/network/members

[stars-shield]: https://img.shields.io/github/stars/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026.svg?style=for-the-badge
[stars-url]: https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/stargazers

[issues-shield]: https://img.shields.io/github/issues/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026.svg?style=for-the-badge
[issues-url]: https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/issues

[license-shield]: https://img.shields.io/github/license/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026.svg?style=for-the-badge
[license-url]: https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/blob/main/LICENSE.txt

[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/

[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/

[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/

[Three.js]: https://img.shields.io/badge/React_Three_Fiber-000000?style=for-the-badge&logo=threedotjs&logoColor=white
[Three-url]: https://docs.pmnd.rs/react-three-fiber/

[Zustand]: https://img.shields.io/badge/Zustand-4B4545?style=for-the-badge&logo=react&logoColor=white
[Zustand-url]: https://zustand.docs.pmnd.rs/

[Dexie]: https://img.shields.io/badge/Dexie-60C860?style=for-the-badge&logoColor=white
[Dexie-url]: https://dexie.org/

[Radix]: https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radix-ui&logoColor=white
[Radix-url]: https://www.radix-ui.com/

[Vitest]: https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white
[Vitest-url]: https://vitest.dev/

[Playwright]: https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white
[Playwright-url]: https://playwright.dev/

[Pnpm]: https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white
[Pnpm-url]: https://pnpm.io/

Clinical and aerospace model sources, formulas and simulation assumptions are documented in [clinical model traceability](docs/clinical-model-traceability.md). Integration and reproducible checks are in [PR43/PR45 integration](docs/pr43-pr45-integration.md).
