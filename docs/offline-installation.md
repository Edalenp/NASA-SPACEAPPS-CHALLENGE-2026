# Installation and offline access

The landing explains NASA's contributions between the four-step walkthrough and
the console preview. HRP is described as the selected 11-risk subset. OSD-575 is
limited to observed Inspiration4 bands for four blood chemistry indicators;
it is not described as clinical limits or personal calibration.
The radiation copy distinguishes the 600 mSv career limit (V1 4030) from the
250 mSv design-reference SPE requirement (V1 4031, October 1989 spectrum).
CSA radiation guidance and NASA's historical 2015 ISS medical kit checklist
are also credited. The checklist is not presented as the current inventory.
The combined integration retains the numeric comparisons and labels their roles
consistently in the meter: personal career limit versus SPE design reference.
Dose histories are independent per astronaut; old untagged doses remain with
Jordan Lee. See `clinical-model-traceability.md` for source and model boundaries.

The source section also includes an interactive evidence viewer. OSD-575 is the
initial view; each source selects a real lab capture with a caption, enlargement
and a link to its corresponding lab panel. Desktop uses a sticky console frame
with GSAP scroll reveals, restrained parallax and the existing heading animation.
Mobile shows the capture below the selected resource. Reduced-motion preferences
disable typing, reveals and parallax. Captures are precached for offline viewing.

`/lab?evidence=hrp|radiation|osd575|iss-kit` opens only a validated destination.
It does not create readings, seed a simulation or change the mission environment.
The OSD-575 destination initially selects glucose; first-use onboarding waits
until the destination panel closes. Capture provenance and a reproducible capture
script are described in `public/landing/evidence/README.md`.

Installation controls are beside the lab entry and in the lab's connection menu.
An available browser installation prompt is used only after a user click. Other
browsers receive instructions instead. Installation is optional for offline use.

Open the production app online and keep it open until **Ready offline** appears.
The service worker precaches the application, reference data bundled with it,
anatomy models, images and fonts. Activation follows successful precaching and
claims the first open page. Saved readings remain in IndexedDB. External source
links still need internet. Clearing browser site data removes the local cache and
readings; browser storage retention remains subject to the device's policies.

The landing's full source inventory and the laboratory's source browser share
the same citation records. The README inventory is generated from them. Local
model/texture attributions and the React Bits, IBM Plex and vgpu notices are
precached too; original external publications are not mirrored. See the
[source and access audit](source-credit-audit.md).

`npm run dev` deliberately does not install a service worker. For a local check:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4180
```

Open the displayed address online, wait for readiness, then test offline and reload.
Deploy over HTTPS; localhost is supported for production-preview testing.

`npm run test:pwa` builds and runs the dedicated Chromium production suite. It
clears ordinary HTTP cache, disconnects the browser, enters the previously unvisited
lab, saves and reloads a reading, loads cached models and landing images, and checks
desktop/mobile layout. Installation controls use a simulated browser prompt; the
suite does not perform an operating-system installation.
