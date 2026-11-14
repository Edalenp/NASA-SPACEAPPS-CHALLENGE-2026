import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAll, db } from "./db";
import { useMission } from "./mission";
import { crew } from "../data/mission";

beforeEach(async () => {
  await clearAll();
  useMission.setState({ busy: false });
  await useMission.getState().hydrate();
});
describe("monitoring persistence", () => {
  it("saves canonical measurements and restores them after rehydration", async () => {
    await useMission.getState().record("pulse", 72);
    expect(await db.measurements.count()).toBe(1);
    expect(await db.entries.count()).toBe(0);
    useMission.setState({ entries: [] });
    await useMission.getState().hydrate();
    expect(useMission.getState().readings.pulse).toBe(72);
    expect((await db.measurements.toArray())[0]).toMatchObject({
      crewMemberId: crew.code,
      type: "heartRate",
      unit: "bpm",
      source: "manual",
    });
  });
  it("persists categorical observations and oxygen without changing the schema", async () => {
    await useMission.getState().record("consciousness", "voice");
    await useMission.getState().record("oxygen", "oxygen");
    await useMission.getState().hydrate();
    expect(await db.observations.count()).toBe(1);
    expect(useMission.getState().readings).toMatchObject({
      consciousness: "voice",
      oxygen: "oxygen",
    });
  });
  it("rejects invalid values and invalid blood pressure pairs before saving", async () => {
    await expect(useMission.getState().record("pulse", 400)).rejects.toThrow();
    await useMission.getState().record("systolic", 110);
    await expect(
      useMission.getState().record("diastolic", 120),
    ).rejects.toThrow("lower");
    expect(await db.measurements.count()).toBe(1);
  });
  it("imports legacy records once and retains original mood", async () => {
    await db.entries.bulkAdd([
      { indicator: "pulse", value: 75, timestamp: new Date().toISOString() },
      { indicator: "mood", value: 4, timestamp: new Date().toISOString() },
    ]);
    await useMission.getState().hydrate();
    await useMission.getState().hydrate();
    expect(await db.measurements.count()).toBe(1);
    expect(await db.entries.count()).toBe(2);
    expect(useMission.getState().entries).toHaveLength(2);
    expect(useMission.getState().readings.mood).toBeNull();
  });
  it("loads a deterministic demo idempotently without overwriting manual data", async () => {
    await useMission.getState().record("pulse", 72);
    await useMission.getState().loadSimulation();
    const count = await db.measurements.count();
    await useMission.getState().loadSimulation();
    expect(await db.measurements.count()).toBe(count);
    expect(count).toBe(1801);
    expect(useMission.getState().readings.pulse).toBe(72);
  });
  it("surfaces a failed write without pretending the reading was saved", async () => {
    const spy = vi
      .spyOn(db.measurements, "put")
      .mockRejectedValueOnce(new Error("Storage quota exceeded"));
    await expect(useMission.getState().record("pulse", 72)).rejects.toThrow(
      "Storage quota",
    );
    expect(useMission.getState().readings.pulse).toBeNull();
    expect(useMission.getState().storageError).toContain("Could not confirm");
    spy.mockRestore();
  });
});
