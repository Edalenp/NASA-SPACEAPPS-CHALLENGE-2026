/// <reference lib="webworker" />
import { Matrix4, Vector3 } from 'three';
import { flowCoordinates, type VesselArrays } from './bloodFlow';

/** Measures blood-flow coordinates off the main thread, one vessel per message. */
self.onmessage = (event: MessageEvent<{ id: string; vessel: VesselArrays; matrix: number[]; heart: [number, number, number]; metres: number }>) => {
  const { id, vessel, matrix, heart, metres } = event.data;
  const flow = flowCoordinates(vessel, new Matrix4().fromArray(matrix), new Vector3(...heart), metres);
  (self as unknown as Worker).postMessage({ id, flow }, [flow.position.buffer, flow.normal.buffer, flow.index.buffer, flow.coord.buffer]);
};
