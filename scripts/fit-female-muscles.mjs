// Rebuild with: node --experimental-strip-types scripts/fit-female-muscles.mjs
// Source anatomy-female.glb stays unchanged; the derived overlay contains muscle meshes only.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { fitFemaleMuscles } from '../src/features/twin/femaleMuscles.ts';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
  async readAsDataURL(blob) { this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.(); }
};
const original = Uint8Array.from(readFileSync(new URL('../public/models/anatomy-female.glb', import.meta.url)));
const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(original.buffer, '');
fitFemaleMuscles(scene);
const overlay = new Group();
const material = new MeshStandardMaterial();
scene.traverse(node => {
  if (!(node instanceof Mesh) || node.userData.fittedMuscleVertices === undefined) return;
  const mesh = new Mesh(node.geometry.clone().applyMatrix4(node.matrixWorld), material);
  mesh.name = node.name;
  mesh.userData = { correctedVertices: node.userData.fittedMuscleVertices };
  overlay.add(mesh);
  console.log(node.name, mesh.geometry.getAttribute('position').count, 'vertices;', mesh.userData.correctedVertices, 'fitted');
});
const output = await new GLTFExporter().parseAsync(overlay, { binary: true });
const target = fileURLToPath(new URL('../public/models/female-muscles-fit.glb', import.meta.url));
writeFileSync(target, Buffer.from(output));
console.log(`Wrote ${output.byteLength} bytes to ${target}`);
