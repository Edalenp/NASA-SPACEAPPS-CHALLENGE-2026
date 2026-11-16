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
    Autonomous crew health prototype for NASA Space Apps Challenge 2026. An offline-capable PWA that monitors vital signs, scores them with the unmodified NEWS2 chart, and escalates crew care across four mission environments — while every clinical claim keeps its cited source.
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

VITRUVIO is an autonomous crew health monitoring prototype for the NASA Space Apps Challenge 2026. A crew member records a daily check-in of vital signs; the engine scores it with the **unmodified NEWS2 chart** from the Royal College of Physicians, compares readings against a personal baseline and against cited absolute clinical limits, and plans contact escalation across transit, station, rover and base environments — including the communication round-trip delay.

Everything the app shows is traceable: manual records stay on-device (IndexedDB), simulated data is labelled as such, and every clinical band, limit and care step cites its source. It is a mission simulation prototype, not medical advice or a flight-certified clinical system.

### NASA Data Used

In one sentence: **VITRUVIO is shaped and validated with documented NASA health-research resources** — the five hazards of human spaceflight from the NASA Human Research Program, a curated set of 11 HRP human-research risks that drive the emergency guides, the NASA-STD-3001 Vol 1 radiation dose limits (with the Canadian Space Agency's equivalent) that the engine enforces, the historical 2015 ISS diagnostic kit that informs the measurement groups, and NASA Open Science Data Repository study OSD-575, whose reproducible cohort bands provide reference context for glucose, calcium, sodium and potassium. All NASA data is used as reference only — aggregate bands and documented limits, never as simulated observations — and every item keeps its citation inside the app. Details: [Engine validity](#documentation) and [NASA reference data](#documentation).

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
- **Escalation across environments:** every NEWS2 level has a real contact plan, including `singleRed`, with deadlines adjusted by the environment's communication round-trip delay.
- **Radiation dose limits:** 600 mSv career and 250 mSv per solar event as separate accumulators (NASA-STD-3001 Vol 1 + CSA).
- **Offline first:** IndexedDB storage, PWA precaching, and legacy console data imported additively.
- **Four mission habitats:** React Three Fiber scene with dynamic inspection camera and labelled simulation data.
- **Emergency guides with sources:** illustrated steps, kit information and every action citing its source, reused from the guides system.
- **Mission brief export:** timestamps, units, provenance, baseline context, NEWS2 completeness and confirmed emergency steps on one report.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* Node.js 18+
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

The monitoring console consumes main's `calculateNews2`, `calculateBaseline`, `evaluateZones`, `planEscalation` and `recommendSleep` through an adapter. NEWS2 is a single engine module fed by `news2-scoring.json`; the former console scorer was removed after being merged into it. IndexedDB remains at version 2; canonical measurements and consciousness observations are written to the existing engine tables. Oxygen-support observations and exercise logs remain in the compatibility table because the backend has no corresponding persisted measurement type.

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
- Routine includes a rest-window planner using the engine's sleep recommendation. Its planning inputs do not save a measurement. Mission brief exports timestamps, units, provenance, baseline context, NEWS2 completeness and the current environment. Mission brief reads Y's emergency journal at download time and includes confirmed steps and notifications for the active crew member on the report's UTC date. Case IDs, status, answers and sources are retained; pending instructions, other patients and unassigned cases are excluded. Storage limitations are stated in the report.

The Guides dialog uses Y's reusable GuidesPanel and GuideCard, including illustrated steps, kit information, hazards, references and the record action. Emergency consumes the same current-day reading selection as the dashboard, preserving explicit source and timestamps instead of inferring provenance from matching values. Simulation timestamps are labelled as simulated, never as manual measurement times. Saved emergency snapshots and care-step timers are not recalculated by this integration.

</details>

### Engine validity (RNF-11)

<details>
<summary>Single-source NEWS2, absolute clinical limits, dose and reaction</summary>

- NEWS2 stays unmodified: bands and triggers come from a single source (`src/engine/news2-scoring.json`), transcribed from the RCP observation chart with citation and declared limits in `_meta`, and are regression-tested against the JSON (`humanVerified: false` until the human check against the chart is signed off).
- An independent layer of absolute clinical reference limits (`src/engine/clinical-limits.json` + `clinicalLimits.ts`) complements NEWS2 with cited adult, sex-independent thresholds: AHA blood-pressure categories (severe hypertension above 180/120 mmHg, stage 2 at 140/90), AHA resting heart rate 60–100 bpm, ATS/BTS oxygen saturation (below 90% is hypoxemia, target 94%), fever at 38 °C oral with an above-40 °C red flag, respiration 12–20 breaths/min, ADA glucose bands (54/70/126/200 mg/dL) and NHLBI sleep 7–9 h. The personal baseline is a change detector, never a clinical validator: a value breaching an absolute limit keeps its clinical status even inside a collapsed or chronically elevated personal band (systolic 200 alerts with the AHA citation whether there is history or not).
- Escalation covers every NEWS2 level: `singleRed` now produces a real step (medical officer at 10 minutes plus the environment round-trip delay) per RCP Chart 2, matching the dashboard ladder.
- Radiation dose uses two separate accumulators (600 mSv career, 250 mSv per solar event, NASA-STD-3001 Vol 1 + CSA cited) and the reaction-time test accepts decimal milliseconds from `performance.now()`.

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

This declaration mirrors what the team states on the official project submission form.

- **AI tools used:** OpenAI Codex and Anthropic Claude, orchestrated through the OpenCode coding agent, were used to scaffold code, write and run tests, draft documentation, and speed up research tasks during the hackathon.
- **What humans decided and verified:** every scientific and clinical decision is the team's own — the NEWS2 transcription from the Royal College of Physicians chart, the absolute clinical limits and their citations, the escalation timing, the dose limit interpretation and all numbers shown in the app. Each claim is guarded by unit tests and reviewed by the team before merging; nothing clinical was delegated to AI.
- **Generated content:** no AI-generated imagery or text is presented as real mission data; all simulated data in the app is labelled as simulated with its own provenance markers.

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

Validation for every change: `pnpm test:run`, `pnpm build`, `pnpm lint` (341 tests across 32 files at the moment of writing).

### Top contributors:

<a href="https://github.com/Edalenp/NASA-SPACEAPPS-CHALLENGE-2026/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Edalenp/NASA-SPACEAPPS-CHALLENGE-2026" alt="contrib.rocks image" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- REFERENCES -->
## References

All data, resources and tools used in the project, as required for project submission — the same list submitted on the project page.

**Clinical standards and guidelines**

1. Royal College of Physicians (RCP), *National Early Warning Score (NEWS) 2* — bands and triggers reproduced with acknowledgement and unaltered, as the RCP requires for digital implementations. <https://www.rcp.ac.uk/improving-care-resources/patient-safety-and-service-quality/audit-and-improvement/national-early-warning-score-news2/>
2. American Heart Association, *Understanding Blood Pressure Readings* (adult categories). <https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings>
3. American Heart Association, *Target Heart Rates* (resting heart rate 60–100 bpm). <https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates>
4. British Thoracic Society / O'Driscoll et al., *BTS Guideline for Oxygen Use in Adults in Healthcare and Emergency Settings*, Thorax 2017 (oxygen saturation targets and hypoxemia). <https://thorax.bmj.com/content/72/Suppl_1/ii1>
5. American Thoracic Society, clinical statements on oxygen and pulmonary health. <https://www.thoracic.org/statements/>
6. Cleveland Clinic, *Fever* (fever threshold at 38 °C). <https://my.clevelandclinic.org/health/symptoms/10880-fever>
7. AMBOSS, *Fever* knowledge entry (red flag above 40 °C). <https://www.amboss.com/us/knowledge/fever>
8. StatPearls, *Respiratory Rate* (adult range 12–20 breaths/min). <https://www.ncbi.nlm.nih.gov/books/NBK537306/>
9. American Diabetes Association, *Diabetes Diagnosis and Testing* (glucose bands). <https://diabetes.org/about-diabetes/diagnosis>
10. National Heart, Lung, and Blood Institute, *How Much Sleep Is Enough?* (7–9 h). <https://www.nhlbi.nih.gov/health/sleep/how-much-sleep-is-enough>

**NASA and space agency resources**

11. NASA Space Flight Human-System Standard, Vol 1 (crew safety — radiation dose limits). <https://standards.nasa.gov/standard/nasa/nasa-std-3001>
12. Canadian Space Agency, spaceflight radiation dose limits — exact reference and licensing notes in the in-app citation catalog. <https://www.asc-csa.gc.ca/eng/space-medicine/>
13. NASA Human Research Program, *Five Hazards of Human Spaceflight*. <https://www.nasa.gov/hrp/5-hazards-of-human-spaceflight/>
14. NASA HRP Human Research Roadmap — curated human-research risks (11 risks used in the guides). <https://humanresearchroadmap.nasa.gov/>
15. NASA Open Science Data Repository, study OSD-575 (cohort bands, v3). <https://osdr.nasa.gov/bio/repo/data/studies/OSD-575>
16. Historical ISS 2015 diagnostic kit — full item citations, documented states and licensing notes in `src/data/nasa/`.
17. NASA radiation reference citations and ten-family source catalog — `src/data/nasa/`.

**Assets and libraries**

18. Open Anatomy 3D by MervinR07 — source of the male and female anatomical models used in VITRUVIO. <https://github.com/MervinR07/open-anatomy-3d>. Underlying assets: BodyParts3D / DBCLS and HuBMAP Human Reference Atlas (CC BY 4.0), MakeHuman (CC0); see [model credits](public/models/ATTRIBUTION.md).
19. NASA Blue Marble — Earth textures, with per-asset attribution in `public/textures/ATTRIBUTION.md`.
20. React, <https://reactjs.org/> · TypeScript, <https://www.typescriptlang.org/> · Vite, <https://vitejs.dev/> · React Three Fiber, <https://docs.pmnd.rs/react-three-fiber/> · three.js, <https://threejs.org/> · Zustand, <https://zustand.docs.pmnd.rs/> · Dexie, <https://dexie.org/> · Radix UI, <https://www.radix-ui.com/> · Vitest, <https://vitest.dev/> · Playwright, <https://playwright.dev/> · pnpm, <https://pnpm.io/>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

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
* **American Heart Association, American Thoracic Society, British Thoracic Society, American Diabetes Association, NHLBI** — the clinical reference limits cited in the engine.
* **NASA Human Research Program** — the five hazards of human spaceflight and the curated HRP risks.
* **[Open Anatomy 3D — MervinR07](https://github.com/MervinR07/open-anatomy-3d)** — anatomical models based on BodyParts3D / DBCLS, HuBMAP and MakeHuman, under CC BY 4.0 / CC0; see [model credits](public/models/ATTRIBUTION.md).
* **NASA Blue Marble** — Earth textures.

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
