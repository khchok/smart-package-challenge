# Smart Package Locker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Smart Package Locker Management System in Node.js + TypeScript, progressively implemented across 5 levels via a commander.js CLI.

**Architecture:** Domain entities (Locker, Package, PickupCode, LockerAssignment) kept pure; service layer handles orchestration; in-memory repositories act as the storage layer; CLI commands wire everything together. Each level adds behaviour without breaking previous levels.

**Tech Stack:** Node.js 20+, TypeScript 5 (CommonJS), commander.js, Vitest, tsx (dev runner)

---

## Setup

### Task 1: Initialise the project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create the project folder and enter it**

```bash
mkdir smart-package-locker && cd smart-package-locker
```

- [ ] **Step 2: Initialise npm**

```bash
npm init -y
```

> **Node.js note:** `package.json` is the manifest for every Node.js project. It records your project name, version, scripts (shortcuts for commands), and dependencies.

- [ ] **Step 3: Install dependencies**

```bash
npm install commander
npm install --save-dev typescript tsx vitest @types/node
```

> **Node.js note:** `--save-dev` flags a package as a development-only dependency (testing tools, compilers). `commander` is a runtime dependency because the CLI needs it when users run the program.

- [ ] **Step 4: Write `package.json` scripts section**

Replace the `"scripts"` block in `package.json` with:

```json
"scripts": {
  "build": "tsc",
  "dev": "tsx src/cli/index.ts",
  "test": "vitest",
  "test:run": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

> **Node.js note:** `tsx` runs TypeScript files directly without compiling first — great for development. `tsc` compiles TypeScript to JavaScript in the `dist/` folder for production.

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

> **Node.js note:** `"module": "CommonJS"` means TypeScript compiles to the traditional Node.js module format — `require()` under the hood. `"strict": true` enables all TypeScript safety checks. `"rootDir"/"outDir"` map `src/` → `dist/` when you compile.

- [ ] **Step 6: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 8: Create the folder structure**

```bash
mkdir -p src/domain src/repositories src/services src/cli/commands
mkdir -p tests/domain tests/repositories tests/services
```

- [ ] **Step 9: Initialise git and commit**

```bash
git init
git add .
git commit -m "chore: initialise Node.js TypeScript project"
```

---

## Level 1 — Basic Locker and Package Storage

### Task 2: Domain types

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Write `src/domain/types.ts`**

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

> **Node.js note:** TypeScript `enum` compiles to a plain JavaScript object. These become the shared vocabulary across every file — import from here, never redeclare.

- [ ] **Step 2: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat(l1): add LockerSize and LockerStatus enums"
```

---

### Task 3: Locker entity

**Files:**
- Create: `src/domain/Locker.ts`
- Create: `tests/domain/Locker.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/domain/Locker.test.ts
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

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm run test:run -- tests/domain/Locker.test.ts
```

Expected: `Cannot find module '../../src/domain/Locker'`

- [ ] **Step 3: Write `src/domain/Locker.ts`**

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

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm run test:run -- tests/domain/Locker.test.ts
```

Expected: `8 passed`

- [ ] **Step 5: Commit**

```bash
git add src/domain/Locker.ts tests/domain/Locker.test.ts
git commit -m "feat(l1): add Locker entity"
```

---

### Task 4: Package, PickupCode, and LockerAssignment

**Files:**
- Create: `src/domain/Package.ts`
- Create: `src/domain/PickupCode.ts`
- Create: `src/domain/LockerAssignment.ts`
- Create: `tests/domain/PickupCode.test.ts`

- [ ] **Step 1: Write failing tests for PickupCode**

```typescript
// tests/domain/PickupCode.test.ts
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

- [ ] **Step 2: Run — confirm fail**

```bash
npm run test:run -- tests/domain/PickupCode.test.ts
```

- [ ] **Step 3: Write `src/domain/Package.ts`**

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

- [ ] **Step 4: Write `src/domain/PickupCode.ts`**

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

- [ ] **Step 5: Write `src/domain/LockerAssignment.ts`**

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

> **Node.js note:** `storedAt` defaults to `new Date()` (current time). Accepting it as a parameter is intentional — tests can inject a fixed date to make charge calculations deterministic.

