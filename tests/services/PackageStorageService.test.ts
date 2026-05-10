import { beforeEach, describe, expect, it } from "vitest";
import { Locker } from "../../src/domain/Locker";
import { LockerSize } from "../../src/domain/types";
import { AssignmentRepository } from "../../src/repositories/AssignmentRepository";
import { LockerRepository } from "../../src/repositories/LockerRepository";
import { PackageStorageService } from "../../src/services/PackageStorageService";

describe("PackageStorageService", () => {
  let lockerRepo: LockerRepository;
  let assignmentRepo: AssignmentRepository;
  let service: PackageStorageService;

  beforeEach(() => {
    lockerRepo = new LockerRepository();
    assignmentRepo = new AssignmentRepository();
    service = new PackageStorageService(lockerRepo, assignmentRepo);
  });

  it("stores a package and returns locker ID and a 6-char pickup code", async () => {
    lockerRepo.save(new Locker("L1", LockerSize.MEDIUM));
    const result = await service.store(LockerSize.SMALL, "Jane Doe");
    expect(result.lockerId).toBe("L1");
    expect(result.pickupCode).toHaveLength(6);
  });

  it("marks the locker as occupied after storing", async () => {
    const locker = new Locker("L1", LockerSize.MEDIUM);
    lockerRepo.save(locker);
    await service.store(LockerSize.SMALL, "Jane Doe");
    expect(locker.isAvailable()).toBe(false);
  });

  it("creates an assignment in the repository", async () => {
    lockerRepo.save(new Locker("L1", LockerSize.SMALL));
    const result = await service.store(LockerSize.SMALL, "Jane Doe");
    expect(assignmentRepo.findByLockerId(result.lockerId)).toBeDefined();
  });

  it("throws when no locker can fit the package", async () => {
    await expect(service.store(LockerSize.LARGE, "Jane Doe")).rejects.toThrow(
      "No suitable locker available for size LARGE",
    );
  });

  it("assigns the smallest available locker", async () => {
    lockerRepo.save(new Locker("L1", LockerSize.LARGE));
    lockerRepo.save(new Locker("L2", LockerSize.MEDIUM));
    const result = await service.store(LockerSize.SMALL, "Jane");
    expect(result.lockerId).toBe("L2");
  });
});
