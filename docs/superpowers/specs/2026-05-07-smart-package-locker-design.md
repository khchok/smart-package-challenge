# Smart Package Locker Management System — Design Spec

**Date:** 2026-05-07  
**Stack:** Node.js · TypeScript · commander.js · Vitest  
**Storage:** In-memory  
**Interface:** Command-based CLI  

---

## Overview

A Smart Package Locker Management System where delivery agents store packages in lockers and customers retrieve them using a pickup code. The system manages locker allocation, package tracking, storage charges, concurrency safety, and barcode-style parcel scanning.

---

## Domain Model

### Entities

| Entity | Single Responsibility |
|--------|----------------------|
| `Locker` | Owns its size and availability state (`occupy` / `release`) |
| `Package` | Carries package metadata (id, size, owner info) — pure data |
| `PickupCode` | Value object authenticating one retrieval — ties a code to a locker + package pair |
| `LockerAssignment` | Active record binding a package to a locker; holds `storedAt` timestamp |

### Services

| Service | Single Responsibility |
|---------|----------------------|
| `LockerFinder` | Given a package size, selects the smallest available locker that fits |
| `PickupCodeGenerator` | Generates a unique alphanumeric code per assignment |
| `StorageChargeCalculator` | Computes tiered fee from `storedAt` + `retrievedAt` timestamps |
| `PackageStorageService` | Orchestrates the store flow: find locker → create assignment → generate code |
| `PackageRetrievalService` | Orchestrates the retrieval flow: validate → calculate charge → release locker |
| `ParcelScanner` | Reads a `parcel.json` file, maps dimensions to locker size, proposes assignment |

### Repositories (in-memory)

| Repository | Single Responsibility |
|------------|----------------------|
| `LockerRepository` | Persists and queries locker state |
| `AssignmentRepository` | Persists and queries active locker assignments |

---

## Locker Sizes

Lockers and packages come in three sizes. The system always assigns the **smallest locker that fits** the package.

| Size | Max Volume (cm³) |
|------|-----------------|
| Small | ≤ 8,000 (e.g. 20×20×20 cm) |
| Medium | ≤ 27,000 (e.g. 30×30×30 cm) |
| Large | > 27,000 (up to 60×60×60 cm) |

A package's size is derived from its dimensions: `width × height × depth`.

---

## Roles

- **Delivery Agent** — stores packages, receives locker ID + pickup code
- **Customer** — retrieves packages using locker ID + pickup code

---

## Store Flow

```
delivery agent runs: store --size medium --owner "Jane Doe"
  → LockerFinder finds smallest available locker that fits
  → if none: "No suitable locker available for size MEDIUM"
  → LockerAssignment created (lockerId, packageId, pickupCode, storedAt=now)
  → PickupCodeGenerator issues unique 6-char alphanumeric code
  → output: "Stored in Locker L3 | Pickup Code: ABC123"
```

## Retrieval Flow

```
customer runs: retrieve --locker L3 --code ABC123
  → AssignmentRepository looks up assignment by locker ID
  → if no assignment: "Locker L3 is not occupied"
  → PickupCode validates the provided code against stored code
  → if mismatch: "Invalid pickup code"
  → StorageChargeCalculator computes fee (storedAt → now)
  → Locker released → Assignment removed
  → output: "Package retrieved | Storage charge: $4.50"
```

---

## Levels

### Level 1: Basic Locker and Package Storage

**Goal:** Implement the core locker allocation system.

Requirements:
- Create lockers of different sizes (Small / Medium / Large)
- List all lockers with their current availability status
- Delivery agent stores a package:
  - System finds the smallest available locker that fits
  - If no suitable locker: return clear error message
  - On success: generate unique pickup code, return locker ID + code

CLI commands:
```bash
node dist/cli.js locker add --id L1 --size small
node dist/cli.js locker list
node dist/cli.js store --size medium --owner "Jane Doe"
```

---

### Level 2: Package Retrieval and Locker Management

**Goal:** Allow customers to retrieve their packages.

Requirements:
- Customer retrieves a package by providing locker ID + pickup code
- Valid retrieval:
  - Package removed from locker
  - Locker becomes available again
- Invalid scenarios handled:
  - Unknown locker ID
  - Locker not currently occupied
  - Pickup code mismatch

CLI commands:
```bash
node dist/cli.js retrieve --locker L1 --code ABC123
```

---

### Level 3: Extended Storage Charges

**Goal:** Calculate storage fees for packages kept beyond expected pickup time.

Requirements:
- Record timestamp when package is stored (`storedAt`)
- On retrieval, calculate total charge using tiered pricing:
  - Days 1–5: `X` units/day
  - Days 6–10: `2X` units/day
  - Days 11+: `3X` units/day
  - A "day" is any 24-hour period (or part thereof) from `storedAt`
  - Default rate `X = 1.00` (configurable constant)
- Return charge amount with the retrieval confirmation