- [ ] **Step 6: Run PickupCode tests — confirm pass**

```bash
npm run test:run -- tests/domain/PickupCode.test.ts
```

Expected: `4 passed`

- [ ] **Step 7: Commit**

```bash
git add src/domain/Package.ts src/domain/PickupCode.ts src/domain/LockerAssignment.ts tests/domain/PickupCode.test.ts
git commit -m "feat(l1): add Package, PickupCode, and LockerAssignment"
```

---

### Task 5: Repositories

**Files:**
- Create: `src/repositories/LockerRepository.ts`
- Create: `src/repositories/AssignmentRepository.ts`
- Create: `tests/repositories/LockerRepository.test.ts`
- Create: `tests/repositories/AssignmentRepository.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/repositories/LockerRepository.test.ts
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

```typescript
// tests/repositories/AssignmentRepository.test.ts
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

- [ ] **Step 2: Run — confirm fail**

```bash
npm run test:run -- tests/repositories/
```

- [ ] **Step 3: Write `src/repositories/LockerRepository.ts`**

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

> **Node.js note:** `Map<string, Locker>` is a key-value store built into JavaScript. Unlike a plain object, it guarantees insertion order and has clean `get`/`set`/`delete` methods. `Array.from(map.values())` converts the map's values into an array so you can use `.filter()`.

- [ ] **Step 4: Write `src/repositories/AssignmentRepository.ts`**

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

- [ ] **Step 5: Run — confirm pass**

```bash
npm run test:run -- tests/repositories/
```

Expected: `8 passed`

- [ ] **Step 6: Commit**

```bash
git add src/repositories/ tests/repositories/
git commit -m "feat(l1): add LockerRepository and AssignmentRepository"
```

---

### Task 6: LockerFinder and PickupCodeGenerator services

**Files:**
- Create: `src/services/LockerFinder.ts`
- Create: `src/services/PickupCodeGenerator.ts`
- Create: `tests/services/LockerFinder.test.ts`
- Create: `tests/services/PickupCodeGenerator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/services/LockerFinder.test.ts
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

```typescript
// tests/services/PickupCodeGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { PickupCodeGenerator } from '../../src/services/PickupCodeGenerator';
import { AssignmentRepository } from '../../src/repositories/AssignmentRepository';
import { LockerAssignment } from '../../src/domain/LockerAssignment';
import { PickupCode } from '../../src/domain/PickupCode';

