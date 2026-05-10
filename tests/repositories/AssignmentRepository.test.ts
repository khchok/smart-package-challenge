import { beforeEach, describe, expect, it } from "vitest";
import { LockerAssignment } from "../../src/domain/LockerAssignment";
import { PickupCode } from "../../src/domain/PickupCode";
import { AssignmentRepository } from "../../src/repositories/AssignmentRepository";

describe("AssignmentRepository", () => {
  let repo: AssignmentRepository;

  beforeEach(() => {
    repo = new AssignmentRepository();
  });
  const makeAssignment = (lockerId: string, code: string) =>
    new LockerAssignment(lockerId, "PKG-001", new PickupCode(code));

  it("saves and finds by locker id", () => {
    const a = makeAssignment("L1", "ABC123");
    repo.save(a);
    expect(repo.findByLockerId("L1")).toBe(a);
  });

  it("returns undefined for unknown locker id", () => {
    expect(repo.findByLockerId("L1")).toBeUndefined();
  });

  it("removes an assignment", () => {
    repo.save(makeAssignment("L1", "ABC123"));
    repo.remove("L1");
    expect(repo.findByLockerId("L1")).toBeUndefined();
  });

  it("detects when a code is already in use", () => {
    repo.save(makeAssignment("L1", "ABC123"));
    expect(repo.isCodeInUse("ABC123")).toBe(true);
    expect(repo.isCodeInUse("XYZ999")).toBe(false);
  });
});
