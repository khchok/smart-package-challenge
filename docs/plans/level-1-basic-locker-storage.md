# Level 1 — Basic Locker and Package Storage

**Goal:** Build the core domain model and a working CLI that lets a delivery agent store a package and get back a locker ID + pickup code.

**What you'll build:**
- `LockerSize` / `LockerStatus` enums
- `Locker`, `Package`, `PickupCode`, `LockerAssignment` domain classes
- `LockerRepository`, `AssignmentRepository` (in-memory)
- `LockerFinder`, `PickupCodeGenerator` services
- `PackageStorageService` orchestrator
- CLI commands: `locker add`, `locker list`, `store`

---

## Task 1: Domain types

**File:** `src/domain/types.ts`

```typescript
export enum LockerSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export enum LockerStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
}
```

> TypeScript `enum` compiles to a plain JS object. Everything in the codebase imports `LockerSize` and `LockerStatus` from this single file — never redeclare them elsewhere.

**Commit:**
```bash
git add src/domain/types.ts
git commit -m "feat(l1): add LockerSize and LockerStatus enums"
```

---

## Task 2: Locker entity

**Files:** `src/domain/Locker.ts`, `tests/domain/Locker.test.ts`

### Write the test first

**`tests/domain/Locker.test.ts`:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Locker } from '../../src/domain/Locker';
import { LockerSize, LockerStatus } from '../../src/domain/types';