describe('PickupCodeGenerator', () => {
  it('generates a PickupCode with a 6-character value', () => {
    const repo = new AssignmentRepository();
    const gen = new PickupCodeGenerator(repo);
    const code = gen.generate();
    expect(code.value).toHaveLength(6);
  });

  it('generates a code not already in use', () => {
    const repo = new AssignmentRepository();
    repo.save(new LockerAssignment('L1', 'PKG-001', new PickupCode('AAAAAA')));
    const gen = new PickupCodeGenerator(repo);
    const code = gen.generate();
    expect(code.value).not.toBe('AAAAAA');
  });
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
npm run test:run -- tests/services/LockerFinder.test.ts tests/services/PickupCodeGenerator.test.ts
```

- [ ] **Step 3: Write `src/services/LockerFinder.ts`**

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

- [ ] **Step 4: Write `src/services/PickupCodeGenerator.ts`**

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

- [ ] **Step 5: Run — confirm pass**

```bash
npm run test:run -- tests/services/LockerFinder.test.ts tests/services/PickupCodeGenerator.test.ts
```

Expected: `7 passed`

- [ ] **Step 6: Commit**

```bash
git add src/services/LockerFinder.ts src/services/PickupCodeGenerator.ts tests/services/
git commit -m "feat(l1): add LockerFinder and PickupCodeGenerator"
```

---

### Task 7: PackageStorageService

**Files:**
- Create: `src/services/PackageStorageService.ts`
- Create: `tests/services/PackageStorageService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/services/PackageStorageService.test.ts
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

- [ ] **Step 2: Run — confirm fail**

```bash
npm run test:run -- tests/services/PackageStorageService.test.ts
```

- [ ] **Step 3: Write `src/services/PackageStorageService.ts`**

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

> **Node.js note:** `randomUUID()` from Node's built-in `crypto` module generates a universally unique ID. `async` marks this method as returning a Promise — even though nothing async happens here yet, Level 4 will add a mutex and this signature won't need to change.

- [ ] **Step 4: Run — confirm pass**

```bash
npm run test:run -- tests/services/PackageStorageService.test.ts
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add src/services/PackageStorageService.ts tests/services/PackageStorageService.test.ts
git commit -m "feat(l1): add PackageStorageService"
```

---

### Task 8: CLI — project entry point and locker commands

**Files:**
- Create: `src/cli/index.ts`
- Create: `src/cli/commands/locker.ts`

- [ ] **Step 1: Write `src/cli/index.ts`**

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

> **Node.js note:** `program.parse()` reads `process.argv` (the command-line arguments Node.js receives) and dispatches to the right command. This is the entry point — the file tsx/node runs first.

- [ ] **Step 2: Write `src/cli/commands/locker.ts`**

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

- [ ] **Step 3: Create stub files so the imports in `index.ts` don't fail**

```typescript
// src/cli/commands/store.ts
import { Command } from 'commander';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';

export function registerStoreCommand(
  _program: Command,
  _lockerRepo: LockerRepository,
  _assignmentRepo: AssignmentRepository,
): void {}
```

```typescript
// src/cli/commands/retrieve.ts
import { Command } from 'commander';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';

export function registerRetrieveCommand(
  _program: Command,
  _lockerRepo: LockerRepository,
  _assignmentRepo: AssignmentRepository,
): void {}
```

```typescript
// src/cli/commands/scan.ts
import { Command } from 'commander';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';

export function registerScanCommand(
  _program: Command,
  _lockerRepo: LockerRepository,
  _assignmentRepo: AssignmentRepository,
): void {}
```

- [ ] **Step 4: Smoke test the CLI**

```bash
npm run dev -- locker add --id L1 --size small
npm run dev -- locker add --id L2 --size medium
npm run dev -- locker add --id L3 --size large
npm run dev -- locker list
```

Expected output from `locker list`:
```
ID		SIZE		STATUS
---		----		------
L1		SMALL		AVAILABLE
L2		MEDIUM		AVAILABLE
L3		LARGE		AVAILABLE
```

> **Node.js note:** `npm run dev -- <args>` passes everything after `--` as arguments to the script. This is how you pass CLI flags through npm scripts.

- [ ] **Step 5: Commit**

```bash
git add src/cli/
git commit -m "feat(l1): add CLI entry point and locker commands"
```

---

### Task 9: store command

**Files:**
- Modify: `src/cli/commands/store.ts`

- [ ] **Step 1: Replace the stub with the real store command**

```typescript
// src/cli/commands/store.ts
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

- [ ] **Step 2: Smoke test**

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

- [ ] **Step 3: Run all tests to check nothing broke**

```bash
npm run test:run
```

- [ ] **Step 4: Commit**

```bash
git add src/cli/commands/store.ts
git commit -m "feat(l1): add store CLI command"
```

---

## Level 2 — Package Retrieval

### Task 10: PackageRetrievalService

**Files:**
- Create: `src/services/PackageRetrievalService.ts`
- Create: `tests/services/PackageRetrievalService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/services/PackageRetrievalService.test.ts
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

- [ ] **Step 2: Run — confirm fail**

```bash
npm run test:run -- tests/services/PackageRetrievalService.test.ts
```

- [ ] **Step 3: Write `src/services/PackageRetrievalService.ts`**

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

> **Note:** `storageCharge` is `0` for now — Level 3 fills this in. The interface is stable so the CLI won't need changes.

- [ ] **Step 4: Run — confirm pass**

```bash
npm run test:run -- tests/services/PackageRetrievalService.test.ts
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add src/services/PackageRetrievalService.ts tests/services/PackageRetrievalService.test.ts
git commit -m "feat(l2): add PackageRetrievalService"
```

---

### Task 11: retrieve CLI command

**Files:**
- Modify: `src/cli/commands/retrieve.ts`

- [ ] **Step 1: Replace the stub**

```typescript
// src/cli/commands/retrieve.ts
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

- [ ] **Step 2: Smoke test the full store → retrieve flow**

```bash
npm run dev -- locker add --id L1 --size medium
npm run dev -- store --size small --owner "Jane Doe"
# Copy the Pickup Code from output, e.g. 3KF9QZ and Locker ID e.g. L1
npm run dev -- retrieve --locker L1 --code 3KF9QZ
npm run dev -- locker list   # L1 should be AVAILABLE again
```

- [ ] **Step 3: Test an invalid code**

```bash
npm run dev -- retrieve --locker L1 --code WRONG1
```

Expected: `Invalid pickup code`

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/retrieve.ts
git commit -m "feat(l2): add retrieve CLI command"
```

---

## Level 3 — Storage Charges

### Task 12: StorageChargeCalculator

**Files:**
- Create: `src/services/StorageChargeCalculator.ts`
- Create: `tests/services/StorageChargeCalculator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/services/StorageChargeCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { StorageChargeCalculator } from '../../src/services/StorageChargeCalculator';

describe('StorageChargeCalculator', () => {
  const calc = new StorageChargeCalculator();

  const at = (daysAfterBase: number): Date => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() + daysAfterBase);
    return d;
  };

  const base = at(0);

  it('charges $1.00 per day for the first 5 days', () => {
    expect(calc.calculate(base, at(1))).toBe(1.00);
    expect(calc.calculate(base, at(3))).toBe(3.00);
    expect(calc.calculate(base, at(5))).toBe(5.00);
  });

  it('charges $2.00 per day for days 6 through 10', () => {
    // 5×1 + 2×2 = 9
    expect(calc.calculate(base, at(7))).toBe(9.00);
    // 5×1 + 5×2 = 15
    expect(calc.calculate(base, at(10))).toBe(15.00);
  });

  it('charges $3.00 per day for days beyond 10', () => {
    // 5×1 + 5×2 + 3×3 = 5 + 10 + 9 = 24
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

- [ ] **Step 2: Run — confirm fail**

```bash
npm run test:run -- tests/services/StorageChargeCalculator.test.ts
```

- [ ] **Step 3: Write `src/services/StorageChargeCalculator.ts`**

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

> **Node.js note:** `Date.getTime()` returns milliseconds since Unix epoch (1 Jan 1970). Subtracting two dates gives the duration in milliseconds. `Math.ceil` rounds up any partial day to a whole day. `retrievedAt` defaults to `new Date()` (now) but tests inject a fixed value for determinism.

- [ ] **Step 4: Run — confirm pass**

```bash
npm run test:run -- tests/services/StorageChargeCalculator.test.ts
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add src/services/StorageChargeCalculator.ts tests/services/StorageChargeCalculator.test.ts
git commit -m "feat(l3): add StorageChargeCalculator with tiered pricing"
```

---

### Task 13: Wire storage charges into PackageRetrievalService

**Files:**
- Modify: `src/services/PackageRetrievalService.ts`
- Modify: `tests/services/PackageRetrievalService.test.ts`

- [ ] **Step 1: Add a charge test to the existing test file**

Add this test inside the existing `describe` block in `tests/services/PackageRetrievalService.test.ts`:

```typescript
  it('returns a storage charge of at least $1.00 on retrieval', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.MEDIUM));
    const stored = await storageService.store(LockerSize.SMALL, 'Jane');
    const result = retrievalService.retrieve(stored.lockerId, stored.pickupCode);
    expect(result.storageCharge).toBeGreaterThanOrEqual(1.00);
  });

  it('calculates charge based on storedAt timestamp', async () => {
    lockerRepo.save(new Locker('L1', LockerSize.MEDIUM));

    // Manually create an assignment with a storedAt 3 days ago
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

- [ ] **Step 2: Update `src/services/PackageRetrievalService.ts` to use the calculator**

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

- [ ] **Step 3: Run all retrieval tests**

```bash
npm run test:run -- tests/services/PackageRetrievalService.test.ts
```

Expected: `8 passed`

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```

- [ ] **Step 5: Commit**

```bash
git add src/services/PackageRetrievalService.ts tests/services/PackageRetrievalService.test.ts
git commit -m "feat(l3): wire StorageChargeCalculator into PackageRetrievalService"
```

---

## Level 4 — Concurrent Request Handling

### Task 14: AsyncMutex

**Files:**
- Create: `src/services/AsyncMutex.ts`
- Create: `tests/services/AsyncMutex.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/services/AsyncMutex.test.ts
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

  it('ensures two concurrent store operations receive different lockers', async () => {
    const mutex = new AsyncMutex();
    const available = ['L1', 'L2'];
    let idx = 0;

    const grabLocker = () =>
      mutex.run(async () => {
        const locker = available[idx];
        await new Promise(r => setTimeout(r, 10));
        idx++;
        return locker;
      });

    const [a, b] = await Promise.all([grabLocker(), grabLocker()]);
    expect(a).toBe('L1');
    expect(b).toBe('L2');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
npm run test:run -- tests/services/AsyncMutex.test.ts
```

- [ ] **Step 3: Write `src/services/AsyncMutex.ts`**

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

> **Node.js note:** Node.js is single-threaded, but `async/await` creates interleaving points. Without the mutex, two `store()` calls could both call `findSmallestFit` before either has called `locker.occupy()` — both see the same locker as available. The mutex serialises them: the second waits in `acquire()` until the first calls `release()` after persisting its assignment.

- [ ] **Step 4: Run — confirm pass**

```bash
npm run test:run -- tests/services/AsyncMutex.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add src/services/AsyncMutex.ts tests/services/AsyncMutex.test.ts
git commit -m "feat(l4): add AsyncMutex for serialising concurrent locker assignments"
```

---

### Task 15: Protect PackageStorageService with the mutex

**Files:**
- Modify: `src/services/PackageStorageService.ts`

- [ ] **Step 1: Add a concurrency test to the existing test file**

Add this test inside the `describe` block in `tests/services/PackageStorageService.test.ts`:

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

- [ ] **Step 2: Run — note this test may already pass (Node.js is synchronous within a tick) but should be provably safe with the mutex**

```bash
npm run test:run -- tests/services/PackageStorageService.test.ts
```

- [ ] **Step 3: Update `src/services/PackageStorageService.ts` to use the mutex**

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

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/services/PackageStorageService.ts tests/services/PackageStorageService.test.ts
git commit -m "feat(l4): protect locker assignment with AsyncMutex"
```

---

## Level 5 — Package Scanner

### Task 16: ParcelScanner service

**Files:**
- Create: `src/services/ParcelScanner.ts`
- Create: `tests/services/ParcelScanner.test.ts`
- Create: `parcel.json`

- [ ] **Step 1: Create the example `parcel.json` in the project root**

```json
{
  "trackingId": "PKG-20260507-001",
  "dimensions": {
    "width": 28,
    "height": 28,
    "depth": 15
  },
  "weight": 2.5,
  "recipientName": "Jane Doe",
  "recipientContact": "jane@example.com"
}
```

Volume: 28×28×15 = 11,760 cm³ → MEDIUM

- [ ] **Step 2: Write failing tests**

```typescript
// tests/services/ParcelScanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ParcelScanner } from '../../src/services/ParcelScanner';
import { LockerSize } from '../../src/domain/types';

const TMP = path.join('/tmp', 'test-parcel.json');

const write = (data: unknown) => fs.writeFileSync(TMP, JSON.stringify(data, null, 2));

describe('ParcelScanner', () => {
  let scanner: ParcelScanner;

  beforeEach(() => { scanner = new ParcelScanner(); });
  afterEach(() => { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); });

  it('scans a valid parcel and returns SMALL for volume ≤ 8000 cm³', () => {
    write({
      trackingId: 'PKG-001',
      dimensions: { width: 20, height: 20, depth: 20 },
      weight: 1,
      recipientName: 'Alice',
      recipientContact: 'alice@example.com',
    });
    const result = scanner.scan(TMP);
    expect(result.size).toBe(LockerSize.SMALL);
    expect(result.trackingId).toBe('PKG-001');
    expect(result.recipientName).toBe('Alice');
  });

  it('returns MEDIUM for volume 8001–27000 cm³', () => {
    write({
      trackingId: 'PKG-002',
      dimensions: { width: 28, height: 28, depth: 15 },
      weight: 2,
      recipientName: 'Bob',
      recipientContact: 'bob@example.com',
    });
    expect(scanner.scan(TMP).size).toBe(LockerSize.MEDIUM);
  });

  it('returns LARGE for volume > 27000 cm³', () => {
    write({
      trackingId: 'PKG-003',
      dimensions: { width: 40, height: 40, depth: 40 },
      weight: 5,
      recipientName: 'Carol',
      recipientContact: 'carol@example.com',
    });
    expect(scanner.scan(TMP).size).toBe(LockerSize.LARGE);
  });

  it('throws when file does not exist', () => {
    expect(() => scanner.scan('/tmp/does-not-exist.json'))
      .toThrow('Parcel file not found: /tmp/does-not-exist.json');
  });

  it('throws for invalid JSON', () => {
    fs.writeFileSync(TMP, 'not json');
    expect(() => scanner.scan(TMP)).toThrow('Invalid JSON in parcel file');
  });

  it('throws when trackingId is missing', () => {
    write({ dimensions: { width: 10, height: 10, depth: 10 }, weight: 1, recipientName: 'X', recipientContact: 'x@x.com' });
    expect(() => scanner.scan(TMP)).toThrow('missing trackingId');
  });

  it('throws when a dimension field is missing', () => {
    write({ trackingId: 'PKG-X', dimensions: { width: 10, height: 10 }, weight: 1, recipientName: 'X', recipientContact: 'x@x.com' });
    expect(() => scanner.scan(TMP)).toThrow('missing dimensions.depth');
  });
});
```

- [ ] **Step 3: Run — confirm fail**

```bash
npm run test:run -- tests/services/ParcelScanner.test.ts
```

- [ ] **Step 4: Write `src/services/ParcelScanner.ts`**

```typescript
import * as fs from 'fs';
import { LockerSize } from '../domain/types';

interface ParcelDimensions {
  width: number;
  height: number;
  depth: number;
}

interface ParcelData {
  trackingId: string;
  dimensions: ParcelDimensions;
  weight: number;
  recipientName: string;
  recipientContact: string;
}

export interface ScannedPackage {
  trackingId: string;
  recipientName: string;
  size: LockerSize;
}

const SMALL_MAX_VOLUME = 8_000;
const MEDIUM_MAX_VOLUME = 27_000;

export class ParcelScanner {
  scan(filePath: string): ScannedPackage {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Parcel file not found: ${filePath}`);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      throw new Error(`Invalid JSON in parcel file: ${filePath}`);
    }

    const data = this.validate(raw);
    const volume = data.dimensions.width * data.dimensions.height * data.dimensions.depth;

    return {
      trackingId: data.trackingId,
      recipientName: data.recipientName,
      size: this.mapVolumeToSize(volume),
    };
  }

  private validate(raw: unknown): ParcelData {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid parcel file: not an object');
    }
    const d = raw as Record<string, unknown>;

    for (const field of ['trackingId', 'recipientName', 'recipientContact'] as const) {
      if (typeof d[field] !== 'string' || !d[field]) {
        throw new Error(`Invalid parcel file: missing ${field}`);
      }
    }
    if (typeof d['weight'] !== 'number') {
      throw new Error('Invalid parcel file: missing weight');
    }
    if (!d['dimensions'] || typeof d['dimensions'] !== 'object') {
      throw new Error('Invalid parcel file: missing dimensions');
    }
    const dims = d['dimensions'] as Record<string, unknown>;
    for (const dim of ['width', 'height', 'depth'] as const) {
      if (typeof dims[dim] !== 'number') {
        throw new Error(`Invalid parcel file: missing dimensions.${dim}`);
      }
    }

    return raw as ParcelData;
  }

  private mapVolumeToSize(volume: number): LockerSize {
    if (volume <= SMALL_MAX_VOLUME) return LockerSize.SMALL;
    if (volume <= MEDIUM_MAX_VOLUME) return LockerSize.MEDIUM;
    return LockerSize.LARGE;
  }
}
```

> **Node.js note:** `fs.readFileSync` reads a file synchronously — the function blocks until the file is fully read. `'utf-8'` tells Node.js to return the content as a string rather than a raw `Buffer` (binary data). `JSON.parse` then converts that string into a JavaScript object.

- [ ] **Step 5: Run — confirm pass**

```bash
npm run test:run -- tests/services/ParcelScanner.test.ts
```

Expected: `7 passed`

- [ ] **Step 6: Commit**

```bash
git add src/services/ParcelScanner.ts tests/services/ParcelScanner.test.ts parcel.json
git commit -m "feat(l5): add ParcelScanner service"
```

---

### Task 17: scan CLI command

**Files:**
- Modify: `src/cli/commands/scan.ts`

- [ ] **Step 1: Replace the stub with the full scan command**

```typescript
// src/cli/commands/scan.ts
import * as readline from 'readline';
import { Command } from 'commander';
import { LockerRepository } from '../../repositories/LockerRepository';
import { AssignmentRepository } from '../../repositories/AssignmentRepository';
import { PackageStorageService } from '../../services/PackageStorageService';
import { ParcelScanner } from '../../services/ParcelScanner';
import { LockerFinder } from '../../services/LockerFinder';

