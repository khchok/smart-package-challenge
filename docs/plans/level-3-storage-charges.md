# Level 3 — Storage Charges

**Goal:** Calculate a tiered storage fee based on how long a package stayed in the locker. The fee is returned when the customer retrieves their package.

**Pricing rules:**
- Days 1–5: $1.00 / day
- Days 6–10: $2.00 / day
- Days 11+: $3.00 / day
- Any partial day counts as a full day
- Minimum charge is always 1 day (even if retrieved seconds after storing)

**What you'll build:**
- `StorageChargeCalculator` service
- Update `PackageRetrievalService` to use it

**Prerequisite:** Level 2 complete.

---

## Task 1: StorageChargeCalculator

**Files:** `src/services/StorageChargeCalculator.ts`, `tests/services/StorageChargeCalculator.test.ts`

### Write the test first

**`tests/services/StorageChargeCalculator.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { StorageChargeCalculator } from '../../src/services/StorageChargeCalculator';

describe('StorageChargeCalculator', () => {
  const calc = new StorageChargeCalculator();

  // Helper: returns a Date exactly N days after a fixed base date
  const at = (daysAfterBase: number): Date => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() + daysAfterBase);
    return d;
  };

  const base = at(0); // 2026-01-01

  it('charges $1.00/day for days 1–5', () => {
    expect(calc.calculate(base, at(1))).toBe(1.00);
    expect(calc.calculate(base, at(3))).toBe(3.00);
    expect(calc.calculate(base, at(5))).toBe(5.00);
  });

  it('charges $2.00/day for days 6–10', () => {
    // 5×$1 + 2×$2 = $9
    expect(calc.calculate(base, at(7))).toBe(9.00);
    // 5×$1 + 5×$2 = $15
    expect(calc.calculate(base, at(10))).toBe(15.00);
  });

  it('charges $3.00/day for days beyond 10', () => {
    // 5×$1 + 5×$2 + 3×$3 = $5 + $10 + $9 = $24
    expect(calc.calculate(base, at(13))).toBe(24.00);
  });

  it('rounds partial days up to a full day', () => {
    const almostOneDay = new Date(base.getTime() + 23 * 60 * 60 * 1000);
    expect(calc.calculate(base, almostOneDay)).toBe(1.00);
  });

  it('charges at least 1 day even for same-day retrieval', () => {
    const oneMinuteLater = new Date(base.getTime() + 60_000);
    expect(calc.calculate(base, oneMinuteLater)).toBe(1.00);
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/services/StorageChargeCalculator.test.ts
```

### Write the implementation

**`src/services/StorageChargeCalculator.ts`:**

```typescript
const RATE = 1.00;

export class StorageChargeCalculator {
  calculate(storedAt: Date, retrievedAt: Date = new Date()): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.ceil((retrievedAt.getTime() - storedAt.getTime()) / msPerDay));

    let charge = 0;
    for (let day = 1; day <= days; day++) {
      if (day <= 5) charge += RATE;
      else if (day <= 10) charge += RATE * 2;
      else charge += RATE * 3;
    }
    return Math.round(charge * 100) / 100;
  }
}
```

> `Date.getTime()` returns milliseconds since Unix epoch (1 Jan 1970). Subtracting two Date values gives duration in milliseconds. `Math.ceil` rounds any partial day up. `retrievedAt` defaults to `new Date()` (right now) — tests inject a fixed value for deterministic results.

Run — expect 5 passed:
```bash
npm run test:run -- tests/services/StorageChargeCalculator.test.ts
```

**Commit:**
```bash
git add src/services/StorageChargeCalculator.ts tests/services/StorageChargeCalculator.test.ts
git commit -m "feat(l3): add StorageChargeCalculator with tiered pricing"
```

---

## Task 2: Wire charges into PackageRetrievalService

**Files:** `src/services/PackageRetrievalService.ts` (update), `tests/services/PackageRetrievalService.test.ts` (add tests)

### Add two new tests to the existing test file

Open `tests/services/PackageRetrievalService.test.ts` and add these two tests inside the existing `describe('PackageRetrievalService', ...)` block (after the existing tests):

```typescript
  it('returns a storage charge of at least $1.00 on retrieval', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.MEDIUM));
    const stored = await storageService.store(LockerSize.SMALL, 'Jane');
    const result = retrievalService.retrieve(stored.lockerId, stored.pickupCode);
    expect(result.storageCharge).toBeGreaterThanOrEqual(1.00);
  });

  it('calculates charge based on storedAt timestamp', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.MEDIUM));
    const { LockerAssignment } = await import('../../src/domain/LockerAssignment');
    const { PickupCode } = await import('../../src/domain/PickupCode');
    const locker = lockerRepo.findById('L1')!;
    locker.occupy();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const assignment = new LockerAssignment('L1', 'PKG-TEST', new PickupCode('FIXED1'), threeDaysAgo);
    assignmentRepo.save(assignment);
    const result = retrievalService.retrieve('L1', 'FIXED1');
    expect(result.storageCharge).toBe(3.00);
  });
```

Run — these two new tests should fail (storageCharge still returns 0):
```bash
npm run test:run -- tests/services/PackageRetrievalService.test.ts
```

### Update `src/services/PackageRetrievalService.ts`

Replace the entire file:

```typescript
import { LockerRepository } from '../repositories/LockerRepository';
import { AssignmentRepository } from '../repositories/AssignmentRepository';
import { StorageChargeCalculator } from './StorageChargeCalculator';

export interface RetrievalResult {
  packageId: string;
  storageCharge: number;
}

export class PackageRetrievalService {
  private readonly calculator = new StorageChargeCalculator();

  constructor(
    private readonly lockerRepo: LockerRepository,
    private readonly assignmentRepo: AssignmentRepository,
  ) {}

  retrieve(lockerId: string, pickupCode: string): RetrievalResult {
    const locker = this.lockerRepo.findById(lockerId);
    if (!locker) throw new Error(`Unknown locker: ${lockerId}`);

    const assignment = this.assignmentRepo.findByLockerId(lockerId);
    if (!assignment) throw new Error(`Locker ${lockerId} is not occupied`);

    if (!assignment.pickupCode.matches(pickupCode)) {
      throw new Error('Invalid pickup code');
    }

    const storageCharge = this.calculator.calculate(assignment.storedAt);

    locker.release();
    this.assignmentRepo.remove(lockerId);

    return { packageId: assignment.packageId, storageCharge };
  }
}
```

Run — expect 8 passed:
```bash
npm run test:run -- tests/services/PackageRetrievalService.test.ts
```

Run all tests:
```bash
npm run test:run
```

### Smoke test

```bash
npm run dev -- locker add --id L1 --size medium
npm run dev -- store --size small --owner "Jane Doe"
# Copy the pickup code, then retrieve immediately:
npm run dev -- retrieve --locker L1 --code <YOUR_CODE>
```

Expected (retrieved same day = 1 day minimum):
```
Package <uuid> retrieved | Storage charge: $1.00
```

**Commit:**
```bash
git add src/services/PackageRetrievalService.ts tests/services/PackageRetrievalService.test.ts
git commit -m "feat(l3): wire StorageChargeCalculator into PackageRetrievalService"
```

---

## Level 3 complete ✓

Storage charges now appear on retrieval. The tiered rate kicks in automatically based on elapsed days. Continue to `level-4-concurrent-requests.md`.
