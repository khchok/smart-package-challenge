import { describe, expect, it } from "vitest";
import { PickupCode } from "../../src/domain/PickupCode";

describe("PickupCode", () => {
  it("stores the code value", () => {
    const code = new PickupCode("123456");
    expect(code.value);
  });

  it("throws for codes shorter than 6 characters", () => {
    expect(() => new PickupCode("AB12")).toThrow("at least 6 characters");
  });

  it("matches the correct input", () => {
    const code = new PickupCode("ABC123");
    expect(code.matches("ABC123")).toBe(true);
  });

  it("does not match an incorrect input", () => {
    const code = new PickupCode("ABC123");
    expect(code.matches("XYZ999")).toBe(false);
  });
});