describe('Locker', () => {
  let locker: Locker;

  beforeEach(() => {
    locker = new Locker('L1', LockerSize.MEDIUM);
  });

  it('is available when created', () => {
    expect(locker.isAvailable()).toBe(true);
    expect(locker.getStatus()).toBe(LockerStatus.AVAILABLE);
  });

  it('becomes occupied after occupy()', () => {
    locker.occupy();
    expect(locker.isAvailable()).toBe(false);
    expect(locker.getStatus()).toBe(LockerStatus.OCCUPIED);
  });

  it('becomes available again after release()', () => {
    locker.occupy();
    locker.release();
    expect(locker.isAvailable()).toBe(true);
  });

  it('throws when occupying an already occupied locker', () => {
    locker.occupy();
    expect(() => locker.occupy()).toThrow('already occupied');
  });

  it('throws when releasing an already available locker', () => {
    expect(() => locker.release()).toThrow('already available');
  });

  it('can fit a package of the same size', () => {
    expect(locker.canFit(LockerSize.MEDIUM)).toBe(true);
  });

  it('can fit a smaller package', () => {
    expect(locker.canFit(LockerSize.SMALL)).toBe(true);
  });

  it('cannot fit a larger package', () => {
    expect(locker.canFit(LockerSize.LARGE)).toBe(false);
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/domain/Locker.test.ts
```

### Write the implementation

**`src/domain/Locker.ts`:**

```typescript
import { LockerSize, LockerStatus } from './types';

const SIZE_RANK: Record<LockerSize, number> = {
  [LockerSize.SMALL]: 1,
  [LockerSize.MEDIUM]: 2,
  [LockerSize.LARGE]: 3,
};

export class Locker {
  readonly id: string;
  readonly size: LockerSize;
  private status: LockerStatus = LockerStatus.AVAILABLE;

  constructor(id: string, size: LockerSize) {
    this.id = id;
    this.size = size;
  }

  isAvailable(): boolean {
    return this.status === LockerStatus.AVAILABLE;
  }

  getStatus(): LockerStatus {
    return this.status;
  }

  occupy(): void {
    if (!this.isAvailable()) {
      throw new Error(`Locker ${this.id} is already occupied`);
    }
    this.status = LockerStatus.OCCUPIED;
  }

  release(): void {
    if (this.isAvailable()) {
      throw new Error(`Locker ${this.id} is already available`);
    }
    this.status = LockerStatus.AVAILABLE;
  }

  canFit(packageSize: LockerSize): boolean {
    return SIZE_RANK[this.size] >= SIZE_RANK[packageSize];
  }
}
```

Run — expect 8 passed:
```bash
npm run test:run -- tests/domain/Locker.test.ts
```

**Commit:**
```bash
git add src/domain/Locker.ts tests/domain/Locker.test.ts
git commit -m "feat(l1): add Locker entity"
```

---

## Task 3: Package, PickupCode, LockerAssignment

**Files:** `src/domain/Package.ts`, `src/domain/PickupCode.ts`, `src/domain/LockerAssignment.ts`, `tests/domain/PickupCode.test.ts`

### Write the test first

**`tests/domain/PickupCode.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { PickupCode } from '../../src/domain/PickupCode';

describe('PickupCode', () => {
  it('stores the code value', () => {
    const code = new PickupCode('ABC123');
    expect(code.value).toBe('ABC123');
  });

  it('throws for codes shorter than 6 characters', () => {
    expect(() => new PickupCode('AB12')).toThrow('at least 6 characters');
  });

  it('matches the correct input', () => {
    const code = new PickupCode('ABC123');
    expect(code.matches('ABC123')).toBe(true);
  });

  it('does not match an incorrect input', () => {
    const code = new PickupCode('ABC123');
    expect(code.matches('XYZ999')).toBe(false);
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/domain/PickupCode.test.ts
```

### Write the implementations

**`src/domain/Package.ts`:**

```typescript
import { LockerSize } from './types';

export class Package {
  readonly id: string;
  readonly size: LockerSize;
  readonly ownerName: string;

  constructor(id: string, size: LockerSize, ownerName: string) {
    this.id = id;
    this.size = size;
    this.ownerName = ownerName;
  }
}
```

**`src/domain/PickupCode.ts`:**

```typescript
export class PickupCode {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.length < 6) {
      throw new Error('Pickup code must be at least 6 characters');
    }
    this.value = value;
  }

  matches(input: string): boolean {
    return this.value === input;
  }
}
```

**`src/domain/LockerAssignment.ts`:**

```typescript
import { PickupCode } from './PickupCode';

export class LockerAssignment {
  readonly lockerId: string;
  readonly packageId: string;
  readonly pickupCode: PickupCode;
  readonly storedAt: Date;

  constructor(
    lockerId: string,
    packageId: string,
    pickupCode: PickupCode,
    storedAt: Date = new Date(),
  ) {
    this.lockerId = lockerId;
    this.packageId = packageId;
    this.pickupCode = pickupCode;
    this.storedAt = storedAt;
  }
}
```

> `storedAt` defaults to `new Date()` but accepts an injected value — this lets tests pass a fixed date to make storage charge calculations deterministic later.

Run — expect 4 passed:
```bash
npm run test:run -- tests/domain/PickupCode.test.ts
```

**Commit:**
```bash
git add src/domain/Package.ts src/domain/PickupCode.ts src/domain/LockerAssignment.ts tests/domain/PickupCode.test.ts
git commit -m "feat(l1): add Package, PickupCode, and LockerAssignment"
```

---

## Task 4: Repositories

**Files:** `src/repositories/LockerRepository.ts`, `src/repositories/AssignmentRepository.ts`, `tests/repositories/LockerRepository.test.ts`, `tests/repositories/AssignmentRepository.test.ts`

### Write tests first

**`tests/repositories/LockerRepository.test.ts`:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LockerRepository } from '../../src/repositories/LockerRepository';
import { Locker } from '../../src/domain/Locker';
import { LockerSize } from '../../src/domain/types';

describe('LockerRepository', () => {
  let repo: LockerRepository;

  beforeEach(() => { repo = new LockerRepository(); });

  it('saves and retrieves a locker by id', () => {
    const locker = new Locker('L1', LockerSize.SMALL);
    repo.save(locker);
    expect(repo.findById('L1')).toBe(locker);
  });

  it('returns undefined for unknown id', () => {
    expect(repo.findById('UNKNOWN')).toBeUndefined();
  });

  it('returns all lockers', () => {
    repo.save(new Locker('L1', LockerSize.SMALL));
    repo.save(new Locker('L2', LockerSize.LARGE));
    expect(repo.findAll()).toHaveLength(2);
  });

  it('returns only available lockers that can fit the given size', () => {
    const small = new Locker('L1', LockerSize.SMALL);
    const medium = new Locker('L2', LockerSize.MEDIUM);
    const occupied = new Locker('L3', LockerSize.LARGE);
    occupied.occupy();
    repo.save(small);
    repo.save(medium);
    repo.save(occupied);
    const result = repo.findAvailableBySize(LockerSize.SMALL);
    expect(result.map(l => l.id)).toEqual(expect.arrayContaining(['L1', 'L2']));
    expect(result.map(l => l.id)).not.toContain('L3');
  });
});
```

**`tests/repositories/AssignmentRepository.test.ts`:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AssignmentRepository } from '../../src/repositories/AssignmentRepository';
import { LockerAssignment } from '../../src/domain/LockerAssignment';
import { PickupCode } from '../../src/domain/PickupCode';

describe('AssignmentRepository', () => {
  let repo: AssignmentRepository;

  beforeEach(() => { repo = new AssignmentRepository(); });

  const makeAssignment = (lockerId: string, code: string) =>
    new LockerAssignment(lockerId, 'PKG-001', new PickupCode(code));

  it('saves and finds by locker id', () => {
    const a = makeAssignment('L1', 'ABC123');
    repo.save(a);
    expect(repo.findByLockerId('L1')).toBe(a);
  });

  it('returns undefined for unknown locker id', () => {
    expect(repo.findByLockerId('L1')).toBeUndefined();
  });

  it('removes an assignment', () => {
    repo.save(makeAssignment('L1', 'ABC123'));
    repo.remove('L1');
    expect(repo.findByLockerId('L1')).toBeUndefined();
  });

  it('detects when a code is already in use', () => {
    repo.save(makeAssignment('L1', 'ABC123'));
    expect(repo.isCodeInUse('ABC123')).toBe(true);
    expect(repo.isCodeInUse('XYZ999')).toBe(false);
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/repositories/
```

### Write the implementations

**`src/repositories/LockerRepository.ts`:**

```typescript
import { Locker } from '../domain/Locker';
import { LockerSize } from '../domain/types';

export class LockerRepository {
  private lockers = new Map<string, Locker>();

  save(locker: Locker): void {
    this.lockers.set(locker.id, locker);
  }

  findById(id: string): Locker | undefined {
    return this.lockers.get(id);
  }

  findAll(): Locker[] {
    return Array.from(this.lockers.values());
  }

  findAvailableBySize(size: LockerSize): Locker[] {
    return this.findAll().filter(l => l.isAvailable() && l.canFit(size));
  }
}
```

> `Map<string, Locker>` is a built-in JS key-value store. `Array.from(map.values())` converts its values to an array so you can `.filter()` them.

**`src/repositories/AssignmentRepository.ts`:**

```typescript
import { LockerAssignment } from '../domain/LockerAssignment';

export class AssignmentRepository {
  private assignments = new Map<string, LockerAssignment>();

  save(assignment: LockerAssignment): void {
    this.assignments.set(assignment.lockerId, assignment);
  }

  findByLockerId(lockerId: string): LockerAssignment | undefined {
    return this.assignments.get(lockerId);
  }

  remove(lockerId: string): void {
    this.assignments.delete(lockerId);
  }

  isCodeInUse(code: string): boolean {
    return Array.from(this.assignments.values()).some(a => a.pickupCode.value === code);
  }
}
```

Run — expect 8 passed:
```bash
npm run test:run -- tests/repositories/
```

**Commit:**
```bash
git add src/repositories/ tests/repositories/
git commit -m "feat(l1): add LockerRepository and AssignmentRepository"
```

---

## Task 5: LockerFinder and PickupCodeGenerator

**Files:** `src/services/LockerFinder.ts`, `src/services/PickupCodeGenerator.ts`, `tests/services/LockerFinder.test.ts`, `tests/services/PickupCodeGenerator.test.ts`

### Write tests first

**`tests/services/LockerFinder.test.ts`:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LockerFinder } from '../../src/services/LockerFinder';
import { LockerRepository } from '../../src/repositories/LockerRepository';
import { Locker } from '../../src/domain/Locker';
import { LockerSize } from '../../src/domain/types';

describe('LockerFinder', () => {
  let repo: LockerRepository;
  let finder: LockerFinder;

  beforeEach(() => {
    repo = new LockerRepository();
    finder = new LockerFinder(repo);
  });

  it('returns null when no lockers exist', () => {
    expect(finder.findSmallestFit(LockerSize.SMALL)).toBeNull();
  });

  it('returns the only available locker that fits', () => {
    repo.save(new Locker('L1', LockerSize.MEDIUM));
    expect(finder.findSmallestFit(LockerSize.SMALL)?.id).toBe('L1');
  });

  it('returns the smallest fitting locker when multiple are available', () => {
    repo.save(new Locker('L1', LockerSize.LARGE));
    repo.save(new Locker('L2', LockerSize.MEDIUM));
    repo.save(new Locker('L3', LockerSize.SMALL));
    expect(finder.findSmallestFit(LockerSize.SMALL)?.id).toBe('L3');
  });

  it('skips occupied lockers', () => {
    const small = new Locker('L1', LockerSize.SMALL);
    small.occupy();
    repo.save(small);
    repo.save(new Locker('L2', LockerSize.MEDIUM));
    expect(finder.findSmallestFit(LockerSize.SMALL)?.id).toBe('L2');
  });

  it('returns null when no locker is large enough', () => {
    repo.save(new Locker('L1', LockerSize.SMALL));
    expect(finder.findSmallestFit(LockerSize.LARGE)).toBeNull();
  });
});
```

**`tests/services/PickupCodeGenerator.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { PickupCodeGenerator } from '../../src/services/PickupCodeGenerator';
import { AssignmentRepository } from '../../src/repositories/AssignmentRepository';
import { LockerAssignment } from '../../src/domain/LockerAssignment';
import { PickupCode } from '../../src/domain/PickupCode';

describe('PickupCodeGenerator', () => {
  it('generates a PickupCode with a 6-character value', () => {
    const repo = new AssignmentRepository();
    const gen = new PickupCodeGenerator(repo);
    expect(gen.generate().value).toHaveLength(6);
  });

  it('generates a code not already in use', () => {
    const repo = new AssignmentRepository();
    repo.save(new LockerAssignment('L1', 'PKG-001', new PickupCode('AAAAAA')));
    const gen = new PickupCodeGenerator(repo);
    expect(gen.generate().value).not.toBe('AAAAAA');
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/services/LockerFinder.test.ts tests/services/PickupCodeGenerator.test.ts
```

### Write the implementations

**`src/services/LockerFinder.ts`:**

```typescript
import { Locker } from '../domain/Locker';
import { LockerSize } from '../domain/types';
import { LockerRepository } from '../repositories/LockerRepository';

const SIZE_RANK: Record<LockerSize, number> = {
  [LockerSize.SMALL]: 1,
  [LockerSize.MEDIUM]: 2,
  [LockerSize.LARGE]: 3,
};

export class LockerFinder {
  constructor(private readonly lockerRepo: LockerRepository) {}

  findSmallestFit(packageSize: LockerSize): Locker | null {
    const candidates = this.lockerRepo.findAvailableBySize(packageSize);
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size])[0];
  }
}
```

**`src/services/PickupCodeGenerator.ts`:**

```typescript
import { PickupCode } from '../domain/PickupCode';
import { AssignmentRepository } from '../repositories/AssignmentRepository';

export class PickupCodeGenerator {
  constructor(private readonly assignmentRepo: AssignmentRepository) {}

  generate(): PickupCode {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (code.length < 6 || this.assignmentRepo.isCodeInUse(code));
    return new PickupCode(code);
  }
}
```

Run — expect 7 passed:
```bash
npm run test:run -- tests/services/LockerFinder.test.ts tests/services/PickupCodeGenerator.test.ts
```

**Commit:**
```bash
git add src/services/LockerFinder.ts src/services/PickupCodeGenerator.ts tests/services/LockerFinder.test.ts tests/services/PickupCodeGenerator.test.ts
git commit -m "feat(l1): add LockerFinder and PickupCodeGenerator"
```

---

## Task 6: PackageStorageService

**Files:** `src/services/PackageStorageService.ts`, `tests/services/PackageStorageService.test.ts`

### Write the test first

**`tests/services/PackageStorageService.test.ts`:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PackageStorageService } from '../../src/services/PackageStorageService';
import { LockerRepository } from '../../src/repositories/LockerRepository';
import { AssignmentRepository } from '../../src/repositories/AssignmentRepository';
import { Locker } from '../../src/domain/Locker';
import { LockerSize } from '../../src/domain/types';

describe('PackageStorageService', () => {
  let lockerRepo: LockerRepository;
  let assignmentRepo: AssignmentRepository;
  let service: PackageStorageService;

  beforeEach(() => {
    lockerRepo = new LockerRepository();
    assignmentRepo = new AssignmentRepository();
    service = new PackageStorageService(lockerRepo, assignmentRepo);
  });

  it('stores a package and returns locker ID and a 6-char pickup code', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.MEDIUM));
    const result = await service.store(LockerSize.SMALL, 'Jane Doe');
    expect(result.lockerId).toBe('L1');
    expect(result.pickupCode).toHaveLength(6);
  });

  it('marks the locker as occupied after storing', async () => {
    const locker = new Locker('L1', LockerSize.MEDIUM);
    lockerRepo.save(locker);
    await service.store(LockerSize.SMALL, 'Jane Doe');
    expect(locker.isAvailable()).toBe(false);
  });

  it('creates an assignment in the repository', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.SMALL));
    const result = await service.store(LockerSize.SMALL, 'Jane Doe');
    expect(assignmentRepo.findByLockerId(result.lockerId)).toBeDefined();
  });

  it('throws when no locker can fit the package', async () => {
    await expect(service.store(LockerSize.LARGE, 'Jane Doe'))
      .rejects.toThrow('No suitable locker available for size LARGE');
  });

  it('assigns the smallest available locker', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.LARGE));
    lockerRepo.save(new Locker('L2', LockerSize.MEDIUM));
    const result = await service.store(LockerSize.SMALL, 'Jane');
    expect(result.lockerId).toBe('L2');
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/services/PackageStorageService.test.ts
```

### Write the implementation

**`src/services/PackageStorageService.ts`:**

```typescript
import { randomUUID } from 'crypto';
import { Package } from '../domain/Package';
import { LockerAssignment } from '../domain/LockerAssignment';
import { LockerSize } from '../domain/types';
import { LockerRepository } from '../repositories/LockerRepository';
import { AssignmentRepository } from '../repositories/AssignmentRepository';
import { LockerFinder } from './LockerFinder';
import { PickupCodeGenerator } from './PickupCodeGenerator';

export interface StoreResult {
  lockerId: string;
  pickupCode: string;
}

export class PackageStorageService {
  private readonly lockerFinder: LockerFinder;
  private readonly codeGenerator: PickupCodeGenerator;

  constructor(
    private readonly lockerRepo: LockerRepository,
    private readonly assignmentRepo: AssignmentRepository,
  ) {
    this.lockerFinder = new LockerFinder(lockerRepo);
    this.codeGenerator = new PickupCodeGenerator(assignmentRepo);
  }

  async store(size: LockerSize, ownerName: string): Promise<StoreResult> {
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
  }
}
```

> `randomUUID()` from Node's built-in `crypto` module generates a universally unique ID — no package needed. `async` is declared now so Level 4's mutex won't require a signature change.

Run — expect 5 passed:
```bash
npm run test:run -- tests/services/PackageStorageService.test.ts
```

**Commit:**
```bash
git add src/services/PackageStorageService.ts tests/services/PackageStorageService.test.ts
git commit -m "feat(l1): add PackageStorageService"
```

---

## Task 7: CLI — entry point and locker commands

**Files:** `src/cli/index.ts`, `src/cli/commands/locker.ts`, `src/cli/commands/store.ts` (stub), `src/cli/commands/retrieve.ts` (stub), `src/cli/commands/scan.ts` (stub)

### `src/cli/index.ts`

```typescript
import { Command } from 'commander';
import { LockerRepository } from '../repositories/LockerRepository';
import { AssignmentRepository } from '../repositories/AssignmentRepository';
import { registerLockerCommands } from './commands/locker';
import { registerStoreCommand } from './commands/store';
import { registerRetrieveCommand } from './commands/retrieve';
import { registerScanCommand } from './commands/scan';

const lockerRepo = new LockerRepository();
const assignmentRepo = new AssignmentRepository();

const program = new Command();
program
  .name('locker-cli')
  .description('Smart Package Locker CLI')
  .version('1.0.0');

registerLockerCommands(program, lockerRepo);
registerStoreCommand(program, lockerRepo, assignmentRepo);
registerRetrieveCommand(program, lockerRepo, assignmentRepo);
registerScanCommand(program, lockerRepo, assignmentRepo);

program.parse();
```

> `program.parse()` reads `process.argv` (the command-line arguments Node.js receives) and dispatches to the matching command handler.

### `src/cli/commands/locker.ts`

```typescript
import { Command } from 'commander';
import { Locker } from '../../domain/Locker';
import { LockerSize } from '../../domain/types';
import { LockerRepository } from '../../repositories/LockerRepository';

export function registerLockerCommands(program: Command, lockerRepo: LockerRepository): void {
  const lockerCmd = program
    .command('locker')
    .description('Manage lockers');

  lockerCmd
    .command('add')
    .description('Add a new locker')
    .requiredOption('--id <id>', 'Locker ID (e.g. L1)')
    .requiredOption('--size <size>', 'Locker size: small | medium | large')
    .action((opts) => {
      const size = opts.size.toUpperCase() as LockerSize;
      if (!Object.values(LockerSize).includes(size)) {
        console.error(`Invalid size "${opts.size}". Use: small, medium, large`);
        process.exit(1);
      }
      if (lockerRepo.findById(opts.id)) {
        console.error(`Locker ${opts.id} already exists`);
        process.exit(1);
      }
      lockerRepo.save(new Locker(opts.id, size));
      console.log(`Locker ${opts.id} (${size}) added.`);
    });

  lockerCmd
    .command('list')
    .description('List all lockers and their status')
    .action(() => {
      const lockers = lockerRepo.findAll();
      if (lockers.length === 0) {
        console.log('No lockers registered.');
        return;
      }
      console.log('ID\t\tSIZE\t\tSTATUS');
      console.log('---\t\t----\t\t------');
      lockers.forEach(l =>
        console.log(`${l.id}\t\t${l.size}\t\t${l.getStatus()}`)
      );
    });
}
```

### Stub files (so `index.ts` imports don't fail)

**`src/cli/commands/store.ts`:**
```typescript
import { Command } from 'commander';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';

export function registerStoreCommand(
  _program: Command,
  _lockerRepo: LockerRepository,
  _assignmentRepo: AssignmentRepository,
): void {}
```

**`src/cli/commands/retrieve.ts`:**
```typescript
import { Command } from 'commander';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';

export function registerRetrieveCommand(
  _program: Command,
  _lockerRepo: LockerRepository,
  _assignmentRepo: AssignmentRepository,
): void {}
```

**`src/cli/commands/scan.ts`:**
```typescript
import { Command } from 'commander';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';

export function registerScanCommand(
  _program: Command,
  _lockerRepo: LockerRepository,
  _assignmentRepo: AssignmentRepository,
): void {}
```

### Smoke test

```bash
npm run dev -- locker add --id L1 --size small
npm run dev -- locker add --id L2 --size medium
npm run dev -- locker add --id L3 --size large
npm run dev -- locker list
```

Expected:
```
ID		SIZE		STATUS
---		----		------
L1		SMALL		AVAILABLE
L2		MEDIUM		AVAILABLE
L3		LARGE		AVAILABLE
```

> `npm run dev -- <args>` — the `--` separates npm's own flags from the flags you want passed to your script.

**Commit:**
```bash
git add src/cli/
git commit -m "feat(l1): add CLI entry point and locker commands"
```

---

## Task 8: store command

**File:** `src/cli/commands/store.ts` (replace stub)

```typescript
import { Command } from 'commander';
import { LockerSize } from '../../domain/types';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';
import { PackageStorageService } from '../../services/PackageStorageService';

export function registerStoreCommand(
  program: Command,
  lockerRepo: LockerRepository,
  assignmentRepo: AssignmentRepository,
): void {
  program
    .command('store')
    .description('Store a package in the smallest available locker')
    .requiredOption('--size <size>', 'Package size: small | medium | large')
    .requiredOption('--owner <name>', 'Package owner name')
    .action(async (opts) => {
      const size = opts.size.toUpperCase() as LockerSize;
      if (!Object.values(LockerSize).includes(size)) {
        console.error(`Invalid size "${opts.size}". Use: small, medium, large`);
        process.exit(1);
      }
      const service = new PackageStorageService(lockerRepo, assignmentRepo);
      try {
        const result = await service.store(size, opts.owner);
        console.log(`Stored in Locker ${result.lockerId} | Pickup Code: ${result.pickupCode}`);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }
    });
}
```

### Smoke test

```bash
npm run dev -- locker add --id L1 --size small
npm run dev -- locker add --id L2 --size medium
npm run dev -- store --size small --owner "Jane Doe"
npm run dev -- store --size large --owner "Bob"
```

Expected:
```
Stored in Locker L1 | Pickup Code: 3KF9QZ
No suitable locker available for size LARGE
```

### Run all tests

```bash
npm run test:run
```

**Commit:**
```bash
git add src/cli/commands/store.ts
git commit -m "feat(l1): add store CLI command"
```

---

## Level 1 complete ✓

You can now:
- Add lockers of any size
- List all lockers with status
- Store a package → get locker ID + pickup code
- See an error when no locker fits

Continue to `level-2-package-retrieval.md`.
