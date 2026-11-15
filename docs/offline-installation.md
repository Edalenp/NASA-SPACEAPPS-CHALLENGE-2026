# Installation and offline access

The landing explains NASA's contributions between the four-step walkthrough and
the console preview. HRP is described as the selected 11-risk subset. OSD-575 is
limited to observed Inspiration4 bands for four blood chemistry indicators;
it is not described as clinical limits or personal calibration.

Installation controls are beside the lab entry and in the lab's connection menu.
An available browser installation prompt is used only after a user click. Other
browsers receive instructions instead. Installation is optional for offline use.

Open the production app online and keep it open until **Ready offline** appears.
The service worker precaches the application, reference data bundled with it,
anatomy models, images and fonts. Activation follows successful precaching and
claims the first open page. Saved readings remain in IndexedDB. External source
links still need internet. Clearing browser site data removes the local cache and
readings; browser storage retention remains subject to the device's policies.

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
