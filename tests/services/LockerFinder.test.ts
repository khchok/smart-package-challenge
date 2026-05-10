import { beforeEach, describe, expect, it } from "vitest";
import { Locker } from "../../src/domain/Locker";
import { LockerSize } from "../../src/domain/types";
import { LockerRepository } from "../../src/repositories/LockerRepository";
import { LockerFinder } from "../../src/services/LockerFinder";

describe("", () => {
  let repo: LockerRepository;
  let finder: LockerFinder;

  beforeEach(() => {
    repo = new LockerRepository();
    finder = new LockerFinder(repo);
  });

  it("returns null when no locker exist", () => {
    expect(finder.findSmallestFit(LockerSize.SMALL)).toBeNull();
  });

  it("returns the only available locker that fits", () => {
    repo.save(new Locker("L1", LockerSize.MEDIUM));
    expect(finder.findSmallestFit(LockerSize.SMALL)?.id).toBe("L1");
  });

  it("returns the smallest fitting locker when multiple are available", () => {
    repo.save(new Locker("L1", LockerSize.LARGE));
    repo.save(new Locker("L2", LockerSize.MEDIUM));
    repo.save(new Locker("L3", LockerSize.SMALL));
    expect(finder.findSmallestFit(LockerSize.SMALL)?.id).toBe("L3");
  });

  it("skips occupied lockers", () => {
    const small = new Locker("L1", LockerSize.SMALL);
    small.occupy();
    repo.save(small);
    repo.save(new Locker("L2", LockerSize.MEDIUM));
    expect(finder.findSmallestFit(LockerSize.SMALL)?.id).toBe("L2");
  });

  it("returns null when no locker is large enough", () => {
    repo.save(new Locker("L1", LockerSize.SMALL));
    expect(finder.findSmallestFit(LockerSize.LARGE)).toBeNull();
  });
});
