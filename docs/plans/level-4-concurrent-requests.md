# Level 4 — Concurrent Requests (Optional)

**Goal:** Prevent two delivery agents from being assigned the same locker when they store packages simultaneously.

**Why this matters in Node.js:**
Node.js is single-threaded, but `async/await` creates interleaving points. Without a lock, two concurrent `store()` calls can both call `findSmallestFit()` before either calls `locker.occupy()` — both see the same locker as available and both get assigned to it. A mutex serialises the critical section so only one runs at a time.

**What you'll build:**
- `AsyncMutex` — a simple promise-based lock
- Update `PackageStorageService` to use it

**Prerequisite:** Level 3 complete.

---

## Task 1: AsyncMutex

**Files:** `src/services/AsyncMutex.ts`, `tests/services/AsyncMutex.test.ts`

### Write the test first

**`tests/services/AsyncMutex.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { AsyncMutex } from '../../src/services/AsyncMutex';

describe('AsyncMutex', () => {
  it('runs a single operation and returns its result', async () => {
    const mutex = new AsyncMutex();
    const result = await mutex.run(() => 42);
    expect(result).toBe(42);
  });

  it('serialises concurrent operations — second runs after first completes', async () => {
    const mutex = new AsyncMutex();
    const order: number[] = [];

    await Promise.all([
      mutex.run(async () => {
        await new Promise(r => setTimeout(r, 20));
        order.push(1);
      }),
      mutex.run(async () => {
        order.push(2);
      }),
    ]);

    expect(order).toEqual([1, 2]);
  });

  it('ensures two concurrent operations receive different values', async () => {
    const mutex = new AsyncMutex();
    const available = ['L1', 'L2'];
    let idx = 0;

    const grab = () =>
      mutex.run(async () => {
        const val = available[idx];
        await new Promise(r => setTimeout(r, 10));
        idx++;
        return val;
      });

    const [a, b] = await Promise.all([grab(), grab()]);
    expect(a).toBe('L1');
    expect(b).toBe('L2');
    expect(a).not.toBe(b);
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/services/AsyncMutex.test.ts
```

### Write the implementation

**`src/services/AsyncMutex.ts`:**

```typescript
export class AsyncMutex {
  private locked = false;
  private readonly queue: Array<() => void> = [];

  private acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
```

> How it works:
> - `acquire()` — if unlocked, lock immediately and return. If locked, push a resolve callback onto the queue and return a pending Promise (the caller waits here).
> - `release()` — pull the next waiter off the queue and call its resolve (unblocking it). If no waiters, unlock.
> - `run(fn)` — acquires, runs your function, releases in `finally` (always releases even if fn throws).
> - `<T>` is a TypeScript generic — it means the return type matches whatever your function returns.

Run — expect 3 passed:
```bash
npm run test:run -- tests/services/AsyncMutex.test.ts
```

**Commit:**
```bash
git add src/services/AsyncMutex.ts tests/services/AsyncMutex.test.ts
git commit -m "feat(l4): add AsyncMutex for serialising concurrent locker assignments"
```

---

## Task 2: Protect PackageStorageService with the mutex

**Files:** `src/services/PackageStorageService.ts` (update), `tests/services/PackageStorageService.test.ts` (add test)

### Add a concurrency test to the existing test file

Open `tests/services/PackageStorageService.test.ts` and add this test inside the existing `describe` block:

```typescript
  it('assigns different lockers to two concurrent store requests', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.SMALL));
    lockerRepo.save(new Locker('L2', LockerSize.SMALL));

    const [r1, r2] = await Promise.all([
      service.store(LockerSize.SMALL, 'Agent A'),
      service.store(LockerSize.SMALL, 'Agent B'),
    ]);

    expect(r1.lockerId).not.toBe(r2.lockerId);
  });
```

Run — this test may already pass (Node.js executes synchronously within a single tick), but the mutex makes it provably safe regardless:
```bash
npm run test:run -- tests/services/PackageStorageService.test.ts
```

### Update `src/services/PackageStorageService.ts`

Replace the entire file:

```typescript
import { randomUUID } from 'crypto';
import { Package } from '../domain/Package';
import { LockerAssignment } from '../domain/LockerAssignment';
import { LockerSize } from '../domain/types';
import { LockerRepository } from '../repositories/LockerRepository';
import { AssignmentRepository } from '../repositories/AssignmentRepository';
import { LockerFinder } from './LockerFinder';
import { PickupCodeGenerator } from './PickupCodeGenerator';
import { AsyncMutex } from './AsyncMutex';

export interface StoreResult {
  lockerId: string;
  pickupCode: string;
}

export class PackageStorageService {
  private readonly lockerFinder: LockerFinder;
  private readonly codeGenerator: PickupCodeGenerator;
  private readonly mutex = new AsyncMutex();

  constructor(
    private readonly lockerRepo: LockerRepository,
    private readonly assignmentRepo: AssignmentRepository,
  ) {
    this.lockerFinder = new LockerFinder(lockerRepo);
    this.codeGenerator = new PickupCodeGenerator(assignmentRepo);
  }

  async store(size: LockerSize, ownerName: string): Promise<StoreResult> {
    return this.mutex.run(() => {
      const locker = this.lockerFinder.findSmallestFit(size);
      if (!locker) {
        throw new Error(`No suitable locker available for size ${size}`);
      }

      const pkg = new Package(randomUUID(), size, ownerName);
      const pickupCode = this.codeGenerator.generate();
      const assignment = new LockerAssignment(locker.id, pkg.id, pickupCode);

      locker.occupy();
      this.assignmentRepo.save(assignment);

      return { lockerId: locker.id, pickupCode: pickupCode.value };
    });
  }
}
```

> The entire find-occupy-save sequence is now wrapped in `mutex.run()`. No two concurrent callers can execute this block at the same time. The function passed to `run()` is synchronous — `mutex.run` handles the Promise wrapping.

Run all tests — expect everything still passes:
```bash
npm run test:run
```

**Commit:**
```bash
git add src/services/PackageStorageService.ts tests/services/PackageStorageService.test.ts
git commit -m "feat(l4): protect locker assignment with AsyncMutex"
```

---

## Level 4 complete ✓

Concurrent store requests are now safe. The mutex queue ensures only one assignment proceeds at a time. Continue to `level-5-package-scanner.md`.
