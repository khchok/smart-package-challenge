import { describe, expect, it } from "vitest";
import { LockerAssignment } from "../../src/domain/LockerAssignment";
import { PickupCode } from "../../src/domain/PickupCode";
import { AssignmentRepository } from "../../src/repositories/AssignmentRepository";
import { PickupCodeGenerator } from "../../src/services/PickupCodeGenerator";

describe("PickupCodeGenerator", () => {
  it("generates a PickupCode with a 6-character value", () => {
    const repo = new AssignmentRepository();
    const gen = new PickupCodeGenerator(repo);
    expect(gen.generate().value).toHaveLength(6);
  });

  it("generates a code not already in use", () => {
    const repo = new AssignmentRepository();
    repo.save(new LockerAssignment("L1", "PKG-001", new PickupCode("AAAAAA")));
    const gen = new PickupCodeGenerator(repo);
    expect(gen.generate().value).not.toBe("AAAAAA");
  });
});
