# 2D body fallback (RF-15)

`BodyFallback2D({ reason? })` shows the six body systems when the 3D twin cannot run. Each zone has its code, a status shape and a word. Selecting a zone or its chip calls the store's `select(id)`, exactly like a 3D pin, so the same inspector card opens.

`Scene.tsx` uses it in three places, and nowhere else changed: devices without WebGL (`webgl.ts`), the scene's error boundary, and the canvas fallback. `?twin=2d` forces it for demos and testing.

The figure is the front outline of the Open Anatomy skin (CC BY 4.0), traced like the guide plates (see `../../guides/README.md`). Status uses the existing watch and alert tokens; styles live in `body-fallback-2d.css`.
