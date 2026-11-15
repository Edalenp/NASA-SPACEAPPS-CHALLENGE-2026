# Measurement guides

## Guide card (RF-16, RF-17)

`GuideCard({ id, index?, onRecord? })` is the reusable guide for any reading. The Guides panel uses it, and any measurement form can use it. It shows, top to bottom:

1. **Facts**: instrument, ISS medical kit item with its pack, colour and slot, and the spaceflight hazards that bear on the reading. Each hazard links to NASA.
2. **Why it matters**, then **steps**. For pulse, temperature and oximeter, the steps sit beside an illustrated plate, and choosing a step changes the plate's pose.
3. **Sources**: the technique source and the NASA kit checklist, with check dates, and the record action.

What the card shows depends on the guide's `validation` in `../../data/guides.ts`:

| Status | Meaning | Steps |
| --- | --- | --- |
| `cited` | Technique paraphrased from a checked public source. Onboard and clinical review pending. | Shown |
| `self-report` | The reading is the crew member's own record. There is no technique to cite. | Shown |
| `draft` | No source yet. | Withheld |

Pack names, colours and slots come from NASA's ISS medical kit checklist (MED CL 3.001, 2015). The Medical Diagnostic Pack (blue) holds the blood oximeter (B1), blood pressure cuffs (B2), blood pressure monitor (B4) and thermometer (B3). The checklist lists no glucometer, so the glucose guide says so instead of naming a pack. Respiration, sleep, mood, consciousness and exercise use no kit item.

Technique sources, checked 2026-11-14: MedlinePlus (pulse, temperature, blood pressure), FDA (oximeter), Cleveland Clinic (breathing rate, counted for 60 seconds), CDC (blood glucose) and RCP NEWS2 (consciousness). `src/data/guides.test.ts` checks the kit, hazard and source rules.

## Illustrated plates

`VisualGuidesPanel` and `VisualMeasurementGuide` show the three illustrated guides inside Emergency's **Measurement visuals** help. Their drawings, and the emergency step plates, live in `./art/`:

- `anatomy-paths.ts`: outlines traced from the Open Anatomy skin (CC BY 4.0). It is generated; do not edit it by hand. `scripts/blender-anatomy-views.py` renders orthographic silhouettes in Blender, and `scripts/trace-anatomy.py` traces them. Proportions come from a real body model, not from freehand drawing. Interior lines are dropped, and the pelvis is smoothed so the figures read as neutral diagrams.
- `measurement.tsx` and `care.tsx`: the plates. Devices, cutaways and callouts are drawn on top of the outlines.
- `ArtFrame.tsx`: the frame, the callout and the motion runner. `art-motion.ts` holds the shared GSAP helpers.

Plates use one ink colour from host tokens (`--art-ink`, `--art-ground`, `--art-cue`), hairline leaders and dashed hidden lines. There are no gradients, glow or raster images. Each pose plays a short GSAP motion once when it appears, for example fingers arriving at the wrist, the thermometer sliding under the tongue or the oximeter closing on the fingertip. **Replay** runs it again. Reduced-motion users see the final pose. No device ever shows a value, and the plates simulate no heartbeat or timer.

The caption on every plate states "Line drawing made with AI assistance". Space Apps rules require AI-made material to be acknowledged, so keep that line. The earlier AI raster images were retired. They stay out of the build in the ignored `.impeccable/archive/guides-raster/` folder.

## Integration (for the owner of `Panels.tsx`)

`GuidesPanel({ guide, onSelectGuide, onRecord? })` is the whole Guides dialog body: reading tabs plus the guide card. It reads no store. The monitoring console’s `Panels.tsx` now hosts this component instead of its old private guide implementation:

```tsx
import { GuidesPanel } from "../guides/GuidesPanel";

<GuidesPanel
  guide={guide}
  onSelectGuide={(id) => open("guides", { guide: id })}
  onRecord={(id) => open("record", { recordFor: id })}
/>
```

`VisualGuidesPanel({ initialGuide?, onRecord? })` and `VisualMeasurementGuide({ guide, onRecord? })` remain store-independent. None of these components writes readings or shared state.