Example:
- Stored for 3 days → 3 × $1.00 = $3.00
- Stored for 7 days → (5 × $1.00) + (2 × $2.00) = $9.00
- Stored for 13 days → (5 × $1.00) + (5 × $2.00) + (3 × $3.00) = $24.00

---

### Level 4: Handling Concurrent Requests (Optional)

**Goal:** Ensure correct locker assignment when multiple delivery agents store packages simultaneously.

Context: Node.js is single-threaded, but async operations (e.g. I/O, timers, future DB calls) create windows where two requests can interleave. This level teaches async safety patterns.

Requirements:
- Implement an in-memory async lock (mutex) on locker assignment
- Only one assignment can proceed at a time per locker
- Two concurrent store requests must not receive the same locker
- If a locker is taken during the lock wait, fall through to the next available locker
- Locker availability must remain consistent under concurrent load

Implementation approach:
- `AsyncMutex` class: a queue of pending resolve callbacks, released one at a time
- `PackageStorageService` acquires the mutex before calling `LockerFinder`, releases after `LockerAssignment` is persisted

---

### Level 5: Package Scanner

**Goal:** Simulate a barcode/QR scanner that auto-populates package metadata and proposes a locker assignment for confirmation.

**Scanner input format (`parcel.json`):**

```json
{
  "trackingId": "PKG-20260507-001",
  "dimensions": {
    "width": 25,
    "height": 20,
    "depth": 15
  },
  "weight": 2.5,
  "recipientName": "Jane Doe",
  "recipientContact": "jane@example.com"
}
```

Requirements:
- Delivery agent runs the scan command pointing at a `parcel.json` file
- `ParcelScanner` reads and validates the file
- Dimensions are mapped to a locker size using volume thresholds (see Locker Sizes table)
- System auto-finds the best available locker (same `LockerFinder` logic as Level 1)
- If no locker available: error returned immediately, no prompt shown
- If locker found: display a confirmation prompt:
  ```
  Scanned: PKG-20260507-001 (Jane Doe)
  Dimensions: 25×20×15 cm → Size: MEDIUM
  Proposed locker: L3 (Medium, available)
  Confirm assignment? [y/n]:
  ```
- If confirmed (`y`): create assignment, generate pickup code, display result
- If rejected (`n`): cancel, no state changes

CLI command:
```bash
node dist/cli.js scan --file ./parcel.json
```

Invalid file handling:
- File not found: "Parcel file not found: ./parcel.json"
- Missing required fields: "Invalid parcel file: missing dimensions.width"
- Dimensions out of supported range: "Package too large for any available locker size"

---

## Project Structure

```
smart-package-locker/
├── src/
│   ├── domain/
│   │   ├── types.ts            # LockerSize, LockerStatus enums + shared types
│   │   ├── Locker.ts
│   │   ├── Package.ts
│   │   ├── PickupCode.ts
│   │   └── LockerAssignment.ts
│   ├── repositories/
│   │   ├── LockerRepository.ts
│   │   └── AssignmentRepository.ts
│   ├── services/
│   │   ├── LockerFinder.ts
│   │   ├── PickupCodeGenerator.ts
│   │   ├── StorageChargeCalculator.ts
│   │   ├── PackageStorageService.ts
│   │   ├── PackageRetrievalService.ts
│   │   ├── AsyncMutex.ts       # Level 4
│   │   └── ParcelScanner.ts    # Level 5
│   └── cli/
│       ├── index.ts            # commander root program
│       └── commands/
│           ├── locker.ts       # locker add / locker list
│           ├── store.ts        # store command
│           ├── retrieve.ts     # retrieve command
│           └── scan.ts         # Level 5 scan command
├── tests/
│   ├── domain/
│   │   ├── Locker.test.ts
│   │   ├── PickupCode.test.ts
│   │   └── LockerAssignment.test.ts
│   ├── services/
│   │   ├── LockerFinder.test.ts
│   │   ├── StorageChargeCalculator.test.ts
│   │   ├── PackageStorageService.test.ts
│   │   ├── PackageRetrievalService.test.ts
│   │   ├── AsyncMutex.test.ts
│   │   └── ParcelScanner.test.ts
│   └── repositories/
│       ├── LockerRepository.test.ts
│       └── AssignmentRepository.test.ts
├── parcel.json                 # example scan input
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Testing Strategy

- **Unit tests** for every domain class and service in isolation
- **No mocking of domain logic** — repositories are tested with real in-memory state
- **StorageChargeCalculator** tested with controlled timestamps (inject `now` as a parameter)
- **AsyncMutex** tested with concurrent Promise.all scenarios
- **ParcelScanner** tested with fixture JSON files (valid + invalid cases)
- Test file structure mirrors `src/` structure

---

## Non-Goals

- No persistent database (in-memory only)
- No authentication or user sessions
- No external SMS/email notification (pickup code returned in CLI output only)
- No web UI
