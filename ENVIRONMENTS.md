# VITRUVIO mission environments

Four procedural 3D cabins implement the scene part of RF-31. The existing mission selector, health engine, readings, communication delays and anatomical model retain their contracts. Designed for the team's current React Three Fiber canvas and offline PWA.

| Mission ID | View | Ambient motion |
| --- | --- | --- |
| `station` | Wide observation gallery, NASA Blue Marble Earth and solar arrays | Slow planet and array rotation |
| `transit` | Chamfered pressure windows, distant illustrative Mars and transfer assembly | Slow assembly rotation |
| `rover` | Lower panoramic windshield, dashboard, rocks and dunes | Passing terrain rocks and drifting dust |
| `base` | Broad habitat gallery, outpost, solar field and mountains | Antenna tracking and drifting dust |

All four respond gently to the pointer, including cabin parallax and moving window shadows. The body, medical camera and labels do not drift. Day/night follows the existing mission store. The environments are illustrative context, not live mission telemetry.

The interior now closes around the complete orbit: side walls join the forward bulkhead, and all bearings include equipment, workstations, storage and pressure hardware. Rover rear seating and the base laboratory add mission-specific detail. Camera limits prevent moving under the deck or outside the rover's walls.

The user's second reference calls for a cinematic foreground/background hierarchy: a sharp protagonist in front of a living, softer environment. The medical twin now has a separate key/fill/rim light rig, a crisp deck and contact shadow. Habitat colour, opacity and modest defocus keep the background visible while the anatomy retains detail. Sparse illuminated air and slow sunlight changes provide depth without moving health data.

## Anatomical inspection

Selecting a system from the body, a pin or the existing system list activates inspection. The camera takes the shortest spherical path to that system, with a smooth approximately one-second transition. Targets were checked against the anatomical model's actual world bounds. The rest of the body becomes translucent, while the selection receives four-band cel shading, a thin dark silhouette and slight emission. A soft targeted spotlight follows the inspected area. The broad subject light is now an area light rather than an intense frontal spot.

During Surface inspection, the skin remains translucent and the selected internal system is revealed. Reset restores ordinary surface rendering. Anatomical contours use a stable dark ink in both themes, independent of the interface's light night text.

**Show full body** and the existing reset control restore the complete view and normal opacity. Manual orbit interrupts the camera transition. Reduced motion applies the target immediately. On mobile, selecting a system scrolls the anatomical view into sight. Pins avoid screen-space collisions and hide when their anchors leave the camera viewport.

The mission store adds only visual `focus` and `focusRevision` fields. Existing `select(system)` and `resetView()` consumers keep their signatures; selection now also requests inspection. No health score, threshold, reading or clinical action changes.

The optional WebGPU palette is generated with vGPU 0.6.0. See `VGPU.md` for the installed toolchain, shader validation, pixel checks and fallback behavior. The existing respiratory asset contains a bronchial tree rather than solid lung lobes; the focus preserves that source geometry.

## Integration

`Cabin.tsx` remains the environment integration point. It reads `environment` from `useMission` and renders `environments/HabitatEnvironment.tsx` in the background canvas. Environment code is under `src/features/twin/environments/`; inspection lives beside `Scene.tsx`. No dashboard, health engine or mission-data file changes. The mission store adds the two visual inspection fields described above.

For another canvas or a redesigned interface, mount:

```tsx
<HabitatEnvironment environment={environment} p={palette} night={night} motion={true} />
```

Mount it inside a React Three Fiber `<Canvas frameloop="demand">`. Include `MotionControl` outside the canvas for the pause action and visible NASA attribution. That control uses the current mission store; its styling lives in `environment.css`.

`Scene.tsx` composes two independent WebGL canvases. `habitat-viewport` renders the room at a lower pixel ratio; `medical-viewport` keeps the anatomy, status colours, mission ring and shadow sharp. `ViewLink.ts` and `CameraLink.tsx` synchronise the background with intentional medical camera controls. Ambient frames redraw only the habitat, leaving the approximately 1.1-million-triangle anatomy idle. This trades an additional WebGL context for independent rendering and visual treatment; it does not duplicate the anatomical asset.

The background layer alone receives CSS defocus, restrained saturation and opacity. These settings are in `environment.css`. `SubjectLighting.tsx` controls the stable foreground illumination. Main-scene shadow maps refresh after body changes, not on each ambient frame. The room has its own shadow-casting sunlight and cabin fixtures. Background-only long-distance fog softens remote structures; the medical foreground has no fog. Pointer picking and accessible system buttons remain on the medical layer.

