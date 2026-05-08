# Level 2 — Package Retrieval

**Goal:** Allow customers to retrieve their package using a locker ID and pickup code. The locker should become available again after retrieval.

**What you'll build:**
- `PackageRetrievalService` with full validation
- `retrieve` CLI command

**Prerequisite:** Level 1 complete.

---

## Task 1: PackageRetrievalService

**Files:** `src/services/PackageRetrievalService.ts`, `tests/services/PackageRetrievalService.test.ts`

### Write the test first

**`tests/services/PackageRetrievalService.test.ts`:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PackageRetrievalService } from '../../src/services/PackageRetrievalService';
import { PackageStorageService } from '../../src/services/PackageStorageService';
import { LockerRepository } from '../../src/repositories/LockerRepository';
import { AssignmentRepository } from '../../src/repositories/AssignmentRepository';
import { Locker } from '../../src/domain/Locker';
import { LockerSize } from '../../src/domain/types';

describe('PackageRetrievalService', () => {
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

  it('retrieves a package and returns the package id', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.MEDIUM));
    const stored = await storageService.store(LockerSize.SMALL, 'Jane');
    const result = retrievalService.retrieve(stored.lockerId, stored.pickupCode);
    expect(result.packageId).toBeDefined();
  });

  it('frees the locker after retrieval', async () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    lockerRepo.save(locker);
    const stored = await storageService.store(LockerSize.SMALL, 'Jane');
    retrievalService.retrieve(stored.lockerId, stored.pickupCode);
    expect(locker.isAvailable()).toBe(true);
  });

  it('removes the assignment after retrieval', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.MEDIUM));
    const stored = await storageService.store(LockerSize.SMALL, 'Jane');
    retrievalService.retrieve(stored.lockerId, stored.pickupCode);
    expect(assignmentRepo.findByLockerId(stored.lockerId)).toBeUndefined();
  });

  it('throws for an unknown locker ID', () => {
    expect(() => retrievalService.retrieve('UNKNOWN', 'ABC123'))
      .toThrow('Unknown locker: UNKNOWN');
  });

  it('throws when the locker is not occupied', () => {
    lockerRepo.save(new Locker('L1', LockerSize.SMALL));
    expect(() => retrievalService.retrieve('L1', 'ABC123'))
      .toThrow('Locker L1 is not occupied');
  });

  it('throws for an incorrect pickup code', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.MEDIUM));
    const stored = await storageService.store(LockerSize.SMALL, 'Jane');
    expect(() => retrievalService.retrieve(stored.lockerId, 'WRONG1'))
      .toThrow('Invalid pickup code');
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/services/PackageRetrievalService.test.ts
```

### Write the implementation

**`src/services/PackageRetrievalService.ts`:**

```typescript
import { LockerRepository } from '../repositories/LockerRepository';
import { AssignmentRepository } from '../repositories/AssignmentRepository';

export interface RetrievalResult {
  packageId: string;
  storageCharge: number;
}

export class PackageRetrievalService {
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

    locker.release();
    this.assignmentRepo.remove(lockerId);

    return { packageId: assignment.packageId, storageCharge: 0 };
  }
}
```

> `storageCharge` is `0` here — Level 3 adds the real calculation. The `RetrievalResult` interface is already stable so the CLI won't need changing later.

Run — expect 6 passed:
```bash
npm run test:run -- tests/services/PackageRetrievalService.test.ts
```

**Commit:**
```bash
git add src/services/PackageRetrievalService.ts tests/services/PackageRetrievalService.test.ts
git commit -m "feat(l2): add PackageRetrievalService"
```

---

## Task 2: retrieve CLI command

**File:** `src/cli/commands/retrieve.ts` (replace stub)

```typescript
import { Command } from 'commander';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';
import { PackageRetrievalService } from '../../services/PackageRetrievalService';

export function registerRetrieveCommand(
  program: Command,
  lockerRepo: LockerRepository,
  assignmentRepo: AssignmentRepository,
): void {
  program
    .command('retrieve')
    .description('Retrieve a package from a locker')
    .requiredOption('--locker <id>', 'Locker ID')
    .requiredOption('--code <code>', 'Pickup code')
    .action((opts) => {
      const service = new PackageRetrievalService(lockerRepo, assignmentRepo);
      try {
        const result = service.retrieve(opts.locker, opts.code);
        console.log(
          `Package ${result.packageId} retrieved | Storage charge: $${result.storageCharge.toFixed(2)}`
        );
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
```

### Smoke test — full store → retrieve flow

```bash
# Add a locker and store a package
npm run dev -- locker add --id L1 --size medium
npm run dev -- store --size small --owner "Jane Doe"

# Note the Pickup Code printed, e.g. 3KF9QZ, then retrieve:
npm run dev -- retrieve --locker L1 --code 3KF9QZ

# Locker should be AVAILABLE again
npm run dev -- locker list
```

Expected output from retrieve:
```
Package <uuid> retrieved | Storage charge: $0.00
```

### Test error cases

```bash
# Wrong code
npm run dev -- retrieve --locker L1 --code WRONG1
# Expected: Invalid pickup code

# Unknown locker
npm run dev -- retrieve --locker L99 --code ABC123
# Expected: Unknown locker: L99
```

### Run all tests

```bash
npm run test:run
```

**Commit:**
```bash
git add src/cli/commands/retrieve.ts
git commit -m "feat(l2): add retrieve CLI command"
```

---

## Level 2 complete ✓

The full store → retrieve flow works. The locker is freed after pickup and can receive a new package. Storage charge shows `$0.00` — Level 3 adds the real calculation.

Continue to `level-3-storage-charges.md`.
