# Smart Package Locker System

A locker management system where delivery agents store packages and customers retrieve them using a pickup code. Built in Node.js + TypeScript across 4 levels.

---

## Running the app

```bash
npm install
npm run dev        # start the interactive CLI
npm run test:run   # run the full test suite
npm run typecheck  # TypeScript type check (no emit)
npm run build      # compile to dist/
```

---

## Approach

### Domain-first design

| Unit                      | Responsibility                                                    |
| ------------------------- | ----------------------------------------------------------------- |
| `Locker`                  | Locker size and availability state (`occupy` / `release`)         |
| `Package`                 | Carries metadata (id, size, owner)                                |
| `PickupCode`              | Value object — validates a code string, tied to one assignment    |
| `LockerAssignment`        | records assignment details (`packageId, lockerId, storedAt`);     |
| `LockerFinder`            | Find smallest fit for given size                                  |
| `PickupCodeGenerator`     | Generate unique 6-char alphanumeric codes                         |
| `StorageChargeCalculator` | Tiered fee calculation from `storedAt` to `retrievedAt`           |
| `PackageStorageService`   | Store packages with async mutex avoid concurrency issue           |
| `PackageRetrievalService` | Validates code, charges, confirmation before retrieval, retrieval |

### ATM-style interactive CLI

Role-based interactive menu using `inquirer`:

1. **Usability** — An ATM-style menu guides the user through each action step by step, which is how locker kiosks actually work in the real world.
2. **Closer to the problem domain** — the system has distinct roles (Admin, Delivery Agent, Customer). A role selector at startup makes this explicit and prevents agents from accidentally triggering customer actions.

Lockers are pre-seeded on startup (S1–S3 SMALL, M1–M2 MEDIUM, L1 LARGE) so no setup commands are needed before the first store operation.

### Concurrency safety (Level 4)

Use `async-mutex` npm package to resolve concurrency issue. The mutex is a promise-based queue of resolve callbacks, when promises enter the `async/await` execution, it will locked for subsequent promises execution by holding them into a queue. When the current holder releases, the next waiter from the queue is unblocked without polling and continue execution.

---

## Tradeoffs

**In-memory storage vs persistent storage**

Uses in-memory state for demo purpose meaning states will be refresh for each start. In real-world scenario there will be database for persistent storage. Current implementation allow database implementation by changing the repositories.

**Tiered pricing hardcoded vs configurable**

The rate tiers (days 1–5: $1/day, 6–10: $2/day, 11+: $3/day) and the base rate are constants in `StorageChargeCalculator`. In real system these would come from config or a database to allow pricing changes without a redeploy.

**Pickup code**

As described in the challenge, Pickup code will be sent to customer's email/SMS. Current implementation show raw pickup code on screen for demo purpose.

---

## Assumptions

- **Locker size fitting.** Assume delivery agent well understand the package size or dimension and the locker fitting for each packages.
- **No authentication** The role selector is for ease of the demo. In production, Admin and Delivery agent role will be authenticated while customer is authenticated through locker Id and pickup code.
- **Barcodes could be next phase integration.** Assume barcode scanner integration for next phase where delivery agent do not need to know customer name, contact and package sizes to shorten the time taken to operate the system.
