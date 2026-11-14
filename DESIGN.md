# VITRUVIO design system

Version 0.2, 2026-11-14. Written with AI assistance (Claude) and pending team review.
v0.2 merges the console prototype on `demo-vitruvio` (Santiago) into v0.1. Tokens live in `src/styles/tokens.css`.
This file is the short version for anyone, human or agent, who writes UI for the product.

## The idea

A calm instrument inside a habitat for reading your own body. Grey means fine. Colour means a body needs attention.

## What changed in v0.2

| Topic | v0.1 | v0.2 | Why |
| --- | --- | --- | --- |
| Neutrals | Cold ceramic and near-black graphite | Warm sage habitat greys; night is olive, never black | The prototype's cabin feels lived-in and reads better for long use |
| Type | Archivo + Martian Mono | IBM Plex Sans + IBM Plex Mono | One family, more legible, already in the prototype |
| Watch | Hazard yellow `#f2b705` | Burnt amber `#965721` / `#e1ad76` | Calmer, sits in the habitat palette |
| Alert and Emergency | Signal orange `#f0421c` | Brick `#a33f33` / `#e9a095` | Same reason |
| Twin | Contour rings | Real anatomy (Open Anatomy 3D) in a procedural cabin, three layers | Judges recognise organs at a glance |
| Mission ring | Around a plate | Laid on the deck around the crew member | Keeps the ring, gives the 3D stage a floor |
| Systems list | Plain list | Dark console plate | Strong anchor from the prototype |
| Wordmark | Drawn, no rule | Plex Bold, overline, tagline "Autonomous crew health", mark on the left | Prototype lockup, plus our mark |

Corrected from the prototype: no `®` (the name is not registered), no green for "normal", vessels and heart stay grey
until their system needs attention, mono labels never below 11px, emergency is a full screen, not a dialog.

## Colour

| Token | Day | Night | Use |
| --- | --- | --- | --- |
| `--vt-ground` | `#e8e9e1` | `#292e25` | Screen field |
| `--vt-plate` | `#f0f0e9` | `#30362b` | Inspector, dialogs |
| `--vt-recess` | `#dfe1d7` | `#383f33` | Baseline bands, hover |
| `--vt-console` | `#2c3229` | `#20251d` | The systems plate |
| `--vt-ink` | `#242821` | `#ececde` | Text, lines, primary action |
| `--vt-ink-3` | `#596151` | `#b2b9a5` | Labels and units |
| `--vt-line` | `#c4cabb` | `#48503f` | Hairlines |
| `--vt-select` | `#708c77` | `#8fa592` | Selection tint on the twin, not a state |
| `--vt-watch` | `#965721` | `#e1ad76` | Outside the personal usual range |
| `--vt-alert` | `#a33f33` | `#e9a095` | A NEWS2 parameter scores 3, and the Emergency door |
| `--vt-on-status` | `#f4f4ec` | `#1d1f1a` | Text on a watch or alert fill |

Rules:

- Status is the only colour. A healthy screen is grey. There is no green.
- Every state carries a shape and a word: ● Normal, ▲ Watch, ◆ Alert, — No data.
- On the twin, a watch or alert system is tinted like a highlighter; the selected system gets the sage tint.
- Brick has two jobs, Alert and the Emergency door. Nothing else uses it.

## Type

- **IBM Plex Sans** (SIL OFL) for all text and readouts. **IBM Plex Mono** for values, units and labels only.
- Scale: 72 readout (one per screen), 40, 28, 22, 18, 15 body, 13, 11 micro (mono, uppercase, 0.06em tracking).
- 11px is the floor. Body text stays under 68 characters per line. Fonts are self-hosted through `@fontsource`.

## Shape, space, motion

- 4px grid. Radius 2px on controls, 4px on panels. Lines are 1px; selection inverts to a solid ink block.
- Shadow only under floating panels. No cards inside cards.
- The 10px chamfer belongs to the Emergency door.
- One easing, `cubic-bezier(0.16, 1, 0.3, 1)`; 120ms hover, 220ms panels. The 3D view renders on demand. Respect reduced motion.

## Graphic system

1. **Mission ring** on the deck: one tick per mission day, past in ink, future in grey, flagged days longer and amber.
2. **Anatomical twin**: anatomy, skeleton and surface layers; pins carry the system number.
3. **Leader line** from the selected system's pin.
4. **Baseline ruler**: a grey band for the usual range and a needle for today.
5. **Trend ruler**: one tick per sol, a longer one every five, the usual range as a band, triangles on days outside it.
6. **Console plate**: the dark list of body systems.

## Voice

English, sentences under 15 words, second person, every number with its unit, buttons start with a verb.
"Systolic pressure is 8 mmHg below usual." Never "Warning! Abnormal blood pressure detected."
The product suggests and explains. It never diagnoses and never names a drug or a dose.

## Emergency mode

Fixed dark ground, white text, one instruction per screen under 10 words, at most two answers, buttons at least 88px
tall, no twin and no animation. Only the timer moves, in `--vt-emg-signal`. Exit is always visible.

## Do not

Gradients, glow, glass, neon, holograms, decorative icons, emoji, gradient text, side-stripe accents, green for
"good", a second accent colour, the `®` symbol, mono text under 11px.

## Logo

The mark is Leonardo's construction: a square (the cabin) and a circle (the orbit) on one ground line, circle radius
0.607 of the side, a brick dot at the circle's centre (the person). Lockup: mark, then "VITRUVIO" in Plex Sans Bold
under a 2px overline, then the tagline in Plex Mono. Do not stretch, recolour, fill, tilt or move the dot.
