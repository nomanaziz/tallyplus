## Goal
Stop the repeated deployment/build failures by aligning the project’s package management and dependency versions so the install step is deterministic on the hosting platform.

## What’s causing the failure
There are two overlapping problems in the repo right now:

1. `package.json` declares `zod: ^4.3.6` and `openai: ^4.52.5`.
2. The deployed environment is running `npm install`, while the project also contains a Bun lockfile (`bun.lockb`) and an npm lockfile (`package-lock.json`).
3. The current `package-lock.json` is stale and still records `zod` as `^3.24.2`, while the live `package.json` requests Zod 4.
4. `openai@4.x` has a peer-optional expectation for `zod@^3.23.8`, so npm’s stricter peer resolution is rejecting the install when it sees Zod 4.
5. The codebase appears to use `zod` directly in app code, but there is no actual runtime use of the `openai` package in `src/` or `supabase/` right now.

That combination makes installs fragile and is why the codebase keeps “randomly” failing on build/deploy.

## Plan

### 1. Make dependency resolution consistent
Pick one package-manager path for the repo and make the manifests match it so the host does not resolve a different tree than local development.

I will:
- inspect whether this project should standardize on npm or Bun for deployment
- remove the ambiguity that comes from having both `bun.lockb` and `package-lock.json` driving different dependency graphs
- add an explicit `packageManager` declaration in `package.json` if helpful for deploy consistency

### 2. Fix the Zod/OpenAI conflict at the source
Since the app imports `zod` directly and there is no current code usage of the `openai` SDK, the safest fix is:
- remove `openai` from `package.json` if it is unused
- regenerate the lockfile(s) from the corrected dependency set

Fallback only if needed:
- if `openai` must stay, pin a version compatible with Zod 4 or move the project back to Zod 3 everywhere consistently

Preferred direction: keep Zod 4 and remove unused OpenAI, because that is the smallest, safest change.

### 3. Verify related version drift
There is also evidence of manifest drift in TanStack package versions between the repo files and older lockfile entries. I will:
- reconcile the resolved lockfile with the current `package.json`
- make sure the dependency tree reflects the current TanStack Start setup instead of older transitive versions lingering in `package-lock.json`

### 4. Deliver a clean deploy path
After the dependency cleanup, I will:
- ensure the repo has one authoritative dependency graph
- confirm the install step should succeed in hosting without `--legacy-peer-deps`
- tell you exactly whether you need to republish only, or whether no extra manual step is needed

## Files to update
- `package.json`
- lockfile(s): likely `package-lock.json` and possibly `bun.lockb`

## Technical details
Current evidence from the repo:
- `package.json` has `openai: ^4.52.5` and `zod: ^4.3.6`
- `package-lock.json` still records Zod 3 (`zod: ^3.24.2` and resolved `zod-3.25.76`)
- TanStack tooling inside the lockfile also depends on Zod 3 transitively, which is fine, but npm is failing specifically on the root-level OpenAI/Zod peer expectation
- app code imports `zod` in `src/components/app/AddShopDialog.tsx`
- no actual imports of `openai` were found in `src/` or `supabase/`

## Expected outcome
After this cleanup:
- installs stop failing on the peer dependency conflict
- deployments stop breaking because of stale lockfile/package-manager mismatch
- the project becomes much more stable for future edits instead of failing repeatedly on dependency resolution