The local stylesheet adds opaque backgrounds to the existing score and crew label to preserve contrast over moving scenery. Their layout and content remain under the dashboard owner's control.

## Motion and rendering

- Ambient rendering requests at most 24 frames/second. Camera interaction can request additional frames.
- Pause/play is keyboard accessible and persists as a device preference.
- Reduced motion stops decorative animation and pointer parallax. Its device preference takes precedence over play.
- Opening a panel, hiding the document or scrolling the background out of view suspends ambient updates. Emergency mode unmounts both canvases.
- Repeated cabin details and photovoltaic cells merge by material; rocks use one instanced draw.
- No postprocessing dependency, transmission, remote HDRI, paid service, API key or runtime CDN is required. Defocus is a browser compositing effect restricted to the background layer. vGPU prepares the selected material's four-band palette once and disposes its device.
- The only added raster is the local NASA Earth map, approximately 1.4 MB. The existing PWA asset glob includes it in the production precache.

See `public/textures/ATTRIBUTION.md` for provenance and rendering treatments. Code was written with OpenAI Codex assistance; the original anatomical asset retains its existing attribution.

## Review

Run `pnpm dev` and open the local URL. Use **Environment** in the lower action bar to select each mission. **Hide panels** gives an unobstructed view; **Reset view** restores the medical camera. **Pause motion** stops the scenery.

Run `pnpm build` and `pnpm lint` for static verification. Current browser captures and reports are under `.impeccable/review/cinematic/`; the parent directory preserves evidence of the first version. Hardware frame rate remains dependent on the device; the ambient cap is not a claim of measured 60 fps on a typical laptop.

The subsequent inspection/360-degree revision is captured under `.impeccable/review/inspection/`, including six focused systems, both display layers, day/night, tablet/mobile and four bearings for every environment. Its reports separately cover inspection, enclosure/orbit, production/offline operation and native GPU checks. `environment-motion.webm` demonstrates selection and the ambient environments.

## Final validation

The first version passed 13 browser checks, 10 production/offline checks and an independent visual review on 2026-11-14.

The cinematic revision passes `pnpm build`, `pnpm lint`, 16 browser checks, 10 production/offline checks and 4 targeted camera/modal/offscreen checks (30 total), with zero runtime, WebGL or shader errors. Its 14 captures cover every environment in day, wide and night states, plus tablet and mobile. The added checks confirm moving light/shadows, pointer parallax with a stationary medical camera, and independent rendering: one sampled interval advanced the background from frame 227 to 246 while the medical view stayed at frame 9. Active background renders measured 11,758–52,146 triangles across the four views, rather than redrawing the anatomical scene on each ambient frame. No measured 60-fps claim is made.

The four targeted checks confirm that the background camera tracks intentional medical orbit, modal focus suspends background rendering, an offscreen mobile habitat suspends rendering, and the habitat resumes when it returns into view. Independent cinematic visual review inspected all 14 current captures, two earlier comparison captures and all three current reports, then returned **SHIP** with no material findings. Anatomy and data remain the focal point across the distinct environments and tested viewport states.

The inspection/360-degree revision passed `pnpm build`, `pnpm lint` and 38 checks: 16 inspection/browser, 7 enclosure/orbit and 15 production/offline. All recorded error lists are empty. With vGPU 0.6.0, `pnpm gpu:doctor` returned `healthy`, `pnpm gpu:check` passed device-backed WGSL validation, and `pnpm gpu:test` passed native pixel assertions. Browser evidence covers the optional WebGPU toon palette and its deterministic fallback.

The full independent review inspected all 29 current captures and accepted the furnished enclosures, inspection framing, subject lighting and ghost context. Its two requested fixes are resolved: Surface inspection reveals the selected internal system through translucent skin and restores skin-only overview; night contours retain dark `#25312a` ink. The follow-up returned **SHIP for the scored fixes** after checking refreshed captures and source; the original broader review had no other material findings. See `.impeccable/review/inspection/finish-review.md` for the scoped verdict.

Runtime reports support the behavior checks; the reviewer did not directly assess the video, transition feel or hardware frame rate. Performance remains device-dependent with two WebGL contexts and the existing anatomical geometry. The 24-frame/second ambient request cap is not a measured 60-fps claim.

This is an ordinary extension of `DESIGN.md` v0.2. Its sage/ceramic palette, Plex typography, health-status colour meanings and existing console controls remain the design authority. The incumbent design files and tokens are preserved; environment-specific guidance remains in this document.
