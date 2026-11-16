/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Box3, Mesh, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { prepareModelGeometry } from './modelGeometry';

describe('display preparation of the shipped anatomical assets', () => {
  let female: Object3D;
  let male: Object3D;
  let preparedFemale: Object3D;
  let muscleFit: Object3D;
  let originalSkullNormals: number[];
  beforeAll(async () => {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    [female, male, muscleFit] = await Promise.all(['anatomy-female', 'anatomy-male', 'female-muscles-fit'].map(async name => {
      const bytes = Uint8Array.from(readFileSync(new URL(`../../../public/models/${name}.glb`, import.meta.url)));
      return (await loader.parseAsync(bytes.buffer, '')).scene;
    }));
    originalSkullNormals = Array.from((female.getObjectByName('skull') as Mesh).geometry.getAttribute('normal').array);
    preparedFemale = prepareModelGeometry(female, 'female', muscleFit);
  }, 30_000);

  it('preserves female bone and vessel positions, including the shoulder and forearm', () => {
    const prepared = preparedFemale;
    prepared.updateMatrixWorld(true);
    female.updateMatrixWorld(true);
    const a = new Vector3(), b = new Vector3();
    for (const name of ['skull', 'ribs_l', 'humerus_l', 'forearm_l', 'pelvis', 'femur_l', 'aorta']) {
      const source = female.getObjectByName(name) as Mesh;
      const copy = prepared.getObjectByName(name) as Mesh;
      expect(source, name).toBeInstanceOf(Mesh);
      const src = source.geometry, dst = copy.geometry;
      expect(dst).not.toBe(src);
      expect(dst.index!.count).toBe(src.index!.count);
      let maxShift = 0;
      for (let i = 0; i < src.index!.count; i++) {
        a.fromBufferAttribute(src.getAttribute('position'), src.index!.getX(i)).applyMatrix4(source.matrixWorld);
        b.fromBufferAttribute(dst.getAttribute('position'), dst.index!.getX(i)).applyMatrix4(copy.matrixWorld);
        maxShift = Math.max(maxShift, a.distanceTo(b));
      }
      expect(maxShift, name).toBeLessThan(0.0001);
    }
    expect(new Box3().setFromObject(prepared).getSize(a).distanceTo(new Box3().setFromObject(female).getSize(b))).toBeLessThan(0.0001);
  });

  it('drops only the male genital branches from the female leg vessels', () => {
    const source = female.getObjectByName('arteries_leg_l') as Mesh;
    const copy = preparedFemale.getObjectByName('arteries_leg_l') as Mesh;
    // The dorsal and perineal branches warped from the male model: 948 and 210 triangles.
    expect(source.geometry.index!.count / 3 - copy.geometry.index!.count / 3).toBe(948 + 210);
    // What stays is where it was: every kept corner is one of the source's own positions.
    const sourcePositions = new Set<string>();
    const p = source.geometry.getAttribute('position'), q = copy.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) sourcePositions.add(`${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`);
    for (let i = 0; i < copy.geometry.index!.count; i += 97) {
      const k = copy.geometry.index!.getX(i);
      expect(sourcePositions.has(`${q.getX(k).toFixed(4)},${q.getY(k).toFixed(4)},${q.getZ(k).toFixed(4)}`)).toBe(true);
    }
  });

  it('smooths split skull normals without modifying the cached source', () => {
    const skull = female.getObjectByName('skull') as Mesh;
    const normals = skull.geometry.getAttribute('normal');
    const prepared = preparedFemale;
    const copy = prepared.getObjectByName('skull') as Mesh;
    expect(copy.geometry.getAttribute('position').count).toBeLessThan(skull.geometry.getAttribute('position').count);
    expect(Array.from(normals.array)).toEqual(originalSkullNormals);
  });

  it('replaces the protruding muscle sheets with the fitted overlay, on both sides', () => {
    for (const name of ['gluteal_l', 'gluteal_r', 'chest_muscles_l', 'chest_muscles_r', 'quadriceps_l', 'quadriceps_r']) {
      const mesh = preparedFemale.getObjectByName(name) as Mesh;
      const raw = female.getObjectByName(name) as Mesh;
      expect(mesh.userData.fittedMuscleVertices, name).toBeGreaterThan(0);
      expect(mesh.geometry).not.toBe(raw.geometry);
      const bounds = new Box3().setFromObject(mesh);
      const original = new Box3().setFromObject(raw);
      expect(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)), name).toBeLessThanOrEqual(Math.max(Math.abs(original.min.x), Math.abs(original.max.x)) + 0.002);
      expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
      if (name.startsWith('gluteal')) {
        expect(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)), name).toBeLessThan(0.2);
        expect(original.getSize(new Vector3()).x - bounds.getSize(new Vector3()).x, name).toBeGreaterThan(0.015);
      }
    }
  });

  it('retains the existing relaxed male hands and leaves the cached male asset intact', () => {
    const hand = male.getObjectByName('forearm_l') as Mesh;
    const original = hand.geometry;
    const prepared = prepareModelGeometry(male, 'male');
    const posed = prepared.getObjectByName('forearm_l') as Mesh;
    expect(hand.geometry).toBe(original);
    expect(posed.geometry).not.toBe(original);
    const a = new Vector3().fromBufferAttribute(original.getAttribute('position'), 0);
    const b = new Vector3().fromBufferAttribute(posed.geometry.getAttribute('position'), 0);
    expect(a.distanceTo(b)).toBeGreaterThan(0.001);
  });
});
