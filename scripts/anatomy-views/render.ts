/**
 * Dev tool: renders orthographic views of the Open Anatomy skin (CC BY 4.0) as mask, normal and depth passes.
 * Open /scripts/anatomy-views/ on the dev server; scripts/trace-anatomy.py turns the masks into line art.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
const out = document.getElementById('out')!;
type View = { name: string; eye: [number, number, number]; target: [number, number, number]; half: [number, number]; clip?: [number, number, number, number][]; px: number };
const views: View[] = [
  { name: 'profile', eye: [-2, 1.53, 0], target: [0, 1.53, 0], half: [0.16, 0.22], px: 1000 },
  { name: 'bust', eye: [0, 1.45, 2], target: [0, 1.45, 0], half: [0.3, 0.32], px: 900 },
  { name: 'body', eye: [-3, 0.86, 0], target: [0, 0.86, 0], half: [0.3, 0.88], px: 1400 },
  { name: 'palm_l', eye: [0.27, 0.88, 2], target: [0.27, 0.88, 0], half: [0.08, 0.2], clip: [[1, 0, 0, -0.195]], px: 1200 },
  { name: 'dorsal_l', eye: [0.27, 0.86, -2], target: [0.27, 0.86, 0], half: [0.08, 0.15], clip: [[1, 0, 0, -0.205]], px: 1000 },
  { name: 'body_top', eye: [0, 0.95, 2], target: [0, 0.95, 0], half: [0.36, 0.8], px: 1400 },
  { name: 'dorsal_r', eye: [-0.27, 0.86, -2], target: [-0.27, 0.86, 0], half: [0.08, 0.15], clip: [[-1, 0, 0, -0.205]], px: 1000 },
  { name: 'side_l', eye: [2, 0.84, 0.05], target: [0.27, 0.84, 0.05], half: [0.08, 0.13], clip: [[1, 0, 0, -0.205]], px: 1000 },
];
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('/models/anatomy-male.glb', (g) => {
  let skin: THREE.Mesh | null = null;
  g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.parent?.name === 'skin') skin = o as THREE.Mesh; });
  if (!skin) { out.textContent = 'no skin'; return; }
  const s = skin as THREE.Mesh;
  const src = s.geometry.attributes.position;
  const pos = new Float32Array(src.count * 3);
  for (let i = 0; i < src.count; i++) { pos[i * 3] = src.getX(i); pos[i * 3 + 1] = src.getY(i); pos[i * 3 + 2] = src.getZ(i); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (s.geometry.index) geo.setIndex(Array.from(s.geometry.index.array as ArrayLike<number>));
  geo.applyMatrix4(s.matrixWorld);
  if (location.search.includes('obj')) {
    const p = geo.attributes.position, idx = geo.index!;
    const lines: string[] = ['o skin'];
    for (let i = 0; i < p.count; i++) lines.push(`v ${p.getX(i).toFixed(5)} ${p.getY(i).toFixed(5)} ${p.getZ(i).toFixed(5)}`);
    for (let i = 0; i < idx.count; i += 3) lines.push(`f ${idx.getX(i) + 1} ${idx.getX(i + 1) + 1} ${idx.getX(i + 2) + 1}`);
    out.textContent = lines.join(String.fromCharCode(10));
    return;
  }
  geo.computeVertexNormals();
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.localClippingEnabled = true;
  const res: Record<string, string> = {};
  for (const v of views) {
    const aspect = v.half[0] / v.half[1];
    const H = v.px, W = Math.round(v.px * aspect);
    renderer.setSize(W, H, false);
    const cam = new THREE.OrthographicCamera(-v.half[0], v.half[0], v.half[1], -v.half[1], 0.01, 10);
    cam.position.set(...v.eye); cam.up.set(0, 1, 0); cam.lookAt(new THREE.Vector3(...v.target)); cam.updateMatrixWorld();
    const planes = (v.clip ?? []).map(([a, b, c, d]) => new THREE.Plane(new THREE.Vector3(a, b, c), d));
    for (const kind of ['mask', 'normal', 'depth'] as const) {
      const mat = kind === 'mask' ? new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, clippingPlanes: planes })
        : kind === 'normal' ? new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, clippingPlanes: planes })
        : new THREE.MeshDepthMaterial({ side: THREE.DoubleSide, clippingPlanes: planes });
      const scene = new THREE.Scene(); scene.add(new THREE.Mesh(geo, mat));
      renderer.setClearColor(0x000000, 1);
      if (kind === 'depth') { cam.near = 1.5; cam.far = 4.5; cam.updateProjectionMatrix(); } else { cam.near = 0.01; cam.far = 10; cam.updateProjectionMatrix(); }
      renderer.render(scene, cam);
      res[`${v.name}.${kind}`] = renderer.domElement.toDataURL('image/png');
    }
  }
  out.textContent = JSON.stringify(res);
}, undefined, (e) => { out.textContent = 'ERR ' + e; });
