import { describe, expect, it } from "vitest";
import { StorageChargeCalculator } from "../../src/services/StorageChargeCalculator";

describe("StorageChargeCalculator", () => {
  const calc = new StorageChargeCalculator();

  // Helper: returns a Date exactly N days after a fixed base date
  const at = (daysAfterBase: number): Date => {
    const d = new Date("2026-01-01T00:00:00.000Z");
    d.setUTCDate(d.getUTCDate() + daysAfterBase);
    return d;
  };

  const base = at(0); // 2026-01-01

  it("charges $1.00/day for days 1–5", () => {
    expect(calc.calculate(base, at(1))).toBe(1.0);
    expect(calc.calculate(base, at(3))).toBe(3.0);
    expect(calc.calculate(base, at(5))).toBe(5.0);
  });

  it("charges $2.00/day for days 6–10", () => {
    // 5×$1 + 2×$2 = $9
    expect(calc.calculate(base, at(7))).toBe(9.0);
    // 5×$1 + 5×$2 = $15
    expect(calc.calculate(base, at(10))).toBe(15.0);
  });

  it("charges $3.00/day for days beyond 10", () => {
    // 5×$1 + 5×$2 + 3×$3 = $5 + $10 + $9 = $24
    expect(calc.calculate(base, at(13))).toBe(24.0);
  });

  it("rounds partial days up to a full day", () => {
    const almostOneDay = new Date(base.getTime() + 23 * 60 * 60 * 1000);
    expect(calc.calculate(base, almostOneDay)).toBe(1.0);
  });

  it("charges at least 1 day even for same-day retrieval", () => {
    const oneMinuteLater = new Date(base.getTime() + 60_000);
    expect(calc.calculate(base, oneMinuteLater)).toBe(1.0);
  });
});
