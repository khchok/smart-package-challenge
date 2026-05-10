import { beforeEach, describe, expect, it } from "vitest";
import { Locker } from "../../src/domain/Locker";
import { LockerSize } from "../../src/domain/types";
import { LockerRepository } from "../../src/repositories/LockerRepository";

describe("", () => {
  let repo: LockerRepository;

  beforeEach(() => {
    repo = new LockerRepository();
  });

  it("saves and retrives a locker by id", () => {
    const locker = new Locker("L1", LockerSize.SMALL);
    repo.save(locker);
    expect(repo.findById("L1")).toBe(locker);
  });

  it("returns undefined for unknown id", () => {
    expect(repo.findById("UNKNOWN")).toBeUndefined();
  });

  it("returns all lockers", () => {
    repo.save(new Locker("L1", LockerSize.SMALL));
    repo.save(new Locker("L2", LockerSize.LARGE));
    expect(repo.findAll()).toHaveLength(2);
  });

  it("returns only available lockers that can fit the given size", () => {
    const small = new Locker("L1", LockerSize.SMALL);
    const medium = new Locker("L2", LockerSize.MEDIUM);
    const occupied = new Locker("L3", LockerSize.LARGE);
    occupied.occupy();
    repo.save(small);
    repo.save(medium);
    repo.save(occupied);
    const result = repo.findAvailableBySize(LockerSize.SMALL);
    expect(result.map((l) => l.id)).toEqual(
      expect.arrayContaining(["L1", "L2"]),
    );
    expect(result.map((l) => l.id)).not.toContain("L3");
  });
});