export function registerScanCommand(
  program: Command,
  lockerRepo: LockerRepository,
  assignmentRepo: AssignmentRepository,
): void {
  program
    .command('scan')
    .description('Scan a parcel file and assign it to a locker with confirmation')
    .requiredOption('--file <path>', 'Path to parcel JSON file (e.g. ./parcel.json)')
    .action(async (opts) => {
      const scanner = new ParcelScanner();
      const lockerFinder = new LockerFinder(lockerRepo);
      const storageService = new PackageStorageService(lockerRepo, assignmentRepo);

      let scanned;
      try {
        scanned = scanner.scan(opts.file);
      } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
      }

      const locker = lockerFinder.findSmallestFit(scanned.size);
      if (!locker) {
        console.error(`No suitable locker available for size ${scanned.size}`);
        process.exit(1);
      }

      console.log(`\nScanned: ${scanned.trackingId} (${scanned.recipientName})`);
      console.log(`Size:    ${scanned.size}`);
      console.log(`Locker:  ${locker.id} (${locker.size}, AVAILABLE)`);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('\nConfirm assignment? [y/n]: ', async (answer) => {
        rl.close();

        if (answer.trim().toLowerCase() !== 'y') {
          console.log('Assignment cancelled.');
          return;
        }

        try {
          const result = await storageService.store(scanned.size, scanned.recipientName);
          console.log(`\nStored in Locker ${result.lockerId} | Pickup Code: ${result.pickupCode}`);
        } catch (err) {
          console.error((err as Error).message);
          process.exit(1);
        }
      });
    });
}
```

> **Node.js note:** `readline.createInterface` gives you a way to read user input line by line from the terminal. `rl.question` prints a prompt and calls your callback when the user presses Enter. `rl.close()` releases the input stream — without this, the Node.js process would hang waiting for more input.

- [ ] **Step 2: Smoke test the scan flow**

```bash
npm run dev -- locker add --id L1 --size small
npm run dev -- locker add --id L2 --size medium
npm run dev -- scan --file ./parcel.json
# Enter 'y' at the prompt
```

Expected:
```
Scanned: PKG-20260507-001 (Jane Doe)
Size:    MEDIUM
Locker:  L2 (MEDIUM, AVAILABLE)

Confirm assignment? [y/n]: y

Stored in Locker L2 | Pickup Code: 4XR2KZ
```

- [ ] **Step 3: Test rejection**

```bash
npm run dev -- locker add --id L1 --size medium
npm run dev -- scan --file ./parcel.json
# Enter 'n' at the prompt
```

Expected: `Assignment cancelled.`

- [ ] **Step 4: Test missing file**

```bash
npm run dev -- scan --file ./nonexistent.json
```

Expected: `Parcel file not found: ./nonexistent.json`

- [ ] **Step 5: Run the full test suite**

```bash
npm run test:run
```

Expected: all tests pass

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/cli/commands/scan.ts
git commit -m "feat(l5): add scan CLI command with confirmation prompt"
```

---

## Final Check

- [ ] **Run the complete test suite one last time**

```bash
npm run test:run
```

- [ ] **Build the project to verify TypeScript compiles cleanly**

```bash
npm run build
```

Expected: `dist/` folder created with no errors.

- [ ] **Run the built CLI to confirm the compiled output works**

```bash
node dist/cli/index.js --help
node dist/cli/index.js locker --help
```

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: verify build and complete all 5 levels"
```
