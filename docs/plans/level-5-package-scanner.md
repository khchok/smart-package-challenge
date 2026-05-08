# Level 5 — Package Scanner

**Goal:** Simulate a barcode/QR scanner. When pointed at a `parcel.json` file, the system reads the package metadata, maps dimensions to a locker size, finds the best locker, and prompts the delivery agent to confirm before committing.

**Flow:**
```
scan --file ./parcel.json
  → read + validate parcel.json
  → derive locker size from dimensions (volume)
  → find smallest available locker
  → show summary + confirmation prompt
  → [y] → store package, print pickup code
  → [n] → cancel, no state changes
```

**Size mapping (volume = width × height × depth in cm³):**
- ≤ 8,000 cm³ → SMALL
- ≤ 27,000 cm³ → MEDIUM
- > 27,000 cm³ → LARGE

**What you'll build:**
- `ParcelScanner` service
- `scan` CLI command
- `parcel.json` example file

**Prerequisite:** Level 4 complete (or Level 3 if skipping Level 4).

---

## Task 1: Create parcel.json

Create this file in the **project root** (`smart-package-locker/parcel.json`):

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

Volume: 28 × 28 × 15 = 11,760 cm³ → maps to MEDIUM.

---

## Task 2: ParcelScanner service

**Files:** `src/services/ParcelScanner.ts`, `tests/services/ParcelScanner.test.ts`

### Write the test first

**`tests/services/ParcelScanner.test.ts`:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ParcelScanner } from '../../src/services/ParcelScanner';
import { LockerSize } from '../../src/domain/types';

const TMP = path.join('/tmp', 'test-parcel.json');

const write = (data: unknown) =>
  fs.writeFileSync(TMP, JSON.stringify(data, null, 2));

describe('ParcelScanner', () => {
  let scanner: ParcelScanner;

  beforeEach(() => { scanner = new ParcelScanner(); });
  afterEach(() => { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); });

  it('returns SMALL for volume ≤ 8000 cm³', () => {
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

  it('throws when the file does not exist', () => {
    expect(() => scanner.scan('/tmp/does-not-exist.json'))
      .toThrow('Parcel file not found: /tmp/does-not-exist.json');
  });

  it('throws for invalid JSON', () => {
    fs.writeFileSync(TMP, 'not json');
    expect(() => scanner.scan(TMP)).toThrow('Invalid JSON in parcel file');
  });

  it('throws when trackingId is missing', () => {
    write({
      dimensions: { width: 10, height: 10, depth: 10 },
      weight: 1,
      recipientName: 'X',
      recipientContact: 'x@x.com',
    });
    expect(() => scanner.scan(TMP)).toThrow('missing trackingId');
  });

  it('throws when a dimension is missing', () => {
    write({
      trackingId: 'PKG-X',
      dimensions: { width: 10, height: 10 },
      weight: 1,
      recipientName: 'X',
      recipientContact: 'x@x.com',
    });
    expect(() => scanner.scan(TMP)).toThrow('missing dimensions.depth');
  });
});
```

Run — expect failure:
```bash
npm run test:run -- tests/services/ParcelScanner.test.ts
```

### Write the implementation

**`src/services/ParcelScanner.ts`:**

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

> `fs.readFileSync(path, 'utf-8')` reads a file synchronously and returns its content as a string. Without `'utf-8'` Node.js returns a raw `Buffer` (binary). `JSON.parse` then converts the string to a JS object.

Run — expect 7 passed:
```bash
npm run test:run -- tests/services/ParcelScanner.test.ts
```

**Commit:**
```bash
git add src/services/ParcelScanner.ts tests/services/ParcelScanner.test.ts parcel.json
git commit -m "feat(l5): add ParcelScanner service and parcel.json example"
```

---

## Task 3: scan CLI command

**File:** `src/cli/commands/scan.ts` (replace stub)

```typescript
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

> `readline.createInterface` reads user input line-by-line from the terminal. `rl.question` prints a prompt and calls your callback when the user presses Enter. `rl.close()` is critical — without it, Node.js keeps waiting for more input and the process never exits.

### Smoke test — confirm with y

```bash
npm run dev -- locker add --id L1 --size small
npm run dev -- locker add --id L2 --size medium
npm run dev -- scan --file ./parcel.json
# When prompted, type: y
```

Expected:
```
Scanned: PKG-20260507-001 (Jane Doe)
Size:    MEDIUM
Locker:  L2 (MEDIUM, AVAILABLE)

Confirm assignment? [y/n]: y

Stored in Locker L2 | Pickup Code: 4XR2KZ
```

### Smoke test — cancel with n

```bash
npm run dev -- locker add --id L1 --size medium
npm run dev -- scan --file ./parcel.json
# When prompted, type: n
```

Expected:
```
Assignment cancelled.
```

### Smoke test — missing file

```bash
npm run dev -- scan --file ./nonexistent.json
```

Expected:
```
Parcel file not found: ./nonexistent.json
```

### Run all tests

```bash
npm run test:run
```

### Typecheck

```bash
npm run typecheck
```

**Commit:**
```bash
git add src/cli/commands/scan.ts
git commit -m "feat(l5): add scan CLI command with confirmation prompt"
```

---

## Final verification

```bash
# Run the full test suite
npm run test:run

# Compile TypeScript to dist/
npm run build

# Test the compiled output
node dist/cli/index.js --help
node dist/cli/index.js locker --help
node dist/cli/index.js store --help
node dist/cli/index.js retrieve --help
node dist/cli/index.js scan --help
```

**Final commit:**
```bash
git add -A
git commit -m "chore: verify build and complete all 5 levels"
```

---

## Level 5 complete ✓

All 5 levels done. Your system now supports:

| Command | Description |
|---------|-------------|
| `locker add --id L1 --size small` | Register a new locker |
| `locker list` | View all lockers + status |
| `store --size medium --owner "Jane"` | Store a package, get pickup code |
| `retrieve --locker L1 --code ABC123` | Retrieve package, see storage charge |
| `scan --file ./parcel.json` | Scan parcel, confirm assignment |
