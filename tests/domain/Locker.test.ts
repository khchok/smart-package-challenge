import { beforeEach, describe, expect, it } from "vitest";
import { Locker } from "../../src/domain/Locker";
import { LockerSize, LockerStatus } from "../../src/domain/types";
describe("Locker", () => {
  let locker: Locker;

  beforeEach(() => {
    locker = new Locker("L1", LockerSize.MEDIUM);
  });

  it("is available when created", () => {
    expect(locker.isAvailable()).toBe(true);
    expect(locker.getStatus()).toBe(LockerStatus.AVAILABLE);
  });

  it("becomes occupied after being occupied", () => {
    locker.occupy();
    expect(locker.isAvailable()).toBe(false);
    expect(locker.getStatus()).toBe(LockerStatus.OCCUPIED);
  });

  it("becomes available after being released", () => {
    locker.occupy();
    locker.release();
    expect(locker.isAvailable()).toBe(true);
    expect(locker.getStatus()).toBe(LockerStatus.AVAILABLE);
  });

  it("throws when occupying an already occupied locker", () => {
    locker.occupy();
    expect(() => locker.occupy()).toThrow("already occupied");
  });

  it("throws when releasing an already available locker", () => {
    expect(() => locker.release()).toThrow("already available");
  });

  it("can fit a package of the same size", () => {
    expect(locker.canFit(LockerSize.MEDIUM)).toBe(true);
  });

  it("can fit a smaller package", () => {
    expect(locker.canFit(LockerSize.SMALL)).toBe(true);
  });

  it("cannot fit a larger package", () => {
    expect(locker.canFit(LockerSize.LARGE)).toBe(false);
  });
});
