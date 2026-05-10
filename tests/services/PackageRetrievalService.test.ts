import { beforeEach, describe, expect, it } from "vitest";
import { Locker } from "../../src/domain/Locker";
import { LockerSize } from "../../src/domain/types";
import { AssignmentRepository } from "../../src/repositories/AssignmentRepository";
import { LockerRepository } from "../../src/repositories/LockerRepository";
import { PackageRetrievalService } from "../../src/services/PackageRetrievalService";
import { PackageStorageService } from "../../src/services/PackageStorageService";

describe("PackageRetrievalService", () => {
  let lockerRepo: LockerRepository;
  let assignmentRepo: AssignmentRepository;
  let storageService: PackageStorageService;
  let retrievalService: PackageRetrievalService;

  beforeEach(() => {
    lockerRepo = new LockerRepository();
    assignmentRepo = new AssignmentRepository();
    storageService = new PackageStorageService(lockerRepo, assignmentRepo);
    retrievalService = new PackageRetrievalService(lockerRepo, assignmentRepo);
  });

  it("retrieves a package and returns the package id", async () => {
    lockerRepo.save(new Locker("L1", LockerSize.MEDIUM));
    const stored = await storageService.store(LockerSize.SMALL, "Jane");
    const result = retrievalService.retrieve(
      stored.lockerId,
      stored.pickupCode,
    );
    expect(result.packageId).toBeDefined();
  });

  it("frees the locker after retrieval", async () => {
    const locker = new Locker("L1", LockerSize.MEDIUM);
    lockerRepo.save(locker);
    const stored = await storageService.store(LockerSize.SMALL, "Jane");
    retrievalService.retrieve(stored.lockerId, stored.pickupCode);
    expect(locker.isAvailable()).toBe(true);
  });

  it("removes the assignment after retrieval", async () => {
    lockerRepo.save(new Locker("L1", LockerSize.MEDIUM));
    const stored = await storageService.store(LockerSize.SMALL, "Jane");
    retrievalService.retrieve(stored.lockerId, stored.pickupCode);
    expect(assignmentRepo.findByLockerId(stored.lockerId)).toBeUndefined();
  });

  it("throws for an unknown locker ID", () => {
    expect(() => retrievalService.retrieve("UNKNOWN", "ABC123")).toThrow(
      "Unknown locker: UNKNOWN",
    );
  });

  it("throws when the locker is not occupied", () => {
    lockerRepo.save(new Locker("L1", LockerSize.SMALL));
    expect(() => retrievalService.retrieve("L1", "ABC123")).toThrow(
      "Locker L1 is not occupied",
    );
  });

  it("throws for an incorrect pickup code", async () => {
    lockerRepo.save(new Locker("L1", LockerSize.MEDIUM));
    const stored = await storageService.store(LockerSize.SMALL, "Jane");
    expect(() => retrievalService.retrieve(stored.lockerId, "WRONG1")).toThrow(
      "Invalid pickup code",
    );
  });
});
