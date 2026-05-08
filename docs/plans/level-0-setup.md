# Level 0 — Project Setup

**Goal:** Create the Node.js + TypeScript project with all tooling configured.

---

## Step 1: Create the project folder

```bash
mkdir -p ~/personal/repo/smart-package-challenge/smart-package-locker
cd ~/personal/repo/smart-package-challenge/smart-package-locker
```

---

## Step 2: Initialise npm

```bash
npm init -y
```

> `package.json` is the manifest for every Node.js project. It records dependencies and scripts (command shortcuts).

---

## Step 3: Install dependencies

```bash
npm install commander
npm install --save-dev typescript tsx vitest @types/node
```

> - `commander` — parses CLI arguments (runtime dependency)
> - `typescript` — the TypeScript compiler
> - `tsx` — runs TypeScript directly without compiling (used during development)
> - `vitest` — test runner
> - `@types/node` — TypeScript type definitions for Node.js built-ins (fs, crypto, etc.)

---

## Step 4: Replace the scripts block in `package.json`

Open `package.json` and replace the `"scripts"` section with:

```json
"scripts": {
  "build": "tsc",
  "dev": "tsx src/cli/index.ts",
  "test": "vitest",
  "test:run": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

> - `npm run dev -- <args>` — run the CLI during development (no compile step)
> - `npm run test:run` — run tests once and exit
> - `npm run typecheck` — check types without producing output files

---

## Step 5: Create `tsconfig.json`

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

> - `"module": "CommonJS"` — compiles to traditional Node.js require() format (no .js extensions needed in imports)
> - `"strict": true` — enables all TypeScript safety checks
> - `"rootDir"/"outDir"` — maps `src/` → `dist/` on compile

---

## Step 6: Create `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

---

## Step 7: Create `.gitignore`

```
node_modules/
dist/
```

---

## Step 8: Create folder structure

```bash
mkdir -p src/domain src/repositories src/services src/cli/commands
mkdir -p tests/domain tests/repositories tests/services
```

Your structure should look like:

```
smart-package-locker/
├── src/
│   ├── domain/
│   ├── repositories/
│   ├── services/
│   └── cli/
│       └── commands/
├── tests/
│   ├── domain/
│   ├── repositories/
│   └── services/
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Step 9: Initialise git and commit

```bash
git init
git add .
git commit -m "chore: initialise Node.js TypeScript project"
```

---

## Verify

```bash
npm run typecheck   # should say: no input files (that's fine, no src yet)
npm run test:run    # should say: no test files found
```

Both are expected — setup is correct. Move on to Level 1.
